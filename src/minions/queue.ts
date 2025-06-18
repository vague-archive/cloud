import { bullmq, Redis } from "@deps"
import { logger } from "@lib/logger"

//=================================================================================================
// ABSTRACT work queue interface
//=================================================================================================

interface QueueData {
  name: string
}

interface Queue<Data extends QueueData> {
  name: string
  enqueue(data: Data): Promise<void>
  close(): Promise<void>
}

interface QueueOptions {
  attempts?: number
  backoff?: bullmq.BackoffOptions
}

const QueueDefault = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
}

//=================================================================================================
// BUILD a worker queue (using Redis and BullMQ)
//=================================================================================================

function buildQueue<Data extends QueueData>(connectionUrl: string, name: string, options?: QueueOptions): Queue<Data> {
  const redis = new Redis(connectionUrl, {
    enableOfflineQueue: false, // https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down
  })

  const queue = new bullmq.Queue<Data>(name, {
    connection: redis,
    defaultJobOptions: {
      attempts: options?.attempts ?? QueueDefault.attempts,
      backoff: options?.backoff ?? QueueDefault.backoff,
    },
  })

  queue.on("error", (err) => {
    logger.info(`QUEUE ${name} ERROR ${err}`)
  })

  const enqueue = async (arg: Data) => {
    await queue.add(arg.name, arg)
  }

  const close = async () => {
    await queue.close()
    redis.disconnect()
  }

  return {
    name,
    enqueue,
    close,
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { buildQueue, type Queue }
