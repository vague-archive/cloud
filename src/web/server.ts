import { Config } from "@config"
import { Domain } from "@domain"
import { Firewall } from "@web/middleware/firewall.ts"
import { AwsLoadBalancer } from "@web/middleware/aws.ts"
import { StaticServer } from "@web/middleware/static.ts"
import { WebLogger } from "@web/middleware/logger.ts"
import { Assets } from "@web/middleware/assets.ts"
import { ErrorHandler } from "@web/middleware/errors.ts"
import { Maintenance } from "@web/middleware/maintenance.ts"
import { Manifest } from "@web/manifest.ts"
import { buildRouter } from "@web/router"
import { HotModuleReloader } from "@web/hmr.ts"
import { Application, newApplication } from "@web"
import { OAuthProviders } from "@web/oauth.ts"
import { oakCors } from "@deps"

//=================================================================================================
// SERVER
//=================================================================================================

export class Server {
  readonly app: Application
  readonly hmr: HotModuleReloader
  readonly config: Config

  private constructor(app: Application, hmr: HotModuleReloader, config: Config) {
    this.app = app
    this.hmr = hmr
    this.config = config
  }

  async start(controller: AbortController) {
    this.hmr.start()
    this.app.addEventListener("close", () => {
      this.hmr.stop()
    })
    if (this.config.web.secure && this.config.web.certFile && this.config.web.keyFile) {
      await this.app.listen({
        hostname: this.config.web.host,
        port: this.config.web.port,
        signal: controller.signal,
        cert: Deno.readTextFileSync(this.config.web.certFile!),
        key: Deno.readTextFileSync(this.config.web.keyFile!),
        secure: true,
      })
    } else {
      await this.app.listen({
        hostname: this.config.web.host,
        port: this.config.web.port,
        signal: controller.signal,
      })
    }
  }

  async handle(request: Request) {
    return await this.app.handle(request)
  }

  static async configure({ config, domain, manifest }: {
    config: Config
    domain: Domain
    manifest: Manifest
  }) {
    const { signingKey } = config.keys
    const { publicRoot, trustProxyHeaders } = config.web
    const hmr = new HotModuleReloader(config.web.hmr)
    const { router, route } = buildRouter(config.web.publicUrl, hmr)
    const oauth = new OAuthProviders({
      github: config.github.oauth,
      discord: config.discord.oauth,
    })

    const app = newApplication({
      keys: [signingKey],
      proxy: trustProxyHeaders,
      state: {
        config,
        domain,
        manifest,
        route,
        oauth,
      },
      contextState: "prototype", // don't clone app state, we have class instances so use prototype instead
    })

    app.use(await Firewall(domain.kv))
    app.use(AwsLoadBalancer())
    app.use(ErrorHandler())
    app.use(WebLogger())
    app.use(await Maintenance(domain.kv))
    app.use(await StaticServer({ root: publicRoot }))
    app.use(Assets(hmr))
    app.use(router.routes())
    app.use(oakCors())
    app.use(router.allowedMethods())

    return new Server(app, hmr, config)
  }
}

//-------------------------------------------------------------------------------------------------
