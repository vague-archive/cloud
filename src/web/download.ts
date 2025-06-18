import { z } from "@deps"
import { Expiration } from "@lib/kvstore"
import { logger } from "@lib/logger"
import { github } from "@lib"
import { ContentType, Header, NotFoundError, Status } from "@lib/http"
import { Config } from "@config"
import { Domain } from "@domain"
import { CTX, RequestContext } from "@web"

//=================================================================================================
// SHARED BETWEEN DownloadPage and Api.Downloads
//=================================================================================================

export type Repository = "editor" | "jam"

function parseRepo(value: string): Repository | undefined {
  const result = z.enum(["editor", "jam"]).safeParse(value);
  if (result.success) {
    return result.data
  }
}

//-------------------------------------------------------------------------------------------------

async function getReleases(repo: Repository, domain: Domain, config: Config, refresh = false) {
  const key = ["downloads", repo, "releases"]

  const cached = !refresh && await domain.kv.get(key)
  if (cached) {
    return cached as github.Release[]
  }

  const token = config.github.accessToken
  if (token) {
    logger.info(`fetching vaguevoid/${repo} releases from github API`)
    const releases = await github.getReleases("vaguevoid", repo, token)
    if (releases) {
      await domain.kv.set(key, releases, { expires: Expiration.OneDay })
    }
    return releases
  }
  return []
}

//-------------------------------------------------------------------------------------------------

async function downloadAsset(ctx: RequestContext, repo: Repository, assetId: number) {
  const config = CTX.config(ctx)
  const domain = CTX.domain(ctx)
  const token = config.github.accessToken
  const releases = await getReleases(repo, domain, config)
  const asset = getReleaseAsset(releases, assetId)

  if (!token || !asset || !downloadable(asset.name)) {
    throw new NotFoundError(ctx.request.url.pathname)
  }

  const response = await fetch(asset.url, {
    headers: {
      "Authorization": `TOKEN ${token}`,
      "Accept": "application/octet-stream",
    },
  })

  if (response.status === Status.OK && response.body) {
    ctx.response.status = Status.OK
    ctx.response.headers.set(Header.ContentType, response.headers.get(Header.ContentType) || ContentType.Bytes)
    ctx.response.headers.set(Header.ContentLength, response.headers.get(Header.ContentLength) || "")
    ctx.response.headers.set(Header.ContentDisposition, `attachment; filename="${asset.name}"`)
    ctx.response.body = response.body
  } else {
    ctx.response.status = Status.NotFound
  }
}

function getReleaseAsset(releases: github.Release[], assetId: number) {
  for (const release of releases) {
    for (const asset of release.assets) {
      if (asset.id === assetId) {
        return asset
      }
    }
  }
}

function downloadable(name: string) {
  return false ||
    /fiasco.*zip/i.test(name) ||
    /fiasco.*exe/i.test(name) ||
    /jam.*zip/i.test(name)
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const Download = {
  parseRepo,
  releases: getReleases,
  asset: downloadAsset,
}
