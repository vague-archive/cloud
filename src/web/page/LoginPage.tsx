import { config } from "@config"
import { assert, crypto } from "@lib"
import { logger, pp } from "@lib/logger"
import { NotFoundError, tld } from "@lib/http"
import { IdentityProvider, User } from "@domain"
import { CTX, HX, Layout, RequestContext, Session } from "@web"
import { OAuthProvider } from "@web/oauth.ts"

//-------------------------------------------------------------------------------------------------

const NOT_INVITED = "not-invited"
const ORIGIN = "origin"
const CLI = "cli"
const JWT = "jwt"

//=================================================================================================
// LOGIN PAGE
//=================================================================================================

async function LoginPage(ctx: RequestContext<"/login">) {
  if (ctx.state.user) {
    return await LoginRedirect(ctx, ctx.state.user) // if already logged in, redirect to the default URL (respecting ORIGIN, and CLI)
  }

  const oauth = CTX.oauth(ctx)
  const hasGitHub = oauth.has(IdentityProvider.Github)
  const hasDiscord = oauth.has(IdentityProvider.Discord)
  const noProviders = !hasGitHub && !hasDiscord

  const session = CTX.session(ctx)
  const route = CTX.route(ctx)
  const githubUrl = route("login:provider", IdentityProvider.Github)
  const discordUrl = route("login:provider", IdentityProvider.Discord)
  const notInvited = ctx.request.url.searchParams.get(NOT_INVITED) as string
  const origin = ctx.request.url.searchParams.get(ORIGIN)
  const cli = ctx.request.url.searchParams.has(CLI)

  session.set(ORIGIN, origin)
  session.set(CLI, cli)

  return (
    <Layout.Empty ctx={ctx} title="Home Page">
      <div class="h-full flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          {hasGitHub && (
            <button class="btn-secondary" hx-post={githubUrl}>
              <i class="iconoir-github text-24"></i> Sign in with GitHub
            </button>
          )}

          {hasDiscord && (
            <button class="btn-secondary" hx-post={discordUrl}>
              <i class="iconoir-discord text-24"></i> Sign in with Discord
            </button>
          )}

          {noProviders && (
            <div class="p-8">
              <h3>No Login Providers Enabled</h3>
              <p>
                If this is a development
                server do you have your <code>GITHUB_***</code> or <code>DISCORD_***</code> environment
                variables configured correctly?
              </p>
            </div>
          )}

          {notInvited && (
            <div class="p-8">
              <h3>
                We're sorry, but our application is invite-only at this time
                and <b>{notInvited}</b> has not (yet) been invited.
              </h3>
            </div>
          )}
        </div>
      </div>
    </Layout.Empty>
  )
}

async function LoginRedirect(ctx: RequestContext, user: User) {
  const session = CTX.session(ctx)
  const route = CTX.route(ctx)
  const queryOrigin = ctx.request.url.searchParams.get(ORIGIN)
  const sessionOrigin = session.get(ORIGIN) as string
  const origin = new URL(queryOrigin || sessionOrigin || route("home"), ctx.request.url)
  const cli = ctx.request.url.searchParams.has(CLI) || session.get(CLI)

  const { claims, jwt } = await generateIdentityToken(user)

  if (cli) {
    origin.searchParams.set(JWT, jwt)
    logger.info(`COMMAND LINE LOGIN ${pp(claims)}`)
  } else {
    await createIdentityCookie(ctx, jwt)
    logger.info(`IDENTITY COOKIE CREATED FOR ${pp(claims)}`)
  }

  session.clear(ORIGIN)
  session.clear(CLI)
  ctx.response.redirect(origin)
}

//=============================================================================
// OAuth HANDLERS
//=============================================================================

function redirectUri(ctx: RequestContext, provider: OAuthProvider) {
  const route = CTX.route(ctx)
  return new URL(route("login:callback", provider.name), ctx.request.url)
}

//-----------------------------------------------------------------------------

async function ProviderSignin(ctx: RequestContext<"/login/:provider/signin">) {
  const oauth = CTX.oauth(ctx)
  const provider = oauth.get(ctx.params.provider)
  assert.present(provider)
  const client = oauth.client(provider, redirectUri(ctx, provider))
  const session = CTX.session(ctx)
  const { uri, codeVerifier } = await client.code.getAuthorizationUri()
  session.flash("codeVerifier", codeVerifier)
  HX.redirect(ctx, uri)
}

//-----------------------------------------------------------------------------

async function ProviderCallback(ctx: RequestContext<"/login/:provider/callback">) {
  const oauth = CTX.oauth(ctx)
  const provider = oauth.get(ctx.params.provider)
  assert.present(provider)
  const client = oauth.client(provider, redirectUri(ctx, provider))

  const domain = CTX.domain(ctx)
  const session = CTX.session(ctx)
  const route = CTX.route(ctx)
  const kv = CTX.kv(ctx)

  const codeVerifier = session.get("codeVerifier")
  const origin = session.get(ORIGIN)
  const cli = session.get(CLI)

  assert.isString(codeVerifier)

  const { accessToken } = await client.code.getToken(ctx.request.url, { codeVerifier })
  const identity = await provider.identify(accessToken)
  if (!identity) {
    throw new NotFoundError(ctx.request.url.pathname)
  }

  const user = await domain.account.getUserByIdentifier(identity.provider, identity.identifier)
  if (!user) {
    logger.warn(`SSO LOGIN NOT INVITED ${pp(identity)}`)
    const label = `@${identity.username} (via ${identity.provider})`
    return ctx.response.redirect(route("login", { query: { [NOT_INVITED]: label } }))
  }

  logger.info(`USER LOGIN via ${provider.name} ${pp(user)}`)

  await domain.account.withAuthorizationContext(user)

  ctx.state.session = await Session.create(kv, user)
  ctx.state.session.set(ORIGIN, origin) // preserve origin across session reset
  ctx.state.session.set(CLI, cli) // preserve cli across session reset

  await LoginRedirect(ctx, user)
}

//-----------------------------------------------------------------------------

async function Logout(ctx: RequestContext<"/logout">) {
  const route = CTX.route(ctx)
  const session = CTX.session(ctx)
  const kv = CTX.kv(ctx)
  await Session.destroy(kv, session)
  await removeIdentityCookie(ctx)
  ctx.state.session = await Session.create(kv)
  ctx.response.redirect(route("login"))
}

//=============================================================================
// SHARED TLD IDENTITY COOKIE
//=============================================================================

async function generateIdentityToken(user: User) {
  assert.present(user.identity);
  const claims = {
    "sub": user.id.toString(),
    "provider": user.identity.provider,
    "identifier": user.identity.identifier,
    "username": user.identity.username,
    "name": user.name,
    "email": user.email,
    "disabled": user.disabled,
    "sysadmin": user.sysadmin,
    "timezone": user.timezone,
    "organizations": user.organizations?.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
    })),
  }
  const jwt = await crypto.createJWT(claims, config.keys.signingKey)
  return { claims, jwt }
}

async function createIdentityCookie(ctx: RequestContext, jwt: string) {
  const config = CTX.config(ctx)
  await ctx.cookies.set(config.web.identityCookie.name, jwt, {
    ...config.web.identityCookie.options,
    domain: tld(ctx.request.url),
  })
}

async function removeIdentityCookie(ctx: RequestContext) {
  const config = CTX.config(ctx)
  await ctx.cookies.delete(config.web.identityCookie.name, {
    domain: tld(ctx.request.url),
  })
}

//-----------------------------------------------------------------------------

export default {
  Page: LoginPage,
  ProviderSignin,
  ProviderCallback,
  Logout,
}

//-----------------------------------------------------------------------------
