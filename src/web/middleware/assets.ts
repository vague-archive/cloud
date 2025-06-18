import { extname, join } from "@std/path"
import { exists } from "@std/fs"
import { logger } from "@lib/logger"
import { ContentType, Header, NotFoundError } from "@lib/http"
import { HotModuleReloader, Middleware } from "@web"
import { build } from "@task"

const SOURCE = "src/web"
const PREFIX = "/assets/"
const isAsset = (path: string) => path.startsWith(PREFIX)

//-------------------------------------------------------------------------------------------------

export function Assets(hmr: HotModuleReloader): Middleware {
  const cache = new Map<string, string>()

  hmr.addEventListener("reload", () => {
    cache.clear()
  })

  return async (ctx, next) => {
    const path = ctx.request.url.pathname
    if (!isAsset(path)) {
      return await next()
    }

    if (!await exists(join(SOURCE, path))) {
      throw new NotFoundError(path)
    }

    const compiler = getCompiler(path)
    const cached = cache.get(path)
    if (!cached) {
      logger.info(`REGENERATING ${path}`)
      cache.set(path, await compiler.compile(path))
    }
    ctx.response.body = cache.get(path)
    ctx.response.headers.set(Header.ContentType, compiler.contentType)
  }
}

//-------------------------------------------------------------------------------------------------

interface Compiler {
  compile: (path: string) => Promise<string>
  contentType: string
}

const compilers: Record<string, Compiler> = {
  [".css"]: {
    compile: build.compileStyles,
    contentType: ContentType.Css,
  },
  [".ts"]: {
    compile: build.compileScript,
    contentType: ContentType.Javascript,
  },
}

function getCompiler(path: string) {
  const compiler = compilers[extname(path)]
  if (!compiler) {
    throw new Error(`no compiler found for ${path}`)
  }
  return compiler
}

//-------------------------------------------------------------------------------------------------
