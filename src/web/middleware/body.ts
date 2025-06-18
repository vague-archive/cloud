import { Header, ContentType } from "@lib/http"
import { NextFn, RequestContext } from "@web"

//-------------------------------------------------------------------------------------------------

export function RequestBodyParser() {
  return async (ctx: RequestContext, next: NextFn) => {
    if (ctx.request.headers.get(Header.ContentType) === ContentType.Form) {
      ctx.state.form = await ctx.request.body.formData()
    }
    await next()
  }
}

//-------------------------------------------------------------------------------------------------
