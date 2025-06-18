import { oak } from "@deps"
import { logger, sanitizeAlertWords } from "@lib/logger"
import { Method } from "@lib/http"
import { Middleware } from "@web"

interface WebLoggerOptions {
  prefix?: string
  loggable?: (request: oak.Request) => boolean
}

export function WebLogger(options?: WebLoggerOptions): Middleware {
  const loggable = options?.loggable ?? (() => true)
  const prefix = options?.prefix ?? ""
  return async (ctx, next) => {
    const start = Date.now()
    try {
      await next()
    } finally {
      if (loggable(ctx.request)) {
        const time = Date.now() - start

        const meta = {
          method: ctx.request.method as Method,
          path: ctx.request.url.pathname,
          status: ctx.response.status ?? 200,
          responseTime: time,
        }

        const message = [
          meta.method,
          meta.status,
          `${prefix}${sanitizeAlertWords(meta.path)}`,
          " - ",
          `${meta.responseTime}ms`,
        ].join(" ")

        logger.info(message, meta)
      }
    }
  }
}
