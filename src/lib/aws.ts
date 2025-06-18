import { awsClient, S3 } from "@deps"
import { delay } from "@std/async"
import { crypto } from "@lib"
import { logger, sanitizeAlertWords } from "@lib/logger"

const MAX_RETRIES = 5

export type AwsCredentials = awsClient.Credentials

export class AWS {
  private api: awsClient.ApiFactory
  private s3: S3

  constructor(config: {
    region: string
    credentials?: AwsCredentials
  }) {
    this.api = new awsClient.ApiFactory(config)
    this.s3 = this.api.makeNew(S3)
  }

  async verifyCredentials() {
    await this.api.ensureCredentialsAvailable()
  }

  async s3HeadObject({
    bucket,
    key,
  }: {
    bucket: string
    key: string
  }) {
    try {
      return await this.s3.headObject({
        Bucket: bucket,
        Key: encodeS3Key(key),
      })
    } catch (e) {
      if (e instanceof awsClient.AwsServiceError && (e.code === "Http404" || e.code === "NoSuchKey")) {
        return undefined
      }
      throw e
    }
  }

  async s3GetObject({
    bucket,
    key,
  }: {
    bucket: string
    key: string
  }) {
    try {
      return await this.s3.getObject({
        Bucket: bucket,
        Key: encodeS3Key(key),
      })
    } catch (e) {
      if (e instanceof awsClient.AwsServiceError && e.code === "NoSuchKey") {
        return undefined
      }
      throw e
    }
  }

  async s3PutObject({
    bucket,
    key,
    content,
    contentType,
    retries,
  }: {
    bucket: string
    key: string
    content: Uint8Array
    contentType?: string
    retries?: number
  }) {
    retries = retries ?? MAX_RETRIES
    try {
      await this.s3.putObject({
        Bucket: bucket,
        Key: encodeS3Key(key),
        Body: content,
        ContentType: contentType,
        ContentMD5: await crypto.base64md5(content),
      })
    } catch (error) {
      if (retries > 0) {
        logger.warn(`RETRYING S3 UPLOAD ${key} RETRIES REMAINING: ${retries}`)
        await delay(1000 * (MAX_RETRIES - retries))
        await this.s3PutObject({ bucket, key, content, contentType, retries: retries - 1 })
      } else {
        throw error
      }
    }
  }

  async s3ListObjects({
    bucket,
    prefix,
  }: {
    bucket: string
    prefix: string
  }) {
    return await this.s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
    })
  }

  // USE WITH EXTREME CAUTION
  async s3AllKeys({
    bucket,
    prefix,
  }: {
    bucket: string
    prefix?: string
  }) {
    const keys: string[] = []
    let shouldContinue = true
    let continuationToken: string | null | undefined = undefined
    while (shouldContinue) {
      const result = await this.s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
      result.Contents.forEach((c) => keys.push(c.Key!))
      if (!result.IsTruncated) {
        shouldContinue = false
      } else {
        continuationToken = result.NextContinuationToken
      }
    }
    return keys
  }

  // USE WITH EXTREME CAUTION
  async s3Stats({
    bucket,
    prefix,
  }: {
    bucket: string
    prefix?: string
  }) {
    let count = 0
    let bytes = 0
    let shouldContinue = true
    let continuationToken: string | null | undefined = undefined
    while (shouldContinue) {
      const result = await this.s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
      result.Contents.forEach((c) => {
        count = count + 1
        bytes = bytes + (c.Size || 0)
      })
      if (!result.IsTruncated) {
        shouldContinue = false
      } else {
        continuationToken = result.NextContinuationToken
      }
    }
    return { bucket, prefix, count, bytes }
  }

  async s3DeleteObjects({
    bucket,
    keys,
  }: {
    bucket: string
    keys: string[]
  }) {
    return await this.s3.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((k) => ({ Key: k })),
      },
    })
  }

  async s3RemoveDirectory({
    bucket,
    prefix,
  }: {
    bucket: string
    prefix: string
  }): Promise<void> {
    const objects = await this.s3ListObjects({ bucket, prefix })
    const keys = objects.Contents.map((c) => c.Key!)
    if (keys.length > 0) {
      logger.warn(`REMOVING ${keys.length} S3 OBJECTS`)
      keys.forEach((key) => logger.warn(`REMOVING S3 OBJECT ${sanitizeAlertWords(key)}`))
      await this.s3DeleteObjects({ bucket, keys: keys })
      if (objects.IsTruncated) {
        return await this.s3RemoveDirectory({ bucket, prefix })
      }
    }
  }
}

export function encodeS3Key(key: string) {
  // filenames with () parens cause the following error
  //  "ERROR AwsServiceError: SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided. Check your key and signing
  // so we explicitly encode them here
  //
  // see "characters that might require special handling"
  // - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
  return key
    .replace(/\(/g, "%28") // replace ( with %28
    .replace(/\)/g, "%29") // replace ) with %29
}
