import { ContentType, Header, Status } from "@lib/http"
import { RequestContext } from "@web"

function Ping(ctx: RequestContext) {
  ctx.response.status = Status.OK
  ctx.response.body = "pong"
  ctx.response.headers.set(Header.ContentType, ContentType.Text)
}

export default Ping
