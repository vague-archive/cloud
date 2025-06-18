import { oak } from "@deps"
import { assert } from "@lib"
import { render } from "@lib/jsx"
import { ContentType, forwardHeaders, Header } from "@lib/http"
import { urlSearchParams } from "@lib/params"
import { rid, rtoken, RouteArgument, RouteGenerator, RouteGeneratorOptions, isRouteGeneratorOptions } from "@lib/route"
import { LoadGame, LoadOrganization } from "@web/middleware/loader.ts"
import { RequestBodyParser } from "@web/middleware/body.ts"
import { Session } from "@web/middleware/session.ts"
import { Authenticate } from "@web/middleware/authenticate.ts"
import { oakCors } from "@deps"

import {
  HotModuleReloader,
  isHttpResponse,
  isJsxResponse,
  Middleware,
  RequestContext,
  RequestHandler,
  RequestState,
} from "@web"

import { Api } from "@web/api.ts"

import Ping from "@web/action/ping.ts"

import Login from "@web/page/LoginPage.tsx"
import Join from "@web/page/JoinPage.tsx"
import Home from "@web/page/HomePage.tsx"
import Help from "@web/page/HelpPage.tsx"
import Downloads from "@web/page/DownloadsPage.tsx"
import Tools from "@web/page/ToolsPage.tsx"
import Profile from "@web/page/ProfilePage.tsx"
import Disabled from "@web/page/DisabledPage.tsx"
import Organization from "@web/page/OrganizationPage.tsx"
import GamePage from "@web/page/GamePage.tsx"
import Share from "@web/page/Game/SharePage.tsx"
import SettingsPage from "@web/page/Game/SettingsPage.tsx"
import { SysAdmin } from "@web/page/SysAdminPage.tsx"
import { Preview } from "@web/page/Game/Share/PreviewPage.tsx"

type Router = oak.Router<RequestState>
const newRouter = <S extends RequestState = RequestState>() => new oak.Router<S>()

//=================================================================================================
// MIDDLEWARE PIPELINES
//=================================================================================================

const API = [
  Authenticate.ViaToken,
  oakCors(), // For now, default oakCors configuration is sufficient (https://deno.land/x/cors@v1.2.2#configuration-options)
  LoadOrganization as Middleware,
  LoadGame as Middleware,
] as const

const WEB = [
  RequestBodyParser(),
  Session.middleware(),
  Authenticate.ViaSession,
  LoadOrganization as Middleware,
  LoadGame as Middleware,
] as const

const NONE = [] as const

//=================================================================================================
// BUILD AND CONFIGURE TOP LEVEL ROUTER
//=================================================================================================

function buildRouter(publicUrl: string | URL, hmr?: HotModuleReloader) {
  const router = newRouter()

  if (hmr) {
    router.get("/hmr", (ctx) => hmr.connect(ctx))
  }

  router.add("GET", "/design-system", (ctx) => ctx.response.redirect("https://design-system.void.dev/"))

  router.add("POST",    "api:share",                "/api/:org/:game/share/:label?",             ...API,  handle(Api.Share))
  router.add("POST",    "api:auth:validate",        "/api/auth/validate",                        ...API,  handle(Api.Validate))
  router.add("GET",     "api:organizations",        "/api/organizations",                        ...API,  handle(Api.GetUserOrganizations))
  router.add("GET",     "api:download:manifest",    "/api/download/:repo",                       ...API,  handle(Api.Download.Manifest))
  router.add("GET",     "api:download:asset",       "/api/download/:repo/:assetId",              ...API,  handle(Api.Download.Asset))

  router.add("GET",    "home",                     "/",                                         ...WEB,  handle(Home.RedirectToDefault))
  router.add("GET",    "help",                     "/help",                                     ...WEB,  handle(Help.Page))
  router.add("GET",    "ping",                     "/ping",                                     ...WEB,  handle(Ping))
  router.add("GET",    "login",                    "/login",                                    ...WEB,  handle(Login.Page))
  router.add("POST",   "login:provider",           "/login/:provider/signin",                   ...WEB,  handle(Login.ProviderSignin))
  router.add("GET",    "login:callback",           "/login/:provider/callback",                 ...WEB,  handle(Login.ProviderCallback))
  router.add("POST",   "logout",                   "/logout",                                   ...WEB,  handle(Login.Logout))
  router.add("GET",    "join",                     "/join/:token",                              ...WEB,  handle(Join.Page))
  router.add("POST",   "join:accept",              "/join/accept/:token",                       ...WEB,  handle(Join.Accept))
  router.add("POST",   "join:provider",            "/join/:provider/signin/:token",             ...WEB,  handle(Join.ProviderSignin))
  router.add("GET",    "join:callback",            "/join/:provider/callback",                  ...WEB,  handle(Join.ProviderCallback))
  router.add("GET",    "disabled",                 "/disabled",                                 ...WEB,  handle(Disabled.Page))
  router.add("GET",    "profile",                  "/profile",                                  ...WEB,  handle(Profile.Page))
  router.add("POST",   "profile:token:generate",   "/profile/token",                            ...WEB,  handle(Profile.GenerateAccessToken))
  router.add("DELETE", "profile:token:revoke",     "/profile/token/:tokenId",                   ...WEB,  handle(Profile.RevokeAccessToken))
  router.add("POST",                               "/profile",                                  ...WEB,  handle(Profile.Update))
  router.add("GET",    "downloads",                "/downloads",                                ...WEB,  handle(Downloads.Page))
  router.add("GET",    "downloads:release",        "/downloads/:repo/:assetId",                 ...WEB,  handle(Downloads.Release))
  router.add("GET",    "tools",                    "/editor/tools",                             ...WEB,  handle(Tools.Page))

  router.add("GET",    "sysadmin:dashboard",       "/sysadmin",                                 ...WEB,  handle(SysAdmin.Dashboard))
  router.add("POST",   "sysadmin:x:email",         "/sysadmin/experiment/email",                ...WEB,  handle(SysAdmin.Experiment.Email))
  router.add("DELETE", "sysadmin:deploy:cleanup",  "/sysadmin/deploy/cleanup",                  ...WEB,  handle(SysAdmin.Management.CleanupDeploys))
  router.add("GET",    "sysadmin:files:diff",      "/sysadmin/files/diff",                      ...WEB,  handle(SysAdmin.Files.Diff))
  router.add("POST",   "sysadmin:files:diff:fix",  "/sysadmin/files/diff/fix",                  ...WEB,  handle(SysAdmin.Files.DiffFix))

  // (ARBITRARY) ORG/GAME SCOPED ROUTES MUST GO AT THE END

  router.add("GET",    "org",                      "/:org",                                      ...WEB,  handle(Organization.Page))
  router.add("GET",    "org:games",                "/:org/games",                                ...WEB,  handle(Organization.Games.Page))
  router.add("POST",   "org:games:add",            "/:org/games",                                ...WEB,  handle(Organization.Games.Add))
  router.add("GET",    "org:tools",                "/:org/tools",                                ...WEB,  handle(Organization.Tools.Page))
  router.add("POST",   "org:tools:add",            "/:org/tools",                                ...WEB,  handle(Organization.Tools.Add))
  router.add("GET",    "org:team",                 "/:org/team",                                 ...WEB,  handle(Organization.Team.Page))
  router.add("POST",   "org:team:invite",          "/:org/team/invite",                          ...WEB,  handle(Organization.Team.Invite))
  router.add("DELETE", "org:team:retract",         "/:org/team/retract/:tokenId",                ...WEB,  handle(Organization.Team.Retract))
  router.add("DELETE", "org:team:disconnect",      "/:org/team/disconnect/:userId",              ...WEB,  handle(Organization.Team.Disconnect))
  router.add("GET",    "org:settings",             "/:org/settings",                             ...WEB,  handle(Organization.Settings.Page))
  router.add("POST",   "org:settings:update",      "/:org/settings/update",                      ...WEB,  handle(Organization.Settings.Update))
  router.add("GET",    "game",                     "/:org/:game",                                ...WEB,  handle(GamePage))
  router.add("GET",    "game:share",               "/:org/:game/share",                          ...WEB,  handle(Share.Page))
  router.add("GET",    "game:settings",            "/:org/:game/settings",                       ...WEB,  handle(SettingsPage.Page)),
  router.add("POST",   "game:settings:update",     "/:org/:game/settings/update",                ...WEB,  handle(SettingsPage.Update)),
  router.add("POST",   "game:settings:archive",    "/:org/:game/settings/archive",               ...WEB,  handle(SettingsPage.Archive)),
  router.add("DELETE", "game:settings:delete",     "/:org/:game/settings/delete",                ...WEB,  handle(SettingsPage.Delete)),
  router.add("DELETE", "share:delete",             "/:org/:game/share/:deploy",                  ...WEB,  handle(Share.DeleteDeploy))
  router.add("POST",   "share:pin",                "/:org/:game/share/:deploy/pin",              ...WEB,  handle(Share.PinDeploy))
  router.add("POST",   "share:password",           "/:org/:game/share/:deploy/password",         ...WEB,  handle(Share.SetDeployPassword))
  router.add("GET",    "preview",                  "/:org/:game/preview/:deploy/",               ...WEB,  handle(Preview.GameServer))
  router.add("POST",   "preview:password",         "/:org/:game/preview/:deploy/password",       ...WEB,  handle(Preview.SubmitPassword))
  router.add("GET",    "preview:password-check",   "/:org/:game/preview/:deploy/password-check", ...WEB,  handle(Preview.PasswordCheck))
  router.add("GET",                                "/:org/:game/preview/:deploy/:asset*",        ...NONE, handle(Preview.AssetServer))

  const route = buildRouteGenerator(publicUrl, router)

  return { router, route }
}

//=================================================================================================
// ROUTE GENERATOR
//=================================================================================================

function buildRouteGenerator(publicUrl: string | URL, router: Router): RouteGenerator {
  const url = (name: string, params?: Record<string, string>, opts?: RouteGeneratorOptions) => {
    const query = opts?.query ? urlSearchParams(opts?.query)?.toString() : undefined
    let value: string | undefined
    if (params && query) {
      value = router.url(name, params, { query })
    } else if (params) {
      value = router.url(name, params)
    } else if (query) {
      value = router.url(name, { query })
    } else {
      value = router.url(name)
    }
    assert.present(value)
    if (opts?.full) {
      return new URL(value, publicUrl).toString()
    } else {
      return value
    }
  }

  // TODO: should be able to reflect on router.entries() and do this automatically, but
  // unfortunately router .entries() doesn't include the route names!!! (a bug), so for now
  // we have to build this manually...

  const route = (name: string, ...args: RouteArgument[]) => {
    const lastArg = args.at(-1)
    const opts = isRouteGeneratorOptions(lastArg) ? args.pop() as RouteGeneratorOptions : {}
    switch (name) {
      case "login":
      case "logout":
        return url(name, undefined, opts)
      case "login:provider":
      case "login:callback":
        return url(name, { provider: rid(args[0]) }, opts)

      case "sysadmin:dashboard":
      case "sysadmin:x:email":
      case "sysadmin:deploy:cleanup":
        return url(name, undefined, opts)

      case "org":
      case "org:games":
      case "org:games:add":
      case "org:tools":
      case "org:tools:add":
      case "org:team":
      case "org:team:invite":
      case "org:settings":
      case "org:settings:update":
        return url(name, { org: rid(args[0]) }, opts)

      case "org:team:retract":
        return url(name, { org: rid(args[0]), tokenId: rid(args[1]) }, opts)

      case "org:team:disconnect":
        return url(name, { org: rid(args[0]), userId: rid(args[1]) }, opts)

      case "game":
      case "game:share":
      case "game:settings":
      case "game:settings:update":
      case "game:settings:archive":
      case "game:settings:delete":
        return url(name, { org: rid(args[0]), game: rid(args[1]) }, opts)

      case "share:pin":
      case "share:delete":
      case "share:password":
        return url(name, { org: rid(args[0]), game: rid(args[1]), deploy: rid(args[2]) }, opts)

      case "preview":
      case "preview:password":
      case "preview:password-check":
        return url(name, { org: rid(args[0]), game: rid(args[1]), deploy: rid(args[2]) }, opts)

      case "editor:releases:list":
        return url(name, undefined, opts)
      case "editor:releases:download":
        return url(name, { repo: rid(args[0]), assetId: rid(args[1]) }, opts)

      case "profile":
      case "profile:token:generate":
        return url(name, undefined, opts)
      case "profile:token:revoke":
        return url(name, { tokenId: rid(args[0]) }, opts)

      case "downloads":
        return url(name, undefined, opts)

      case "downloads:release":
        return url(name, { repo: rid(args[0]), assetId: rid(args[1])}, opts)

      case "ping":
      case "home":
      case "help":
      case "disabled":
      case "tools":
        return url(name, undefined, opts)

      case "join":
      case "join:accept":
        return url(name, { token: rtoken(args[0]) }, opts)
      case "join:provider":
        return url(name, { provider: rid(args[0]), token: rtoken(args[1])}, opts)
      case "join:callback":
        return url(name, { provider: rid(args[0]) }, opts)

      case "api:share":
        return url(name, { org: rid(args[0]), game: rid(args[1]) }, opts)
      case "api:auth:validate":
        return url(name, undefined, opts)
      case "api:organizations":
        return url(name, undefined, opts)
      case "api:download:manifest":
        return url(name, { repo: rid(args[0]) }, opts)
      case "api:download:asset":
        return url(name, { repo: rid(args[0]), assetId: rid(args[1]) }, opts)

      default:
        throw new Error(`unknown route: ${name}`)
    }
  }

  return route
}

//=================================================================================================
// HANDLER WRAPPER
//=================================================================================================

function handle<R extends string, S extends RequestState>(handler: RequestHandler<R, S>) {
  return async (ctx: RequestContext<R, S>, next: () => Promise<unknown>) => {
    const response = await handler(ctx, next)
    if (isHttpResponse(response)) {
      forwardHeaders(ctx, response.headers)
      ctx.response.body = response.body
      ctx.response.status = response.status
    } else if (isJsxResponse(response)) {
      const stream = render(response)
      ctx.response.headers.set(Header.ContentType, ContentType.Html)
      ctx.response.body = stream
    } else {
      // assume handler did all the work already
    }
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { buildRouter }

//-------------------------------------------------------------------------------------------------
