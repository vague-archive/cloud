import { z } from "@deps"
import { assert } from "@lib"

const _timezones: string[] = Intl.supportedValuesOf("timeZone")
assert.nonEmptyArray(_timezones)
export const timezones: [string, ...string[]] = _timezones

export const zTimezones = z.enum(timezones) // requires non empty array

export const locales: [string, ...string[]] = [ "en-US", "en-GB" ]
export const zLocales = z.enum(locales) // requires non empty array
