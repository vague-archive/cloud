import { delay } from "@std/async"
import { config } from "@config"
import { Database } from "@db"
import { Clock } from "@lib/clock"
import { FileStore } from "@lib/filestore"
import { KvStore, MemoryKvStore } from "@lib/kvstore"
import { RouteGenerator } from "@lib/route"
import { Factory, testDatabase, testMailer, testRouteGenerator } from "@test"
import { Domain } from "@domain"
import { Mailer } from "@mail"
import { MockFileServer } from "./mock/fileserver.ts"
import { MockMinionsQueue } from "./mock/minions.ts"

//-----------------------------------------------------------------------------

const TestKeys = {
  signingKey:
    "Zqlkii6IEpmFILaNd0ZZGFfbLqGZgFrJopnnjPttGywzuxpJnNuC90AV9+GqkXjeSjQDn1AR7Cdz1Hd7iOcusA9cV9OGRuhIVBgNch1MacLYwkJBIwPL3oyfk9BCrO03i5w34KfoY9GFr9CZ61kpGP90InGWUiF2GbyEsAishKo=",
  encryptKey: "x+eLvtCTh0dXznoyLt3gOGtGZWrvBmlz0u1Qqd1qmMU=",
}

//-----------------------------------------------------------------------------

interface WithClock {
  clock: Clock
}

interface WithKv {
  kv: KvStore
  kvf: string
}

interface WithDb {
  db: Database
  factory: Factory
}

interface WithMailer {
  mailer: Mailer
}

interface WithDomain extends WithKv, WithDb, WithMailer {
  domain: Domain
}

interface WithWeb {
  route: RouteGenerator
}

interface WithTmpDir {
  tmpDir: string
}

//-----------------------------------------------------------------------------

type Context = Deno.TestContext & WithClock

type TestFn<CTX extends Context> = (ctx: CTX) => void | Promise<void>

interface TestBuilder<CTX extends Context> {
  (name: string, fn: TestFn<CTX>): void
  skip: TestBuilder<CTX>
  only: TestBuilder<CTX>
  kv: TestBuilder<CTX & WithKv>
  db: TestBuilder<CTX & WithDb>
  mailer: TestBuilder<CTX & WithMailer>
  domain: TestBuilder<CTX & WithDomain>
  web: TestBuilder<CTX & WithWeb>
  tmp: TestBuilder<CTX & WithTmpDir>
}

// deno-lint-ignore no-explicit-any
type WrappedTestFn = TestFn<any>

//-----------------------------------------------------------------------------

export function testBuilder() {
  const state = {
    skip: false,
    only: false,
    kv: false,
    db: false,
    mailer: false,
    domain: false,
    web: false,
    tmp: false,
  }

  const Test = ((name: string, fn: WrappedTestFn) => {
    fn = state.web ? wrapWeb(fn) : fn
    fn = state.domain ? wrapDomain(fn) : fn
    fn = state.mailer ? wrapMailer(fn) : fn
    fn = state.db ? wrapDb(fn) : fn
    fn = state.kv ? wrapKv(fn) : fn
    fn = state.tmp ? wrapTmpDir(fn) : fn
    fn = wrapClock(fn)
    const sanitize = config.logger.level === "silent" // ugh, winston logs async which causes false positive leak detection, so only enable leak detection if logger is silent
    Deno.test({
      name,
      only: state.only,
      ignore: state.skip,
      sanitizeOps: sanitize,
      sanitizeResources: sanitize,
      fn,
    })
    state.skip = false
    state.only = false
    state.kv = false
    state.db = false
    state.mailer = false
    state.domain = false
    state.web = false
    state.tmp = false
  }) as TestBuilder<Context>

  Object.defineProperty(Test, "skip", {
    get: function () {
      state.skip = true
      return Test
    },
  })

  Object.defineProperty(Test, "only", {
    get: function () {
      state.only = true
      return Test
    },
  })

  Object.defineProperty(Test, "kv", {
    get: function () {
      state.kv = true
      return Test
    },
  })

  Object.defineProperty(Test, "db", {
    get: function () {
      state.db = true
      return Test
    },
  })

  Object.defineProperty(Test, "mailer", {
    get: function() {
      state.mailer = true
      return Test
    },
  })

  Object.defineProperty(Test, "domain", {
    get: function () {
      state.kv = true
      state.db = true
      state.mailer = true
      state.domain = true
      return Test
    },
  })

  Object.defineProperty(Test, "web", {
    get: function() {
      state.web = true
      return Test
    },
  })

  Object.defineProperty(Test, "tmp", {
    get: function () {
      state.tmp = true
      return Test
    },
  })

  return Test
}

//-----------------------------------------------------------------------------

function wrapClock(fn: WrappedTestFn): WrappedTestFn {
  return async (ctx) => {
    const clock = Clock.freeze()
    await fn({ ...ctx, clock })
  }
}

function wrapKv(fn: WrappedTestFn): WrappedTestFn {
  return async (ctx) => {
    const kv = new MemoryKvStore()
    await fn({ ...ctx, kv })
  }
}

function wrapDb(fn: WrappedTestFn): WrappedTestFn {
  class RollbackError extends Error {}
  return async (ctx) => {
    try {
      const db = testDatabase()
      await db.transaction().execute(async (tx) => {
        const factory = new Factory(tx)
        await fn({
          ...ctx,
          db: tx,
          factory,
        })
        throw new RollbackError()
      })
    } catch (e) {
      if (!(e instanceof RollbackError)) {
        throw e
      }
    }
  }
}

function wrapMailer(fn: WrappedTestFn): WrappedTestFn {
  return async (ctx) => {
    const mailer = testMailer()
    await fn({ ...ctx, mailer })
  }
}

function wrapDomain(fn: WrappedTestFn): WrappedTestFn {
  return async (ctx) => {
    const filestore = new FileStore(new URL(MockFileServer.Url))
    const minions = MockMinionsQueue()
    const domain = new Domain({
      keys: TestKeys,
      kv: ctx.kv,
      db: ctx.db,
      clock: ctx.clock,
      filestore,
      mailer: ctx.mailer,
      minions,
    })
    await fn({
      ...ctx,
      domain,
    })
  }
}

function wrapWeb(fn: WrappedTestFn): WrappedTestFn {
  const route = testRouteGenerator()
  return async (ctx) => {
    await fn({ ...ctx, route })
  }
}

function wrapTmpDir(fn: WrappedTestFn): WrappedTestFn {
  return async (ctx) => {
    const tmpDir = await Deno.makeTempDir()
    try {
      await fn({
        ...ctx,
        tmpDir,
      })
    } finally {
      await delay(0) // something about deno file access causes misreported leaks if we dont add a tiny delay before cleaning up the tmp directory
      await Deno.remove(tmpDir, { recursive: true })
    }
  }
}

//-----------------------------------------------------------------------------
