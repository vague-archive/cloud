import { assert } from "@lib"
import { Game, GamePurpose, Organization } from "@domain"
import { CTX, Layout, RequestContext } from "@web"

function RedirectToDefault(ctx: RequestContext) {
  const route = CTX.route(ctx)
  const origin = ctx.request.url.searchParams.get("origin") ?? undefined
  const user = ctx.state.user
  if (user && user.disabled) {
    return ctx.response.redirect(route("disabled"))
  } else if (user) {
    assert.present(user.organizations)
    if (user.organizations.length === 1) {
      const org = user.organizations[0]
      assert.present(org)
      assert.present(org.games)
      if (org.games.length === 1) {
        const game = org.games[0]
        assert.present(game)
        return ctx.response.redirect(route("game", org, game))
      } else {
        return ctx.response.redirect(route("org", org))
      }
    } else if (user.organizations.length === 0) {
      return NoOrganizationPage(ctx)
    }
    return GamePicker(ctx, user.organizations)
  } else {
    return ctx.response.redirect(route("login", { query: { origin } }))
  }
}

function GamePicker(ctx: RequestContext, orgs: Organization[]) {
  return (
    <Layout.Page ctx={ctx} title="Choose a Game" page="game:picker">
      <div class="space-y-8">
        {orgs.map((org) => <OrganizationCard ctx={ctx} org={org} />)}
      </div>
    </Layout.Page>
  )
}

function OrganizationCard({ ctx, org }: {
  ctx: RequestContext
  org: Organization
}) {
  const route = CTX.route(ctx)
  const games = org.games?.filter((g) => !g.archived && g.purpose === GamePurpose.Game)
  const tools = org.games?.filter((g) => !g.archived && g.purpose === GamePurpose.Tool)
  const hasGames = games && games.length > 0
  const hasTools = tools && tools.length > 0

  return (
    <card>
      <card-header>
        <card-title>
          {org.name}
        </card-title>
        <card-header-rhs>
          <a hx-boost href={route("org", org)} class="btn-primary">view org</a>
        </card-header-rhs>
      </card-header>
      <card-body>
        { hasGames && <OrganizationGames ctx={ctx} org={org} games={games} /> }
        { hasTools && <OrganizationTools ctx={ctx} org={org} tools={tools} /> }
      </card-body>
    </card>
  )
}

function OrganizationGames({ ctx, org, games }: {
  ctx: RequestContext
  org: Organization
  games: Game[]
}) {
  const route = CTX.route(ctx)
  return (
    <div class="divide-y pb-4">
      {games.map((game) => (
        <a hx-boost href={route("game", org, game)} class="block p-4 hover:bg-gray-100">
          <span class="link font-bold">{game.name}</span>
          {game.description && <span class="ml-4 text-gray no-underline">{game.description}</span>}
        </a>
      ))}
    </div>
  )
}

function OrganizationTools({ ctx, org, tools }: {
  ctx: RequestContext
  org: Organization
  tools: Game[]
}) {
  const route = CTX.route(ctx)
  return (
    <div>
      <h4 class="pl-4">Tools</h4>
      <div class="divide-y pb-4">
        {tools.map((tool) => (
          <a hx-boost href={route("game", org, tool)} class="block p-4 hover:bg-gray-100">
            <span class="link font-bold">{tool.name}</span>
            {tool.description && <span class="ml-4 text-gray no-underline">{tool.description}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}

function NoOrganizationPage(ctx: RequestContext) {
  return (
    <Layout.Page ctx={ctx} title="No Organization Found" page="org:none">
      <card>
        <card-body>
          You are not a member of any organization, please contact support, or your administrator, to be invited to your organization.
        </card-body>
      </card>
    </Layout.Page>
  )
}

export default {
  RedirectToDefault,
}
