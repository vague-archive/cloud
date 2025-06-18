import { CTX, RequestContext } from "@web"
import { Organization } from "@domain"

//=============================================================================
// PAGE
//=============================================================================

function Header({ ctx, org }: {
  ctx: RequestContext
  org: Organization
}) {
  const route = CTX.route(ctx)
  const currentPage = ctx.request.url.pathname.split('/').at(-1)
  return (
    <div class="flex items-center gap-12">
      <h3>{ org.name }</h3>
      <div class="flex gap-2">
        <a hx-boost href={route("org:games", org)} class={`link ${currentPage === "games" ? "font-bold" : ""}`}>games</a>
        <span class="link-separator"></span>
        <a hx-boost href={route("org:tools", org)} class={`link ${currentPage === "tools" ? "font-bold" : ""}`}>tools</a>
        <span class="link-separator"></span>
        <a hx-boost href={route("org:team", org)} class={`link ${currentPage === "team" ? "font-bold" : ""}`}>team</a>
        <span class="link-separator"></span>
        <a hx-boost href={route("org:settings", org)} class={`link ${currentPage === "settings" ? "font-bold" : ""}`}>settings</a>
      </div>
    </div>
  )
}

//=============================================================================
// EXPORTS
//=============================================================================

export default Header
