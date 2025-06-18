import { delay } from "@std/async"
import { assert, Test } from "@test"
import { Clock } from "@lib/clock"

//-------------------------------------------------------------------------------------------------

Test("live clock is live and NOT freezable", async () => {
  const clock = Clock.live

  assert.equals(clock.freezable, false)
  assert.equals(clock.frozen, false)
  assert.throws(() => clock.freeze())

  const before = clock.now
  await delay(11)
  assert.greater(clock.now.diff(before).toMillis(), 10)
})

//-------------------------------------------------------------------------------------------------

Test("construct a freezable clock", async () => {
  const clock = Clock.freeze()

  assert.equals(clock.freezable, true)
  assert.equals(clock.frozen, true)

  const before = clock.now
  await delay(10)
  assert.equals(clock.now.diff(before).toMillis(), 0)
  assert.equals(clock.now, before)

  clock.unfreeze()
  await delay(11)
  assert.greater(clock.now.diff(before).toMillis(), 10)
  assert.equals(clock.frozen, false)
})

//-------------------------------------------------------------------------------------------------

Test("every tests gets a frozen clock", async ({ clock }) => {
  assert.equals(clock.freezable, true)
  assert.equals(clock.frozen, true)
  const before = clock.now
  await delay(10)
  assert.equals(clock.now.diff(before).toMillis(), 0)
  assert.equals(clock.now, before)
})

//-------------------------------------------------------------------------------------------------

Test("freeze clock (using Date) and time travel forward/back", ({ clock }) => {
  const monday    = DT`2022-07-11T10:00:00.000Z`
  const tuesday   = DT`2022-07-12T10:00:00.000Z`
  const wednesday = DT`2022-07-13T10:00:00.000Z`
  const thursday  = DT`2022-07-14T10:00:00.000Z`
  const future    = DT`2099-12-31T23:59:59.000Z`

  clock.freeze(monday)
  assert.equals(clock.now, monday)

  clock.freeze(tuesday)
  assert.equals(clock.now, tuesday)

  clock.freeze(wednesday)
  assert.equals(clock.now, wednesday)

  clock.forward({ days: 1 })
  assert.equals(clock.now, thursday)

  clock.back({ days: 2 })
  assert.equals(clock.now, tuesday)

  clock.freeze(future)
  assert.equals(clock.now, future)
})

//-------------------------------------------------------------------------------------------------

Test("freeze clock (using string) and time travel forward/back", ({ clock }) => {
  const monday    = "2022-07-11T10:00:00.000Z"
  const tuesday   = "2022-07-12T10:00:00.000Z"
  const wednesday = "2022-07-13T10:00:00.000Z"
  const thursday  = "2022-07-14T10:00:00.000Z"
  const future    = "2099-12-31T23:59:59.000Z"

  clock.freeze(monday)
  assert.equals(clock.now.toISO(), monday)

  clock.freeze(tuesday)
  assert.equals(clock.now.toISO(), tuesday)

  clock.freeze(wednesday)
  assert.equals(clock.now.toISO(), wednesday)

  clock.forward({ days: 1 })
  assert.equals(clock.now.toISO(), thursday)

  clock.back({ days: 2 })
  assert.equals(clock.now.toISO(), tuesday)

  clock.freeze(future)
  assert.equals(clock.now.toISO(), future)
})

//-------------------------------------------------------------------------------------------------

Test("current time in a particular timezone", ({ clock }) => {
  clock.freeze("2022-07-09T20:00:00Z")

  assert.equals(clock.now.toISO(), "2022-07-09T20:00:00.000Z")

  assert.equals(clock.local_now("US/Hawaii").toISO(),        "2022-07-09T10:00:00.000-10:00")
  assert.equals(clock.local_now("US/Pacific").toISO(),       "2022-07-09T13:00:00.000-07:00")
  assert.equals(clock.local_now("America/Santiago").toISO(), "2022-07-09T16:00:00.000-04:00")
  assert.equals(clock.local_now("US/Eastern").toISO(),       "2022-07-09T16:00:00.000-04:00")
  assert.equals(clock.local_now("Europe/London").toISO(),    "2022-07-09T21:00:00.000+01:00")
  assert.equals(clock.local_now("Europe/Berlin").toISO(),    "2022-07-09T22:00:00.000+02:00")
  assert.equals(clock.local_now("Europe/Paris").toISO(),     "2022-07-09T22:00:00.000+02:00")
  assert.equals(clock.local_now("Europe/Rome").toISO(),      "2022-07-09T22:00:00.000+02:00")
  assert.equals(clock.local_now("Africa/Cairo").toISO(),     "2022-07-09T22:00:00.000+02:00")
  assert.equals(clock.local_now("Asia/Kolkata").toISO(),     "2022-07-10T01:30:00.000+05:30")
  assert.equals(clock.local_now("Australia/Perth").toISO(),  "2022-07-10T04:00:00.000+08:00")
  assert.equals(clock.local_now("Pacific/Fiji").toISO(),     "2022-07-10T08:00:00.000+12:00")
})

//-------------------------------------------------------------------------------------------------
