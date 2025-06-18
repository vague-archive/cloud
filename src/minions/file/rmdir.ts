import { MinionsContext } from "@minions"

interface RemoveDirectoryData {
  name: "file:rmdir"
  path: string
}

async function RemoveDirectory(data: RemoveDirectoryData, ctx: MinionsContext) {
  await ctx.domain.filestore.rmdir(data.path)
  return {
    path: data.path,
    cleanedOn: ctx.domain.clock.now,
  }
}

export { RemoveDirectory, type RemoveDirectoryData }
