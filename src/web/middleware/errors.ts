import { outdent } from "@deps"
import { AuthorizationError, Middleware, RequestContext } from "@web"
import { logger } from "@lib/logger"
import { isHttpError, NotFoundError, Status, StatusText } from "@lib/http"
import { CsrfError } from "@web/middleware/session.ts"

//-----------------------------------------------------------------------------

interface ErrorHandlerOptions {
  exposeInternalServerError: boolean
}

export function ErrorHandler(opts?: ErrorHandlerOptions): Middleware {
  return async (ctx, next) => {
    const route = ctx.state.route
    try {
      await next()
      if (ctx.response.status === Status.NotFound) {
        return notFound(ctx)
      } else if (ctx.response.status === Status.Forbidden) {
        return forbidden(ctx)
      }
    } catch (err) {
      if (err instanceof AuthorizationError) {
        if (isPage(ctx) && ctx.state.user === undefined && route) {
          ctx.response.redirect(route("login", { query: { origin: ctx.request.url.toString() }}))
        } else {
          return notFound(ctx)
        }
      } else if (err instanceof NotFoundError) {
        return notFound(ctx)
      } else if (err instanceof CsrfError) {
        return forbidden(ctx)
      } else {
        return internalServerError(ctx, err, opts)
      }
    }
  }
}

//-----------------------------------------------------------------------------

function isPage(ctx: RequestContext) {
  return ctx.request.headers.get("accept")?.includes("text/html")
}

function notFound(ctx: RequestContext) {
  ctx.response.status = Status.NotFound
  if (isPage(ctx)) {
    ctx.response.body = StatusText[Status.NotFound] // TODO: custom 404 page
  }
}

function forbidden(ctx: RequestContext) {
  ctx.response.status = Status.Forbidden
  if (isPage(ctx)) {
    ctx.response.body = StatusText[Status.Forbidden] // TODO: custom 403 page
  }
}

//-----------------------------------------------------------------------------

function internalServerError(ctx: RequestContext, err: Error, opts?: ErrorHandlerOptions) {
  const status = isHttpError(err) ? err.status : Status.InternalServerError
  const message = opts?.exposeInternalServerError ? err.toString() : StatusText[status]
  ctx.response.status = status
  if (isPage(ctx) && ctx.response.writable) {
    ctx.response.type = "text/html"
    ctx.response.body = outdent`
      <html>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${message}</title>
        </head>
        <body>
          <h1>${message}</h1>
        </body>
      </html>
    `
  } else {
    ctx.response.body = message
  }
  ReportError(ctx, status, err)
}

function ReportError(ctx: RequestContext, status: Status, err: Error) {
  if (suppressReport(status)) {
    return
  }
  logger.error([
    `${err.name} - ${err.message} processing request: ${ctx.request.method} ${ctx.request.url.toString()}`,
    err.stack ? err.stack.split("\n").slice(1).join("\n") : undefined,
  ].join("\n"))
}

const suppress: Status[] = [
  Status.NotFound,
  Status.Forbidden,
]

function suppressReport(status: Status) {
  return suppress.includes(status)
}

//-----------------------------------------------------------------------------
