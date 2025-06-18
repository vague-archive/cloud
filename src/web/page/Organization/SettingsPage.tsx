import { CTX, HX, Layout, RequestContext } from "@web"
import { zod } from "@deps"
import Header from "@web/page/Organization/Header.tsx"
import { Organization } from "@domain"
import { xdata } from "@lib/jsx"

//=============================================================================
// PAGE
//=============================================================================

function SettingsPage(ctx: RequestContext) {
  const org = CTX.organization(ctx)
  const header = <Header ctx={ctx} org={org} />
  return (
    <Layout.Page ctx={ctx} title={org.name} page="org" header={header}>
      <OrgSettings ctx={ctx} org={org} />
    </Layout.Page>
  )
}

//=================================================================================================
// COMPONENTS
//=================================================================================================

function OrgSettings({ ctx, org }: {
  ctx: RequestContext
  org: Organization
}) {
  return (
    <card>
      <card-header>
        <card-title>Settings</card-title>
      </card-header>
      <card-body>
        <EditOrgDetailsForm ctx={ctx} org={org} />
      </card-body>
    </card>
  )
}

function EditOrgDetailsForm({ ctx, org, name, slug, error }: {
  ctx: RequestContext
  org: Organization
  name?: string
  slug?: string
  error?: zod.ZodError
}) {
  const route = CTX.route(ctx)
  const organization = CTX.organization(ctx)

  name = name ?? organization.name
  slug = slug ?? organization.slug

  const form = {
    mode: error ? "edit" : "view",
    name: name,
    oldSlug: slug,
    newSlug: slug,
  }

  const nameErrors = error?.flatten().fieldErrors["name"]

  return (
    <form
      hx-post={route("org:settings:update", organization)}
      hx-disabled-elt="#update-org-submit, #update-org-cancel"
      x-data={xdata(form)}
      class="max-w-128"
    >
      <div x-show="mode === 'view'">
        <field>
          <label>Name:</label>
          <div>{ org.name }</div>
        </field>
        <field>
          <label>Identity:</label>
          <div class="font-bold flex">{ org.slug }</div>
        </field>
        <div class="mt-4">
          <button type="button" class="btn-primary" x-on:click="mode='edit'">edit</button>
        </div>
      </div>
      
      <div x-cloak="true" x-show="mode === 'edit'" x-trap="mode === 'edit'">
        <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-4 mb-4">
          <b>WARNING</b>:
          Changing the name of your organization also changes the identity used in URL's and you will have to update
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
            <span x-text="newSlug"></span>
            <input id="slug" name="slug" x-model="newSlug" type="hidden" />
            <span x-show="newSlug !== oldSlug" class="text-danger pl-4">(CHANGED)</span>
          </div>
        </field>

        <div class="mt-4 flex gap-2 justify-end">
          <button id="update-game-submit" type="button" class="btn-secondary" x-on:click="mode='view'">cancel</button>
          <button id="update-game-cancel" type="submit" class="btn-primary">save</button>
        </div>
      </div>
    </form>
  )
}

//=================================================================================================
// UPDATE ORG ACTION
//=================================================================================================

async function UpdateOrg(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const route = CTX.route(ctx)
  const org = CTX.organization(ctx)
  const form = CTX.form(ctx)
  const name = form.get("name") as string
  const slug = form.get("slug") as string

  const result = await domain.account.updateOrganization(org, {
    name: name,
    slug: slug,
  })

  if (result instanceof zod.ZodError) {
    return <EditOrgDetailsForm ctx={ctx} org={org} name={name} slug={slug} error={result} />
  }

  // do full page redirect because url and header (might) have changed
  return HX.redirect(ctx, route("org:settings", result))
}


//=============================================================================
// EXPORTS
//=============================================================================

export const OrganizationSettings = {
  Page: SettingsPage,
  Update: UpdateOrg,
}
