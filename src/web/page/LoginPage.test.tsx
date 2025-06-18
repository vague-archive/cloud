import { assert, bypass, Factory, Test, testWebContext } from "@test"
import { Header, Status } from "@lib/http"
import { OAuthProviders } from "@web/oauth.ts"
import { CTX } from "@web"
import { Session } from "@web/middleware/session.ts"
import Login from "@web/page/LoginPage.tsx"
import { config } from "@config"
import { TokenType } from "@domain"
import { to } from "@lib/to"
import { crc32 } from "@deps"
import LoginPage from "@web/page/LoginPage.tsx"

//=================================================================================================
// LOGIN PAGE
//=================================================================================================

Test.domain("Login page - anonymous user", async ({ domain }) => {
  const ctx = testWebContext({
    path: "/login",
    state: { domain, oauth },
  })
  const element = await Login.Page(ctx)
  assert.present(element)
  assert.jsx.componentName(element, "EmptyLayout")
  assert.equals(element.props.title, "Home Page")
})

//-------------------------------------------------------------------------------------------------


Test.domain("Login page - logged in user", async ({ factory, domain }) => {
  const user = await createUserWithIdentity(factory)
  const session = Session.build(user)
  const testOrigin = "http://example.com"
  const ctx = testWebContext({
    path: "/login",
    queryParams: {
      "origin": testOrigin
    },
    state: { domain, oauth, user, session },
  })

  await Login.Page(ctx)

  assert.response.found(ctx.response, testOrigin)
  assert.match(ctx.response.headers.getSetCookie()[0], config.web.identityCookie.name)
  // No JWT returned
  const location = new URL(ctx.response.headers.get(Header.Location)!)
  assert.absent(location.searchParams.get("jwt"))
})

//-------------------------------------------------------------------------------------------------

Test.domain("Login page - from CLI", async ({ factory, domain }) => {
  const user = await createUserWithIdentity(factory)
  const session = Session.build(user)
  const ctx = testWebContext({
    path: "/login",
    state: { domain, oauth, user, session },
    queryParams: { cli: "true" }
  })

  await Login.Page(ctx)

  // No identity cookie
  assert.notMatch(ctx.response.headers.getSetCookie()[0], config.web.identityCookie.name)
  const location = new URL(ctx.response.headers.get(Header.Location)!)
  assert.present(location.searchParams.get("jwt"))
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

Test.domain("ProviderSignin", async ({ domain }) => {
  const ctx = testWebContext({
    path: "/login/:provider/signin",
    state: { domain, oauth },
    params: { provider: "github" },
    hx: true,
  })

  await Login.ProviderSignin(ctx)

  const session = CTX.session(ctx)
  const codeVerifier = session.get("codeVerifier") as string
  assert.present(codeVerifier)
  assert.equals(ctx.response.status, Status.OK)

  const location = new URL(ctx.response.headers.get(Header.HxRedirect)!)
  assert.equals(location.host, "github.com")
  assert.equals(location.pathname, "/login/oauth/authorize")
  assert.equals(location.searchParams.get("response_type"), "code")
  assert.equals(location.searchParams.get("client_id"), CLIENT_ID)
  assert.equals(location.searchParams.get("redirect_uri"), `${ctx.request.url.origin}/login/github/callback`)
  assert.equals(location.searchParams.get("code_challenge_method"), "S256")
  assert.present(location.searchParams.get("code_challenge"))
})

//-------------------------------------------------------------------------------------------------

Test.domain("ProviderCallback", async ({ factory, domain }) => {
  const identity = await factory.identity.load("jake")
  const user = await factory.user.load("jake")
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Access, organizationId: org.id })
  const testOrigin = "http://example.com"

  const ctx = testWebContext({
    path: "/login/:provider/callback",
    state: { domain, oauth },
    params: { provider: "github" },
  })
  ctx.request.url.searchParams.set("code", "a-code")

  const session = CTX.session(ctx)
  session.set("origin", testOrigin)

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

  session.set("codeVerifier", "abcdefg")
  session.set("tokenValue", token.value!)

  await Login.ProviderCallback(ctx)

  assert.response.found(ctx.response, testOrigin)
  assert.present(ctx.state.session)
  assert.equals(ctx.state.session.userId, user.id)
  // New session
  assert.notEquals(session.sid, ctx.state.session.sid)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.domain.web("ProviderCallback - SSO login not invited", async ({ factory, domain, route }) => {
  const user = await factory.user.create()
  const identity = await factory.identity.create({ userId: user.id })
  const org = await factory.org.create({ name: "Test Org", slug: "test-org" })
  const token = await factory.token.create({ type: TokenType.Access, organizationId: org.id })
  const testOrigin = "http://example.com"

  const ctx = testWebContext({
    path: "/login/:provider/callback",
    state: { domain, oauth },
    params: { provider: "github" },
  })
  ctx.request.url.searchParams.set("code", "a-code")

  const session = CTX.session(ctx)
  session.set("origin", testOrigin)
  session.set("cli", true)

  const server = bypass.server(
    bypass.handler.post("https://github.com/login/oauth/access_token", () =>
      bypass.json({
        access_token: "an-access-token",
        token_type: "bearer",
      })),
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: identity.username,
        id: parseInt(crc32(identity.identifier), 16), // Needs to be valid integer - default nanoid can't always be converted by to.int
        name: user.name,
        email: user.email,
      })),
  )
  server.listen()

  session.set("codeVerifier", "abcdefg")
  session.set("tokenValue", token.value!)

  await Login.ProviderCallback(ctx)

  assert.response.found(ctx.response, route("login"))
  assert.match(ctx.response.headers.get(Header.Location)!, "not-invited")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.domain.web("Logout", async ({ domain, route }) => {
  const ctx = testWebContext({
    path: "/logout",
    state: { domain },
  })
  const session = CTX.session(ctx)

  await LoginPage.Logout(ctx)

  assert.response.found(ctx.response, route("login"))
  const newSession = CTX.session(ctx)
  assert.notEquals(session.sid, newSession.sid)
  // Identity cookie set to empty string
  assert.match(ctx.response.headers.getSetCookie()[0], `${config.web.identityCookie.name}=;`)
})

//=================================================================================================
// TEST HELPER METHODS
//=================================================================================================

async function createUserWithIdentity(factory: Factory) {
  const user = await factory.user.create()
  const identity = await factory.identity.create({ userId: user.id })
  user.identities = [identity]
  return user;
}

//-------------------------------------------------------------------------------------------------

