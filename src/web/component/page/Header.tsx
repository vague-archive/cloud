import { User } from "@domain"
import { CTX, RequestContext } from "@web"
import { samePage } from "@web/component"
import { assert, is } from "@lib"
import { cls } from "@lib/html"
import { Children } from "@lib/jsx"

//-----------------------------------------------------------------------------

export function Header({ ctx, title, page, children }: {
  ctx: RequestContext
  title?: string
  page: string
  children?: Children
}) {
  const route = CTX.route(ctx)
  const user = ctx.state.user

  if (!children && title) {
    children = <h3>{title}</h3>
  } else if (is.string(children)) {
    children = <h3>{children}</h3>
  }

  return (
    <nav class="h-14 flex items-center justify-between bg-light border-b border-dark z-1">
      <a
        href={route("home")}
        hx-boost="true"
        class="self-stretch flex items-center justify-center w-14 hover:bg-gray-100"
        title="Welcome to Void"
      >
        <void-logo />
      </a>

      <div class="flex-1 flex items-center px-4">
        {children}
      </div>

      <a href={route("help")} class="link px-4 py-1 mr-4 rounded-xl font-bold text-large">
        HELP
      </a>

      {user && <ProfileMenu ctx={ctx} page={page} user={user} />}
    </nav>
  )
}

//-----------------------------------------------------------------------------

function ProfileMenu({ ctx, page, user }: {
  ctx: RequestContext
  page: string
  user: User
}) {
  const route = CTX.route(ctx)
  const session = CTX.session(ctx)
  const alpineUserMenu = {
    "x-show": "open",
    "x-on:click.outside": "open = false",
    "x-on:keyup.window.escape": "open = false",
  }
  const orgs = user.organizations
  assert.present(orgs)
  return (
    <div class="relative" x-data="{ open: false }">
      <button
        class="w-14 h-full flex items-center justify-center hover:bg-gray-100"
        x-on:click="open = !open"
      >
        <i class="iconoir-user text-32"></i>
      </button>
      <div
        id="user-menu"
        class="absolute right-0 z-10 mt-0.5 w-64 overflow-hidden origin-top-right bg-light border border-current py-1 ring-1 ring-black ring-opacity-5 focus:outline-none"
        tabIndex={-1}
        {...alpineUserMenu}
        style={{ display: "none" }}
      >
        <div class="px-4 py-2 border-b border-current mb-2">
          <div class="font-bold text-gray-800 truncate">
            {user.name}
          </div>
          <div class="font-medium text-gray-500 truncate">
            {user.email}
          </div>
        </div>
        {orgs.length === 1 && (
          <ProfileLink href={route("org", orgs[0])} path="org" page={page}>
            Your Organization
          </ProfileLink>
        )}
        {orgs.length > 1 && (
          <ProfileLink href={route("home")} path="org" page={page}>
            Your Organizations ({`${orgs.length}`})
          </ProfileLink>
        )}
        <ProfileLink href={route("profile")} path="profile" page={page}>
          Your Profile
        </ProfileLink>
        <ProfileLink href={route("downloads")} path="downloads" page={page}>
          Downloads
        </ProfileLink>
        <ProfileLink href={route("tools")} path="tools" page={page} boost="false">
          Editor Tools
        </ProfileLink>
        {user.sysadmin && (
          <ProfileLink href={route("sysadmin:dashboard")} path="sysadmin" page={page}>
            SysAdmin
          </ProfileLink>
        )}
        <form action={route("logout")} method="POST">
          <input type="hidden" name="_csrf" value={session.csrf} />
          <button type="submit" class="block w-full px-4 py-1 text-left text-gray-700 hover:bg-gray-50">
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}

function ProfileLink({ href, path, page, boost, children }: {
  href: string
  path: string
  page: string
  boost?: string
  children: Children
}) {
  const activeCls = "bg-gray-100"
  const inactiveCls = ""
  const commonCls = "block px-4 py-1 text-gray-700 whitespace-nowrap hover:bg-gray-50"
  const classes = cls(
    commonCls,
    samePage(page, path) ? activeCls : inactiveCls,
  )
  return (
    <a href={href} hx-boost={ boost ?? "true" } class={classes} tabIndex={-1}>
      {children}
    </a>
  )
}

//-----------------------------------------------------------------------------
