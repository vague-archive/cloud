import { CTX, Layout, RequestContext } from "@web"
import { SupportEmailLink } from "@web/component"

function DisabledPage(ctx: RequestContext) {
  CTX.authorize(ctx, "disabled")
  return (
    <Layout.Page ctx={ctx} title="Disabled" page="disabled">
      <h1>Sorry, your account has been disabled</h1>
      <p>
        Please contact <SupportEmailLink />
      </p>
    </Layout.Page>
  )
}

export default {
  Page: DisabledPage,
}
