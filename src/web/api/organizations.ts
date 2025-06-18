import { CTX, RequestContext } from "@web"
import { ContentType, Status } from "@lib/http"

//-------------------------------------------------------------------------------------------------

export function GetUserOrganizations(ctx: RequestContext) {
  const user = CTX.authorize(ctx)

  ctx.response.status = Status.OK
  ctx.response.body = user.organizations || []
  ctx.response.type = ContentType.Json
}
