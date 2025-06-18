import { contentType } from "@std/media-types"
import { array, crypto } from "@lib"
import { AWS } from "@lib/aws"
import { Format } from "@lib/format"
import { Status } from "@lib/http"
import { logger, sanitizeAlertWords } from "@lib/logger"
import { Domain } from "@domain"
import { MinionsContext } from "@minions"

//=================================================================================================
// UPLOAD single file
//=================================================================================================

interface S3UploadData {
  name: "s3:upload"
  bucket: string
  path: string
}

async function S3Upload(data: S3UploadData, ctx: MinionsContext) {
  const bucket = data.bucket
  const path = data.path
  const domain = ctx.domain
  const aws = ctx.aws
  return await upload({
    bucket,
    path,
    domain,
    aws,
  })
}

//=================================================================================================
// UPLOAD bulk list of files
//=================================================================================================

interface S3UploadBulkData {
  name: "s3:upload:bulk"
  bucket: string
  paths: string[]
  concurrency?: number
  shuffle?: boolean
}

async function S3UploadBulk(data: S3UploadBulkData, ctx: MinionsContext) {
  const bucket = data.bucket
  const concurrency = data.concurrency ?? 50 // also limited by WorkerDefault.concurrency
  if (concurrency > 1) {
    const paths = data.shuffle === false ? data.paths : array.shuffle(data.paths) // simple (but naive) way to distribute large/small files across concurrent chunks
    const chunks = array.chunk(paths, { count: concurrency })
    for (const chunk of chunks) {
      await ctx.domain.minions.enqueue({
        name: "s3:upload:bulk",
        bucket,
        paths: chunk,
        concurrency: 1,
      })
    }
    return {
      bucket,
      chunks,
      concurrency,
    }
  }

  const uploaded: string[] = []
  const unmodified: string[] = []
  const missing: string[] = []

  for (const path of data.paths) {
    try {
      const result = await upload({ bucket, path: path, domain: ctx.domain, aws: ctx.aws })
      if (result.result === "uploaded") {
        uploaded.push(path)
      } else if (result.result === "unmodified") {
        unmodified.push(path)
      } else if (result.result === "missing") {
        missing.push(path)
      }
    } catch (err) {
      logger.error(`error uploading ${path} to S3 bucket ${bucket} - ${err}`)
    }
  }

  return {
    bucket,
    uploaded,
    unmodified,
    missing,
  }
}

//=================================================================================================
// HELPER METHODS
//=================================================================================================

async function upload({ bucket, path, domain, aws }: {
  bucket: string
  path: string
  domain: Domain
  aws: AWS
}) {
  const filename = path
  const key = path

  const loader = await domain.filestore.load(filename)
  if (loader.status === Status.NotFound) {
    logger.warn(`${filename} not uploaded to S3 bucket ${bucket} because it no longer exists in the file system`)
    return { result: "missing", bucket, path, uploadedOn: undefined }
  } else if (loader.status !== Status.OK) {
    throw new Error(`unexpected status ${loader.status} when loading file ${filename}`)
  }

  const content = await loader.bytes()
  const etag = `"${await crypto.hash(content, "MD5")}"`

  const head = await aws.s3HeadObject({ bucket, key })
  if (head && (head.ContentLength === content.length) && (head.ETag === etag)) {
    // TODO: why does this cause a leak in the unit test ???
    // logger.warn(
    //   `${filename} not uploaded to S3 bucket ${bucket} because it already exists with the same path, content-length, and etag`,
    // )
    return { result: "unmodified", bucket, path, uploadedOn: head.LastModified }
  }

  const start = Date.now()
  await aws.s3PutObject({
    bucket,
    key,
    content,
    contentType: contentType(filename),
  })
  const duration = Date.now() - start
  logger.info(`UPLOADED ${sanitizeAlertWords(key)} TO S3 ${bucket} IN ${Format.duration(duration)}`)

  return {
    result: "uploaded",
    bucket,
    path,
    uploadedOn: domain.clock.now,
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { S3Upload, S3UploadBulk, type S3UploadBulkData, type S3UploadData }
