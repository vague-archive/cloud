import { bullmq, Redis } from "@deps"
import { logger, pp } from "@lib/logger"

//=================================================================================================
// BACKGROUND WORKER
//=================================================================================================

interface WorkerOptions {
  concurrency?: number
  removeOnComplete?: bullmq.KeepJobs
  removeOnFail?: bullmq.KeepJobs
}

const WorkerDefault = {
  concurrency: 50,
  removeOnComplete: { count: 1000 },
  removeOnFail: undefined,
}

type Handler<Data, Result, Context> = (data: Data, context: Context) => Result | Promise<Result>

//=================================================================================================
// BUILD a background worker (using Redis and BullMQ)
//=================================================================================================

function buildWorker<Data, Result, Context>(
  connectionUrl: string,
  queueName: string,
  handler: Handler<Data, Result, Context>,
  context: Context,
  options?: WorkerOptions,
) {
  const redis = new Redis(connectionUrl, {
    maxRetriesPerRequest: null, // https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
  })

  const worker = new bullmq.Worker(queueName, async (job: bullmq.Job) => await handler(job.data, context), {
    autorun: false,
    connection: redis,
    concurrency: options?.concurrency ?? WorkerDefault.concurrency,
    removeOnComplete: options?.removeOnComplete ?? WorkerDefault.removeOnComplete,
    removeOnFail: options?.removeOnFail ?? WorkerDefault.removeOnFail,
  })

  worker.on("closed", () => {
    redis.disconnect()
  })

  const log = (msg: string) => logger.info(`${queueName} ${msg}`)

  worker.on("ready", () => log(`WORKER READY`))
  worker.on("paused", () => log(`QUEUE PAUSED`))
  worker.on("resumed", () => log(`QUEUE RESUMED`))
  worker.on("closing", () => log(`WORKER CLOSING`))
  worker.on("closed", () => log(`WORKER CLOSED`))
  worker.on("error", (err) => log(`WORKER ERROR ${err}`))
  worker.on("active", (job) => log(`JOB STARTED ${pp(job.data)}`))
  worker.on("completed", (job, result) => log(`JOB COMPLETED ${pp(job.data)} RESULT ${pp(result)}`))
  worker.on("failed", (job, err) => log(`JOB FAILED ${pp(job?.data)} ERROR ${err}`))

  return worker
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { buildWorker }
