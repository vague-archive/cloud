import { CTX, RequestContext } from "@web"

//-------------------------------------------------------------------------------------------------

export function Validate(ctx: RequestContext<"/api/auth/validate">) {
  CTX.authorize(ctx)
  ctx.response.body = "Valid Authorization Token"
}