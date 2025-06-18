import { z } from "@deps"
import { assert, Test } from "@test"
import { i18n } from "@lib"

//-----------------------------------------------------------------------------

Test("list of timezones", () => {
  assert.equals(i18n.timezones.includes("America/New_York"), true)
  assert.equals(i18n.timezones.includes("America/Los_Angeles"), true)
  assert.equals(i18n.timezones.includes("America/Denver"), true)
  assert.equals(i18n.timezones.includes("America/Chicago"), true)
  assert.equals(i18n.timezones.includes("Europe/London"), true)
  assert.equals(i18n.timezones.includes("Europe/Paris"), true)
  assert.equals(i18n.timezones.includes("Asia/Tokyo"), true)
  assert.equals(i18n.timezones.includes("Africa/Johannesburg"), true)
  assert.equals(i18n.timezones.includes("Australia/Sydney"), true)

  assert.equals(i18n.timezones.includes("Nope"), false)
  assert.equals(i18n.timezones.includes("yolo"), false)
  assert.equals(i18n.timezones.includes(""), false)
})

//-----------------------------------------------------------------------------

Test("zod timezone validation", () => {
  const schema = z.object({
    zone: i18n.zTimezones,
  })

  let result = schema.safeParse({ zone: "America/New_York" })
  assert.equals(result.success, true)
  assert.equals(result.data, { zone: "America/New_York" })

  result = schema.safeParse({ zone: "invalid" })
  assert.equals(result.success, false)
  assert.zodError(result.error)
  assert.zodInvalidEnum(result.error, "zone", i18n.timezones)
})

//-----------------------------------------------------------------------------
