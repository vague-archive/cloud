import { NotFoundError } from "@lib/http"
import { CTX, NextFn, RequestContext } from "@web"
import { samePage } from "@web/page.ts"

//=================================================================================================
// LOAD ORGANIZATION
//=================================================================================================

async function LoadOrganization(ctx: RequestContext<"unknown">, next: NextFn) {
  if (ctx.params?.org) {
    const domain = CTX.domain(ctx)
    const org = await domain.account.getOrganizationBySlug(ctx.params.org)
    if (org === undefined) {
      throw new NotFoundError(ctx.request.url.pathname)
    }
    // NOTE: authz occurs in individual endpoints via CTX.organization(ctx)
    ctx.state.organization = org
  }
  await next()
}

//=================================================================================================
// LOAD GAME
//=================================================================================================

async function LoadGame(ctx: RequestContext<"unknown">, next: NextFn) {
  if (ctx.params?.game) {
    const domain = CTX.domain(ctx)
    const org = CTX.organization(ctx, "noauthz")
    const game = await domain.games.getGameBySlug(org, ctx.params.game)
    const route = CTX.route(ctx)
    if (game === undefined) {
      throw new NotFoundError(ctx.request.url.pathname)
    }
    // Redirect to settings if game is archived and we are not already navigating to settings
    if (game.archived && (!ctx.routeName || !samePage(ctx.routeName, "game:settings"))) {
      ctx.response.redirect(route("game:settings", org, game))
    }
    // NOTE: authz occurs in individual endpoints via CTX.game(ctx)
    ctx.state.game = game
  }
  await next()
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { LoadGame, LoadOrganization }

//-------------------------------------------------------------------------------------------------
