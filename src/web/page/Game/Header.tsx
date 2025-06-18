import { CTX, RequestContext } from "@web"
import { Organization, Game } from "@domain"

//=============================================================================
// PAGE
//=============================================================================

function Header({ ctx, org, game }: {
  ctx: RequestContext
  org: Organization
  game: Game
}) {
  const route = CTX.route(ctx)
  const currentPage = ctx.request.url.pathname.split('/').at(-1)
  return (
    <div class="flex items-center gap-12">
      <h3>{ game.name }</h3>
      <div class="flex gap-2">
        <a hx-boost href={route("game:share", org, game)} class={`link ${currentPage === "share" ? "font-bold" : ""}`}>share</a>
        <span class="link-separator"></span>
        <a hx-boost href={route("game:settings", org, game)} class={`link ${currentPage === "settings" ? "font-bold" : ""}`}>settings</a>
      </div>
    </div>
  )
}
//=============================================================================
// EXPORTS
//=============================================================================

export default Header
