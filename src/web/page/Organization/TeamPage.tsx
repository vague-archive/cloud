import { zod } from "@deps"
import { IdentityProvider, Organization, Member, Token } from "@domain"
import { assert } from "@lib"
import { Format } from "@lib/format"
import { CTX, HX, Layout, RequestContext } from "@web"
import { to } from "@lib/to"
import { NotFoundError } from "@lib/http"
import { ComponentProps, xdata } from "@lib/jsx"
import { AuthorizationError } from "@web"
import Header from "@web/page/Organization/Header.tsx"

//=================================================================================================
// PAGE
//=================================================================================================

async function Page(ctx: RequestContext) {
  const org = CTX.organization(ctx)
  const domain = CTX.domain(ctx)
  const user = CTX.authorize(ctx)
  const format = new Format(user)

  await domain.account.withMembers(org)
  const invites = await domain.account.getInvitesForOrganization(org)

  const header = <Header ctx={ctx} org={org} />
  return (
    <Layout.Page ctx={ctx} title="Team" page="org:team" header={header}>
      <div class="space-y-8">
        <InviteCard ctx={ctx} org={org} invites={invites} format={format} />
        <TeamCard ctx={ctx} org={org} />
      </div>
    </Layout.Page>
  )
}

//=================================================================================================
// COMPONENTS
//=================================================================================================

function TeamCard({ ctx, org }: {
  ctx: RequestContext
  org: Organization
}) {
  ctx
  assert.present(org.members)
  const user = CTX.authorize(ctx)
  return (
    <card id="members">
      <card-header>
        <card-title>Team</card-title>
      </card-header>
      <card-body>
        <ul class="divide-y">
          {org.members.map((m) => {
            assert.present(m.user)
            assert.present(m.user.identity)
            return (
              <li class="flex py-1 items-center">
                <div class="flex-1 whitespace-nowrap overflow-hidden bold">{m.user.name}</div>
                <span class="flex-1 whitespace-nowrap overflow-hidden text-gray-600 items-center gap-2 hidden sm:flex">
                  {m.user.identity.provider === IdentityProvider.Github && <i class="iconoir-github text-20 border bg-gray-100 p-1 rounded-full"></i>}
                  {m.user.identity.provider === IdentityProvider.Discord && <i class="iconoir-discord text-20 border bg-gray-100 p-1 rounded-full"></i>}
                  {m.user.identity.username}
                </span>
                {m.user.email && <span class="flex-1 text-gray ml-4 overflow-hidden">({m.user.email})</span>}
                <span class="w-7">{m.userId !== user.id ? <DisconnectButton ctx={ctx} organization={org} member={m} /> : <></>}</span>
              </li>
            )
          })}
        </ul>
      </card-body>
    </card>
  )
}

function InviteCard({ ctx, org, invites, format }: {
  ctx: RequestContext
  org: Organization
  invites: Token[]
  format: Format
}) {
  const data = { mode: "list", email: "" }
  return (
    <card id="invite-card" x-data={xdata(data)}>
      <card-header>
        <card-title>
          <span x-text="mode === 'list' ? 'Invitations' : 'Invite User'">Invitations</span>
        </card-title>
        <card-header-rhs x-show="mode === 'list'">
          <button class="btn-primary" x-on:click="mode='invite'">Invite User</button>
        </card-header-rhs>
      </card-header>
      <card-body>
        <InviteForm ctx={ctx} org={org} />
        <InviteList ctx={ctx} org={org} invites={invites} format={format} />
      </card-body>
    </card>
  )
}

function InviteList(props: ComponentProps & {
  ctx: RequestContext
  org: Organization
  invites: Token[]
  format: Format
}) {
  const { ctx, org, invites, format, ...rest } = props
  const empty = invites.length === 0
  return (
    <div {...rest}>
      {empty && (
        <div>There are no pending invitations.</div>
      )}
      {!empty && (
        <ul class="divide-y">
          {invites.map((i) => (
            <li class="flex gap-4 py-1 items-center hover:bg-gray-50" title={i.sentTo}>
              <div class="whitespace-nowrap w-48 truncate">{ i.sentTo }</div>
              <div class="flex-1 flex gap-2">
                <span class="text-gray">sent:</span>
                <span>{ format.date(i.createdOn, { month: "short", day: "numeric" }) }</span>
                <span class="text-gray">expires:</span>
                <span>{ format.date(i.expiresOn!, { month: "short", day: "numeric" }) }</span>
              </div>
              <RetractButton ctx={ctx} organization={org} invite={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InviteForm(props: ComponentProps & {
  ctx: RequestContext
  org: Organization
  error?: zod.ZodError
}) {
  const { ctx, org, error, ...rest } = props
  const route = CTX.route(ctx)
  const emailErrors = error?.flatten().fieldErrors["email"]?.join(", ")
  const inviteErrors = error?.flatten().fieldErrors["invite"]?.join(", ")
  const errors = emailErrors || inviteErrors
  return (
    <form
      x-cloak
      x-show="mode === 'invite'"
      x-on:cancel="mode = 'list'"
      hx-post={route("org:team:invite", org)}
      hx-disabled-elt="#invite-submit, #invite-cancel"
      class="mt-2 mb-8 max-w-128 mx-auto"
      {...rest}
    >
      <field>
        <label for="email">Email:</label>
        <field-input>
          <input id="email" name="email" x-model="email" autoComplete="off" data-1p-ignore="true" />
        </field-input>
        {errors && <field-error>{errors}</field-error>}
      </field>

      <form-buttons class="right">
        <button id="invite-cancel" type="button" class="btn-secondary" x-on:click="$dispatch('cancel')">cancel</button>
        <button id="invite-submit" type="submit" class="btn-primary">save</button>
      </form-buttons>
    </form>
  )
}

function RetractButton({ ctx, organization, invite }: {
  ctx: RequestContext
  organization: Organization
  invite: Token
}) {
  const route = CTX.route(ctx)
  return (
    <div
      x-data="{show: false}"
      hx-delete={route("org:team:retract", organization, invite)}
      hx-trigger="confirm"
    >
      <button class="btn-round btn-tertiary h-6" x-on:click="show = true" title="retract invite">
        <i class="iconoir-xmark"/>
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Retract invitation?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to retract the invitation sent to { invite.sentTo }?
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Retract</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </div>
  )
}

function DisconnectButton({ ctx, organization, member }: {
  ctx: RequestContext
  organization: Organization
  member: Member
}) {
  const route = CTX.route(ctx)
  return (
    <div
      x-data="{show: false}"
      hx-delete={route("org:team:disconnect", organization, member.userId)}
      hx-trigger="confirm"
      hx-target="#members"
      style="margin-left: auto;"
    >
      <button class="btn-round btn-tertiary h-6" x-on:click="show = true" title="disconnect member">
        <i class="iconoir-xmark"/>
      </button>
      <fx-modal x-bind:show="show" x-on:close="show = false">
        <card>
          <card-header>
            <card-title>Remove Member from Organization?</card-title>
          </card-header>
          <card-body>
            Are you sure you want to remove this user from your organization? This action cannot be undone.
          </card-body>
          <card-buttons>
            <button class="btn-danger"    x-on:click="$dispatch('confirm')">Remove</button>
            <button class="btn-secondary" x-on:click="$dispatch('close')">Cancel</button>
          </card-buttons>
        </card>
      </fx-modal>
    </div>
  )
}

//=============================================================================
// INVITE and RETRACT ACTIONS
//=============================================================================

async function Invite(ctx: RequestContext<"/:org/team/invite">) {
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const form = CTX.form(ctx)
  const route = CTX.route(ctx)
  const email = form.get("email") as string
  const result = await domain.account.sendInvite(org, email, route)
  if (result instanceof zod.ZodError) {
    return <InviteForm ctx={ctx} org={org} error={result} />
  } else {
    return await refreshInviteCard(ctx)
  }
}

async function Retract(ctx: RequestContext<"/:org/team/retract/:tokenId">) {
  const domain = CTX.domain(ctx)
  const tokenId = to.int(ctx.params.tokenId)
  const org = CTX.organization(ctx)
  const invites = await domain.account.getInvitesForOrganization(org)
  const invite = invites.find((i) => i.id === tokenId)
  if (!invite) {
    throw new NotFoundError(ctx.request.url.pathname)
  }
  await domain.account.retractInvite(invite)
  return await refreshInviteCard(ctx)
}

async function refreshInviteCard(ctx: RequestContext) {
  const domain = CTX.domain(ctx)
  const user = CTX.authorize(ctx)
  const org = CTX.organization(ctx)
  const format = new Format(user)
  const invites = await domain.account.getInvitesForOrganization(org)
  HX.retarget(ctx, "#invite-card")
  return <InviteCard ctx={ctx} org={org} invites={invites} format={format} />
}

//=============================================================================
// DISCONNECT MEMBER ACTION
//=============================================================================

async function Disconnect(ctx: RequestContext<"/:org/team/disconnect/:userId">) {
  const curUser = CTX.authorize(ctx)
  const domain = CTX.domain(ctx)
  const org = CTX.organization(ctx)
  const userId = ctx.params.userId
  const user = await domain.account.getUser(to.int(userId))
  if(user?.id === curUser.id) {
    throw new AuthorizationError("User cannot remove themselves from organization")
  }
  if (org && user) {
    await domain.account.deleteMember(user, org)
    await domain.account.withMembers(org)
    return <TeamCard ctx={ctx} org={org} />
  } else {
    throw new NotFoundError(ctx.request.url.pathname)
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export const OrganizationTeam = {
  Page,
  Invite,
  Retract,
  Disconnect,
}

//-------------------------------------------------------------------------------------------------
