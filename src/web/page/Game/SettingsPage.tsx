import { CTX, HX, Layout, RequestContext } from "@web"
import Header from "@web/page/Game/Header.tsx"
import { Game, Organization } from "@domain"
import { to } from "@lib/to"
import { zod } from "@deps"
import { xdata } from "@lib/jsx"

//=============================================================================
// PAGE
//=============================================================================

function SettingsPage(ctx: RequestContext) {
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const header = <Header ctx={ctx} org={org} game={game} />
  return (
    <Layout.Page ctx={ctx} title={game.name} page="game" header={header}>
      <div class="space-y-8">
        <GameSettings ctx={ctx} org={org} game={game}/>
      </div>
    </Layout.Page>
  )
}


//=============================================================================
// COMPONENTS
//=============================================================================


function GameSettings({ ctx, org, game, error }: {
  ctx: RequestContext
  org: Organization
  game: Game
  error?: zod.ZodError
}) {
  return (
    <card id="settings">
      { game.archived ? 
          <ArchivedGameCard ctx={ctx} game={game}/> : 
          <ActiveGameCard ctx={ctx} org={org} game={game} error={error}/>
      }
    </card>
  )
}

function ActiveGameCard({ ctx, org, game, error }: {
  ctx: RequestContext
  org: Organization
  game: Game
  error?: zod.ZodError
}) {
  return (
    <div>
      <card-header>
        <card-title>Settings</card-title>
      </card-header>
      <card-body class="space-y-8">
        <EditGameDetailsForm ctx={ctx} org={org} game={game} error={error}/>
        <ArchiveGameButton ctx={ctx} game={game}/> 
      </card-body>
    </div>
  )
}

function EditGameDetailsForm({ ctx, org, game, name, slug, description, error }: {
  ctx: RequestContext
  org: Organization
  game: Game
  name?: string
  slug?: string
  description?: string
  error?: zod.ZodError
}) {
  const route = CTX.route(ctx)
  const organization = CTX.organization(ctx)

  name = name ?? game.name
  slug = slug ?? game.slug
  description = description ?? game.description

  const form = {
    mode: error ? "edit" : "view",
    name: name,
    oldSlug: slug,
    newSlug: slug,
    description: description,
  }
  const nameErrors = error?.flatten().fieldErrors["name"]
  const descriptionErrors = error?.flatten().fieldErrors["description"]

  return (
    <form
      hx-post={route("game:settings:update", organization, game)}
      hx-disabled-elt="#update-game-submit, #update-game-cancel"
      x-data={xdata(form)}
      class="max-w-128"
    >
      <div x-show="mode === 'view'">
        <field>
          <label>Name:</label>
          <div>{ game.name }</div>
        </field>
        <field>
          <label>Identity:</label>
          <div class="font-bold flex">{ org.slug }/{ game.slug }</div>
        </field>
        <field>
          <label>Description:</label>
          <div>{ game.description }</div>
        </field>
        <div class="mt-4">
          <button type="button" class="btn-primary" x-on:click="mode='edit'">edit</button>
        </div>
      </div>

      <div x-cloak="true" x-show="mode === 'edit'" x-trap="mode === 'edit'">
        <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-4 mb-4">
          <b>WARNING</b>:
          Changing the name of your game also changes the identity used in URL's and you will have to update
          your automated integrations (if any) with the new identity.
        </div>
        <field>
          <label for="name">Name:</label>
          <field-input>
            <input id="name" name="name" x-model="name" x-on:input="newSlug = hx.slugify(name)" data-1p-ignore />
          </field-input>
          {nameErrors && <field-error>{nameErrors}</field-error>}
        </field>

        <field>
          <label>Identity:</label>
          <div class="font-bold flex">
            { org.slug }/
            <span x-text="newSlug"></span>
            <input id="slug" name="slug" x-model="newSlug" type="hidden" />
            <span x-show="newSlug !== oldSlug" class="text-danger pl-4">(CHANGED)</span>
          </div>
        </field>

        <field>
          <label for="description">Description:</label>
          <field-input>
            <textarea id="description" name="description" x-model="description" rows={5} />
          </field-input>
          {descriptionErrors && <field-error>{descriptionErrors}</field-error>}
        </field>

        <div class="mt-4 flex gap-2 justify-end">
          <button id="update-game-submit" type="button" class="btn-secondary" x-on:click="mode='view'">cancel</button>
          <button id="update-game-cancel" type="submit" class="btn-primary">save</button>
        </div>
      </div>
    </form>
  )
}

function ArchivedGameCard({ ctx, game }: {
  ctx: RequestContext
  game: Game
}) {
  return (
    <div>
      <card-header>
        <card-title>Archived Project</card-title>
      </card-header>    
      <card-body class="space-y-8">
        <p>
          This game has been archived, and all deployments have become inactive. 
          If you would like to restore this project and continue development, select restore.
        </p>
        <RestoreGameButton ctx={ctx} game={game}/>
        <DeleteGameButton ctx={ctx} game={game}/>
      </card-body>
    </div>
  )
}

function ArchiveGameButton({ ctx, game }: {
  ctx: RequestContext
  game: Game
}) {
  const route = CTX.route(ctx)
  const organization = CTX.organization(ctx)
  return (
    <div
      x-data="{show: false}"
      hx-post={route("game:settings:archive", organization, game)}
      hx-vals='{"archive": true}'
      hx-trigger="confirm"
      hx-target="#settings"
      style="margin-left: auto;"
    >
      <button class="btn-danger btn-wide" x-on:click="show = true" title="archive">
        <i class="iconoir-archive"/>
        Archive
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Archive Game?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to archive this game? Shared deployments of an archived game cannot be accessed until the game is restored.
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Archive</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </div>
  )
}


function RestoreGameButton({ ctx, game }: {
  ctx: RequestContext
  game: Game
}) {
  const route = CTX.route(ctx)
  const organization = CTX.organization(ctx)
  return (
    <div
      x-data="{show: false}"
      hx-post={route("game:settings:archive", organization, game)}
      hx-vals='{"archive": false}'
      hx-trigger="confirm"
      hx-target="#settings"
      style="margin-left: auto;"
    >
      <button class="btn-primary btn-wide" x-on:click="show = true" title="restore">
        <i class="iconoir-refresh-double"/>
        Restore
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Restore Game?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to restore this game? This will re-enable access to shared deployments.
          </card-body>
          <card-buttons>
            <button class="btn-primary"   x-on:click="$dispatch('confirm')">Restore</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </div>
  )
}

function DeleteGameButton({ ctx, game }: {
  ctx: RequestContext
  game: Game
}) {
  const route = CTX.route(ctx)
  const organization = CTX.organization(ctx)
  return (
    <div
      x-data="{show: false}"
      hx-delete={route("game:settings:delete", organization, game)}
      hx-trigger="confirm"
      style="margin-left: auto;"
    >
      <button class="btn-danger btn-wide" x-on:click="show = true" title="archive">
        <i class="iconoir-trash"/>
        Permanently Delete
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Permanently Delete Game?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to delete this game? This action cannot be undone.
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Delete</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </div>
  )
}

//=================================================================================================
// UPDATE GAME ACTION
//=================================================================================================

async function UpdateGame(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const route = CTX.route(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const form = CTX.form(ctx)
  const name = form.get("name") as string
  const slug = form.get("slug") as string
  const description = form.get("description") as string

  const result = await domain.games.updateGame(game, {
    name: name,
    slug: slug,
    description: description,
  })

  if (result instanceof zod.ZodError) {
    return <EditGameDetailsForm ctx={ctx} org={org} game={game} name={name} slug={slug} description={description} error={result} />
  }

  // do full page redirect because url and header (might) have changed
  return HX.redirect(ctx, route("game:settings", org, result))
}

async function ArchiveGame(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)
  const form = CTX.form(ctx)
  const archive = to.bool(form.get("archive"))
  await domain.games.archiveGame(game, archive)
  return <GameSettings ctx={ctx} org={org} game={game} />
}

async function DeleteGame(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const route = CTX.route(ctx)
  const org = CTX.organization(ctx)
  const game = CTX.game(ctx)

  await domain.games.deleteGame(game)

  // Will get 404 after deletion if we do not redirect
  return HX.redirect(ctx, route("org:games", org))
}

//=============================================================================
// EXPORTS
//=============================================================================

export default {
  Page: SettingsPage,
  Update: UpdateGame,
  Archive: ArchiveGame,
  Delete: DeleteGame,
}
