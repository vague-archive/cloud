import { assert, factory, Test } from "@test"
import { Organization, UserRoleType } from "@domain"
import { authorize, is } from "@web/policy.ts"

//-------------------------------------------------------------------------------------------------

Test("is anonymous | active | disabled | sysadmin", () => {
  const anonymous = undefined
  const active = buildUser({ disabled: false })
  const disabled = buildUser({ disabled: true })
  const sysadmin = buildUser({ disabled: false, sysadmin: true })
  const disabledSysadmin = buildUser({ disabled: true, sysadmin: true })

  assert.equals(is(anonymous, "anonymous"), true)
  assert.equals(is(active, "anonymous"), false)
  assert.equals(is(disabled, "anonymous"), false)
  assert.equals(is(sysadmin, "anonymous"), false)
  assert.equals(is(disabledSysadmin, "anonymous"), false)

  assert.equals(is(anonymous, "active"), false)
  assert.equals(is(active, "active"), true)
  assert.equals(is(disabled, "active"), false)
  assert.equals(is(sysadmin, "active"), true)
  assert.equals(is(disabledSysadmin, "active"), false)

  assert.equals(is(anonymous, "disabled"), false)
  assert.equals(is(active, "disabled"), false)
  assert.equals(is(disabled, "disabled"), true)
  assert.equals(is(sysadmin, "disabled"), false)
  assert.equals(is(disabledSysadmin, "disabled"), true)

  assert.equals(is(anonymous, "sysadmin"), false)
  assert.equals(is(active, "sysadmin"), false)
  assert.equals(is(disabled, "sysadmin"), false)
  assert.equals(is(sysadmin, "sysadmin"), true)
  assert.equals(is(disabledSysadmin, "sysadmin"), false)
})

//-------------------------------------------------------------------------------------------------

Test("user is member of organization", () => {
  const org1 = factory.org.build()
  const org2 = factory.org.build()

  const game1 = factory.game.build({ organization: org1 })
  const game2 = factory.game.build({ organization: org2 })

  const user1    = buildUser({ organizations: [org1] })
  const user2    = buildUser({ organizations: [org2] })
  const user3    = buildUser({ organizations: [org1, org2] })
  const user4    = buildUser({ organizations: [] })
  const user5    = buildUser({ organizations: undefined })
  const sysadmin = buildUser({ organizations: [], sysadmin: true })

  assert.equals(is(user1, "member", org1), true)
  assert.equals(is(user1, "member", org2), false)
  assert.equals(is(user1, "member", game1), true)
  assert.equals(is(user1, "member", game2), false)

  assert.equals(is(user2, "member", org1), false)
  assert.equals(is(user2, "member", org2), true)
  assert.equals(is(user2, "member", game1), false)
  assert.equals(is(user2, "member", game2), true)

  assert.equals(is(user3, "member", org1), true)
  assert.equals(is(user3, "member", org2), true)
  assert.equals(is(user3, "member", game1), true)
  assert.equals(is(user3, "member", game2), true)

  assert.equals(is(user4, "member", org1), false)
  assert.equals(is(user4, "member", org2), false)
  assert.equals(is(user4, "member", game1), false)
  assert.equals(is(user4, "member", game2), false)

  assert.equals(is(sysadmin, "member", org1),  true)
  assert.equals(is(sysadmin, "member", org2),  true)
  assert.equals(is(sysadmin, "member", game1), true)
  assert.equals(is(sysadmin, "member", game2), true)

  assert.throws(
    () => is(user5, "member", org1),
    Error,
    "missing user.organizations - did you forget to load withOrganizations",
  )
  assert.throws(
    () => is(user5, "member", game1),
    Error,
    "missing user.organizations - did you forget to load withOrganizations",
  )
})

//-------------------------------------------------------------------------------------------------

Test("authorize - throws exception instead of returning true or false", () => {
  const anonymous = undefined
  const active = buildUser({ disabled: false })
  const disabled = buildUser({ disabled: true })
  const sysadmin = buildUser({ disabled: false, sysadmin: true })

  authorize(anonymous, "anonymous")
  assert.throwsAuthorizationError(() => authorize(anonymous, "active"))
  assert.throwsAuthorizationError(() => authorize(anonymous, "disabled"))
  assert.throwsAuthorizationError(() => authorize(anonymous, "sysadmin"))

  authorize(active, "active")
  assert.throwsAuthorizationError(() => authorize(active, "anonymous"))
  assert.throwsAuthorizationError(() => authorize(active, "disabled"))
  assert.throwsAuthorizationError(() => authorize(active, "sysadmin"))

  authorize(disabled, "disabled")
  assert.throwsAuthorizationError(() => authorize(disabled, "anonymous"))
  assert.throwsAuthorizationError(() => authorize(disabled, "active"))
  assert.throwsAuthorizationError(() => authorize(disabled, "sysadmin"))

  authorize(sysadmin, "sysadmin")
  authorize(sysadmin, "active")
  assert.throwsAuthorizationError(() => authorize(sysadmin, "anonymous"))
  assert.throwsAuthorizationError(() => authorize(sysadmin, "disabled"))
})

//=================================================================================================
// TEST HELPER METHODS
//=================================================================================================

function buildUser(opts: {
  disabled?: boolean
  sysadmin?: boolean
  organizations?: Organization[]
}) {
  const user = factory.user.build({
    disabled: opts.disabled ?? false,
    organizations: opts.organizations
  })
  if (opts.sysadmin) {
    const role = factory.role.build({ userId: user.id, role: UserRoleType.Sysadmin })
    user.roles = [role]
  }
  return user
}

//-------------------------------------------------------------------------------------------------
