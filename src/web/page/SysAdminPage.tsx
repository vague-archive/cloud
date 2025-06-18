import { to } from "@lib"
import { xdata } from "@lib/jsx"
import { logger } from "@lib/logger"
import { Format } from "@lib/format"
import { Expiration } from "@lib/kvstore"
import { Organization, Deploy } from "@domain"
import { CTX, Layout, RequestContext } from "@web"

//=================================================================================================
// TYPES
//=================================================================================================

type Stats = {
  organizations: number
  users: number
  games: number
  tools: number
  deploys: number
  files: {
    local: {
      root: string
      count: number
      bytes: number
    },
    s3?: {
      bucket: string
      count: number
      bytes: number
    }
  }
}

//=================================================================================================
// DASHBOARD PAGE
//=================================================================================================

async function SysAdminDashboard(ctx: RequestContext) {
  CTX.authorize(ctx, "sysadmin")
  const orgs = await loadOrganizations(ctx)
  const stats = await loadStats(ctx)
  const expiredDeploys = await loadExpiredDeploys(ctx)
  return (
    <Layout.Page ctx={ctx} title="System Administration" page="sysadmin:dashboard">
      <div class="space-y-8">
        <StatsCard stats={stats} />
        <OrganizationsCard ctx={ctx} orgs={orgs} />
        <ExpiredDeploysCard ctx={ctx} deploys={expiredDeploys} />
        <ExperimentCard ctx={ctx} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// FILE SERVER DIFF PAGE
//=================================================================================================

async function SysAdminFilesDiff(ctx: RequestContext) {
  CTX.authorize(ctx, "sysadmin")
  const domain = CTX.domain(ctx)
  const diff = await domain.filestore.diff()
  const bucket = diff.bucket
  return (
    <Layout.Page ctx={ctx} title="System Administration" page="sysadmin:dashboard">
      <div>root: <span>{ diff.root }</span></div>
      <div>bucket: <span>{ diff.bucket }</span></div>
      <h3>Missing Remote</h3>
      {diff.missingRemote.map((path) => (
        <a hx-post="/sysadmin/files/diff/fix" hx-vals={xdata({action: "push", path, bucket})} class="link block">{ path }</a>
      ))}
      <h3>Missing Local</h3>
      {diff.missingLocal.map((path) => (
        <a hx-post="/sysadmin/files/diff/fix" hx-vals={xdata({action: "pull", path, bucket})} class="link block">{ path }</a>
      ))}
    </Layout.Page>
  )
}

async function SysAdminFilesDiffFix(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const form = CTX.form(ctx)
  const action = form.get("action") as string
  const path = form.get("path") as string
  const bucket = form.get("bucket") as string
  if (path && bucket) {
    if (action === "push") {
      await domain.minions.enqueue({
        name: "s3:upload",
        bucket,
        path,
      })
    } else if (action === "pull") {
      // load from filestore has side effect of pulling from S3 (when missing from filestore)
      await domain.filestore.load(path)
    }
  }
  return <></>
}

//=================================================================================================
// COMPONENTS
//=================================================================================================

function StatsCard({ stats }: {
  stats: Stats
}) {
  return (
    <card>
      <card-header>
        <card-title>
          Statistics <span class="ml-6 text-gray text-default">(cached for 24 hours)</span>
        </card-title>
      </card-header>
      <card-body>
        <table>
          <tr>
            <th class="text-left px-2">organizations</th>
            <td class="px-2">{stats.organizations}</td>
          </tr>
          <tr>
            <th class="text-left px-2">users</th>
            <td class="px-2">{stats.users}</td>
          </tr>
          <tr>
            <th class="text-left px-2">games</th>
            <td class="px-2">{stats.games}</td>
          </tr>
          <tr>
            <th class="text-left px-2">tools</th>
            <td class="px-2">{stats.tools}</td>
          </tr>
          <tr>
            <th class="text-left px-2">deploys</th>
            <td class="px-2">{stats.deploys}</td>
          </tr>
          <tr>
            <th class="text-left px-2">file count</th>
            <td class="px-2">
              <span title="local">{stats.files.local.count}</span>
              {stats.files.s3 && <span title="s3">/ {stats.files.s3.count}</span>}
            </td>
          </tr>
          <tr>
            <th class="text-left px-2">file size</th>
            <td class="px-2">
              <span title="local">{Format.bytes(stats.files.local.bytes)}</span>
              {stats.files.s3 && <span title="s3">/ {Format.bytes(stats.files.s3.bytes)}</span>}
            </td>
          </tr>
        </table>
      </card-body>
    </card>
  )
}

function OrganizationsCard({ ctx, orgs }: {
  ctx: RequestContext
  orgs: Organization[]
}) {
  const route = CTX.route(ctx)
  return (
    <card>
      <card-header>
        <card-title>Organizations</card-title>
      </card-header>
      <card-body>
        <div class="border-2 border-danger-100 bg-danger-50 text-large text-danger-900 p-4 mb-2">
          <b>WARNING</b>: As a sysadmin you have <b>full access to all organizations</b>....<br />
          ...but with great power, comes great responsibility! <br />
          Be careful, look but dont touch!
        </div>
        <div class="divide-y">
          {orgs.map((org) => (
            <a hx-boost href={route("org", org)} class="block px-1 py-2 hover:bg-gray-100">
              <span class="link font-bold">{org.name}</span>
            </a>
          ))}
        </div>
      </card-body>
    </card>
  )
}

function ExpiredDeploysCard({ ctx, deploys }: {
  ctx: RequestContext
  deploys: Deploy[]
}) {
  const route = CTX.route(ctx)
  return (
    <card>
      <card-header>
        <card-title>Expired Deploys <span class="ml-2 text-base text-gray">&gt; {Deploy.ExpirationDays} days</span></card-title>
      </card-header>
      <card-body>
        {deploys.length === 0 ? <h4>No expired deploys found</h4> : 
        <div id="expired-deploys-body" x-data="{ expired: false }">
          <button class="link flex items-center" x-on:click="expired = ! expired">
              Show Expired Deploys 
              <i x-show="!expired" class="iconoir-nav-arrow-down"/> 
              <i x-show="expired" class="iconoir-nav-arrow-up"/>
            </button>
          <div x-show="expired">
            <table class="table-auto">
              <thead>
                <tr>
                  <th class="text-left px-2">game</th>
                  <th class="text-left px-2">user</th>
                  <th class="text-left px-2">slug</th>
                  <th class="text-left px-2">deployed date</th>
                </tr>
              </thead>
              <tbody>
                {deploys.map((deploy) => (
                  <tr>
                    <td class="text-left px-2">{deploy.game?.name}</td>
                    <td class="text-left px-2">{deploy.deployedByUser?.name}</td>
                    <td class="text-left px-2">{deploy.slug}</td>
                    <td class="text-left px-2">{deploy.deployedOn.toISO()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
              <div
                x-data="{show: false}"
                hx-delete={route("sysadmin:deploy:cleanup")}
                hx-trigger="confirm"
                hx-target="#expired-deploys-body"
                style="margin-left: auto;"
              >
                <button class="btn-danger btn-wide" x-on:click="show = true" title="Delete">
                  Delete Expired Deploys
                </button>
                <fx-modal x-bind:show="show" x-on:close="show = false">
                  <card>
                    <card-header>
                      <card-title>Delete Deploys</card-title>
                    </card-header>
                    <card-body>
                      Are you sure you want to clean up all expired deploys? Deleted deploys cannot be recovered.
                      To preserve a deploy that is past the expiration date, pin it from the share page of your game.
                    </card-body>
                    <card-buttons>
                      <button class="btn-danger"    x-on:click="$dispatch('confirm')">Delete</button>
                      <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
                    </card-buttons>
                  </card>
                </fx-modal>
              </div>
          </div>
        </div>
        }
      </card-body>
    </card>
  )
}


//-------------------------------------------------------------------------------------------------

function ExperimentCard({ ctx }: {
  ctx: RequestContext
}) {
  const route = CTX.route(ctx)
  return (
    <card>
      <card-header>
        <card-title>Experiment</card-title>
      </card-header>
      <card-body>
        <p>Random temporary experiments I need to test in production</p>
        <div class="p-4">
          <button class="btn-primary" hx-post={route("sysadmin:x:email")}>
            send yourself an email
          </button>
        </div>
      </card-body>
    </card>
  )
}

async function ExperimentEmailAction(ctx: RequestContext) {
  const user = CTX.authorize(ctx, "sysadmin")
  if (!user.email) {
    return <h1>You don't have an email!</h1>
  }
  const mailer = CTX.mailer(ctx)
  const mail = mailer.template("example", {
    to: user.email,
    name: user.name,
  })
  await mailer.deliver(mail)
  return <h4 class="text-success">Email has been sent</h4>
}

async function CleanupDeploys(ctx: RequestContext) {
  CTX.authorize(ctx, "sysadmin")
  const domain = CTX.domain(ctx)
  await domain.minions.enqueue({
    name: "deploy:cleanup",
  })
  return <h4 class="text-success">Cleanup job has been enqueued</h4>
}

//=================================================================================================
// HELPER METHODS
//=================================================================================================

export const STATS_CACHE_KEY = ["sysadmin", "stats"]

async function loadStats(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const refresh = to.bool(ctx.request.url.searchParams.get("refresh"))
  let stats = await domain.kv.get(STATS_CACHE_KEY) as Stats
  if (!stats || refresh) {
    logger.info(`CACHE MISS ${STATS_CACHE_KEY}`)
    stats = await domain.sysadmin.stats()
    await domain.kv.set(STATS_CACHE_KEY, stats, {
      expires: Expiration.OneDay,
    })
  }
  return stats
}

async function loadOrganizations(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  return await domain.account.allOrganizations()
}

async function loadExpiredDeploys(ctx: RequestContext){
  const domain = CTX.domain(ctx)
  return await domain.games.getExpiredDeploys()
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const SysAdmin = {
  Dashboard: SysAdminDashboard,
  Experiment: {
    Email: ExperimentEmailAction,
  },
  Management: {
    CleanupDeploys
  },
  Files: {
    Diff: SysAdminFilesDiff,
    DiffFix: SysAdminFilesDiffFix,
  }
}

//-------------------------------------------------------------------------------------------------
