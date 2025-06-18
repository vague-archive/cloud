import { zod } from "@deps"
import { IdentityProvider, Organization } from "@domain"
import { assert } from "@lib"
import { logger, pp } from "@lib/logger"
import { CTX, HX, Layout, RequestContext, Session } from "@web"

const DEFAULT_TIMEZONE = "America/Los_Angeles"

//-------------------------------------------------------------------------------------------------

async function JoinPage(ctx: RequestContext<"/join/:token">) {
  const domain = CTX.domain(ctx)
  const tokenValue = ctx.params.token
  const invite = await domain.account.getInvite(tokenValue)
  const org = invite?.organizationId && await domain.account.getOrganization(invite.organizationId)
  const user = ctx.state.user

  if (invite && org && user) {
    return <JoinExistingUser ctx={ctx} org={org} tokenValue={tokenValue} />
  } else if (invite && org) {
    return <JoinAnonymous ctx={ctx} org={org} tokenValue={tokenValue} />
  } else {
    return <InviteUnavailable ctx={ctx} />
  }
}

//-------------------------------------------------------------------------------------------------

function JoinAnonymous({ ctx, org, tokenValue }: {
  ctx: RequestContext
  org: Organization
  tokenValue: string
}) {
  const route = CTX.route(ctx)
  const oauth = CTX.oauth(ctx)
  const hasGitHub = oauth.has(IdentityProvider.Github)
  const hasDiscord = oauth.has(IdentityProvider.Discord)
  const githubUrl = route("join:provider", IdentityProvider.Github, tokenValue)
  const discordUrl = route("join:provider", IdentityProvider.Discord, tokenValue)
  return (
    <Layout.Modal ctx={ctx} title="Join Organization">
      <card>
        <card-header>
          <card-title>Join Organization</card-title>
        </card-header>
        <card-body class="p-12 pb-16">
          You have been invited to join the <b>{ org.name }</b> team and make some great games.
        </card-body>
        <card-buttons class="flex flex-col -bottom-18 sm:flex-row sm:-bottom-6">
          {hasGitHub && (
            <button class="btn-secondary" hx-post={githubUrl} hx-vals="js:{timezone: hx.timezone()}">
              <i class="iconoir-github text-24"></i> Sign in with GitHub
            </button>
          )}

          {hasDiscord && (
            <button class="btn-secondary" hx-post={discordUrl} hx-vals="js:{timezone: hx.timezone()}">
              <i class="iconoir-discord text-24"></i> Sign in with Discord
            </button>
          )}
        </card-buttons>
      </card>
    </Layout.Modal>
  )
}

//-------------------------------------------------------------------------------------------------

function JoinExistingUser({ ctx, org, tokenValue }: {
  ctx: RequestContext
  org: Organization
  tokenValue: string
}) {
  const route = CTX.route(ctx)
  return (
    <Layout.Modal ctx={ctx} title="Join Organization">
      <form
        hx-post={route("join:accept", tokenValue)}
      >
        <card>
          <card-header>
            <card-title>Join Organization</card-title>
          </card-header>
          <card-body class="p-12 pb-16">
            You have been invited to join the <b>{ org.name }</b> team and make some great games.
          </card-body>
          <card-buttons>
            <button     class="btn-primary">Join</button>
            <a href="/" class="btn-secondary">Cancel</a>
          </card-buttons>
        </card>
      </form>
    </Layout.Modal>
  )
}

//-------------------------------------------------------------------------------------------------

function InviteUnavailable({ ctx }: {
  ctx: RequestContext
}) {
  return (
    <Layout.Modal ctx={ctx} title="Invite Unavailable">
      <card>
        <card-header>
          <card-title>Invite Unavailable</card-title>
        </card-header>
        <card-body class="p-12 pb-16">
          <p>
            We're sorry, that invitation is no longer available. Please request a new invite
            from your team mates.
          </p>
        </card-body>
      </card>
    </Layout.Modal>
  )
}

//-------------------------------------------------------------------------------------------------

function JoinError({ ctx, error }: {
  ctx: RequestContext
  error: zod.ZodError
}) {
  const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
  return (
    <Layout.Modal ctx={ctx} title="Invite Unavailable">
      <card>
        <card-header>
          <card-title>Invite Unavailable</card-title>
        </card-header>
        <card-body class="p-12 pb-16">
          <p>
            We're sorry, that invitation could not be accepted. Please request a new invite
            from your team mates.
          </p>
          <p class="p-4 mt-4 text-danger bg-danger-50 border-danger">
            { errorMessage }
          </p>
        </card-body>
      </card>
    </Layout.Modal>
  )
}

//=============================================================================
// ACCEPT ACTION
//=============================================================================

async function Accept(ctx: RequestContext<"/join/accept/:token">) {
  const domain = CTX.domain(ctx)
  const route = CTX.route(ctx)
  const tokenValue = ctx.params.token
  const invite = await domain.account.getInvite(tokenValue)
  const org = invite?.organizationId && await domain.account.getOrganization(invite.organizationId)
  const user = ctx.state.user

  if (invite && org && user) {
    await domain.account.acceptInviteForExistingUser(invite, user)
    HX.redirect(ctx, route("org", org))
  } else {
    HX.redirect(ctx, route("join", tokenValue))
  }
}

//=============================================================================
// OAuth HANDLERS
//=============================================================================

async function ProviderSignin(ctx: RequestContext<"/join/:provider/signin/:token">) {
  const route = CTX.route(ctx)
  const oauth = CTX.oauth(ctx)
  const form = CTX.form(ctx)
  const timezone = form.get("timezone") as string
  const tokenValue = ctx.params.token
  const providerName = ctx.params.provider
  const provider = oauth.get(providerName)!
  const redirectUri = route("join:callback", providerName, { full: true })
  const client = oauth.client(provider, redirectUri)
  const session = CTX.session(ctx)
  const { uri, codeVerifier } = await client.code.getAuthorizationUri()
  session.flash("codeVerifier", codeVerifier)
  session.flash("tokenValue", tokenValue)
  session.flash("timezone", timezone ?? DEFAULT_TIMEZONE)
  HX.redirect(ctx, uri)
}

async function ProviderCallback(ctx: RequestContext<"/join/:provider/callback">) {
  const domain = CTX.domain(ctx)
  const session = CTX.session(ctx)
  const kv = CTX.kv(ctx)
  const route = CTX.route(ctx)
  const oauth = CTX.oauth(ctx)
  const redirectUri = route("join:callback", ctx.params.provider, { full: true })
  const provider = oauth.get(ctx.params.provider)
  assert.present(provider)
  const client = oauth.client(provider, redirectUri)

  const codeVerifier = session.get("codeVerifier")
  assert.isString(codeVerifier)

  const { accessToken } = await client.code.getToken(ctx.request.url, { codeVerifier })
  const identity = await provider.identify(accessToken)
  assert.present(identity)

  const tokenValue = session.get("tokenValue")
  const timezone = session.get("timezone")
  assert.isString(tokenValue)
  assert.isString(timezone)
  const invite = await domain.account.getInvite(tokenValue)
  assert.present(invite)
  assert.present(invite.organizationId)
  const org = await domain.account.getOrganization(invite.organizationId)
  assert.present(org)

  let user = await domain.account.getUserByIdentifier(identity.provider, identity.identifier)
  if (user) {
    await domain.account.acceptInviteForExistingUser(invite, user)
  } else {
    const result = await domain.account.acceptInviteForNewUser(invite, {
      provider: identity.provider,
      identifier: identity.identifier,
      username: identity.username,
      name: identity.name,
      timezone: timezone,
      locale: "en-US",
    })
    if (result instanceof zod.ZodError) {
      return <JoinError ctx={ctx} error={result} />
    } else {
      user = result
    }
  }

  logger.info(`USER JOINED ORG ${org.name} (${org.id}) via ${provider.name} ${pp(user)}`)

  ctx.state.session = await Session.create(kv, user)
  ctx.response.redirect(route("org", org))
}

//=============================================================================
// EXPORTS
//=============================================================================

export const Join = {
  Page: JoinPage,
  Accept,
  ProviderSignin,
  ProviderCallback,
}
export default Join
