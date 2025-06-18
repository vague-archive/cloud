import { CTX, Middleware, NextFn, RequestContext } from "@web"
import { KvStore, Expiration } from "@lib/kvstore"
import { Status } from "@lib/http"
import { logger, pp } from "@lib/logger"

// When we hosted at fly.io, they provided a rudimentary WAF that blocked a lot of spam
// traffic from us. Now we've moved to AWS we don't get that anymore. AWS do have a WAF
// but it doesn't work with an NLB and I haven't had time to investigate the alternatives
// yet, so for a short term hack fix...
//
// ... this middleware implements a very naive WAF (web application firewall)... we should
// really do this at the infrastructure layer, but until then...

//-------------------------------------------------------------------------------------------------

const DENY = [
  /\.env$/,
  /\.php$/,
  /^\/wp-config/,
  /^\/tmp/,
  /^\/\.ssh/,
  /^\/\.git/,
  /^\/autodiscover/,
]

//-------------------------------------------------------------------------------------------------

const BLOCKED_KEY = "blocked"

async function getBlockedIps(kv: KvStore): Promise<Set<string>> {
  return new Set(await kv.get([BLOCKED_KEY]) as [string])
}

async function setBlockedIps(kv: KvStore, blocked: Set<string>) {
  await kv.set([BLOCKED_KEY], Array.from(blocked), {
    expires: Expiration.OneHour,
  })
}

//-------------------------------------------------------------------------------------------------

export async function Firewall(kv: KvStore): Promise<Middleware> {

  let blocked = await getBlockedIps(kv)
  if (blocked.size > 0) {
    logger.warn(`WAF STARTED: ${pp(Array.from(blocked))}`)
  }

  console.log("SUBSCRIBE TO KEYSPACE")
  kv.subscribe(`__keyspace@0__:${BLOCKED_KEY}`, async () => {
    blocked = await getBlockedIps(kv)
    // TODO: investigate why this gets called multiple times for a single setBlockedIps call
    logger.warn(`WAF UPDATED: ${pp(Array.from(blocked))}`)
  })

  return async (ctx: RequestContext, next: NextFn) => {
    const config = CTX.config(ctx)
    if (config.web.waf) {
      if (blocked.has(ctx.request.ip)) {
        ctx.response.status = Status.NotFound
        return
      }
      if (DENY.some((re) => ctx.request.url.pathname.match(re))) {
        logger.warn(`WAF BLOCKED: ${ctx.request.url.pathname} FOR IP ${ctx.request.ip}`)
        blocked.add(ctx.request.ip)
        setBlockedIps(kv, blocked)
        ctx.response.status = Status.NotFound
        return
      }
    }
    await next()
  }
}

//-------------------------------------------------------------------------------------------------
