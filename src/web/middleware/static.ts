import { exists, expandGlob } from "@std/fs"
import { join, relative } from "@std/path"
import { Middleware, send } from "@web"

interface StaticServerOptions {
  root: string
}

interface Entry {
  path: string
  redirect?: boolean
}

export async function StaticServer({ root }: StaticServerOptions): Promise<Middleware> {
  const glob = `${root}/**/*`
  const files: Record<string, Entry> = {}

  const makePath = (path: string) => `/${relative(root, path)}`

  for await (const entry of expandGlob(glob)) {
    if (entry.isDirectory) {
      if (await exists(join(entry.path, "index.html"))) {
        const path = makePath(entry.path)
        const withTrailingSlash = `${path}/`
        const index = `${path}/index.html`
        files[path] = { path: withTrailingSlash, redirect: true }
        files[withTrailingSlash] = { path: index }
      }
    } else {
      const path = makePath(entry.path)
      files[path] = { path }
    }
  }

  return async (ctx, next) => {
    const entry = files[ctx.request.url.pathname]
    if (entry) {
      if (entry.redirect) {
        ctx.response.redirect(entry.path)
      } else {
        await send(ctx, entry.path, {
          root,
        })
      }
    } else {
      await next()
    }
  }
}
