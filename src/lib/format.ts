import { pluralize } from "@deps"
import { assert } from "@lib"

const KB = 1000
const MB = KB * 1000
const GB = MB * 1000
const TB = GB * 1000
const PB = TB * 1000

//=================================================================================================

interface FormatContext {
  timezone: string
  locale: string
}

export class Format implements FormatContext {
  static default: Format = new Format()
  static date = Format.default.date
  static time = Format.default.time
  static duration = Format.default.duration
  static plural = Format.default.plural
  static slugify = Format.default.slugify
  static bytes = Format.default.bytes
  static round = Format.default.round

  readonly timezone: string
  readonly locale: string

  static for(options: Partial<FormatContext>) {
    return new Format(options)
  }

  constructor(options?: Partial<FormatContext>) {
    this.timezone = options?.timezone ?? "UTC"
    this.locale = options?.locale ?? "en-US"
  }

  date(dt: DateTime, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
    return this.dtf(dt, options)
  }

  time(dt: DateTime, options: Intl.DateTimeFormatOptions = { timeStyle: "short" }) {
    return this.dtf(dt, options)
  }

  duration(ms: number, format: "short" | "long" = "long") {
    let minutes: number
    let seconds: number

    if (ms < 100) {
      minutes = 0
      seconds = 0
    } else if (ms < 10000) {
      minutes = 0
      seconds = Math.floor(ms / 100) / 10
    } else if (ms < 60000) {
      minutes = 0
      seconds = Math.floor(ms / 1000)
    } else {
      minutes = Math.floor(ms / 60000)
      seconds = Math.floor((ms - (minutes * 60000)) / 1000)
    }

    switch (format) {
      case "long":
        if (minutes === 0 && seconds === 0) {
          return "0 seconds"
        } else if (minutes === 0) {
          return this.plural("seconds", seconds, true)
        } else if (seconds === 0) {
          return this.plural("minutes", minutes, true)
        } else {
          return `${this.plural("minutes", minutes, true)}, ${this.plural("seconds", seconds, true)}`
        }
      case "short":
        if (minutes === 0 && seconds === 0) {
          return "0 seconds"
        } else if (minutes === 0) {
          return `${seconds}s`
        } else if (seconds === 0) {
          return `${minutes}m`
        } else {
          return `${minutes}m ${seconds}s`
        }
      default:
        assert.unreachable(format)
    }
  }

  private dtf(dt: DateTime, options: Intl.DateTimeFormatOptions) {
    return dt.setLocale(this.locale).toLocaleString({
      timeZone: this.timezone,
      ...options,
    })
  }

  plural(word: string, count?: number | unknown[], includeCount = false) {
    count = Array.isArray(count) ? count.length : count
    return pluralize(word, count, includeCount)
  }

  // WARNING: keep in sync with client side method in src/web/assets/script.ts
  slugify(name: string) {
    return name.toLowerCase().trim()
      .replace(/'s/g, "s")
      .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/-$/, "")
  }

  bytes(b: number) {
    if (b < KB) {
      return this.plural("byte", b, true)
    } else if (b < MB) {
      return `${this.round(b / KB, 2)} KB`
    } else if (b < GB) {
      return `${this.round(b / MB, 2)} MB`
    } else if (b < TB) {
      return `${this.round(b / GB, 2)} GB`
    } else if (b < PB) {
      return `${this.round(b / TB, 2)} TB`
    } else {
      return `${this.round(b / PB, 2)} PB`
    }
  }

  round(n: number, dp = 2) {
    let label = n.toFixed(dp)
    if (label.includes(".")) {
      while (label.at(label.length - 1) === "0") {
        label = label.slice(0, label.length - 1)
      }
      if (label.at(label.length - 1) === ".") {
        return label.slice(0, label.length - 1)
      }
    }
    return label
  }

  static migrationDate(dt: DateTime) {
    const pad = (num: number) => (num < 10 ? "0" + num : num)
    const year = dt.year
    const month = pad(dt.month)
    const day = pad(dt.day)
    const hour = pad(dt.hour)
    const minute = pad(dt.minute)
    const second = pad(dt.second)
    return `${year}${month}${day}${hour}${minute}${second}`
  }
}
