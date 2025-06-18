import { CTX, RequestContext } from "@web"

//=============================================================================
// PAGE
//=============================================================================

function GamePage(ctx: RequestContext) {
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const route = CTX.route(ctx)
  return ctx.response.redirect(route("game:share", org, game))
}

//=============================================================================
// EXPORTS
//=============================================================================

export default GamePage
