import { zod } from "@deps"
import { User, Token } from "@domain"
import { to, i18n } from "@lib"
import { Format } from "@lib/format"
import { NotFoundError } from "@lib/http"
import { xdata } from "@lib/jsx"
import { CTX, Layout, RequestContext } from "@web"
import { Clipboard } from "@web/component"

//=================================================================================================
// PROFILE PAGE
//=================================================================================================

async function ProfilePage(ctx: RequestContext) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const tokens = await domain.account.getAccessTokens(user)
  return (
    <Layout.Page ctx={ctx} title="Profile" page="profile">
      <div class="space-y-8">
        <MyProfileCard ctx={ctx} user={user} />
        <AccessTokenCard ctx={ctx} user={user} tokens={tokens} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// COMPONENTS
//=================================================================================================

function MyProfileCard({ ctx, user }: {
  ctx: RequestContext
  user: User
}) {
  return (
    <card>
      <card-header>
        <card-title>My Profile</card-title>
      </card-header>
      <card-body>
        <MyProfileForm ctx={ctx} user={user} />
      </card-body>
    </card>
  )
}

function MyProfileForm({ ctx, user, name, timezone, locale, error }: {
  ctx: RequestContext
  user: User
  name?: string
  timezone?: string
  locale?: string
  error?: zod.ZodError
}) {
  const route = CTX.route(ctx)
  const form = {
    mode: error ? "edit" : "view",
    name: name ?? user.name,
    timezone: timezone ?? user.timezone,
    locale: locale ?? user.locale,
  }
  const nameErrors = error?.flatten().fieldErrors["name"]
  const timezoneErrors = error?.flatten().fieldErrors["timezone"]
  const localeErrors = error?.flatten().fieldErrors["locale"]
  return (
    <form
      hx-post={route("profile")}
      hx-disabled-elt="#update-profile-submit, #update-profile-cancel"
      x-data={xdata(form)}
      class="max-w-96"
    >

      <div x-show="mode === 'view'">
        <field>
          <label>Full Name:</label>
          <div>{ form.name }</div>
        </field>
        <field>
          <label>Timezone:</label>
          <div>{ form.timezone }</div>
        </field>
        <field>
          <label>Locale:</label>
          <div>{ form.locale }</div>
        </field>
        <div class="mt-4">
          <button type="button" class="btn-primary" x-on:click="mode='edit'">edit</button>
        </div>
      </div>

      <div x-cloak="true" x-show="mode === 'edit'" x-trap="mode === 'edit'">
        <field>
          <label for="name">Full Name:</label>
          <field-input>
            <input id="name" name="name" x-model="name" />
          </field-input>
          {nameErrors && <field-error>{nameErrors}</field-error>}
        </field>

        <field>
          <label for="timezone">Timezone:</label>
          <field-input>
            <select id="timezone" name="timezone" x-model="timezone">
              {i18n.timezones.map((tz) => <option>{tz}</option>)}
            </select>
          </field-input>
          {timezoneErrors && (<field-error>{ timezoneErrors }</field-error>)}
        </field>
        
        <field>
          <label for="locale">Locale:</label>
          <field-input>
            <select id="locale" name="locale" x-model="locale">
              {i18n.locales.map((locale) => <option>{locale}</option>)}
            </select>
          </field-input>
          {localeErrors && (<field-error>{ localeErrors }</field-error>)}
        </field>

        <div class="mt-4 flex gap-2 justify-end">
          <button id="update-profile-submit" type="button" class="btn-secondary" x-on:click="mode='view'">cancel</button>
          <button id="update-profile-cancel" type="submit" class="btn-primary">save</button>
        </div>
      </div>

    </form>
  )
}

//-------------------------------------------------------------------------------------------------

function AccessTokenCard({ ctx, user, tokens, token }: {
  ctx: RequestContext
  user: User
  tokens: Token[]
  token?: Token
}) {
  const format = Format.for(user)
  return (
    <card id="access-token-card">
      <card-header>
        <card-title>Personal Access Tokens</card-title>
      </card-header>
      <card-body>
        {tokens.length === 0 && !token && (
          <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-4 mb-4">
            You don't have any access tokens yet.
          </div>
        )}
        <div class="mt-2">
          {tokens.map((token) => (
            <div class="flex gap-2 p-1 hover:bg-gray-100">
              <div>Created: {format.date(token.createdOn)}</div>
              <div>{format.time(token.createdOn)}</div>
              <div class="flex-1">
                ******{token.tail}
              </div>
              <RevokeAccessTokenButton ctx={ctx} token={token} />
            </div>
          ))}
        </div>
        {token && token.value && (
          <div class="border-2 border-warn-100 bg-warn-50 text-large text-warn-900 p-4 mb-4">
            <p>
              Your generated token is below, copy the value now. It will no longer
              be available once you navigate away from this page.
            </p>
            <div class="flex items-center gap-1">
              <Clipboard content={token.value} />
              <code class="block unstyled p-4">
                { token.value }
              </code>
            </div>
          </div>
        )}
        {!token && (
          <div class="mt-4">
            <GenerateTokenButton ctx={ctx} />
          </div>
        )}
      </card-body>
    </card>
  )
}

function RevokeAccessTokenButton({ ctx, token }: {
  ctx: RequestContext
  token: Token
}) {
  const route = CTX.route(ctx)
  return (
    <span
      x-data="{show: false}"
      hx-delete={route("profile:token:revoke", token)}
      hx-trigger="confirm"
      hx-target="#access-token-card"
    >
      <button x-on:click="show = true" title="revoke access token">
        <i class="iconoir-trash text-24" />
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Revoke Access Token</card-title>
          </card-header>
          <card-body>
            Are you sure you want to revoke this access token? This action cannot be undone.
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Delete</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </span>
  )
}

function GenerateTokenButton({ ctx }: {
  ctx: RequestContext
}) {
  const route = CTX.route(ctx)
  return (
    <button
      class="btn-primary"
      hx-post={route("profile:token:generate")}
      hx-target="#access-token-card"
    >
      generate token
    </button>
  )
}

//=================================================================================================
// UPDATE PROFILE ACTION
//=================================================================================================

async function UpdateProfile(ctx: RequestContext) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const form = CTX.form(ctx)
  const name = form.get("name") as string
  const timezone = form.get("timezone") as string
  const locale = form.get("locale") as string

  const result = await domain.account.updateUser(user, { name, timezone, locale })

  if (result instanceof User) {
    return <MyProfileForm ctx={ctx} user={result} />
  } else {
    return <MyProfileForm ctx={ctx} user={user} name={name} timezone={timezone} locale={locale} error={result} />
  }
}

//=============================================================================
// ACCESS TOKEN ACTIONS
//=============================================================================

async function GenerateAccessToken(ctx: RequestContext<"/profile/token">) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const tokens = await domain.account.getAccessTokens(user)
  const token = await domain.account.generateAccessToken(user)
  return <AccessTokenCard ctx={ctx} user={user} tokens={tokens} token={token} />
}

async function RevokeAccessToken(ctx: RequestContext<"/profile/token/:tokenId">) {
  const user = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const tokenId = to.int(ctx.params.tokenId)
  const tokens = await domain.account.getAccessTokens(user)
  const token = tokens.find((t) => t.id === tokenId)
  if (token) {
    await domain.account.revokeAccessToken(token)
    return <AccessTokenCard ctx={ctx} user={user} tokens={tokens.filter((t) => t.id !== token.id)} />
  } else {
    throw new NotFoundError(ctx.request.url.pathname)
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export default {
  Page: ProfilePage,
  Update: UpdateProfile,
  GenerateAccessToken,
  RevokeAccessToken,
}

//-------------------------------------------------------------------------------------------------
