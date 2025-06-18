import { assert, Test } from "@test"
import { Format } from "@lib/format"

//-----------------------------------------------------------------------------

Test("format date and time", () => {
  const dt = DT`2024-02-28T02:34:56.123Z`

  const pacific = Format.for({ timezone: "US/Pacific" })
  const eastern = Format.for({ timezone: "US/Eastern" })
  const london = Format.for({ timezone: "Europe/London", locale: "en-GB" })

  assert.equals(pacific.date(dt), "Feb 27, 2024")
  assert.equals(eastern.date(dt), "Feb 27, 2024")
  assert.equals(london.date(dt), "28 Feb 2024")

  assert.equals(pacific.date(dt, { dateStyle: "short" }), "2/27/24")
  assert.equals(eastern.date(dt, { dateStyle: "short" }), "2/27/24")
  assert.equals(london.date(dt,  { dateStyle: "short" }), "28/02/2024")

  assert.equals(pacific.date(dt, { month: "short", day: "numeric" }), "Feb 27")
  assert.equals(eastern.date(dt, { month: "short", day: "numeric" }), "Feb 27")
  assert.equals(london.date(dt,  { month: "short", day: "numeric" }), "28 Feb")

  assert.equals(pacific.time(dt), "6:34 PM")
  assert.equals(eastern.time(dt), "9:34 PM")
  assert.equals(london.time(dt), "02:34")
})

//-----------------------------------------------------------------------------

Test("format date for db migration file", () => {
  const date = DT`2024-02-28T02:34:56.123Z`
  assert.equals(Format.migrationDate(date), "20240228023456")
})

//-----------------------------------------------------------------------------

Test("plurals", () => {
  assert.equals(Format.plural("person"), "people")
  assert.equals(Format.plural("person", 0), "people")
  assert.equals(Format.plural("person", 1), "person")
  assert.equals(Format.plural("person", 2), "people")
  assert.equals(Format.plural("person", 0, true), "0 people")
  assert.equals(Format.plural("person", 1, true), "1 person")
  assert.equals(Format.plural("person", 2, true), "2 people")

  assert.equals(Format.plural("person"), "people")

  assert.equals(Format.plural("team member"), "team members")

  assert.equals(Format.plural("thing", [], true), "0 things")
  assert.equals(Format.plural("thing", [1], true), "1 thing")
  assert.equals(Format.plural("thing", [1, 2], true), "2 things")
})

//-----------------------------------------------------------------------------

Test("format duration", () => {
  assert.equals(Format.duration(0), "0 seconds")
  assert.equals(Format.duration(1), "0 seconds")
  assert.equals(Format.duration(2), "0 seconds")
  assert.equals(Format.duration(49), "0 seconds")
  assert.equals(Format.duration(50), "0 seconds")
  assert.equals(Format.duration(98), "0 seconds")
  assert.equals(Format.duration(99), "0 seconds")
  assert.equals(Format.duration(100), "0.1 seconds")
  assert.equals(Format.duration(123), "0.1 seconds")
  assert.equals(Format.duration(199), "0.1 seconds")
  assert.equals(Format.duration(200), "0.2 seconds")
  assert.equals(Format.duration(234), "0.2 seconds")
  assert.equals(Format.duration(299), "0.2 seconds")
  assert.equals(Format.duration(333), "0.3 seconds")
  assert.equals(Format.duration(444), "0.4 seconds")
  assert.equals(Format.duration(555), "0.5 seconds")
  assert.equals(Format.duration(666), "0.6 seconds")
  assert.equals(Format.duration(777), "0.7 seconds")
  assert.equals(Format.duration(888), "0.8 seconds")
  assert.equals(Format.duration(999), "0.9 seconds")
  assert.equals(Format.duration(1000), "1 second")
  assert.equals(Format.duration(1001), "1 second")
  assert.equals(Format.duration(1099), "1 second")
  assert.equals(Format.duration(1100), "1.1 seconds")
  assert.equals(Format.duration(9999), "9.9 seconds")
  assert.equals(Format.duration(10000), "10 seconds")
  assert.equals(Format.duration(11111), "11 seconds")
  assert.equals(Format.duration(22222), "22 seconds")
  assert.equals(Format.duration(33333), "33 seconds")
  assert.equals(Format.duration(44444), "44 seconds")
  assert.equals(Format.duration(55555), "55 seconds")
  assert.equals(Format.duration(59999), "59 seconds")
  assert.equals(Format.duration(60000), "1 minute")
  assert.equals(Format.duration(60001), "1 minute")
  assert.equals(Format.duration(60999), "1 minute")
  assert.equals(Format.duration(61000), "1 minute, 1 second")
  assert.equals(Format.duration(62000), "1 minute, 2 seconds")
  assert.equals(Format.duration(119000), "1 minute, 59 seconds")
  assert.equals(Format.duration(120000), "2 minutes")

  assert.equals(Format.duration(0, "short"), "0 seconds")
  assert.equals(Format.duration(1, "short"), "0 seconds")
  assert.equals(Format.duration(2, "short"), "0 seconds")
  assert.equals(Format.duration(98, "short"), "0 seconds")
  assert.equals(Format.duration(99, "short"), "0 seconds")
  assert.equals(Format.duration(100, "short"), "0.1s")
  assert.equals(Format.duration(123, "short"), "0.1s")
  assert.equals(Format.duration(199, "short"), "0.1s")
  assert.equals(Format.duration(200, "short"), "0.2s")
  assert.equals(Format.duration(234, "short"), "0.2s")
  assert.equals(Format.duration(299, "short"), "0.2s")
  assert.equals(Format.duration(333, "short"), "0.3s")
  assert.equals(Format.duration(444, "short"), "0.4s")
  assert.equals(Format.duration(555, "short"), "0.5s")
  assert.equals(Format.duration(666, "short"), "0.6s")
  assert.equals(Format.duration(777, "short"), "0.7s")
  assert.equals(Format.duration(888, "short"), "0.8s")
  assert.equals(Format.duration(999, "short"), "0.9s")
  assert.equals(Format.duration(1000, "short"), "1s")
  assert.equals(Format.duration(1001, "short"), "1s")
  assert.equals(Format.duration(1099, "short"), "1s")
  assert.equals(Format.duration(1100, "short"), "1.1s")
  assert.equals(Format.duration(9999, "short"), "9.9s")
  assert.equals(Format.duration(10000, "short"), "10s")
  assert.equals(Format.duration(11111, "short"), "11s")
  assert.equals(Format.duration(22222, "short"), "22s")
  assert.equals(Format.duration(33333, "short"), "33s")
  assert.equals(Format.duration(44444, "short"), "44s")
  assert.equals(Format.duration(55555, "short"), "55s")
  assert.equals(Format.duration(59999, "short"), "59s")
  assert.equals(Format.duration(60000, "short"), "1m")
  assert.equals(Format.duration(60001, "short"), "1m")
  assert.equals(Format.duration(60999, "short"), "1m")
  assert.equals(Format.duration(61000, "short"), "1m 1s")
  assert.equals(Format.duration(62000, "short"), "1m 2s")
  assert.equals(Format.duration(119000, "short"), "1m 59s")
  assert.equals(Format.duration(120000, "short"), "2m")
})

//-----------------------------------------------------------------------------

Test("slugify", () => {
  assert.equals(Format.slugify("Jake"), "jake")
  assert.equals(Format.slugify("Jake Gordon"), "jake-gordon")
  assert.equals(Format.slugify("    Jake     Gordon    "), "jake-gordon")
  assert.equals(Format.slugify("jake-gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake_gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake.gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake------gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake (simon) gordon"), "jake-simon-gordon")
  assert.equals(Format.slugify("jake/gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake?gordon"), "jake-gordon")
  assert.equals(Format.slugify("jake(gordon)"), "jake-gordon")
  assert.equals(Format.slugify(`jake !@#$%^&*()<>[]{};:,+="'~ gordon`), "jake-gordon")
  assert.equals(Format.slugify("jake 123 gordon"), "jake-123-gordon")
  assert.equals(Format.slugify("Jake's Team"), "jakes-team")
  assert.equals(Format.slugify("Joséphine. Élodie"), "joséphine-élodie")
  assert.equals(Format.slugify(""), "")
  assert.equals(Format.slugify("    "), "")
})

//-----------------------------------------------------------------------------

Test("byte size", () => {
  assert.equals(Format.bytes(0),    "0 bytes")
  assert.equals(Format.bytes(1),    "1 byte")
  assert.equals(Format.bytes(2),    "2 bytes")
  assert.equals(Format.bytes(8),    "8 bytes")
  assert.equals(Format.bytes(999),  "999 bytes")
  assert.equals(Format.bytes(1000), "1 KB")
  assert.equals(Format.bytes(1001), "1 KB")
  assert.equals(Format.bytes(1010), "1.01 KB")
  assert.equals(Format.bytes(1100), "1.1 KB")
  assert.equals(Format.bytes(1111), "1.11 KB")
  assert.equals(Format.bytes(1119), "1.12 KB")
  assert.equals(Format.bytes(2000), "2 KB")
  assert.equals(Format.bytes(3000), "3 KB")
  assert.equals(Format.bytes(4000), "4 KB")
  assert.equals(Format.bytes(5000), "5 KB")
  assert.equals(Format.bytes(6000), "6 KB")
  assert.equals(Format.bytes(7000), "7 KB")
  assert.equals(Format.bytes(8000), "8 KB")
  assert.equals(Format.bytes(9000), "9 KB")
  assert.equals(Format.bytes(10000), "10 KB")
  assert.equals(Format.bytes(100000), "100 KB")
  assert.equals(Format.bytes(1000000), "1 MB")
  assert.equals(Format.bytes(10000000), "10 MB")
  assert.equals(Format.bytes(100000000), "100 MB")
  assert.equals(Format.bytes(1000000000), "1 GB")
  assert.equals(Format.bytes(10000000000), "10 GB")
  assert.equals(Format.bytes(100000000000), "100 GB")
  assert.equals(Format.bytes(1000000000000), "1 TB")
  assert.equals(Format.bytes(10000000000000), "10 TB")
  assert.equals(Format.bytes(100000000000000), "100 TB")
  assert.equals(Format.bytes(1000000000000000), "1 PB")
  assert.equals(Format.bytes(1234567890000000), "1.23 PB")
})

//-----------------------------------------------------------------------------

Test("round", () => {
  assert.equals(Format.round(1234, 0), "1234")
  assert.equals(Format.round(1234, 1), "1234")
  assert.equals(Format.round(1234, 2), "1234")

  assert.equals(Format.round(42.234567, 0), "42")
  assert.equals(Format.round(42.234567, 1), "42.2")
  assert.equals(Format.round(42.234567, 2), "42.23")
  assert.equals(Format.round(42.234567, 3), "42.235")
  assert.equals(Format.round(42.234567, 4), "42.2346")

  assert.equals(Format.round(0.234567, 0), "0")
  assert.equals(Format.round(0.234567, 1), "0.2")
  assert.equals(Format.round(0.234567, 2), "0.23")
  assert.equals(Format.round(0.234567, 3), "0.235")
  assert.equals(Format.round(0.234567, 4), "0.2346")

  assert.equals(Format.round(1.00001, 2), "1")
  assert.equals(Format.round(1.10001, 2), "1.1")

  assert.equals(Format.round(1000, 0), "1000")
  assert.equals(Format.round(1000, 1), "1000")
  assert.equals(Format.round(1000, 2), "1000")

  assert.equals(Format.round(1000.001,  2), "1000")
  assert.equals(Format.round(1000.0001, 2), "1000")
})

//-----------------------------------------------------------------------------
