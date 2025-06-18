import { nanoid } from "@deps"
import { Header, Method } from "@lib/http"
import { Domain } from "@domain"
import { assert, Test, testWebContext } from "@test"
import { CTX } from "@web"
import { CSRF_KEY, CsrfError, Session, USER_KEY } from "@web/middleware/session.ts"

const KEY1 = "key-1"
const KEY2 = "key-2"
const KEY3 = "key-3"
const COUNT = "count"
const VALUE1 = "value-1"
const VALUE2 = "value-2"
const VALUE3 = "value-3"
const COOKIE_NAME = "test-session-cookie"

//-----------------------------------------------------------------------------

Test.kv("default session state", async ({ kv }) => {
  const session = await Session.create(kv)
  assert.equals(session.userId, undefined)
  assert.present(session.csrf)
  assert.equals(session.has(CSRF_KEY), true)
  assert.equals(session.has(USER_KEY), false)
  assert.equals(session.csrf, session.get(CSRF_KEY))
  assert.equals(session.userId, session.get(USER_KEY))
  session
})

//-----------------------------------------------------------------------------

Test.domain("default session state - with user", async ({ kv, factory }) => {
  const user = await factory.user.create()
  const session = await Session.create(kv, user)
  assert.equals(session.userId, user.id)
  assert.present(session.csrf)
  assert.equals(session.has(CSRF_KEY), true)
  assert.equals(session.has(USER_KEY), true)
  assert.equals(session.csrf, session.get(CSRF_KEY))
  assert.equals(session.userId, session.get(USER_KEY))
  session
})

//-----------------------------------------------------------------------------

Test.kv("session get, set, clear, has, and keys", async ({ kv }) => {
  const session = await Session.create(kv)

  assert.equals(session.has(KEY1), false)
  assert.equals(session.has(KEY2), false)
  assert.equals(session.has(KEY3), false)
  assert.equals(session.get(KEY1), undefined)
  assert.equals(session.get(KEY2), undefined)
  assert.equals(session.get(KEY3), undefined)
  assert.equals(session.keys, [CSRF_KEY])

  session.set(KEY1, VALUE1)
  session.set(KEY2, VALUE2)

  assert.equals(session.has(KEY1), true)
  assert.equals(session.has(KEY2), true)
  assert.equals(session.has(KEY3), false)
  assert.equals(session.get(KEY1), VALUE1)
  assert.equals(session.get(KEY2), VALUE2)
  assert.equals(session.get(KEY3), undefined)
  assert.equals(session.keys, [CSRF_KEY, KEY1, KEY2])

  session.set(KEY1, undefined)

  assert.equals(session.has(KEY1), false)
  assert.equals(session.has(KEY2), true)
  assert.equals(session.has(KEY3), false)
  assert.equals(session.get(KEY1), undefined)
  assert.equals(session.get(KEY2), VALUE2)
  assert.equals(session.get(KEY3), undefined)
  assert.equals(session.keys, [CSRF_KEY, KEY2])

  session.clear(KEY2)

  assert.equals(session.has(KEY1), false)
  assert.equals(session.has(KEY2), false)
  assert.equals(session.has(KEY3), false)
  assert.equals(session.get(KEY1), undefined)
  assert.equals(session.get(KEY2), undefined)
  assert.equals(session.get(KEY3), undefined)
  assert.equals(session.keys, [CSRF_KEY])
})

//-----------------------------------------------------------------------------

Test.kv("session flash", async ({ kv }) => {
  const session = await Session.create(kv)

  session.set(KEY1, VALUE1)
  session.flash(KEY2, VALUE2)

  assert.equals(session.keys, [CSRF_KEY, KEY1, KEY2])

  assert.equals(session.has(KEY1), true)
  assert.equals(session.has(KEY2), true)
  assert.equals(session.get(KEY1), VALUE1)
  assert.equals(session.get(KEY2), VALUE2)

  assert.equals(session.has(KEY1), true)
  assert.equals(session.has(KEY2), false)
  assert.equals(session.get(KEY1), VALUE1)
  assert.equals(session.get(KEY2), undefined)

  assert.equals(session.keys, [CSRF_KEY, KEY1])
})

//-----------------------------------------------------------------------------

Test.kv("sessions have unique sids", async ({ kv }) => {
  const s1 = await Session.create(kv)
  const s2 = await Session.create(kv)
  assert.present(s1.sid)
  assert.present(s2.sid)
  assert.notEquals(s1.sid, s2.sid)
})

//-----------------------------------------------------------------------------

Test.domain("create, save, load, & destroy session", async ({ kv, factory }) => {
  const org = await factory.org.create()
  const user = await factory.user.create({ organizations: [org] })
  await factory.member.create({ user: user, organization: org })

  const session = await Session.create(kv, user)
  session.set(KEY1, VALUE1)
  session.set(KEY2, VALUE2)
  session.flash(KEY3, VALUE3)
  await Session.save(kv, session)

  assert.equals(session.keys, [CSRF_KEY, USER_KEY, KEY1, KEY2, KEY3])
  assert.equals(session.userId, user.id)
  assert.equals(session.get(KEY1), VALUE1)
  assert.equals(session.get(KEY2), VALUE2)
  assert.equals(session.get(KEY3), VALUE3)

  assert.present(await kv.get(["session", session.sid]))

  const s2 = await Session.load(kv, session.sid)
  assert.distinct(s2, session)
  assert.equals(s2.keys, [CSRF_KEY, USER_KEY, KEY1, KEY2, KEY3])
  assert.equals(s2.userId, user.id)
  assert.equals(s2.get(KEY1), VALUE1)
  assert.equals(s2.get(KEY2), VALUE2)
  assert.equals(s2.get(KEY3), VALUE3)

  await Session.destroy(kv, session)

  assert.absent(await kv.get(["session", session.sid]))

  const s3 = await Session.load(kv, session.sid)
  assert.notEquals(s3, session)
  assert.equals(s3.sid, session.sid)
  assert.equals(s3.userId, undefined)
  assert.equals(s3.keys, [CSRF_KEY])

  const sid = nanoid()
  const unknown = await Session.load(kv, sid)
  assert.true(unknown instanceof Session)
  assert.equals(unknown.sid, sid)
  assert.equals(unknown.userId, undefined)
  assert.equals(unknown.keys, [CSRF_KEY])
})

//-------------------------------------------------------------------------------------------------

Test.domain("loading an existing session gives a distinct instance", async ({ kv, factory }) => {
  const org = await factory.org.create()
  const user = await factory.user.create({ organizations: [org] })
  await factory.member.create({ user: user, organization: org })

  const s1 = await Session.create(kv, user)
  await Session.save(kv, s1)

  const s2 = await Session.load(kv, s1.sid)

  assert.distinct(s1, s2)
  assert.equals(s1, s2)

  s1.set(KEY1, "s1")
  s2.set(KEY1, "s2")

  assert.equals(s1.get(KEY1), "s1")
  assert.equals(s2.get(KEY1), "s2")
})

//-------------------------------------------------------------------------------------------------

Test.domain("middleware creates a new session and sets the session cookie", async ({ kv, domain }) => {
  const { middleware, ctx, next } = prepareMiddleware({ domain })

  await middleware(ctx, next)

  const session = ctx.state.session

  assert.present(session)
  assert.equals(session.get("count"), 1, "expected session count to be 1")
  assert.equals(session.userId, undefined, "expected session to be anonymous")

  const [setCookie] = ctx.response.headers.getSetCookie()
  assert.match(setCookie, `${COOKIE_NAME}=${session.sid}`)
  assert.match(setCookie, `path=/`)
  assert.match(setCookie, `expires=`)
  assert.match(setCookie, `samesite=lax`)
  assert.match(setCookie, `httponly`)

  const reload = await Session.load(kv, session.sid)
  assert.present(reload)
  assert.distinct(reload, session)
  assert.equals(reload, session)
})

//-------------------------------------------------------------------------------------------------

Test.domain("middleware loads existing session when cookie is present", async ({ factory, kv, domain }) => {
  const user = await factory.user.create()
  const session = Session.build(user)
  const sid = session.sid

  session.set(KEY1, VALUE1)
  assert.equals(session.sid, sid)
  assert.equals(session.userId, user.id)
  assert.equals(session.keys, [CSRF_KEY, USER_KEY, KEY1])

  await Session.save(kv, session)

  const { middleware, ctx, next } = prepareMiddleware({
    domain,
    headers: [
      ["Cookie", `${COOKIE_NAME}=${sid}`],
    ],
  })

  await middleware(ctx, next)

  assert.present(ctx.state.session)
  assert.distinct(ctx.state.session, session)

  assert.equals(ctx.state.session.sid, sid)
  assert.equals(ctx.state.session.userId, user.id)
  assert.equals(ctx.state.session.keys, [CSRF_KEY, USER_KEY, COUNT, KEY1])
  assert.equals(ctx.state.session.get(USER_KEY), user.id)
  assert.equals(ctx.state.session.get(COUNT), 1)
  assert.equals(ctx.state.session.get(KEY1), VALUE1)
})

//-------------------------------------------------------------------------------------------------

Test.domain("middleware creates new session when cookie is present but not found in store", async ({ domain }) => {
  const sid = nanoid()
  const { middleware, ctx, next } = prepareMiddleware({
    domain,
    headers: [
      ["Cookie", `${COOKIE_NAME}=${sid}`],
    ],
  })

  await middleware(ctx, next)

  assert.present(ctx.state.session)

  assert.equals(ctx.state.session.sid, sid)
  assert.equals(ctx.state.session.userId, undefined)
  assert.equals(ctx.state.session.keys, [CSRF_KEY, COUNT])
  assert.equals(ctx.state.session.get(KEY1), undefined)
  assert.equals(ctx.state.session.get(USER_KEY), undefined)
  assert.equals(ctx.state.session.get(COUNT), 1)
  assert.equals(ctx.state.session.get(KEY1), undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("middleware provides csrf protection", async ({ domain }) => {
  const { middleware, ctx, next } = prepareMiddleware({
    domain,
    method: Method.POST,
  })
  await assert.rejects(() => middleware(ctx, next), CsrfError)
})

//-------------------------------------------------------------------------------------------------

Test.domain("middleware csrf protection - csrf token provided", async ({ kv, factory, domain }) => {
  const user = await factory.user.create()
  const session = Session.build(user)
  const sid = session.sid
  const csrfToken = nanoid()

  session.set(CSRF_KEY, csrfToken)
  await Session.save(kv, session)

  const { middleware, ctx, next } = prepareMiddleware({
    domain,
    method: Method.POST,
    headers: [
      [Header.Cookie, `${COOKIE_NAME}=${sid}`],
      [Header.CSRFToken, csrfToken],
    ],
  })

  await middleware(ctx, next)
})

//-------------------------------------------------------------------------------------------------

function prepareMiddleware(options: {
  domain: Domain
  method?: Method
  headers?: [string, string][]
}) {
  const { domain, method, headers } = options
  const middleware = Session.middleware({
    cookieName: COOKIE_NAME,
  })

  const ctx = testWebContext({
    state: { domain },
    session: false,
    method,
    headers,
  })

  const next = () => {
    const session = CTX.session(ctx)
    const count = session.get("count") as number
    session.set("count", (count ?? 0) + 1)
    return Promise.resolve()
  }

  assert.equals(ctx.state.session, undefined, "preconditions")

  return { ctx, middleware, next }
}

//-------------------------------------------------------------------------------------------------
