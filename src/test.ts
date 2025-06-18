import { oak, oakBody, Redis } from "@deps"
import { Config, config } from "@config"
import { Mailer } from "@mail"
import { createDatabase, Database } from "@db"
import { Domain, User } from "@domain"
import { assert } from "@lib"
import { Header } from "@lib/http"
import { AWS } from "@lib/aws"
import { testBuilder } from "./test/builder.ts"
import { Manifest, RequestState, Server, Session } from "@web"
import { buildRouter } from "@web/router"

//-----------------------------------------------------------------------------

export { z } from "@deps"
export { faker } from "./test/faker.ts"
export { bypass } from "./test/bypass.ts"
export { assert } from "./test/assert.ts"
export { Factory, factory, identify } from "./test/factory.ts"
export { Fixture, insertFixtures } from "./test/fixture.ts"
export { MockFileServer } from "./test/mock/fileserver.ts"
export { MockMinionsQueue } from "./test/mock/minions.ts"

//-----------------------------------------------------------------------------
//
// our custom test wrapper allows for:
//
//   Test(...)
//   Test.skip(...)
//   Test.only(...)
//
// as well as isolated and transactional db tests via:
//
//   Test.kv("test kv", async ({kv}) => {})
//   Test.db("test db", async ({db}) => {})
//   Test.domain("test domain", async ({domain}) => {})
//

export const Test = testBuilder()

//-----------------------------------------------------------------------------
//
// Deno.test tracks "resource leaks" and so the first test to acquire a
// connection from the pool (which stays in the pool for re-use) will be
// flagged as a leak. To avoid this we can "prime" the pool
// in ensure that all connections are acquired OUTSIDE of the test scopes

let testDb: Database | undefined
try {
  testDb = await createDatabase({
    ...config.test.database,
    prime: true,
  })
} catch (err) {
  // if something goes wrong on startup just warn, because the very first time we run `deno task db create`
  // the database won't actually exist, so this static global initialization will fail...
  // ... so instead, lets assert when testDatabase() is actually requested by a test below
  console.warn(err.message)
}

export function testDatabase(): Database {
  assert.present(testDb)
  return testDb
}

//-----------------------------------------------------------------------------
//
// We use a single Redis instance for all tests,
// but need to flush the DB between each test

export async function testRedis(fn: (redis: Redis) => void | Promise<void>) {
  const redis = new Redis(config.test.redis.url)
  try {
    await redis.flushdb()
    await fn(redis)
    await redis.flushdb()
  } finally {
    redis.disconnect()
  }
}

//-----------------------------------------------------------------------------

export const TestMailerConfig = {
  enabled: false,
  productName: "Void Test",
  productUrl: "https://test.void.dev",
  supportEmail: "support@test.void.dev",
}

export function testMailer() {
  return new Mailer(TestMailerConfig)
}

//-----------------------------------------------------------------------------

export function testMinionsContext(domain: Domain) {
  return {
    domain,
    aws: new AWS({
      region: "us-west-2",
      credentials: {
        awsAccessKeyId: "minions-access-key-id",
        awsSecretKey: "minions-secret-key",
      },
    }),
  }
}

//-----------------------------------------------------------------------------
//
// To test an individual web handler, build a test context and call the handler with it
//  - see "Ping Action" in src/web/action/ping.test.ts

export function testWebContext<R extends string, S extends RequestState = RequestState>(options?: {
  user?: User
  method?: string
  path?: R
  params?: oak.RouteParams<R>
  queryParams?: Record<string, string>
  state?: Partial<S>
  session?: Session | false
  headers?: [string, string][]
  body?: string
  hx?: boolean
}): oak.RouterContext<R, oak.RouteParams<R>, S> {

  const state = options?.state ?? {} as S
  if (state.session === undefined && options?.session !== false) {
    state.session = options?.session || Session.build(options?.user)
  }
  state.route = state.route ?? testRouteGenerator()
  state.user = state.user ?? options?.user
  state.config = state.config ?? config
  state.manifest = state.manifest ?? ((path: string) => path)

  // oak.createWebContext does not support a signed SecureCookieMap, so we
  // need to override the default config and use unsigned keys in tests
  state.config.web.sessionCookie.options.signed  = false
  state.config.web.identityCookie.options.signed = false

  const headers = options?.headers ?? []
  if (options?.hx) {
    headers.push([Header.HxRequest, "true"])
  }

  let path = options?.path ?? "/"
  if (options?.params) {
    for (const key of Object.keys(options.params)) {
      path = path.replace(`:${key}`, options.params[key] ?? `:${key}`)
    }
  }
  if(options?.queryParams) {
    const url = new URL(path, "http://example.com")
    for (const [key, value] of Object.entries(options.queryParams)) {
      url.searchParams.append(key, value)
    }
    path = `${url.pathname}${url.search}`
  }

  const ctx = oak.testing.createMockContext<R, oak.RouteParams<R>, S>({
    method: options?.method,
    params: options?.params,
    path,
    headers,
    state,
  })

  // if we don't need to inject a request body we're done...
  if (!options?.body) {
    return ctx
  }

  // UGH. ... but if we do, it's a real PITA - starting to wonder if we should have just used native deno Request/Response and written our own middelware/routing layer?
  const request = new Request(ctx.request.url, {
    body: options?.body,
    method: ctx.request.method,
    headers: ctx.request.headers,
  })
  const body = new oakBody({
    request,
    headers: request.headers,
    getBody() {
      return request.body
    },
  })
  return {
    ...ctx,
    request: {
      ...ctx.request,
      hasBody: true,
      body: body,
    },
  } as oak.RouterContext<R, oak.RouteParams<R>, S>
}

//-----------------------------------------------------------------------------
//
// To test via the entire server stack, construct a test web server and ask it to handle a Request
//  - see "Ping Server" in src/web/action/ping.test.ts

export async function testWebServer(options?: {
  config?: Config
  domain?: Domain
  manifest?: Manifest
}) {
  return await Server.configure({
    config: options?.config ?? config,
    domain: options?.domain!,
    manifest: options?.manifest!,
  })
}

//-----------------------------------------------------------------------------

// can share same route generator for all tests
const { route } = buildRouter("https://void.test")
export function testRouteGenerator() {
  return route
}

//-----------------------------------------------------------------------------
//
// Web middleware frequently needs fake next() function
// that we can verify was called

interface NextFn {
  (): Promise<void>
  called: boolean
}

export function nextFn(fn?: () => void) {
  const next = (() => {
    if (fn) {
      fn()
    }
    next.called = true
    return Promise.resolve()
  }) as NextFn
  next.called = false
  return next
}

//-----------------------------------------------------------------------------
