import { config } from "@config"
import { logger } from "@lib/logger"
import { buildMinionsWorker } from "@minions"

const worker = await buildMinionsWorker(config)

const controller = new AbortController()
controller.signal.addEventListener("abort", async () => {
  logger.info(`[${controller.signal.reason}] shutting down minions...`)
  await worker.close()
  logger.info(`minions closed`)
  Deno.exit(1)
})

Deno.addSignalListener("SIGINT", () => controller.abort("SIGINT"))
Deno.addSignalListener("SIGTERM", () => controller.abort("SIGTERM"))
Deno.addSignalListener("SIGQUIT", () => controller.abort("SIGQUIT"))

worker.run()
