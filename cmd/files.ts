import { config } from "@config"
import { AWS } from "@lib/aws"
import { logger } from "@lib/logger"
import { FileServer } from "@file"
import { buildMinionsQueue } from "@minions"

const host = config.filestore.host
const port = config.filestore.port
const root = config.filestore.root
const bucket = config.filestore.bucket
const signingKey = config.keys.signingKey
const aws = new AWS(config.aws)
const minions = buildMinionsQueue(config.redis.workers.url)

const controller = new AbortController()
const server = new FileServer({
  host,
  port,
  root,
  bucket,
  signingKey,
  aws,
  minions,
})

server.app.addEventListener("listen", ({ hostname, port }) => {
  logger.info(`Fileserver listening on http://${hostname}:${port}`)
  logger.info(`Fileserver access on ${config.filestore.url}`)
  logger.info(`Fileserver S3 bucket: ${aws && bucket ? bucket : "disabled"}`)
})

server.app.addEventListener("close", async () => {
  logger.info(`[${controller.signal.reason}] Shutting down...`)
  logger.info(`Fileserver closed`)
  await minions.close()
  Deno.exit()
})

Deno.addSignalListener("SIGINT", () => controller.abort("SIGINT"))
Deno.addSignalListener("SIGTERM", () => controller.abort("SIGTERM"))
Deno.addSignalListener("SIGQUIT", () => controller.abort("SIGQUIT"))

server.start(controller)
