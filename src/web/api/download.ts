import { to } from "@lib"
import { CTX, RequestContext } from "@web"
import { ContentType, Header, Status } from "@lib/http"
import { Download } from "@web/download"

//=================================================================================================
// GET DOWNLOAD MANIFEST
//=================================================================================================

async function DownloadManifest(ctx: RequestContext<"/api/download/:repo">) {
  const domain = CTX.domain(ctx)
  const config = CTX.config(ctx)
  const route = CTX.route(ctx)
  const repo = Download.parseRepo(ctx.params.repo)
  const refresh = shouldRefresh(ctx);

  if (repo === undefined) {
    ctx.response.status = Status.NotFound
    return
  }

  const releases = await Download.releases(repo, domain, config, refresh)
  const latest = releases.filter((r) => !r.prerelease)[0]
  const assets = latest.assets.reduce((acc, entity) => {
    acc[entity.name] = route("api:download:asset", repo, entity.id)
    return acc;
  }, {} as Record<string, string>);

  ctx.response.headers.set(Header.ContentType, ContentType.Json)
  ctx.response.status = Status.OK
  ctx.response.body = JSON.stringify({
    repo,
    version: `v${latest.tagName}`,
    assets
  })
}

//=================================================================================================
// DOWNLOAD RELEASE ASSET
//=================================================================================================

async function DownloadAsset(ctx: RequestContext<"/api/download/:repo/:assetId">) {
  const repo = Download.parseRepo(ctx.params.repo)
  const assetId = to.int(ctx.params.assetId)
  if (repo === undefined) {
    ctx.response.status = Status.NotFound
    return
  }
  return await Download.asset(ctx, repo, assetId);
}

//=================================================================================================
// PRIVATE HELPER METHODS
//=================================================================================================

function shouldRefresh(ctx: RequestContext) {
  return to.bool(ctx.request.url.searchParams.get("refresh"));
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const DownloadEndpoints = {
  Manifest: DownloadManifest,
  Asset: DownloadAsset
}
