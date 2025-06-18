import { Test, testWebContext, assert } from "@test"
import { Validate } from "@web/api/validateAuth.ts"

//=================================================================================================
// TEST Validate Authentication
//=================================================================================================

Test.domain("active user", async ({ domain, factory }) => {
  const user = await factory.user.load("scarlett")
  
  const ctx = testWebContext({
    path: "/api/auth/validate",
    state: { domain, user: user },
  })

  Validate(ctx)

  assert.equals(ctx.response.status, 200)
})

//-------------------------------------------------------------------------------------------------

Test.domain("inactive user is marked as invalid", async ({ domain, factory }) => {
  const user = await factory.user.load("disabled")

  const ctx = testWebContext({
    path: "/api/auth/validate",
    state: { domain, user: user },
  })

  assert.throws(() => Validate(ctx))
  assert.equals(ctx.response.status, 404)
})
//-------------------------------------------------------------------------------------------------

Test.domain("undefined user is not allowed", ({ domain }) => {
  const ctx = testWebContext({
    path: "/api/auth/validate",
    state: { domain },
  })

  assert.throws(() => Validate(ctx))
  assert.equals(ctx.response.status, 404)
})