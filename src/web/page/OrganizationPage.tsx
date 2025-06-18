import { CTX, RequestContext } from "@web"
import { OrganizationGames } from "./Organization/GamesPage.tsx"
import { OrganizationTools } from "./Organization/ToolsPage.tsx"
import { OrganizationTeam } from "./Organization/TeamPage.tsx"
import { OrganizationSettings } from "./Organization/SettingsPage.tsx"

function OrganizationPage(ctx: RequestContext) {
  const org = CTX.organization(ctx)
  const route = CTX.route(ctx)
  ctx.response.redirect(route("org:games", org))
}

export default {
  Page: OrganizationPage,
  Games: OrganizationGames,
  Tools: OrganizationTools,
  Team: OrganizationTeam,
  Settings: OrganizationSettings
}
