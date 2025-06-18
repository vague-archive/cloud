import { JSX, oak } from "@deps"
import { Config } from "@config"
import { assert } from "@lib"
import { Header, NotFoundError, Status } from "@lib/http"
import { RouteGenerator } from "@lib/route"
import { Domain, Game, Organization, User } from "@domain"
import { Session } from "@web/middleware/session.ts"
import { WebLogger } from "@web/middleware/logger.ts"
import { ErrorHandler } from "@web/middleware/errors.ts"
import { loadManifest, Manifest } from "@web/manifest.ts"
import { Server } from "@web/server.ts"
import { AuthorizationError, authorize, is, Role } from "@web/policy.ts"
import { HotModuleReloader } from "@web/hmr.ts"
import { Layout } from "@web/component"
import { OAuthProviders } from "@web/oauth.ts"

//=================================================================================================
// oak.State
//=================================================================================================

interface ApplicationState extends oak.State {
  config: Config
  domain: Domain
  manifest: Manifest
  route: RouteGenerator
  oauth: OAuthProviders
}

interface RequestState extends ApplicationState {
  user?: User
  session?: Session
  form?: FormData
  organization?: Organization
  game?: Game
}

//=================================================================================================
// oak.Application
//=================================================================================================

type Application = oak.Application<ApplicationState>

function newApplication(config: oak.ApplicationOptions<ApplicationState, oak.NativeRequest>) {
  return new oak.Application<ApplicationState>(config)
}

//=================================================================================================
// oak.Context
//=================================================================================================

type NoRoute = "none"
type UnknownRoute = "unknown"

type RequestContext<R extends string = NoRoute, S extends RequestState = RequestState> = R extends NoRoute
  ? oak.Context<S>
  : R extends UnknownRoute ? oak.RouterContext<string, oak.RouteParams<string>, S>
  : oak.RouterContext<R, oak.RouteParams<R>, S>

//=================================================================================================
// request handler
//=================================================================================================

type RequestHandler<R extends string = NoRoute, S extends RequestState = RequestState> = (
  ctx: RequestContext<R, S>,
  next: NextFn,
) => RequestHandlerResponse | Promise<RequestHandlerResponse>

type RequestHandlerResponse = Response | JSX.Element | void

function isHttpResponse(value: RequestHandlerResponse): value is Response {
  return value instanceof Response
}

function isJsxResponse(value: RequestHandlerResponse): value is JSX.Element {
  return value !== undefined && isHttpResponse(value) === false
}

type NextFn = () => void | Promise<unknown>

//=================================================================================================
// oak.Middleware
//=================================================================================================

type Middleware<S extends oak.State = RequestState> = oak.Middleware<S>

//=================================================================================================
// oak misc
//=================================================================================================

type CookieOptions = oak.CookiesSetDeleteOptions
const send = oak.send

//=================================================================================================
// oak.Context helpers (when optional state is required)
//=================================================================================================

const CTX = {
  config: (ctx: RequestContext) => {
    assert.present(ctx.state.config)
    return ctx.state.config
  },
  mailer: (ctx: RequestContext) => {
    assert.present(ctx.state.domain)
    return ctx.state.domain.mailer
  },
  domain: (ctx: RequestContext) => {
    assert.present(ctx.state.domain)
    return ctx.state.domain
  },
  kv: (ctx: RequestContext) => {
    return CTX.domain(ctx).kv
  },
  manifest: (ctx: RequestContext) => {
    assert.present(ctx.state.manifest)
    return ctx.state.manifest
  },
  route: (ctx: RequestContext) => {
    assert.present(ctx.state.route)
    return ctx.state.route
  },
  oauth: (ctx: RequestContext) => {
    assert.present(ctx.state.oauth)
    return ctx.state.oauth
  },
  authorize: (ctx: RequestContext, role: Role = "active") => {
    const user = ctx.state.user
    authorize(user, role)
    assert.present(user)
    return user
  },
  session: (ctx: RequestContext) => {
    assert.present(ctx.state.session, "session missing, did you forget Session middleware?")
    return ctx.state.session
  },
  form: (ctx: RequestContext) => {
    assert.present(ctx.state.form, "form missing, did you forget Form/Csrf middleware?")
    return ctx.state.form
  },
  organization: (ctx: RequestContext, authz?: "noauthz") => {
    assert.present(ctx.state.organization, "organization missing, did you forget LoadOrganization middleware?")
    if (authz === "noauthz") {
      return ctx.state.organization
    }
    authorize(ctx.state.user, "member", ctx.state.organization)
    return ctx.state.organization
  },
  game: (ctx: RequestContext, authz?: "noauthz") => {
    assert.present(ctx.state.game, "game missing, did you forget LoadGame middleware?")
    if (authz === "noauthz") {
      return ctx.state.game
    }
    authorize(ctx.state.user, "member", ctx.state.game)
    return ctx.state.game
  },
}

//=================================================================================================
// HTMX helpers
//=================================================================================================

const HX = {
  redirect: (ctx: RequestContext, location: string | URL) => {
    ctx.response.status = Status.OK
    ctx.response.headers.set(Header.HxRedirect, location.toString())
  },
  retarget: (ctx: RequestContext, selector: string, element?: JSX.Element) => {
    ctx.response.status = Status.OK
    ctx.response.headers.set(Header.HxRetarget, selector)
    return element
  },
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  type Application,
  type ApplicationState,
  AuthorizationError,
  authorize,
  type CookieOptions,
  CTX,
  HX,
  ErrorHandler,
  HotModuleReloader,
  is,
  isHttpResponse,
  isJsxResponse,
  Layout,
  loadManifest,
  type Manifest,
  type Middleware,
  newApplication,
  type NextFn,
  NotFoundError,
  type RequestContext,
  type RequestHandler,
  type RequestState,
  send,
  Server,
  Session,
  WebLogger,
}
