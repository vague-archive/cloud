import { join } from "@std/path"
import { Deploy, DeployState, Game, GamePurpose, Organization } from "@domain"
import { CTX, Layout, Manifest, RequestContext, Session } from "@web"
import { assert } from "@lib"
import { logger } from "@lib/logger"
import { ContentType, Header, NotFoundError, Status } from "@lib/http"
import { streamToBuffer } from "@lib/stream"

//=================================================================================================
// SERVE GAME PREVIEW INDEX
//=================================================================================================

async function GameServer(ctx: RequestContext<"/:org/:game/preview/:deploy/">) {
  const domain = CTX.domain(ctx)
  const session = CTX.session(ctx)
  const manifest = CTX.manifest(ctx)
  const organization = CTX.organization(ctx, "noauthz")
  const game = CTX.game(ctx, "noauthz")

  if(game.archived){
    throw new NotFoundError(ctx.request.url.pathname)
  }

  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)
  if (!deploy) {
    throw new NotFoundError(ctx.request.url.pathname)
  }

  if (deploy.state === DeployState.Deploying) {
    ctx.response.status = Status.OK
    ctx.response.headers.set(Header.ContentType, ContentType.Html)
    ctx.response.body = "<h1>Your game is still deploying,  please try again in a few seconds</h1>"
  } else if (deploy.state === DeployState.Failed) {
    ctx.response.status = Status.InternalServerError
    ctx.response.body = deploy.error
  } else {
    if (deploy.hasPassword) {
      await deploy.decryptPassword(domain.keys.encryptKey)
      if (getGamePassword(deploy, session) !== deploy.password) {
        return PasswordPage(ctx)
      }
    }
    const response = await domain.filestore.load(join(deploy.path, "index.html"))
    if (response.status === Status.OK && response.body) {
      const csrf = session.csrf
      const buffer = await streamToBuffer(response.body)
      const layout = markupLayout({ buffer, manifest, organization, game, deploy, csrf })

      includeHeaders(ctx, game.purpose)

      ctx.response.status = Status.OK
      ctx.response.headers.set(Header.ContentType, ContentType.Html)
      ctx.response.headers.set(Header.CacheControl, "max-age=0") // don't cache the index.html page, it will change with a new deploy (with the same label)
      ctx.response.body = layout
    }
  }
  return
}

//-------------------------------------------------------------------------------------------------

function markupLayout({ buffer, manifest, organization, game, deploy, csrf }: {
  buffer: Uint8Array
  manifest: Manifest
  organization: Organization
  game: Game
  deploy: Deploy
  csrf: string
}) {
  const csrfMeta = `<meta name="void:csrf" content="${csrf}" />`
  const orgMeta = `<meta name="void:organization" content="${organization.slug}" />`
  const gameMeta = `<meta name="void:game" content="${game.slug}" />`
  const deployMeta = `<meta name="void:deployId" content="${deploy.id}" />`
  const script = `<script src="${manifest("/assets/cloud.ts")}"></script>`
  let source = new TextDecoder().decode(buffer)
  source = source.replace(
    /<\/head>/i,
    `  ${orgMeta}\n  ${gameMeta}\n  ${deployMeta}\n  ${csrfMeta}\n  ${script}</head>`,
  )
  return source
}

//-------------------------------------------------------------------------------------------------

function includeHeaders(ctx: RequestContext, purpose: GamePurpose) {
  switch (purpose) {
    case GamePurpose.Tool:
      ctx.response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
      ctx.response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")
      ctx.response.headers.set("Cross-Origin-Resource-Policy", "cross-origin")
      ctx.response.headers.set("Access-Control-Allow-Origin", "*")
      break;
    case GamePurpose.Game:
      // none yet
      break;
    default:
      assert.unreachable(purpose);
  }
}

//=================================================================================================
// SERVE GAME PREVIEW ASSETS
//=================================================================================================

async function AssetServer(ctx: RequestContext<"/:org/:game/preview/:deploy/:asset*">) {
  const domain = CTX.domain(ctx)
  const org = ctx.params.org
  const game = ctx.params.game
  const deploy = ctx.params.deploy
  const asset = ctx.params.asset

  if (asset === undefined) {
    assert.false(
      ctx.request.url.pathname.endsWith("/"),
      "only way this should happen is when label is served without trailing slash",
    )
    ctx.response.redirect(ctx.request.url.pathname + "/")
    return
  }

  const info = await getGameInfo(ctx, org, game, deploy)
  const filePath = join(info.filePath, asset)
  includeHeaders(ctx, info.purpose)
  const response = await domain.filestore.load(filePath, ctx.request.headers)
  if (response.headers.get(Header.ContentType) === ContentType.Wasm) {
    return await Preload(ctx, response)
  } else {
    return response
  }
}

/*
 * Ok. For an as-yet-unknown reason, if we try to stream back an asset that is a WASM file the
 * Deno/Oak framework chunked response handler is very very slow
 *  - e.g. a 7MB engine wasm file takes 5+ seconds even on my local machine (and 20+ seconds from AWS)
 * but it is perfectly fine for other content types
 *  - e.g. a 10MB png file is streamed back almost instantly on my local machine (and in < 1s from AWS)
 *
 * I haven't been able to identify the root cause, but it's somewhere in the Deno or Oak response
 * handling. The fetch from our file server is instant, and if you debug the return from our AssetServer
 * handler is instant, but then the actual response to the client is streamed back hella-slow
 *
 * We are currently in the process of rewriting this app in ASP.NET so I dont want to spend a lot
 * more time trying to diagnose this. So - AS A WORKAROUND - lets just load the wasm into memory
 * and stream back the bytes with an explicit ContentLength and skip the Deno/Oak chunked response
 * handler entirely
 */
async function Preload(ctx: RequestContext<"/:org/:game/preview/:deploy/:asset*">, asset: Response) {

  // if non-200 (e.g. 304NotModified, 404NotFound) then just return it as normal
  if (asset.status !== Status.OK) {
    return asset
  }

  // otherwise load bytes into memory and skip default transfer-encoding: chunked behavior
  const bytes = await asset.bytes()
  ctx.response.body = bytes
  ctx.response.headers.set(Header.ContentLength, bytes.length.toString())
  for (const [key, value] of asset.headers) {
    if (key.toLowerCase() !== "transfer-encoding") {
      ctx.response.headers.set(key, value)
    }
  }
}

//=================================================================================================
// GAME INFO CACHE (stash critical info when serving up index.html to avoid DB hits in AssetServer)
//=================================================================================================

interface GameInfo {
  purpose: GamePurpose,
  filePath: string,
}

const infoCache: Map<string, GameInfo> = new Map()

async function getGameInfo(ctx: RequestContext, orgSlug: string, gameSlug: string, deploySlug: string) {
  const key = join(orgSlug, gameSlug, deploySlug)
  let info = infoCache.get(key)
  if (info) {
    return info
  } else {
    logger.info(`CACHE MISS INFO FOR ${key}`)
    const domain = CTX.domain(ctx);
    const org = await domain.account.getOrganizationBySlug(orgSlug)
    if (!org) {
      throw new NotFoundError(ctx.request.url.pathname)
    }
    const game = await domain.games.getGameBySlug(org, gameSlug)
    if (!game) {
      throw new NotFoundError(ctx.request.url.pathname)
    }
    const deploy = await domain.games.getDeployBySlug(game, deploySlug)
    if (!deploy) {
      throw new NotFoundError(ctx.request.url.pathname)
    }
    info = {
      purpose: game.purpose,
      filePath: deploy.path
    }
    infoCache.set(key, info)
    return info
  }
}

//=================================================================================================
// GAME PASSWORD PAGE
//=================================================================================================

function PasswordPage(ctx: RequestContext) {
  return (
    <Layout.Empty ctx={ctx} title="Game Password">
      <div class="h-full flex flex-col items-center justify-center">
        <card class="min-w-96">
          <card-body>
            <form hx-post="password" hx-target="#password-error" method="POST">
              <field>
                <label for="password">Game Password:</label>
                <field-input>
                  <input id="password" type="password" name="password" placeholder="******" autoFocus></input>
                </field-input>
              </field>
              <form-buttons>
                <span id="password-error" class="flex-1 text-danger"></span>
                <button type="submit" class="btn-primary">Play...</button>
              </form-buttons>
            </form>
          </card-body>
        </card>
      </div>
    </Layout.Empty>
  )
}

async function SubmitPassword(ctx: RequestContext<"/:org/:game/preview/:deploy/password">) {
  const domain = CTX.domain(ctx)
  const game = CTX.game(ctx, "noauthz")
  const session = CTX.session(ctx)
  const form = CTX.form(ctx)
  const password = form.get("password") ?? ""
  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)

  assert.present(deploy)

  await deploy.decryptPassword(domain.keys.encryptKey)

  if (password === deploy.password) {
    saveGamePassword(deploy, password, session)
    ctx.response.status = Status.OK
    ctx.response.headers.set("HX-Refresh", "true")
  } else {
    ctx.response.status = Status.OK
    ctx.response.body = "password is invalid"
  }
}

function saveGamePassword(deploy: Deploy, password: string, session: Session) {
  session.set(`game-password-${deploy.id}`, password)
}

function getGamePassword(deploy: Deploy, session: Session) {
  return session.get(`game-password-${deploy.id}`)
}

async function PasswordCheck(ctx: RequestContext<"/:org/:game/preview/:deploy/password-check">) {
  const domain = CTX.domain(ctx)
  const session = CTX.session(ctx)
  const game = CTX.game(ctx, "noauthz")

  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)
  if (!deploy) {
    ctx.response.status = Status.NotFound
    return
  }
  if (deploy.hasPassword) {
    await deploy.decryptPassword(domain.keys.encryptKey)
    if (getGamePassword(deploy, session) !== deploy.password) {
      ctx.response.status = Status.Forbidden
      return
    }
  }
  ctx.response.status = Status.OK
  ctx.response.body = "password is valid"
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const Preview = {
  GameServer,
  AssetServer,
  SubmitPassword,
  PasswordCheck,
}

//-------------------------------------------------------------------------------------------------
