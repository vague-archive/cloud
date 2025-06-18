import { Test, testWebContext, assert } from "@test"
import { GetUserOrganizations } from "./organizations.ts"
import { Status } from "@lib/http"

//=================================================================================================
// TEST GetUserOrganizations
//=================================================================================================

Test.domain("user part of multiple organizations", async ({ domain, factory }) => {
  const user = await factory.user.load("scarlett")
  await domain.account.withAuthorizationContext(user)
  
  const ctx = testWebContext({
    path: "/api/organizations",
    state: { domain, user: user },
  })

  GetUserOrganizations(ctx)

  assert.equals(ctx.response.status, Status.OK)
  assert.equals(ctx.response.body, user.organizations)
})

//-------------------------------------------------------------------------------------------------

Test.domain("user not in any organizations returns empty array", async ({ domain, factory }) => {
  const user = await factory.user.load("other")
  await domain.account.withAuthorizationContext(user)

  const ctx = testWebContext({
    path: "/api/organizations",
    state: { domain, user: user },
  })

  GetUserOrganizations(ctx)

  assert.equals(ctx.response.status, Status.OK)
  assert.equals(ctx.response.body, [])
})

//-------------------------------------------------------------------------------------------------


Test.domain("disabled user not allowed", async ({ domain, factory }) => {
  const user = await factory.user.load("disabled")
  await domain.account.withAuthorizationContext(user)

  const ctx = testWebContext({
    path: "/api/organizations",
    state: { domain, user: user },
  })

  assert.throws(() => GetUserOrganizations(ctx))

  assert.equals(ctx.response.status, Status.NotFound)
})