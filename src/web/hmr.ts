import { assert } from "@lib"
import { logger, pp } from "@lib/logger"
import { RequestContext } from "@web"

export class HotModuleReloader extends EventTarget {
  readonly enabled: boolean
  private handler: (e: Event) => void
  private watcher?: Deno.FsWatcher
  private sockets: WebSocket[]

  //-----------------------------------------------------------------------------------------------

  constructor(enabled: boolean) {
    super()
    this.enabled = enabled
    this.handler = (e: Event) => this.onHmr(e as CustomEvent)
    this.sockets = []
  }

  //-----------------------------------------------------------------------------------------------

  start() {
    if (this.enabled) {
      logger.info("enabled hot module reloading")
      addEventListener("hmr", this.handler)
      this.watcher = Deno.watchFs("src/web/assets")
      /* DON'T await */ this.watchAssets()
    }
  }

  stop() {
    if (this.enabled) {
      logger.info("disabled hot module reloading")
      removeEventListener("hmr", this.handler)
      this.watcher?.close()
      this.sockets.forEach((s) => s.close())
    }
  }

  //-----------------------------------------------------------------------------------------------

  connect(ctx: RequestContext) {
    if (this.enabled) {
      assert.true(ctx.isUpgradable)
      const socket = ctx.upgrade()
      socket.onopen = () => {
        logger.info("hmr websocket connected")
        this.addSocket(socket)
      }
      socket.onclose = () => {
        logger.info("hmr websocket closed")
        this.removeSocket(socket)
      }
      socket.onerror = (err) => {
        logger.error(`hmr websocket error ${pp(err)}`)
        this.removeSocket(socket)
      }
    }
  }

  private addSocket(socket: WebSocket) {
    const index = this.sockets.indexOf(socket)
    if (index === -1) {
      this.sockets.push(socket)
    }
  }

  private removeSocket(socket: WebSocket) {
    const index = this.sockets.indexOf(socket)
    if (index > -1) {
      this.sockets.splice(index, 1)
    }
  }

  //-----------------------------------------------------------------------------------------------

  private onHmr(event: CustomEvent) {
    if (this.enabled) {
      this.reload(event.detail)
    }
  }

  private reload<D>(detail: D) {
    logger.info(`hmr ${pp(detail)}`)
    this.sockets.forEach((s) => s.send("reload"))
    this.dispatchEvent(new CustomEvent("reload", { detail }))
  }

  //-----------------------------------------------------------------------------------------------

  private async watchAssets() {
    assert.true(this.enabled)
    assert.present(this.watcher)
    for await (const event of this.watcher) {
      if (event.kind === "modify") {
        this.reload(event)
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
}
