import { Deploy, DeployState, Domain, Game, GamePurpose, Organization, User } from "@domain"
import { assert, to } from "@lib"
import { logger } from "@lib/logger"
import { Format } from "@lib/format"
import { NotFoundError } from "@lib/http"
import { cls } from "@lib/html"
import { hxvals } from "@lib/jsx"
import { authorize, CTX, Layout, RequestContext } from "@web"
import { Clipboard } from "@web/component"
import Header from "@web/page/Game/Header.tsx"

//=============================================================================
// PAGE
//=============================================================================

async function SharePage(ctx: RequestContext) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const deploys = await getDeploys(domain, game)
  const header = <Header ctx={ctx} org={org} game={game} />
  return (
    <Layout.Page ctx={ctx} title={game.name} page="game" header={header}>
      <div class="space-y-8">
        {game.description && <GameDescription game={game} />}
        {deploys.length > 0 && <DeploysCard ctx={ctx} organization={org} game={game} deploys={deploys} user={user} />}
        {deploys.length === 0 && (
          <div>
            <h4>This {game.purpose} has not been shared yet</h4>
            <a href="/help" class="btn btn-primary mt-4">Learn how to share your first {game.purpose}</a>
          </div>
        )}
      </div>
    </Layout.Page>
  )
}

async function getDeploys(domain: Domain, game: Game) {
  const deploys = await domain.games.getDeploys(game)
  await domain.games.withDeployedBy(deploys)
  await domain.games.withDecryptedPasswords(deploys, domain.keys.encryptKey)
  return deploys
}

async function refreshDeploysCard(ctx: RequestContext) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const deploys = await getDeploys(domain, game)
  return <DeploysCard ctx={ctx} organization={org} game={game} deploys={deploys} user={user} />
}

//=============================================================================
// COMPONENTS
//=============================================================================

function GameDescription({ game }: {
  game: Game
}) {
  return (
    <card>
      <card-header>
        <card-title>Description</card-title>
      </card-header>
      <card-body>
        {game.description}
      </card-body>
    </card>
  )
}

function DeploysCard({ ctx, organization, game, deploys, user }: {
  ctx: RequestContext
  organization: Organization
  game: Game
  deploys: Deploy[]
  user: User
}) {
  const route = CTX.route(ctx)
  const format = Format.for(user)
  const singleUser = deploys.every((d) => d.deployedBy === user.id)
  const canPassword = game.purpose === GamePurpose.Game
  const canCopy = game.purpose === GamePurpose.Tool
  return (
    <card id="deploys">
      <card-header>
        <card-title>Shared Builds</card-title>
      </card-header>
      <card-body>
        <p>
          Your team has deployed{" "}
          {format.plural("shared build", deploys, true)}. Click the link(s) below to playtest your games.
        </p>
        <div class="mt-2">
          {deploys.map((d) => (
            <div class="flex items-center gap-2 p-1 hover:bg-gray-100">
              <div>{format.date(d.deployedOn)}</div>
              <div>{format.time(d.deployedOn)}</div>
              <div class="flex-1">
                <GameLink ctx={ctx} organization={organization} game={game} deploy={d} />
                {!singleUser && d.deployedByUser && <span class="text-gray ml-4 lowercase">({d.deployedByUser.name})</span>}
              </div>
              {canCopy && (
                <div class="mr-8">
                  <button class="btn btn-primary btn-small">
                    <Clipboard content={route("preview", organization, game, d, { full: true })} label="copy url" />
                  </button>
                </div>
              )}
              <div class="flex gap-3">
                {canPassword && <PasswordButton ctx={ctx} organization={organization} game={game} deploy={d} />}
                <PinButton ctx={ctx} organization={organization} game={game} deploy={d} />
                <DeleteButton ctx={ctx} organization={organization} game={game} deploy={d} />
              </div>
            </div>
          ))}
        </div>
      </card-body>
    </card>
  )
}

//-------------------------------------------------------------------------------------------------

function GameLink({ ctx, organization, game, deploy }: {
  ctx: RequestContext
  organization: Organization
  game: Game
  deploy: Deploy
}) {
  const route = CTX.route(ctx)
  switch (deploy.state) {
    case DeployState.Ready:
      return (
        <a
          class="link"
          href={route("preview", organization, game, deploy)}
          target="_deploy"
        >
          {deploy.slug}
        </a>
      )
    case DeployState.Failed:
      return (
        <div class="flex gap-4">
          <span class="text-dark">{deploy.slug}</span>
          <span class="text-danger" title={deploy.error}>
            (deploy failed)
          </span>
        </div>
      )
    case DeployState.Deploying:
      return (
        <div class="flex gap-4">
          <span class="text-dark">{deploy.slug}</span>
          <span class="text-gray">(deploying)</span>
        </div>
      )
    default:
      assert.unreachable(deploy.state)
  }
}

//-------------------------------------------------------------------------------------------------

function PinButton({ ctx, organization, game, deploy }: {
  ctx: RequestContext
  organization: Organization
  game: Game
  deploy: Deploy
}) {
  const route = CTX.route(ctx)
  const isPinned = deploy.pinned
  const size = "text-20"
  const icon = isPinned ? "iconoir-pin-solid -rotate-45" : "iconoir-pin"
  const color = ""
  const tooltip = isPinned ? "unpin" : "pin this build (so that it never expires)"
  return (
    <button
      x-data="{show: false}"
      hx-post={route("share:pin", organization, game, deploy)}
      hx-vals={hxvals({pin: !isPinned})}
      title={tooltip}
    >
      <i class={cls(size, icon, color)}></i>
    </button>
  )
}

//-------------------------------------------------------------------------------------------------

function PasswordButton({ ctx, organization, game, deploy }: {
  ctx: RequestContext
  organization: Organization
  game: Game
  deploy: Deploy
}) {
  const route = CTX.route(ctx)
  const hasPassword = deploy.hasPassword
  const password = deploy.password ?? ""
  const icon = hasPassword ? "iconoir-password-check" : "iconoir-password-xmark"
  const color = hasPassword ? "text-primary" : ""
  const tooltip = hasPassword ? "change password" : "set password"
  const size = "text-24"
  return (
    <span x-data="{show: false}">
      <button x-on:click="show=true" title={tooltip}>
        <i class={cls(size, icon, color)}></i>
      </button>
      <form
        hx-post={route("share:password", organization, game, deploy)}
        hx-target="#deploys"
        method="POST"
        class="form"
      >
        <fx-modal x-bind:show="show" x-on:close="show = false">
          <card>
            <card-header>
              <card-title>Game Password</card-title>
            </card-header>
            <card-body>
              <div
                class="space-y-2"
                x-data={JSON.stringify({
                  password,
                  enabled: hasPassword,
                  revealed: false,
                })}
              >
                <field class="horizontal">
                  <label for="enabled">Enabled:</label>
                  <fx-toggle name="enabled" x-bind:on="enabled" x-on:change="enabled = $event.detail.on" />
                </field>

                <field class="horizontal">
                  <field-input class="flex-1">
                    <input
                      x-model="password"
                      x-bind:disabled="!enabled"
                      x-bind:type="revealed ? 'text' : 'password'"
                      name="password"
                      class="w-full"
                      autoComplete="new-password"
                      data-1password-ignore
                    >
                    </input>
                  </field-input>
                  <span x-show="revealed" x-on:click="revealed = false" class="cursor-pointer">
                    <i class="iconoir-eye-solid text-24" />
                  </span>
                  <span x-show="!revealed" x-on:click="revealed = true" class="cursor-pointer">
                    <i class="iconoir-eye-closed text-24" />
                  </span>
                </field>

                <form-buttons>
                  <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
                  <button class="btn-primary" type="submit">Ok</button>
                </form-buttons>
              </div>
            </card-body>
          </card>
        </fx-modal>
      </form>
    </span>
  )
}

//-------------------------------------------------------------------------------------------------

function DeleteButton({ ctx, organization, game, deploy }: {
  ctx: RequestContext
  organization: Organization
  game: Game
  deploy: Deploy
}) {
  const route = CTX.route(ctx)
  return (
    <span
      x-data="{show: false}"
      hx-delete={route("share:delete", organization, game, deploy)}
      hx-trigger="confirm"
      hx-target="#deploys"
    >
      <button x-on:click="show = true" title="delete game build">
        <i class="iconoir-trash text-24" />
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Delete Game Build?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to delete this game build? This action cannot be undone.
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Delete</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </span>
  )
}

//=============================================================================
// DELETE DEPLOY ACTION
//=============================================================================

async function DeleteDeploy(ctx: RequestContext<"/:org/:game/share/:deploy">) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const game = CTX.game(ctx)
  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)
  if (deploy) {
    authorize(user, "member", game)
    await domain.games.deleteDeploy(deploy)
    return refreshDeploysCard(ctx)
  } else {
    throw new NotFoundError(ctx.request.url.pathname)
  }
}

//=============================================================================
// PIN DEPLOY ACTION
//=============================================================================

async function PinDeploy(ctx: RequestContext<"/:org/:game/share/:deploy/pin">) {
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const form = CTX.form(ctx)
  const pin = to.bool(form.get("pin"))
  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)
  if (deploy) {
    logger.info(`${pin ? "pinned" : "unpinned"} deploy ${deploy.id}`)
    await domain.games.pinDeploy(deploy, pin)
    return <PinButton ctx={ctx} organization={org} game={game} deploy={deploy} />
  } else {
    throw new NotFoundError(ctx.request.url.pathname)
  }
}

//=============================================================================
// SET PASSWORD ACTION
//=============================================================================

async function SetDeployPassword(ctx: RequestContext<"/:org/:game/share/:deploy/password">) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const game = CTX.game(ctx)
  const form = CTX.form(ctx)
  const deploy = await domain.games.getDeployBySlug(game, ctx.params.deploy)
  const password = form.get("password")
  const enabled = form.get("enabled") === "1"
  if (deploy) {
    authorize(user, "member", game)
    if (enabled && password) {
      logger.info(`password set on deploy ${deploy.id}`)
      assert.isString(password)
      await domain.games.setDeployPassword(deploy, password)
    } else {
      logger.info(`password removed for deploy ${deploy.id}`)
      await domain.games.clearDeployPassword(deploy)
    }
    return refreshDeploysCard(ctx)
  } else {
    throw new NotFoundError(ctx.request.url.pathname)
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export default {
  Page: SharePage,
  PinDeploy,
  DeleteDeploy,
  SetDeployPassword,
}
