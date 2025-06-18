import { join } from "@std/path"
import { config } from "@config"
import { Domain } from "@domain"
import { logger, pp } from "@lib/logger"
import { loadManifest, Server } from "@web"

const domain = await Domain.configure(config)
const manifest = await loadManifest(join(config.web.publicRoot, "assets", "manifest.json"))
const controller = new AbortController()

const server = await Server.configure({
  config,
  domain,
  manifest,
})

server.app.addEventListener("listen", ({ hostname, port, secure }) => {
  logger.info(`Listening on http${secure ? "s" : ""}://${hostname}:${port}`)
  logger.info(`Access on ${config.web.publicUrl}`)
  logger.info(`Configuration: ${pp(config)}`)
})

server.app.addEventListener("close", async () => {
  logger.info(`[${controller.signal.reason}] Shutting down...`)
  await domain.close()
  logger.info(`Server closed`)
  Deno.exit()
})

Deno.addSignalListener("SIGINT", () => controller.abort("SIGINT"))
Deno.addSignalListener("SIGTERM", () => controller.abort("SIGTERM"))
Deno.addSignalListener("SIGQUIT", () => controller.abort("SIGQUIT"))

server.start(controller)
