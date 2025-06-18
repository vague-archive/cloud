import { nanoid } from "@deps"
import { User } from "@domain"
import { crypto } from "@lib"
import { logger } from "@lib/logger"
import { Expiration, KvStore } from "@lib/kvstore"
import { Header, httpError, Method, Status } from "@lib/http"
import { SerializableObject, SerializableValue } from "@lib/serialize"
import { CookieOptions, CTX, NextFn, RequestContext } from "@web"

export const CSRF_KEY = "_csrf"
export const USER_KEY = "_userId"

//-----------------------------------------------------------------------------

interface SessionData {
  data: Record<string, SerializableValue>
  flash: Record<string, SerializableValue>
}

//-----------------------------------------------------------------------------

export class Session {
  readonly sid: string

  private data: Record<string, SerializableValue>
  private flashdata: Record<string, SerializableValue>
  private deleted: boolean

  private constructor(sid: string, initial?: Partial<SessionData>) {
    this.sid = sid
    this.data = initial?.data ?? {}
    this.flashdata = initial?.flash ?? {}
    this.deleted = false
    this.generateCsrfToken()
  }

  get(key: string): SerializableValue {
    if (key in this.data) {
      return this.data[key]
    } else {
      const value = this.flashdata[key]
      delete this.flashdata[key]
      return value
    }
  }

  set(key: string, value: SerializableValue) {
    if (value === null || value === undefined) {
      delete this.data[key]
    } else {
      this.data[key] = value
    }
  }

  clear(key: string) {
    this.set(key, undefined)
  }

  flash(key: string, value: SerializableValue) {
    this.flashdata[key] = value
  }

  has(key: string) {
    return key in this.data || key in this.flashdata
  }

  get keys() {
    const dataKeys = Object.keys(this.data)
    const flashKeys = Object.keys(this.flashdata)
    return Array.from(new Set(dataKeys.concat(flashKeys))).sort()
  }

  get userId() {
    return this.get(USER_KEY) as number
  }

  get csrf() {
    return this.get(CSRF_KEY) as string
  }

  private generateCsrfToken() {
    if (!this.has(CSRF_KEY)) {
      this.set(CSRF_KEY, crypto.generateToken())
    }
  }

  get isDeleted() {
    return this.deleted
  }

  private delete() {
    this.deleted = true
  }

  //---------------------------------------------------------------------------

  private serialize(): SerializableObject {
    return {
      data: this.data,
      flash: this.flashdata,
    }
  }

  private static deserialize(sid: string, value: SerializableObject) {
    return new Session(sid, { ...value })
  }

  //---------------------------------------------------------------------------

  static build(user?: User) {
    const sid = nanoid(21)
    const session = new Session(sid)
    session.set(USER_KEY, user?.id)
    return session
  }

  static async create(kv: KvStore, user?: User) {
    const session = Session.build(user)
    const sid = session.sid
    await Session.store.save(kv, sid, session.serialize())
    debug(`CREATED NEW SESSION sid: ${sid}`)
    return session
  }

  static async save(kv: KvStore, session: Session) {
    const { sid } = session
    await Session.store.save(kv, sid, session.serialize())
    debug(`SAVED EXISTING SESSION sid: ${sid}`)
  }

  static async load(kv: KvStore, sid: string) {
    const value = await Session.store.load(kv, sid)
    if (value) {
      const session = Session.deserialize(sid, value)
      debug(`LOAD EXISTING SESSION sid: ${sid}`)
      return session
    } else {
      const session = new Session(sid)
      debug(`CREATE NEW SESSION sid: ${sid}`)
      return session
    }
  }

  static async destroy(kv: KvStore, session: Session) {
    await Session.store.delete(kv, session.sid)
    session.delete()
    debug(`DELETED SESSION sid: ${session.sid}`)
  }

  //---------------------------------------------------------------------------

  private static store = {
    load: async (kv: KvStore, sid: string) => {
      return await kv.get(["session", sid]) as SerializableObject
    },

    save: async (kv: KvStore, sid: string, session: SerializableObject) => {
      await kv.set(["session", sid], session, {
        expires: Expiration.OneWeek,
      })
    },

    delete: async (kv: KvStore, sid: string) => {
      await kv.delete(["session", sid])
    },
  }

  //---------------------------------------------------------------------------

  static middleware(
    options?: Partial<{
      cookieName: string
      cookieOptions: CookieOptions
    }>,
  ) {
    return async (ctx: RequestContext, next: NextFn) => {
      const config = CTX.config(ctx)
      const cookieName = options?.cookieName ?? config.web.sessionCookie.name
      const cookieOptions = options?.cookieOptions ?? config.web.sessionCookie.options
      const kv = CTX.kv(ctx)
      const sid = await ctx.cookies.get(cookieName)
      if (sid) {
        ctx.state.session = await Session.load(kv, sid)
      } else {
        ctx.state.session = await Session.create(kv)
      }
      csrfProtection(ctx, ctx.state.session.csrf)
      await next()
      if (ctx.state.session.isDeleted) {
        debug(`DELETE SESSION COOKIE sid: ${ctx.state.session.sid}`)
        await ctx.cookies.delete(cookieName)
      } else {
        await Session.save(kv, ctx.state.session)
        debug(`SET SESSION COOKIE sid: ${ctx.state.session.sid}`)
        await ctx.cookies.set(cookieName, ctx.state.session.sid, cookieOptions)
      }
    }
  }

}

//-----------------------------------------------------------------------------

const SAFE_METHODS = [
  Method.GET,
  Method.HEAD,
  Method.OPTIONS,
]

function csrfProtection(ctx: RequestContext, expectedToken: string, exclude?: (path: string) => boolean) {
  const safeMethod = SAFE_METHODS.includes(ctx.request.method as Method)
  if (!safeMethod) {
    if (exclude && exclude(ctx.request.url.pathname)) {
      return
    }
    const token = ctx.request.headers.get(Header.CSRFToken) || ctx.state.form?.get(CSRF_KEY)
    if (!token || token != expectedToken) {
      throw new CsrfError()
    }
  }
}

export class CsrfError extends httpError(Status.Forbidden) {}

//-----------------------------------------------------------------------------

const debugEnabled = false

function debug(message: string) {
  if (debugEnabled) {
    logger.debug(`[OAUTH DEBUG] ${message}`)
  }
}

//-----------------------------------------------------------------------------
