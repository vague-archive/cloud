import { to } from "@lib"
import { KvStore } from "@lib/kvstore"
import { ContentType, Header, Status } from "@lib/http"
import { render } from "@lib/jsx"
import { logger } from "@lib/logger"
import { Middleware } from "@web"
import { MaintenancePage } from "@web/page/MaintenancePage.tsx"

const MAINTENANCE_KEY = "maintenance"

async function getMaintenanceValue(kv: KvStore): Promise<boolean> {
  return to.bool(await kv.get([MAINTENANCE_KEY]))
}

export async function Maintenance(kv: KvStore): Promise<Middleware> {

  let maintenance = await getMaintenanceValue(kv)
  if (maintenance) {
    logger.warn("STARTUP IN MAINTENANCE MODE")
  }

  kv.subscribe(`__keyspace@0__:${MAINTENANCE_KEY}`, async () => {
    maintenance = await getMaintenanceValue(kv)
    if (maintenance) {
      logger.warn("ENABLE MAINTENANCE MODE")
    } else {
      logger.warn("DISABLE MAINTENANCE MODE")
    }
  })
  
  return async (ctx, next) => {
    if (maintenance) {
      const accept = ctx.request.headers.get(Header.Accept)
      if (accept && accept.includes("text/html")) {
        ctx.response.headers.set(Header.ContentType, ContentType.Html)
        ctx.response.body = render(MaintenancePage(ctx))
      } else {
        ctx.response.headers.set(Header.ContentType, ContentType.Json)
        ctx.response.body = JSON.stringify({ maintenance: true })
      }
      ctx.response.status = Status.ServiceUnavailable
    } else {
      await next()
    }
  }
}
