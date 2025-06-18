import { assert, Test } from "@test"
import { samePage } from "./page.ts"

//-----------------------------------------------------------------------------

Test("same page", () => {
  const p1 = "login"
  const p2 = "organization:members"
  const p3 = "organization:billing"

  assert.equals(samePage(p1, "unknown"), false)
  assert.equals(samePage(p2, "unknown"), false)
  assert.equals(samePage(p3, "unknown"), false)

  assert.equals(samePage(p1, "login"), true)
  assert.equals(samePage(p2, "login"), false)
  assert.equals(samePage(p3, "login"), false)

  assert.equals(samePage(p1, "organization"), false)
  assert.equals(samePage(p2, "organization"), true)
  assert.equals(samePage(p3, "organization"), true)

  assert.equals(samePage(p1, "organization:members"), false)
  assert.equals(samePage(p2, "organization:members"), true)
  assert.equals(samePage(p3, "organization:members"), false)

  assert.equals(samePage(p1, "organization:billing"), false)
  assert.equals(samePage(p2, "organization:billing"), false)
  assert.equals(samePage(p3, "organization:billing"), true)

  assert.equals(samePage(p1, "organization:unknown"), false)
  assert.equals(samePage(p2, "organization:unknown"), false)
  assert.equals(samePage(p3, "organization:unknown"), false)
})

//-----------------------------------------------------------------------------
