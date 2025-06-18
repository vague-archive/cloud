import { MinionsContext } from "@minions"

interface S3DeleteData {
  name: "s3:delete"
  path: string
  bucket: string
}

async function S3Delete(data: S3DeleteData, ctx: MinionsContext) {
  await ctx.aws.s3DeleteObjects({
    bucket: data.bucket,
    keys: [data.path],
  })
  return {
    bucket: data.bucket,
    path: data.path,
    deletedOn: ctx.domain.clock.now,
  }
}

export { S3Delete, type S3DeleteData }
