import { crypto, to } from "@lib"
import { getBearerToken, Header } from "@lib/http"
import { CTX, NextFn, RequestContext } from "@web"

//=================================================================================================
// AUTHENTICATE via session
//=================================================================================================

async function AuthenticateViaSession(ctx: RequestContext, next: NextFn) {
  if (ctx.state.user === undefined) {
    if (ctx.state.session?.userId) {
      const domain = CTX.domain(ctx)
      const user = await domain.account.getUser(ctx.state.session.userId)
      ctx.state.user = await domain.account.withAuthorizationContext(user)
    }
  }
  await next()
}

//=================================================================================================
// AUTHENTICATE via bearer token
//=================================================================================================

async function AuthenticateViaToken(ctx: RequestContext, next: NextFn) {
  if (ctx.state.user === undefined) {
    const token = getBearerToken(ctx.request.headers.get(Header.Authorization))
    if (token) {
      const domain = CTX.domain(ctx)
      if (crypto.isJWT(token)) {
        const config = CTX.config(ctx)
        const payload = await crypto.verifyJWT(token, config.keys.signingKey)
        if (payload !== "invalid-signature" && payload.sub) {
          const userId = to.int(payload.sub)
          const user = await domain.account.getUser(userId)
          ctx.state.user = await domain.account.withAuthorizationContext(user)
        }
      } else {
        const user = await domain.account.getUserByAccessToken(token)
        ctx.state.user = await domain.account.withAuthorizationContext(user)
      }
    }
  }
  await next()
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const Authenticate = {
  ViaSession: AuthenticateViaSession,
  ViaToken: AuthenticateViaToken,
}

//-------------------------------------------------------------------------------------------------
