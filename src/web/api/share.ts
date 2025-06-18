import { ulid } from "@std/ulid"
import { assert } from "@lib"
import { logger, pp } from "@lib/logger"
import { Format } from "@lib/format"
import { Header, Status } from "@lib/http"
import { DeployState } from "@domain"
import { authorize, CTX, RequestContext } from "@web"

//-------------------------------------------------------------------------------------------------

export async function Share(ctx: RequestContext<"/api/:org/:game/share/:label?">) {
  const user = CTX.authorize(ctx)
  const config = CTX.config(ctx)
  const domain = CTX.domain(ctx)
  const route = CTX.route(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)

  authorize(user, "member", org)

  const start = Date.now()
  const password = ctx.request.headers.get("X-Deploy-Password") ?? undefined
  const label = ctx.request.headers.get("X-Deploy-Label") ?? ctx.params.label ?? ulid()
  const pinned = ctx.request.headers.get("X-Deploy-Pinned") === "true" || undefined // Only pass to domain method if true
  const slug = Format.slugify(label)
  const path = domain.games.sharePath(org, game, slug)

  assert.present(ctx.request.body.stream)

  const deploy = await domain.games.createDeploy(game, user, {
    slug,
    path,
    password,
    pinned,
  })

  try {
    const response = await domain.filestore.save(
      path,
      ctx.request.body.stream,
      new Headers({
        [Header.CustomCommand]: "extract",
      }),
    )
    if (response.status !== Status.OK) {
      const message = response.body ? await response.text() : "no message"
      throw new Error(`failed to save archive to file store ${path} ${response.status} ${message}`)
    }
    await domain.games.updateDeploy(deploy, {
      state: DeployState.Ready,
      error: undefined,
    })
  } catch (err) {
    await domain.games.updateDeploy(deploy, {
      state: DeployState.Failed,
      error: err.toString(),
    })
    const duration = Date.now() - start
    logger.error(`deploy failed in ${Format.duration(duration)} ${pp(deploy)}`)
    ctx.response.status = Status.InternalServerError
    ctx.response.body = err.toString()
    return
  }

  const duration = Date.now() - start
  logger.info(`deploy created in ${Format.duration(duration)} ${pp(deploy)}`)

  const url = new URL(route("preview", org, game, deploy), config.web.publicUrl)
  ctx.response.status = Status.OK
  ctx.response.body = `Play your game at ${url}\n`
}

//-------------------------------------------------------------------------------------------------
