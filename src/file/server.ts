import { oak } from "@deps"
import { copy } from "@std/io"
import { dirname, join, normalize } from "@std/path"
import { walk } from "@std/fs"
import { Untar } from "@std/archive"
import { array, assert } from "@lib"
import { AWS } from "@lib/aws"
import { Format } from "@lib/format"
import { logger, pp, sanitizeAlertWords } from "@lib/logger"
import { ContentType, Header, HttpError, Method, Status, StatusText } from "@lib/http"
import { StreamReader } from "@lib/stream"
import { ErrorHandler, WebLogger } from "@web"
import { MinionsQueue } from "@minions"

//=================================================================================================
// TYPES
//=================================================================================================

interface FileServerConfig {
  host: string
  port: number
  root: string
  signingKey: string
  aws?: AWS
  bucket?: string
  minions: MinionsQueue
}

interface FileServerState {
  root: string
  aws?: AWS
  bucket?: string
  minions: MinionsQueue
}

type NoRoute = "none"
type UnknownRoute = "unknown"

type FileServerContext<R extends string = NoRoute, S extends FileServerState = FileServerState> =
  R extends NoRoute
    ? oak.Context<S>
    : R extends UnknownRoute
      ? oak.RouterContext<string, oak.RouteParams<string>, S>
      : oak.RouterContext<R, oak.RouteParams<R>, S>

type WithPath = "/:path+"

//=================================================================================================
// LOAD
//=================================================================================================

async function Load(ctx: FileServerContext<WithPath>) {
  const command = ctx.request.headers.get(Header.CustomCommand) ?? "get"
  switch (command) {
    case "get":
      return await LoadFile(ctx)
    case "ls":
      return await ListDirectory(ctx)
    default:
      throw new Error(`unexpected command ${command}`)
  }
}

async function LoadFile(ctx: FileServerContext<WithPath>) {
  const { bucket, aws, root } = ctx.state
  const path = ctx.params.path
  assert.present(path)
  try {
    if (await unmodified(ctx, path)) {
      ctx.response.status = Status.NotModified
    } else {
      ctx.response.status = Status.OK
      await ctx.send({
        path,
        root,
      })
    }
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      if (aws && bucket) {
        const result = await aws.s3GetObject({
          bucket,
          key: path,
        })
        if (result?.Body) {
          logger.warn(`[FILE] DOWNLOADED MISSING FILE ${path} FROM S3 BUCKET ${bucket}`)
          const filename = join(root, path)
          await Deno.mkdir(dirname(filename), { recursive: true })
          await Deno.writeFile(filename, result.Body)
          ctx.response.status = Status.OK
          await ctx.send({
            path,
            root,
          })
          return
        }
      }
      ctx.response.status = Status.NotFound
      ctx.response.body = StatusText[Status.NotFound]
    } else {
      throw err
    }
  }
}

async function ListDirectory(ctx: FileServerContext<WithPath>) {
  const path = ctx.params.path
  const root = ctx.state.root
  assert.present(path)
  const directory = join(root, path, "/")
  const entries: string[] = []
  for await (const entry of walk(directory)) {
    if (entry.isFile) {
      entries.push(entry.path.replace(join(root, path, "/"), ""))
    }
  }
  entries.sort()
  ctx.response.status = Status.OK
  ctx.response.headers.set(Header.ContentType, ContentType.Json)
  ctx.response.body = JSON.stringify(entries)
}

async function unmodified(ctx: FileServerContext<WithPath>, path: string) {
  const str = ctx.request.headers.get(Header.IfModifiedSince)
  const ifModifiedSince = str ? new Date(str) : undefined
  if (ifModifiedSince) {
    const filename = join(ctx.state.root, path)
    const fileinfo = await stat(filename)
    if (fileinfo && fileinfo.mtime) {
      const lastModified = fileinfo.mtime
      return (lastModified <= ifModifiedSince)
    }
  }
  return false
}

//=================================================================================================
// SAVE SINGLE FILE or EXTRACT ARCHIVE
//=================================================================================================

async function Save(ctx: FileServerContext<WithPath>) {
  const command = ctx.request.headers.get(Header.CustomCommand) ?? "save"
  switch (command) {
    case "save":
      return await saveFile(ctx)
    case "extract":
      return await extractArchive(ctx)
    default:
      throw new Error(`unexpected command ${command}`)
  }
}

async function saveFile(ctx: FileServerContext<WithPath>) {
  assert.present(ctx.request.body.stream)
  assert.present(ctx.params.path)

  const { bucket, minions, root } = ctx.state
  const path = ctx.params.path
  const filename = join(root, path)
  await Deno.mkdir(dirname(filename), { recursive: true })
  await Deno.writeFile(filename, ctx.request.body.stream)
  if (bucket) {
    await minions.enqueue({ name: "s3:upload", bucket, path })
  }
  ctx.response.status = Status.OK
  ctx.response.body = "saved"
}

async function extractArchive(ctx: FileServerContext<WithPath>) {
  assert.present(ctx.request.body.stream)
  assert.present(ctx.params.path)

  const { bucket, minions, root } = ctx.state
  const basePath = ctx.params.path
  const stream = ctx.request.body.stream.pipeThrough(new DecompressionStream("gzip"))
  const reader = new StreamReader(stream.getReader())
  const archive = new Untar(reader)

  const manifest: { path: string; size: number }[] = []

  const start = Date.now()
  logger.info(`EXTRACT ARCHIVE ${join(root, basePath)}`)
  for await (const entry of archive) {
    if (entry.type === "file") {
      try {
        const path = normalize(join(basePath, entry.fileName))
        const filename = join(root, path)

        await Deno.mkdir(dirname(filename), { recursive: true })
        using file = await Deno.open(filename, { create: true, write: true, truncate: true })
        logger.info(`EXTRACTING ${sanitizeAlertWords(filename)}`)
        await copy(entry, file)

        const contentLength = entry.fileSize
        assert.present(contentLength)
        manifest.push({ path: entry.fileName, size: contentLength })
      } catch (err) {
        if (err instanceof Error) {
          logger.error([
            `Failed to extract ${entry.fileName} - ${err.name} - ${err.message}: ${pp(entry)}`,
            err.stack ? err.stack.split("\n").slice(1).join("\n") : undefined,
          ].join("\n"))
        } else {
          logger.error(`Failed to extract ${entry.fileName} - ${err.toString()}: ${pp(entry)}`)
        }
      }
    }
  }
  const duration = Date.now() - start
  logger.info(`EXTRACTED ARCHIVE ${join(root, basePath)} IN ${Format.duration(duration)}`)

  assert.true(manifest.length > 0, "game archive contained no entries")

  await Deno.writeTextFile(join(root, basePath, "void.manifest.json"), JSON.stringify(manifest))

  if (bucket) {
    const paths = manifest.map(({ path }) => join(basePath, path))
    paths.push(join(basePath, "void.manifest.json"))
    await minions.enqueue({ name: "s3:upload:bulk", bucket, paths })
  }

  ctx.response.status = Status.OK
  ctx.response.body = `${basePath} archive extracted`
}

//=================================================================================================
// DELETE FILE OR DIRECTORY
//=================================================================================================

async function Delete(ctx: FileServerContext<WithPath>) {
  const command = ctx.request.headers.get(Header.CustomCommand) ?? "delete"
  const { bucket, minions } = ctx.state
  const path = ctx.params.path ?? ""
  const filename = join(ctx.state.root, path)
  const fileinfo = await stat(filename)
  if (fileinfo) {
    await Deno.remove(filename, { recursive: true })
    ctx.response.status = Status.OK
    ctx.response.body = `${path} deleted`
    if (bucket) {
      await minions.enqueue({ name: command === "rmdir" ? "s3:rmdir" : "s3:delete", bucket, path })
    }
  } else {
    ctx.response.status = Status.NotFound
    ctx.response.body = StatusText[Status.NotFound]
  }
}

//=================================================================================================
// STATS
//=================================================================================================

async function Stats(ctx: FileServerContext) {
  const { aws, bucket, root } = ctx.state
  const start = Date.now()
  logger.warn(`CALCULATING FILE STATS FOR ${root} AND BUCKET ${bucket}- DONT DO THIS FREQUENTLY`)

  const [ local, s3 ] = await Promise.all([
    localStats(root),
    s3Stats(aws, bucket),
  ])

  const duration = Date.now() - start
  logger.warn(`CALCULATED DISK SPACE FOR ${root} IN ${Format.duration(duration)}`)

  ctx.response.status = Status.OK
  ctx.response.headers.set(Header.ContentType, ContentType.Json)
  ctx.response.body = JSON.stringify({
    local,
    s3,
  })
}

async function localStats(root: string): Promise<{ root: string, count: number, bytes: number }> {
  const td = new TextDecoder()

  // Spawn two processes - find and wc to get file count
  const find = new Deno.Command("find", {
    args: [
      `${root}`,
      "-type",
      "f",
    ],
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const wc = new Deno.Command("wc", {
    args: [
      "-l",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn()

  // Get writer for wc and pipe in output from find
  const writer = wc.stdin;
  await find.stdout.pipeTo(writer)
  const findCode = (await find.status).code
  assert.true(findCode === 0, `Failed to read filesystem: '${td.decode((await find.stderr.getReader().read()).value)}'`)
  const wcOut = await wc.output()
  assert.true(wcOut.code === 0, `Failed to parse file list: ${td.decode(wcOut.stderr)}`)

  // Decode output and parse to int
  const out = td.decode(wcOut.stdout).trim();
  const count = parseInt(out)

  // Spawn du to read disk usage, no piping necessary so can use async version of output
  const du = await new Deno.Command("du", {
    args: [
      "-s",
      "-k",
      `${root}`,
    ],
  }).output()
  assert.true(du.code === 0, `Failed to read disk usage: ${td.decode(du.stderr)}`)

  // Decode output and parse to int
  // du measures disk usage in 512 byte chunks, so multiply to get size in bytes
  const duOut = td.decode(du.stdout)
  const bytes = parseInt(duOut.split(/\s/)[0]) * 1024
  
  return {
    root,
    bytes,
    count,
  }
}

async function s3Stats(aws: AWS | undefined, bucket: string | undefined): Promise<{ bucket: string, count: number, bytes: number } | undefined> {
  if (aws && bucket) {
    return await aws.s3Stats({bucket})
  }
}

//=================================================================================================
// S3 DIFF - USE WITH EXTREME CAUTION - IT WILL QUERY THE ENTIRE FILE STORE AND S3 BUCKET
//=================================================================================================

async function Diff(ctx: FileServerContext) {
  const { aws, bucket, root } = ctx.state
  const td = new TextDecoder()

  if (!aws || !bucket) {
    ctx.response.status = Status.BadRequest
    ctx.response.body = "not configured with S3 bucket"
    return
  }

  const start = Date.now()
  logger.warn(`CALCULATING DIFF BETWEEN ${root} AND S3 BUCKET ${bucket} - SLOW AND HEAVY - DONT DO THIS FREQUENTLY`)

  const find = await (new Deno.Command("find", {
    args: [ `${root}`, "-type", "f", "-printf", "%P\n" ],
  }).output());
  assert.true(find.success, `Failed to parse file list: ${td.decode(find.stderr)}`)

  const local  = td.decode(find.stdout).trim().split("\n")
  const remote = (await aws.s3AllKeys({ bucket }))

  const { missingLocal, missingRemote } = array.compare(local, remote)

  const duration = Date.now() - start
  logger.warn(`CALCULATED DIFF BETWEEN ${root} AND S3 BUCKET ${bucket} IN ${Format.duration(duration)}`)
  logger.info(`MISSING LOCAL: ${pp(missingLocal)}`)
  logger.info(`MISSING REMOTE: ${pp(missingRemote)}`)

  ctx.response.status = Status.OK
  ctx.response.headers.set(Header.ContentType, ContentType.Json)
  ctx.response.body = JSON.stringify({
    root,
    bucket,
    missingLocal,
    missingRemote,
  })

}

//=================================================================================================
// PING
//=================================================================================================

function Ping(ctx: FileServerContext) {
  ctx.response.status = Status.OK
  ctx.response.body = "pong"
  ctx.response.headers.set(Header.ContentType, ContentType.Text)
}

//=================================================================================================
// HELPER METHODS
//=================================================================================================

async function stat(path: string) {
  try {
    return await Deno.stat(path)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return undefined
    } else {
      throw error
    }
  }
}

//=================================================================================================
// FILE SERVER
//=================================================================================================

class FileServer {
  readonly app: oak.Application<FileServerState>
  readonly host: string
  readonly port: number

  constructor(config: FileServerConfig) {
    const app = new oak.Application<FileServerState>({
      keys: [config.signingKey],
    })

    const weblogger = WebLogger({
      prefix: "[FILESERVER] ",
      loggable: (request) => {
        return request.method !== Method.GET
      },
    })

    const router = new oak.Router()
    router.get("/ping", Ping)
    router.get("/stats", Stats)
    router.get("/diff", Diff)
    router.get("/:path+", Load)
    router.post("/:path+", Save)
    router.delete("/:path+", Delete)

    app.use(async (ctx, next) => {
      ctx.state.root = config.root
      ctx.state.bucket = config.bucket
      ctx.state.aws = config.aws
      ctx.state.minions = config.minions
      await next()
    })
    app.use(ErrorHandler({ exposeInternalServerError: true }))
    app.use(weblogger)
    app.use(router.routes())
    app.use(router.allowedMethods())

    this.host = config.host
    this.port = config.port
    this.app = app
  }

  async start(controller: AbortController) {
    await this.app.listen({
      hostname: this.host,
      port: this.port,
      signal: controller.signal,
    })
  }

  async handle(request: Request) {
    return await this.app.handle(request)
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { FileServer }

//-------------------------------------------------------------------------------------------------
