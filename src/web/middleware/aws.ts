import { CTX, NextFn, RequestContext } from "@web"

//-------------------------------------------------------------------------------------------------

export function AwsLoadBalancer() {
  return async (ctx: RequestContext, next: NextFn) => {

    // When we run behind a load balancer the request URL (and hence the ctx.request.url) might
    // not match the public facing URL, but it's very natural for us to want to use it for
    // context when generating full path urls...
    //
    // The oak framework tries to take care of this by respecting any
    // X-Forwarded-Proto and X-Forwarded-For headers and adjusting ctx.request.url to
    // respect them... (e.g. see https://github.com/oakserver/oak/blob/3896fe568b25ac0b4c5afbf822ff8344c3d1712a/request.ts#L119)
    //
    // HOWEVER, when we run behind an AWS NLB (network load balancer) no X-Forwarded headers
    // are generated, so we can't rely on them
    //
    // SO, - while it's not ideal - lets just force the expected `config.web.publicUrl`
    // protocol, host, and port (which in turn are set by the URL_SCHEME, URL_HOST, and URL_PORT
    // environment variables)
    //
    // SIDE NOTE: if we run behind an AWS ALB (application load balancer) the X-Forwarded headers
    // ARE generated and we would not need this hack, however an ALB buffers the request body and
    // does not support streaming which adds a significant performance hit to our "upload" endpoint
    // so we're using an NLB instead of an ALB

    const config = CTX.config(ctx)
    ctx.request.url.protocol = config.web.publicUrl.protocol
    ctx.request.url.hostname = config.web.publicUrl.hostname
    ctx.request.url.port     = config.web.publicUrl.port
    await next()
  }
}

//-------------------------------------------------------------------------------------------------
