import { zod } from "@deps"
import { Game, GamePurpose, Organization } from "@domain"
import { xdata } from "@lib/jsx"
import { Format } from "@lib/format"
import { CTX, Layout, RequestContext } from "@web"
import Header from "@web/page/Organization/Header.tsx"

//=================================================================================================
// PAGE
//=================================================================================================

async function Page(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const header = (<Header ctx={ctx} org={org} />)
  const games = await domain.games.getGamesForOrg(org)
  const tools = games.filter((g) => g.purpose === GamePurpose.Tool)
  return (
    <Layout.Page ctx={ctx} title={org.name} page="org:tools" header={header}>
      <div class="space-y-16">
        <ToolsCard ctx={ctx} org={org} tools={tools} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// TOOLS CARD
//=================================================================================================

function ToolsCard({ ctx, org, tools }: {
  ctx: RequestContext
  org: Organization
  tools: Game[]
}) {
  const route = CTX.route(ctx)
  const data = { mode: "view" }
  const active = tools.filter(tool => !tool.archived)
  const archived = tools.filter(tool => tool.archived)
  return (
    <card id="tools" x-data={xdata(data)}>
      <card-header>
        <card-title>
          <span x-text="mode === 'view' ? 'Tools' : 'Add Tool'">Tools</span>
        </card-title>
        <card-header-rhs x-show="mode === 'view'">
          <button class="btn-primary" x-on:click="mode='add'">Create Tool</button>
        </card-header-rhs>
      </card-header>
      <card-body>
        <div x-show="mode === 'view'" class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-4 mb-2">
          {active.length === 0 && (
            <p>
              You have no editor tools defined for your organization.
            </p>
          )}
          {active.length > 0 && (
            <p>
              You have {Format.plural("editor tool", active.length, true)} defined for your organization.
            </p>
          )}
        </div>
        <div x-show="mode === 'view'" class="divide-y">
          {active.map((tool) => (
            <a href={route("game", org, tool)} class="block p-4 hover:bg-gray-100">
              <span class="link font-bold">{tool.name}</span>
              {tool.description && <span class="ml-4 text-gray no-underline">{tool.description}</span>}
            </a>
          ))}
        </div>
        <AddToolForm x-cloak="true" x-show="mode === 'add'" x-trap="mode === 'add'" ctx={ctx} org={org} />
        { archived.length > 0 && (
          <div x-data="{ archived: false }" x-show="mode === 'view'">
            <button class="link flex items-center" x-on:click="archived = ! archived">
              Show Archived Tools
              <i x-show="!archived" class="iconoir-nav-arrow-down"/>
              <i x-show="archived" class="iconoir-nav-arrow-up"/>
            </button>
            <div x-show="archived">
              {archived.map((tool) => (
                <a href={route("game:settings", org, tool)} class="block p-4 hover:bg-gray-100">
                  <span class="link font-bold">{tool.name}</span>
                  {tool.description && <span class="ml-4 text-gray no-underline">{tool.description}</span>}
                </a>
              ))}
            </div>
          </div>
        )}
      </card-body>
    </card>
  )
}

//=================================================================================================
// ADD TOOL FORM
//=================================================================================================

function AddToolForm(props: {
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
      hx-post={route("org:tools:add", org)}
      hx-disabled-elt="#add-tool-submit, #add-tool-cancel"
      class="mt-2 max-w-128"
      {...other}
    >
      <input id="purpose" name="purpose" type="hidden" value={GamePurpose.Tool} />

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
        <button id="add-tool-submit" type="button" class="btn-secondary" x-on:click="mode='view'">cancel</button>
        <button id="add-tool-cancel" type="submit" class="btn-primary">save</button>
      </form-buttons>
    </form>
  )
}

//=================================================================================================
// ADD TOOL ACTION
//=================================================================================================

async function AddTool(ctx: RequestContext) {
  CTX.authorize(ctx)

  const org = CTX.organization(ctx)
  const domain = CTX.domain(ctx)
  const form = CTX.form(ctx)
  const name = form.get("name") as string
  const description = form.get("description") as string
  const purpose = form.get("purpose") as GamePurpose

  const result = await domain.games.createGame(org, { name, description, purpose })

  if (result instanceof zod.ZodError)
    return (<AddToolForm ctx={ctx} org={org} name={name} error={result} />)
  else {
    const tools = (await domain.games.getGamesForOrg(org)).filter((g) => g.purpose === GamePurpose.Tool)
    ctx.response.headers.set("HX-Retarget", "#tools")
    return <ToolsCard ctx={ctx} org={org} tools={tools} />
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const OrganizationTools = {
  Page,
  Add: AddTool,
}

//-------------------------------------------------------------------------------------------------
