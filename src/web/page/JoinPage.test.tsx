import { assert, bypass, Fixture, Test, testWebContext } from "@test"
import { IdentityProvider, TokenType, User } from "@domain"
import { to } from "@lib/to"
import { Header, Status } from "@lib/http"
import { OAuthProviders } from "@web/oauth.ts"
import { CTX } from "@web"
import { Join } from "@web/page/JoinPage.tsx"

//=================================================================================================
// JOIN PAGE
//=================================================================================================

Test.domain("Join page - anonymous user", async ({ factory, domain }) => {
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })
  const ctx = testWebContext({
    path: "/join/:token",
    state: { domain },
    params: { token: token.value! },
  })
  const element = await Join.Page(ctx)
  assert.jsx.componentName(element, "JoinAnonymous")
})

//-------------------------------------------------------------------------------------------------

Test.domain("Join page - logged in user", async ({ factory, domain }) => {
  const user = await factory.user.create()
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })
  const ctx = testWebContext({
    user,
    path: "/join/:token",
    state: { domain },
    params: { token: token.value! },
  })
  const element = await Join.Page(ctx)
  assert.jsx.componentName(element, "JoinExistingUser")
})

//-------------------------------------------------------------------------------------------------

Test.domain("Join page - invalid token", async ({ domain }) => {
  const ctx = testWebContext({
    path: "/join/:token",
    state: { domain },
    params: { token: Fixture.UnknownToken },
  })
  const element = await Join.Page(ctx)
  assert.jsx.componentName(element, "InviteUnavailable")
})

//=================================================================================================
// ACCEPT ACTION
//=================================================================================================

Test.domain("Accept invite - existing user is already logged in", async ({ factory, domain }) => {
  const user = await factory.user.load("active")
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email })

  await domain.account.withOrganizations(user)
  assert.equals(user.belongsTo(org), false, "preconditions")

  const ctx = testWebContext({
    user,
    path: "/join/accept/:token",
    state: { domain },
    params: { token: token.value! },
    hx: true,
  })

  await Join.Accept(ctx)
  assert.response.hx.redirect(ctx.response, "/test-org")

  await domain.account.withOrganizations(user)
  assert.equals(user.belongsTo(org), true)
})

//-------------------------------------------------------------------------------------------------

Test.domain.web("Accept invite - existing user is already logged in but invite is no longer valid", async ({ factory, domain, route }) => {
  const user = await factory.user.load("active")
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email, isSpent: true })
  assert.equals(token.isSpent, true, "preconditions")
  const ctx = testWebContext({
    user,
    path: "/join/accept/:token",
    state: { domain },
    params: { token: token.value! },
    hx: true,
  })
  await Join.Accept(ctx)
  assert.response.hx.redirect(ctx.response, route("join", token.value))
})

//-------------------------------------------------------------------------------------------------

Test.domain.web("Accept invite - user is not logged in", async ({ factory, domain, route }) => {
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })
  const ctx = testWebContext({
    path: "/join/accept/:token",
    state: { domain },
    params: { token: token.value! },
    hx: true,
  })
  await Join.Accept(ctx)
  assert.response.hx.redirect(ctx.response, route("join", token.value))
})

//=================================================================================================
// OAuth HANDLERS
//=================================================================================================

const CLIENT_ID = "client-id"
const CLIENT_SECRET = "client-secret"
const oauth = new OAuthProviders({
  github: {
    clientId:     CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  }
})

//-------------------------------------------------------------------------------------------------

Test.domain("ProviderSignin", async ({ factory, domain }) => {
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })
  const form = new FormData()
  form.set("timezone", Fixture.Timezone.Mountain)

  const ctx = testWebContext({
    path: "/join/:provider/signin/:token",
    state: { domain, oauth, form },
    params: { provider: "github", token: token.value! },
    hx: true,
  })

  await Join.ProviderSignin(ctx)

  const session = CTX.session(ctx)
  const codeVerifier = session.get("codeVerifier") as string
  const tokenValue = session.get("tokenValue") as string
  const timezone = session.get("timezone") as string

  assert.present(codeVerifier)
  assert.equals(tokenValue, token.value!)
  assert.equals(timezone, Fixture.Timezone.Mountain)
  assert.equals(ctx.response.status, Status.OK)

  const location = new URL(ctx.response.headers.get(Header.HxRedirect)!)

  assert.equals(location.host, "github.com")
  assert.equals(location.pathname, "/login/oauth/authorize")
  assert.equals(location.searchParams.get("response_type"), "code")
  assert.equals(location.searchParams.get("client_id"), CLIENT_ID)
  assert.equals(location.searchParams.get("redirect_uri"), "https://void.test/join/github/callback")
  assert.equals(location.searchParams.get("code_challenge_method"), "S256")
  assert.present(location.searchParams.get("code_challenge"))
})

//-------------------------------------------------------------------------------------------------

Test.domain("ProviderCallback - accept invite for EXISTING USER", async ({ factory, domain }) => {
  const identity = await factory.identity.load("jake")
  const user = await factory.user.load("jake")
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email })

  const ctx = testWebContext({
    path: "/join/:provider/callback",
    state: { domain, oauth },
    params: { provider: "github" },
    hx: true,
  })
  ctx.request.url.searchParams.set("code", "a-code")

  const server = bypass.server(
    bypass.handler.post("https://github.com/login/oauth/access_token", () =>
      bypass.json({
        access_token: "an-access-token",
        token_type: "bearer",
      })),
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: identity.username,
        id: to.int(identity.identifier),
        name: user.name,
        email: user.email,
      })),
  )
  server.listen()

  const session = CTX.session(ctx)
  session.set("codeVerifier", "abcdefg")
  session.set("tokenValue", token.value!)
  session.set("timezone", Fixture.Timezone.Mountain)

  await Join.ProviderCallback(ctx)

  assert.response.found(ctx.response, "/test-org")

  await domain.account.withOrganizations(user)
  assert.present(user.organizations)
  assert.equals(user.organizations.map((o) => o.name), [
    "Atari",
    "Nintendo",
    "Test Org", // <---- joined new org
    "Void",
  ])

  assert.present(ctx.state.session)
  assert.equals(ctx.state.session.userId, user.id)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.domain("ProviderCallback - accept invite for NEW USER", async ({ factory, domain, clock }) => {
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })

  const ctx = testWebContext({
    path: "/join/:provider/callback",
    state: { domain, oauth },
    params: { provider: "github" },
    hx: true,
  })
  ctx.request.url.searchParams.set("code", "a-code")

  const server = bypass.server(
    bypass.handler.post("https://github.com/login/oauth/access_token", () =>
      bypass.json({
        access_token: "an-access-token",
        token_type: "bearer",
      })),
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: "johndoe",
        id: 123,
        name: "Full Name",
      })),
  )
  server.listen()

  const session = CTX.session(ctx)
  session.set("codeVerifier", "abcdefg")
  session.set("tokenValue", token.value!)
  session.set("timezone", Fixture.Timezone.Mountain)

  await Join.ProviderCallback(ctx)

  assert.response.found(ctx.response, "/test-org")

  const user = await domain.account.getUserByIdentifier(IdentityProvider.Github, "123")
  assert.present(user)
  assert.instanceOf(user, User)
  assert.equals(user.identity.provider, IdentityProvider.Github)
  assert.equals(user.identity.identifier, "123")
  assert.equals(user.identity.username, "johndoe")
  assert.equals(user.name, "Full Name")
  assert.equals(user.email, token.sentTo)
  assert.equals(user.disabled, false)
  assert.equals(user.sysadmin, false)
  assert.equals(user.timezone, Fixture.Timezone.Mountain)
  assert.equals(user.createdOn, clock.now)
  assert.equals(user.updatedOn, clock.now)
  assert.equals(user.organizations, undefined)

  await domain.account.withOrganizations(user)
  assert.present(user.organizations)
  assert.equals(user.organizations.length, 1)
  assert.equals(user.organizations.map((o) => o.name), ["Test Org"])

  assert.present(ctx.state.session)
  assert.equals(ctx.state.session.userId, user.id)

  server.close()
})

//-------------------------------------------------------------------------------------------------
