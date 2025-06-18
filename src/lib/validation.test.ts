import { assert, Test } from "@test"
import { Required } from "./validation.ts"

//-----------------------------------------------------------------------------

Test("Required", () => {
  assert.equals(Required, { message: "Value required" })
})

//-----------------------------------------------------------------------------
