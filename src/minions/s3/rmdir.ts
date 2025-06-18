import { MinionsContext } from "@minions"

interface S3RemoveDirectoryData {
  name: "s3:rmdir"
  path: string
  bucket: string
}

async function S3RemoveDirectory(data: S3RemoveDirectoryData, ctx: MinionsContext) {
  const prefix = data.path.endsWith("/") ? data.path : `${data.path}/`
  await ctx.aws.s3RemoveDirectory({
    bucket: data.bucket,
    prefix,
  })
  return {
    bucket: data.bucket,
    path: prefix,
    deletedOn: ctx.domain.clock.now,
  }
}

export { S3RemoveDirectory, type S3RemoveDirectoryData }
