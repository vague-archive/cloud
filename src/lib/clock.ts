import { assert, is } from "@lib"

//=================================================================================================

class Clock {

  #freezable: boolean
  #now: DateTime | undefined

  get freezable() { return this.#freezable }
  get frozen()    { return this.#now !== undefined }

  get now() {
    return this.#now || DateTime.utc()
  }

  local_now(tz: string) {
    return this.now.setZone(tz)
  }

  freeze(now?: DateLike) {
    assert.true(this.#freezable)
    this.#now = dt(now || this.now)
    return this.#now
  }

  unfreeze() {
    this.#now = undefined
  }

  forward(duration: DurationLike) {
    this.#now = this.now.plus(duration)
  }

  back(duration: DurationLike) {
    this.#now = this.now.minus(duration)
  }

  private constructor(now: DateLike | undefined | "unfreezable") {
    this.#freezable = now !== "unfreezable"
    if (this.#freezable) {
      this.freeze(now)
    }
  }

  static live = new Clock("unfreezable")
  static freeze(now?: DateLike) {
    return new Clock(now)
  }
}

//=================================================================================================
// DATE-LIKE ARGUMENT DETECTION AND CONVERSION
//=================================================================================================

type DateLike = DateTime | Date | string

function isDate(arg: DateLike): arg is Date {
  return arg instanceof Date
}

function isDateTime(arg: DateLike): arg is DateTime {
  return arg instanceof DateTime
}

function dt(arg: DateLike): DateTime {
  if (isDateTime(arg)) {
    return arg
  } else if (isDate(arg)) {
    return DateTime.fromJSDate(arg)
  } else if (is.string(arg)) {
    return DateTime.fromISO(arg, { setZone: true })
  } else {
    assert.unreachable(arg)
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { Clock }
export default Clock
