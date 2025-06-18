import { assert, Test, testWebContext } from "@test"
import { UserRoleType } from "@domain"
import { Layout } from "@web"
import { STATS_CACHE_KEY, SysAdmin } from "@web/page/SysAdminPage.tsx"

//-------------------------------------------------------------------------------------------------

Test.domain("SysAdmin Dashboard", async ({ factory, domain }) => {
  const user = factory.user.build({ disabled: false })
  const role = factory.role.build({ userId: user.id, role: UserRoleType.Sysadmin })
  user.roles = [role]
  assert.equals(user.sysadmin, true, "preconditions")
  assert.equals(user.disabled, false, "preconditions")
  await domain.kv.set(STATS_CACHE_KEY, {}) // avoid filestore query by preloading cache
  const ctx = testWebContext({
    user,
    path: "/sysadmin",
    state: { domain },
  })
  const result = await SysAdmin.Dashboard(ctx)
  assert.equals(result.type, Layout.Page)
  assert.equals(result.props.page, "sysadmin:dashboard")
  assert.equals(result.props.title, "System Administration")
})

//-------------------------------------------------------------------------------------------------

Test.domain("SysAdmin Dashboard - anonymous forbidden", async ({ domain }) => {
  const ctx = testWebContext({
    path: "/sysadmin",
    state: { domain },
  })
  await assert.throwsAuthorizationError(async () => {
    await SysAdmin.Dashboard(ctx)
  })
})

//-------------------------------------------------------------------------------------------------

Test.domain("SysAdmin Dashboard - active user (non sysadmin) forbidden", async ({ factory, domain }) => {
  const user = factory.user.build({ sysadmin: false, disabled: false })
  assert.equals(user.sysadmin, false, "preconditions")
  assert.equals(user.disabled, false, "preconditions")

  const ctx = testWebContext({
    user,
    path: "/sysadmin",
    state: { domain },
  })
  await assert.throwsAuthorizationError(async () => {
    await SysAdmin.Dashboard(ctx)
  })
})

//-------------------------------------------------------------------------------------------------

Test.domain("SysAdmin Dashboard - disabled sysadmin forbidden", async ({ factory, domain }) => {
  const user = factory.user.build({ disabled: true })
  const role = factory.role.build({ userId: user.id, role: UserRoleType.Sysadmin })
  user.roles = [role]
  assert.equals(user.sysadmin, true, "preconditions")
  assert.equals(user.disabled, true, "preconditions")

  const ctx = testWebContext({
    user,
    path: "/sysadmin",
    state: { domain },
  })
  await assert.throwsAuthorizationError(async () => {
    await SysAdmin.Dashboard(ctx)
  })
})

//-------------------------------------------------------------------------------------------------
