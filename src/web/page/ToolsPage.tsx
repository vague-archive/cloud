import { Deploy, Game } from "@domain"
import { Children } from "@lib/jsx"
import { Format } from "@lib/format"
import { CTX, Layout, RequestContext } from "@web"

//=================================================================================================
// EDITOR TOOLS PAGE
//=================================================================================================

async function ToolsPage(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const tools = (await domain.games.getPublicTools()).filter((t) => t.deploys && t.deploys.length > 0)
  return (
    <Layout.Empty ctx={ctx} title="Editor Tools">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-center my-12">🛠️ Void Tools 🛠️</h1>
        {tools.length === 0 && <NoToolsCard />}
        <div class="space-y-4">
          {tools.map((tool) => (<ToolCard ctx={ctx} tool={tool} deploys={tool.deploys ?? []} />))}
        </div>
      </div>
    </Layout.Empty>
  )
}

//=================================================================================================
// COMPONENTS
//=================================================================================================

function NoToolsCard() {
  return (
    <card>
      <card-header>
        <card-title>Unavailable</card-title>
      </card-header>
      <card-body>
        Sorry, there are no editor tools available at this time, please try again later.
      </card-body>
    </card>
  )
}

function ToolCard({ ctx, tool, deploys }: {
  ctx: RequestContext
  tool: Game
  deploys: Deploy[]
}) {
  const route = CTX.route(ctx)
  const format = new Format()
  return (
    <ToolCardWrapper ctx={ctx} tool={tool} deploys={deploys}>
      <div class="flex items-center">
        <div class="flex-1">
          <h4 class="mb-2">{ tool.name }</h4>
          <p class="mb-1 text-gray-500">{ tool.description }</p>
          <p class="text-gray">by { tool.organization?.name ?? "unknown" }</p>
        </div>
        <div class="text-40">
          📝   {/* TODO: add optional emoji in deploy DB */}
        </div>
      </div>
      {deploys.length === 0 && (
        <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-2 mt-2">
          This tool has not been deployed yet
        </div>
      )}
      {deploys.length > 1 && (
        <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-2 mt-2">
          This tool has multiple versions:
          <ul class="space-y-1 p-2">
            {deploys.map((d) => (
              <li><a href={ route("preview", tool.organization, tool, d) } class="link">{ d.slug } <span class="text-primary-300 pl-4">released {format.date(d.deployedOn)}</span></a></li>
            ))}
          </ul>
        </div>
      )}
    </ToolCardWrapper>
  )
}

function ToolCardWrapper({ ctx, tool, deploys, children }: {
  ctx: RequestContext
  tool: Game
  deploys: Deploy[],
  children: Children
}) {
  const classes = "block border p-4 bg-white text-gray-800 rounded-lg shadow hover:shadow-md hover:-translate-y-1 transition-transform"
  if (deploys.length === 1) {
    const route = CTX.route(ctx)
    const url = route("preview", tool.organization, tool, deploys[0])
    return (
      <a href={url} target="_tool" class={classes}>
        {children}
      </a>
    )
  } else {
    return (
      <div class={classes}>
        {children}
      </div>
    )
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export default {
  Page: ToolsPage,
}
