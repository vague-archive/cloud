import { Config } from "@config"
import { assert } from "@lib"
import { AWS } from "@lib/aws"
import { Domain } from "@domain"

import { buildQueue, Queue } from "./minions/queue.ts"
import { buildWorker } from "./minions/worker.ts"
import { RemoveDirectory, RemoveDirectoryData } from "./minions/file/rmdir.ts"
import { DeployCleanup, DeployCleanupData } from "./minions/game/deployCleanup.ts"
import { S3RemoveDirectory, S3RemoveDirectoryData } from "./minions/s3/rmdir.ts"
import { S3Delete, S3DeleteData } from "./minions/s3/delete.ts"
import { S3Upload, S3UploadBulk, S3UploadBulkData, S3UploadData } from "./minions/s3/upload.ts"

const MinionsQueueName = "minions"

interface MinionsContext {
  domain: Domain
  aws: AWS
}

type MinionsData =
  | RemoveDirectoryData
  | DeployCleanupData
  | S3RemoveDirectoryData
  | S3DeleteData
  | S3UploadData
  | S3UploadBulkData

type MinionsQueue = Queue<MinionsData>

async function MinionsHandler(data: MinionsData, ctx: MinionsContext) {
  switch (data.name) {
    case "file:rmdir":
      return await RemoveDirectory(data as RemoveDirectoryData, ctx)
    case "deploy:cleanup":
      return await DeployCleanup(data as DeployCleanupData, ctx)
    case "s3:rmdir":
      return await S3RemoveDirectory(data as S3RemoveDirectoryData, ctx)
    case "s3:delete":
      return await S3Delete(data as S3DeleteData, ctx)
    case "s3:upload":
      return await S3Upload(data as S3UploadData, ctx)
    case "s3:upload:bulk":
      return await S3UploadBulk(data as S3UploadBulkData, ctx)
    default:
      assert.unreachable(data)
  }
}

//=================================================================================================
// BUILDERS
//=================================================================================================

function buildMinionsQueue(connectionUrl: string) {
  return buildQueue(connectionUrl, MinionsQueueName)
}

async function buildMinionsWorker(config: Config) {
  const connectionUrl = config.redis.workers.url
  const domain = await Domain.configure(config)
  const aws = new AWS(config.aws)
  const context = { aws, domain }
  const worker = buildWorker(connectionUrl, MinionsQueueName, MinionsHandler, context)
  worker.on("closed", async () => {
    await domain.close()
  })
  return worker
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  buildMinionsQueue,
  buildMinionsWorker,
  type MinionsContext,
  type MinionsData,
  type MinionsQueue,
  MinionsQueueName,
}
