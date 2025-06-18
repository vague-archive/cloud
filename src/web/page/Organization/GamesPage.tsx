import { zod } from "@deps"
import { Game, GamePurpose, Organization } from "@domain"
import { xdata } from "@lib/jsx"
import { CTX, Layout, RequestContext } from "@web"
import Header from "@web/page/Organization/Header.tsx"

//=================================================================================================
// PAGE
//=================================================================================================

async function Page(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const header = (<Header ctx={ctx} org={org} />)
  const gamesAndTools = await domain.games.getGamesForOrg(org)
  const games = gamesAndTools.filter((g) => g.purpose === GamePurpose.Game)
  return (
    <Layout.Page ctx={ctx} title={org.name} page="org:games" header={header}>
      <div class="space-y-16">
        <GamesCard ctx={ctx} org={org} games={games} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// GAMES CARD
//=================================================================================================

function GamesCard({ ctx, org, games }: {
  ctx: RequestContext
  org: Organization
  games: Game[]
}) {
  const route = CTX.route(ctx)
  const data = { mode: "view" }
  const archivedGames = games.filter(game => game.archived)
  return (
    <card id="games" x-data={xdata(data)}>
      <card-header>
        <card-title>
          <span x-text="mode === 'view' ? 'Games' : 'Add Game'">Games</span>
        </card-title>
        <card-header-rhs x-show="mode === 'view'">
          <button class="btn-primary" x-on:click="mode='add'">Add Game</button>
        </card-header-rhs>
      </card-header>
      <card-body>
        <div x-show="mode === 'view'" class="divide-y">
          {games.map((game) => (
            game.archived ? null :
            <a href={route("game", org, game)} class="block p-4 hover:bg-gray-100">
              <span class="link font-bold">{game.name}</span>
              {game.description && <span class="ml-4 text-gray no-underline">{game.description}</span>}
            </a>
          ))}
        </div>
        <AddGameForm x-cloak="true" x-show="mode === 'add'" x-trap="mode === 'add'" ctx={ctx} org={org} />
        { archivedGames.length > 0 ? 
          <div x-data="{ archived: false }" x-show="mode === 'view'">
            <button class="link flex items-center" x-on:click="archived = ! archived">
              Show Archived Games 
              <i x-show="!archived" class="iconoir-nav-arrow-down"/> 
              <i x-show="archived" class="iconoir-nav-arrow-up"/>
            </button>
            <div x-show="archived">
              {archivedGames.map((game) => (
                <a href={route("game:settings", org, game)} class="block p-4 hover:bg-gray-100">
                  <span class="link font-bold">{game.name}</span>
                  {game.description && <span class="ml-4 text-gray no-underline">{game.description}</span>}
                </a>
              ))}
            </div>
          </div>
        : <div></div> }
      </card-body>
    </card>
  )
}

//=================================================================================================
// ADD GAME FORM
//=================================================================================================

function AddGameForm(props: {
  ctx: RequestContext
  org: Organization
  error?: zod.ZodError
  name?: string
  description?: string
}) {
  const { ctx, org, error, name, description, ...other } = props
  const route = CTX.route(ctx)
  const form = {
    name: name ?? "",
    description: description ?? "",
  }
  const nameErrors = error?.flatten().fieldErrors["name"]
  const descriptionErrors = error?.flatten().fieldErrors["description"]
  return (
    <form
      x-data={xdata(form)}
      hx-post={route("org:games:add", org)}
      hx-disabled-elt="#add-game-submit, #add-game-cancel"
      class="mt-2 max-w-128"
      {...other}
    >
      <input id="purpose" name="purpose" type="hidden" value={GamePurpose.Game} />

      <field>
        <label for="name">Name:</label>
        <field-input>
          <input id="name" name="name" x-model="name" autoComplete="off" data-1p-ignore="true" />
        </field-input>
        {nameErrors && <field-error>{nameErrors}</field-error>}
      </field>

      <field>
        <label for="description">Description:</label>
        <field-input>
          <textarea id="description" name="description" x-model="description" />
        </field-input>
        {descriptionErrors && <field-error>{descriptionErrors}</field-error>}
      </field>

      <form-buttons class="right">
        <button id="add-game-submit" type="button" class="btn-secondary" x-on:click="mode='view'">cancel</button>
        <button id="add-game-cancel" type="submit" class="btn-primary">save</button>
      </form-buttons>
    </form>
  )
}

//=================================================================================================
// ADD GAME ACTION
//=================================================================================================

async function AddGame(ctx: RequestContext) {
  CTX.authorize(ctx)

  const org = CTX.organization(ctx)
  const domain = CTX.domain(ctx)
  const form = CTX.form(ctx)
  const name = form.get("name") as string
  const description = form.get("description") as string
  const purpose = form.get("purpose") as GamePurpose

  const result = await domain.games.createGame(org, { name, description, purpose })

  if (result instanceof zod.ZodError)
    return (<AddGameForm ctx={ctx} org={org} name={name} error={result} />)
  else {
    const games = (await domain.games.getGamesForOrg(org)).filter((g) => g.purpose === GamePurpose.Game)
    ctx.response.headers.set("HX-Retarget", "#games")
    return <GamesCard ctx={ctx} org={org} games={games} />
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const OrganizationGames = {
  Page,
  Add: AddGame,
}

//-------------------------------------------------------------------------------------------------
