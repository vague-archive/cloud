import { assert, factory, Test, testRouteGenerator } from "@test"

const ORG_ID = 100
const ORG_SLUG = "my-org"
const USER_ID = 200
const GAME_ID = 300
const GAME_SLUG = "my-game"
const DEPLOY_ID = 400
const DEPLOY_SLUG = "deploy-latest"
const ASSET_ID = 700
const TOKEN_ID = 800
const TOKEN = "random-token-value"

const route = testRouteGenerator()
const user = factory.user.build({ id: USER_ID })
const org = factory.org.build({ id: ORG_ID, slug: ORG_SLUG })
const game = factory.game.build({ id: GAME_ID, slug: GAME_SLUG })
const deploy = factory.deploy.build({ id: DEPLOY_ID, deployedBy: USER_ID, slug: DEPLOY_SLUG })
const token = factory.token.build({ id: TOKEN_ID })

//=================================================================================================
// TEST route generation helpers
//=================================================================================================

Test("misc page route generation", () => {
  assert.equals(route("ping"),      "/ping")
  assert.equals(route("help"),      "/help")
  assert.equals(route("disabled"),  "/disabled")
  assert.equals(route("tools"),     "/editor/tools")
})

//-------------------------------------------------------------------------------------------------

Test("home page route generation", () => {
  assert.equals(route("home"),                                              "/")
  assert.equals(route("home", { query: { origin: "https://google.com" } }), "/?origin=https%3A%2F%2Fgoogle.com")
})

//-------------------------------------------------------------------------------------------------

Test("login route generation", () => {
  assert.equals(route("login"),                                               "/login")
  assert.equals(route("login", { query: { "foo": "42" } }),                   "/login?foo=42")
  assert.equals(route("login", { query: { "origin": "https://google.com" }}), "/login?origin=https%3A%2F%2Fgoogle.com")
  assert.equals(route("login:provider", "github"),                            "/login/github/signin")
  assert.equals(route("login:callback", "github"),                            "/login/github/callback")
  assert.equals(route("login:provider", "discord"),                           "/login/discord/signin")
  assert.equals(route("login:callback", "discord"),                           "/login/discord/callback")
  assert.equals(route("logout"),                                              "/logout")
})

//-------------------------------------------------------------------------------------------------

Test("join route generation", () => {
  assert.equals(route("join",          TOKEN),            `/join/${TOKEN}`)
  assert.equals(route("join:accept",   TOKEN),            `/join/accept/${TOKEN}`)
  assert.equals(route("join:provider", "github", TOKEN),  `/join/github/signin/${TOKEN}`)
  assert.equals(route("join:callback", "github"),         `/join/github/callback`)
  assert.equals(route("join:provider", "discord", TOKEN), `/join/discord/signin/${TOKEN}`)
  assert.equals(route("join:callback", "discord"),        `/join/discord/callback`)

  assert.equals(route("join", "invite-token-value"), "/join/invite-token-value")
  assert.equals(route("join", "invite/token/value"), "/join/invite%2Ftoken%2Fvalue")
})

//-------------------------------------------------------------------------------------------------

Test("download routes", () => {
  assert.equals(route("downloads"),                             `/downloads`)
  assert.equals(route("downloads:release", "editor", ASSET_ID), `/downloads/editor/${ASSET_ID}`)
  assert.equals(route("downloads:release", "jam",    ASSET_ID), `/downloads/jam/${ASSET_ID}`)
})

//-------------------------------------------------------------------------------------------------

Test("profile scoped route generation", () => {
  assert.equals(route("profile"),                     "/profile")
  assert.equals(route("profile:token:generate"),      "/profile/token")
  assert.equals(route("profile:token:revoke", token), `/profile/token/${TOKEN_ID}`)
})

//-------------------------------------------------------------------------------------------------

Test("sysadmin scoped route generation", () => {
  assert.equals(route("sysadmin:dashboard"), `/sysadmin`)
  assert.equals(route("sysadmin:x:email"),   `/sysadmin/experiment/email`)
  assert.equals(route("sysadmin:deploy:cleanup"), `/sysadmin/deploy/cleanup`)
})

//-------------------------------------------------------------------------------------------------

Test("organization scoped route generation", () => {
  assert.equals(route("org",                 org),        `/${ORG_SLUG}`)
  assert.equals(route("org:games",           org),        `/${ORG_SLUG}/games`)
  assert.equals(route("org:games:add",       org),        `/${ORG_SLUG}/games`)
  assert.equals(route("org:tools",           org),        `/${ORG_SLUG}/tools`)
  assert.equals(route("org:tools:add",       org),        `/${ORG_SLUG}/tools`)
  assert.equals(route("org:team",            org),        `/${ORG_SLUG}/team`)
  assert.equals(route("org:team:invite",     org),        `/${ORG_SLUG}/team/invite`)
  assert.equals(route("org:team:retract",    org, token), `/${ORG_SLUG}/team/retract/${TOKEN_ID}`)
  assert.equals(route("org:team:disconnect", org, user),  `/${ORG_SLUG}/team/disconnect/${USER_ID}`)
  assert.equals(route("org:settings",        org),        `/${ORG_SLUG}/settings`)
  assert.equals(route("org:settings:update", org),        `/${ORG_SLUG}/settings/update`)
})

//-------------------------------------------------------------------------------------------------

Test("game scoped route generation", () => {
  assert.equals(route("game",                   org, game),            `/${ORG_SLUG}/${GAME_SLUG}`)
  assert.equals(route("game:share",             org, game),            `/${ORG_SLUG}/${GAME_SLUG}/share`)
  assert.equals(route("game:settings",          org, game),            `/${ORG_SLUG}/${GAME_SLUG}/settings`)
  assert.equals(route("game:settings:update",   org, game),            `/${ORG_SLUG}/${GAME_SLUG}/settings/update`)
  assert.equals(route("game:settings:archive",  org, game),            `/${ORG_SLUG}/${GAME_SLUG}/settings/archive`)
  assert.equals(route("game:settings:delete",            org, game),            `/${ORG_SLUG}/${GAME_SLUG}/settings/delete`)
  assert.equals(route("share:delete",           org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/share/${DEPLOY_SLUG}`)
  assert.equals(route("share:pin",              org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/share/${DEPLOY_SLUG}/pin`)
  assert.equals(route("share:password",         org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/share/${DEPLOY_SLUG}/password`)
  assert.equals(route("preview",                org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/preview/${DEPLOY_SLUG}/`)
  assert.equals(route("preview:password",       org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/preview/${DEPLOY_SLUG}/password`)
  assert.equals(route("preview:password-check", org, game, deploy),    `/${ORG_SLUG}/${GAME_SLUG}/preview/${DEPLOY_SLUG}/password-check`)
})

//-------------------------------------------------------------------------------------------------

Test("API route generation", () => {
  assert.equals(route("api:share", org, game), `/api/${ORG_SLUG}/${GAME_SLUG}/share`)
  assert.equals(route("api:auth:validate"), `/api/auth/validate`)
  assert.equals(route("api:organizations"), `/api/organizations`)
  assert.equals(route("api:download:manifest", "jam"), `/api/download/jam`)
  assert.equals(route("api:download:asset", "jam", 123), `/api/download/jam/123`)
})

//-------------------------------------------------------------------------------------------------

Test("can include query and/or full routing when requested", () => {
  assert.equals(route("ping"),                                        "/ping")
  assert.equals(route("ping", { query: { foo: "bar" }}),              "/ping?foo=bar")
  assert.equals(route("ping", { full: true }),                        "https://void.test/ping")
  assert.equals(route("ping", { full: true, query: { foo: "bar" } }), "https://void.test/ping?foo=bar")

  assert.equals(route("org", org),                                       `/${ORG_SLUG}`)
  assert.equals(route("org", org, { query: { foo: "bar" }}),             `/${ORG_SLUG}?foo=bar`)
  assert.equals(route("org", org, { full: true }),                       `https://void.test/${ORG_SLUG}`)
  assert.equals(route("org", org, { full: true, query: { foo: "bar" }}), `https://void.test/${ORG_SLUG}?foo=bar`)
})

//-------------------------------------------------------------------------------------------------


