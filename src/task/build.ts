import { z } from "@deps"
import { dirname, extname, join, relative } from "@std/path"
import { parse as parseJsonc } from "@std/jsonc"
import { exists } from "@std/fs"
import { crypto } from "@lib"
import { Status } from "@lib/http"
import { config } from "@config"

//-------------------------------------------------------------------------------------------------

const SOURCE = "src/web"
const PUBLIC = config.web.publicRoot
const MANIFEST = join(PUBLIC, "assets", "manifest.json")

interface Asset {
  path: string
  digest?: boolean
}

const STYLES: Asset[] = [
  { path: "assets/styles.css", digest: true },
]

const SCRIPTS = [
  { path: "assets/vendor.ts", digest: true },
  { path: "assets/script.ts", digest: true },
  { path: "assets/cloud.ts", digest: true },
]

//=================================================================================================
// BUILD TASK
//=================================================================================================

export async function build(target: string | undefined) {
  switch (target ?? "all") {
    case "styles":
      await writeManifest(await Promise.all(STYLES.map(buildStyles)), "update")
      break
    case "script":
      await writeManifest(await Promise.all(SCRIPTS.map(buildScript)), "update")
      break
    case "all":
      await writeManifest(await Promise.all(STYLES.map(buildStyles).concat(SCRIPTS.map(buildScript))), "clean")
      break
    default:
      console.error(`Unknown build target ${target}`)
      Deno.exit(1)
  }
}

async function buildStyles(asset: Asset) {
  const content = await compileStyles(asset.path)
  return await write({ asset, content })
}

async function buildScript(asset: Asset) {
  const content = await compileScript(asset.path)
  return await write({ asset, content, outExt: ".js" })
}

//=================================================================================================
// COMPILE STYLES
//=================================================================================================

import { autoprefixer, postcss, tailwind } from "@deps"
import tailwindConfig from "../../tailwind.config.ts"

export async function compileStyles(path: string) {
  const file = join(SOURCE, path)
  if (!await exists(file)) {
    throw new Error(`unable to locate ${file}`)
  }

  const plugins = [
    PostcssDenoImport(), // see comments belows
    tailwind(tailwindConfig) as postcss.Plugin,
    autoprefixer() as postcss.Plugin,
  ]
  const source = await Deno.readTextFile(file)
  const processor = postcss(plugins)
  const { content } = await processor.process(source, { from: undefined })
  return content
}

//=================================================================================================
// COMPILE SCRIPT
//=================================================================================================

import { esbuild, esbuildDenoPlugins } from "@deps"

export async function compileScript(path: string) {
  const result = await esbuild.build({
    plugins: [...esbuildDenoPlugins({
      configPath: join(Deno.cwd(), "deno.jsonc"),
    })],
    entryPoints: [
      join(SOURCE, path),
    ],
    platform: "browser",
    bundle: true,
    minify: false,
    write: false,
    format: "esm",
  })

  return result.outputFiles[0].text
}

//=================================================================================================
// HELPER METHODS
//=================================================================================================

async function write({ asset, content, outExt }: {
  asset: Asset
  content: string
  outExt?: string
}) {
  const ext = extname(asset.path)
  const digest = asset.digest ? `.${(await crypto.hash(content)).slice(0, 16)}` : "" // don't need full sha-256 digest, just a short slice will do
  const outFile = join(PUBLIC, asset.path.replace(ext, `${digest}${outExt ?? ext}`))
  const outPath = relative(PUBLIC, outFile)
  await Deno.mkdir(dirname(outFile), { recursive: true })
  await Deno.writeTextFile(outFile, content)
  console.log("BUILT", asset.path, "AS", outPath)
  return { asset, outPath } as ManifestEntry
}

//-------------------------------------------------------------------------------------------------

interface ManifestEntry {
  asset: Asset
  outPath: string
}

async function writeManifest(entries: ManifestEntry[], mode: "clean" | "update" = "update") {
  let manifest: Record<string, string> = {}
  if (mode === "update" && await exists(MANIFEST)) {
    manifest = JSON.parse(await Deno.readTextFile(MANIFEST))
  }
  for (const { asset, outPath } of entries) {
    manifest[`/${asset.path}`] = `/${outPath}`
  }
  await Deno.mkdir(dirname(MANIFEST), { recursive: true })
  await Deno.writeTextFile(MANIFEST, JSON.stringify(manifest, null, 2))
}

//=================================================================================================
// POSTCSS DENO IMPORT PLUGIN
//
// - really annoyingly, we can't rely on postcss-import to enable css bundling (in particular from
//   our @vaguevoid/design-system package), so I've hacked in a custom postcss plugin to perform a
//   minimalist css import bundling using our deno import map and manual fetch()
// - also annoyingly, we can't use deno dynamic import to load/cache the modules because it assumes
//   they are javascript/typescript, not css, so we have to reproduce some of the deno import behaviour
// - one alternative would be to vendor our design system, that might have been easier
// - another alternative would be to add a package.json and accept that we still need node for some things
// - ... starting to regret using Deno
//=================================================================================================

function PostcssDenoImport(): postcss.Plugin {
  const importer = new PostcssDenoImporter()
  return {
    postcssPlugin: "postcss-deno-import",
    async Once(root) {
      await importer.walk(root)
    },
  } as postcss.Plugin
}

//-------------------------------------------------------------------------------------------------

class PostcssDenoImporter {
  readonly imports: Record<string, string>
  readonly tokens: Record<string, string>

  constructor() {
    const content = Deno.readTextFileSync("deno.jsonc")
    const jsonc = parseJsonc(content)
    const config = z.object({
      imports: z.record(z.string(), z.string()),
    }).parse(jsonc)
    this.imports = config.imports
    this.tokens = PostcssDenoImporter.getAuthTokens()
  }

  async walk(root: postcss.Root) {
    await this._walk(root, (path) => this.match(path))
  }

  private async _walk(root: postcss.Root, match: (path: string) => string | undefined) {
    const promises: Promise<void>[] = []
    root.walkAtRules("import", (rule) => {
      const path = rule.params.replace(/['"]/gi, "").trim()
      const target = match(path)
      if (target) {
        promises.push(this.handle(rule, target))
      }
    })
    await Promise.all(promises)
  }

  private async handle(rule: postcss.AtRule, target: string) {
    const content = await this.load(target)
    const styles = postcss.parse(content)
    await this._walk(styles, (path) => this.nestedMatch(path, target))
    rule.replaceWith(styles)
  }

  private match(path: string) {
    for (const [key, value] of Object.entries(this.imports)) {
      if (path === key) {
        return value
      }
    }
  }

  private nestedMatch(path: string, context: string) {
    if (path.startsWith("./")) {
      const absolute = new URL(path, context).toString()
      return absolute.endsWith(".css") ? absolute : `${absolute}.css`
    }
  }

  private async load(path: string) {
    const url = new URL(path)
    const cache = `.cache/${url.hostname}${url.pathname}`
    if (await exists(cache)) {
      return await Deno.readTextFile(cache)
    } else {
      console.log("FETCHING CSS IMPORT", path)
      const token = this.tokens[url.hostname]
      const response = await fetch(url, {
        headers: token ? {
          "Authorization": `Bearer ${token}`,
        } : {}
      })
      if (response.status !== Status.OK) {
        throw new Error(`failed to load css import ${path} - ${response.status}: ${await response.text()}`)
      }
      const content = await response.text()
      await Deno.mkdir(dirname(cache), { recursive: true })
      await Deno.writeTextFile(cache, content)
      return content
    }
  }

  private static getAuthTokens() {
    const value = Deno.env.get("DENO_AUTH_TOKENS") ?? ""
    const index: Record<string, string> = {}
    value.split(",").forEach((v) => {
      const [token, domain] = v.split("@")
      index[domain] = token
    })
    return index
  }
}

//-------------------------------------------------------------------------------------------------
