import { github, to } from "@lib"
import { Format } from "@lib/format"
import { Status } from "@lib/http"
import { CTX, Layout, RequestContext } from "@web"
import { Download } from "@web/download"

//=================================================================================================
// DOWNLOADS PAGE
//=================================================================================================

async function DownloadsPage(ctx: RequestContext) {
  CTX.authorize(ctx)
  const config = CTX.config(ctx)
  const domain = CTX.domain(ctx)
  const refresh = ctx.request.url.searchParams.has("refresh")
  const editors = await Download.releases("editor", domain, config, refresh)
  const jam = await Download.releases("jam", domain, config, refresh)
  return (
    <Layout.Page ctx={ctx} title="Downloads" page="downloads">
      <div class="space-y-16">
        <JamDownloadsCard ctx={ctx} title="Jam" releases={jam} />
        <EditorDownloadsCard ctx={ctx} title="Fiasco" releases={editors} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// JAM DOWNLOADS
//=================================================================================================

function JamDownloadsCard({ ctx, title, releases }: {
  ctx: RequestContext
  title: string
  releases: github.Release[]
}) {
  const user = CTX.authorize(ctx)
  const format = new Format(user)
  const latest = releases.filter((r) => !r.prerelease)[0]
  const uiWindows = findJamUi(latest, github.ReleasePlatform.Windows)
  const uiAppleArm = findJamUi(latest, github.ReleasePlatform.AppleArm)
  const cliAppleArm = findJamCli(latest, github.ReleasePlatform.AppleArm)
  const cliAppleIntel = findJamCli(latest, github.ReleasePlatform.AppleIntel)
  const cliLinuxArm = findJamCli(latest, github.ReleasePlatform.LinuxArm)
  const cliLinuxIntel = findJamCli(latest, github.ReleasePlatform.LinuxIntel)
  const cliWindows = findJamCli(latest, github.ReleasePlatform.Windows)
  const uis = [uiAppleArm, uiWindows].filter(ui => !!ui)
  const clis = [cliAppleArm, cliAppleIntel, cliLinuxArm, cliLinuxIntel, cliWindows].filter(a => !!a)
  return (
    <card>
      <card-header>
        <card-title>{ title }</card-title>
      </card-header>
      <card-body class="space-y-4">

        <div>
          <h2 class="h2">Latest (v{latest.tagName})</h2>
          <div class="text-gray">{ format.date(latest.publishedAt)}</div>
        </div>

        {uis.length > 0 && (
          <div class="space-y-4">
            <h3 class="h3">Desktop UI</h3>
            <div class="text-16">
              {
                uis.map((ui, index) => <DownloadLink ctx={ctx} repo="jam" asset={ui} eol={index == uis.length-1} />)
              }
            </div>
          </div>
        )}

        {clis.length > 0 && (
          <div class="space-y-4">
            <h3 class="h3">Command Line (CLI)</h3>
            <div class="text-16 flex flex-wrap whitespace-nowrap">
              {
                clis.map((cli, index) => <DownloadLink ctx={ctx} repo="jam" asset={cli} eol={index == clis.length-1} />)
              }
            </div>
          </div>
        )}

      </card-body>
    </card>
  )
}

function findJamUi(release: github.Release, platform: github.ReleasePlatform)
{
  return release.assets.find(a =>
    a.name.startsWith("jam_ui") &&
    a.platform === platform)
}

function findJamCli(release: github.Release, platform: github.ReleasePlatform)
{
  return release.assets.find(a =>
    a.name.startsWith("jam_") &&
    !a.name.startsWith("jam_ui") &&
    a.platform === platform)
}

//=================================================================================================
// FIASCO DOWNLOADS
//=================================================================================================

function EditorDownloadsCard({ ctx, title, releases }: {
  ctx: RequestContext
  title: string
  releases: github.Release[]
}) {
  const user = CTX.authorize(ctx)
  const format = new Format(user)

  const canary = releases.filter(e => e.prerelease)
  const stable = releases.filter(e => !e.prerelease)

  const latestStable = stable[0];
  const latestCanary = canary[0];

  const latestStableAssets = latestStable ? [
    latestStable.assets.find((a) => a.platform === github.ReleasePlatform.AppleArm),
    latestStable.assets.find((a) => a.platform === github.ReleasePlatform.AppleIntel),
    latestStable.assets.find((a) => a.platform === github.ReleasePlatform.Windows),
  ].filter((a) => !!a) : []

  const latestCanaryAssets = latestCanary ? [
    latestCanary.assets.find((a) => a.platform === github.ReleasePlatform.AppleArm),
    latestCanary.assets.find((a) => a.platform === github.ReleasePlatform.AppleIntel),
    latestCanary.assets.find((a) => a.platform === github.ReleasePlatform.Windows),
  ].filter((a) => !!a) : []

  const noEditors = latestStable === undefined
  return (
    <card>
      <card-header>
        <card-title>{ title }</card-title>
      </card-header>
      <card-body class="space-y-8">

        {noEditors && (
          <div class="p-4 border border-danger bg-danger-50 text-danger">
            Sorry, but there are no stable editor releases available at this time.
          </div>
        )}

        <div>
          <div>
            <h2 class="h2">Stable ({latestStable.tagName})</h2>
            <div class="text-gray">The (final) version of the vintage SDK editor</div>
            <div class="text-gray">{ format.date(latestStable.publishedAt)}</div>
          </div>
          {latestStableAssets.length > 0 && (
            <div class="text-16 mt-2">
            {
              latestStableAssets.map((asset, index) => <DownloadLink ctx={ctx} repo="editor" asset={asset} eol={index == latestStableAssets.length-1} />)
            }
            </div>
          )}
        </div>

        {latestCanary && (
          <div>
            <div>
              <h2 class="h2">Canary ({latestCanary.tagName})</h2>
              <div class="text-gray">The latest cutting edge version of the Fiasco editor</div>
              <div class="text-gray">{ format.date(latestCanary.publishedAt)}</div>
            </div>
            {latestCanaryAssets.length > 0 && (
              <div class="text-16 mt-2">
              {
                latestCanaryAssets.map((asset, index) => <DownloadLink ctx={ctx} repo="editor" asset={asset} eol={index == latestCanaryAssets.length-1} />)
              }
              </div>
            )}
          </div>
        )}

        <hr></hr>

        <details>
          <summary class="cursor-pointer test-dark">
            show all versions...
          </summary>
          <div class="divide-y">
            {releases.map((e) => {
              const assets = [
                e.assets.find((a) => a.platform === github.ReleasePlatform.AppleArm),
                e.assets.find((a) => a.platform === github.ReleasePlatform.AppleIntel),
                e.assets.find((a) => a.platform === github.ReleasePlatform.Windows),
              ].filter((a) => !!a)
              return <div class="px-2 py-8">
                <h3 class="h3">{e.tagName}</h3>
                <div class="text-gray">{ format.date(e.publishedAt)}</div>
                {assets.length > 0 && (
                  <div class="text-16 mt-2">
                  {
                    assets.map((asset, index) => <DownloadLink ctx={ctx} repo="editor" asset={asset} eol={index == assets.length-1} />)
                  }
                  </div>
                )}
              </div>
            })}
          </div>
        </details>

      </card-body>
    </card>
  )
}

//=================================================================================================
// DOWNLOAD LINK
//=================================================================================================

function DownloadLink({ ctx, repo, asset, eol }: {
  ctx: RequestContext,
  repo: string,
  asset: github.ReleaseAsset,
  eol: boolean
}) {
  const route = CTX.route(ctx)
  return (
    <span>
      <a class="link" href={route("downloads:release", repo, asset.id)}>{github.releasePlatformLabel(asset.platform)}</a>
      {!eol && <span class="link-separator"></span>}
    </span>
  );
}

//=================================================================================================
// DOWNLOAD A RELEASE FROM EITHER editor OR jam REPOSITORY
//=================================================================================================

async function DownloadRelease(ctx: RequestContext<"/downloads/:repo/:assetId">) {
  const repo = Download.parseRepo(ctx.params.repo)
  const assetId = to.int(ctx.params.assetId)
  if (repo === undefined) {
    ctx.response.status = Status.NotFound
    return
  }
  return await Download.asset(ctx, repo, assetId);
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export default {
  Page: DownloadsPage,
  Release: DownloadRelease,
}
