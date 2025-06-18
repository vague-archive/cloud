import { is } from "@lib"

const SensitiveKeys: string[] = [
  "password",
  "digest",
  "csrf",
  "secret",
  "key",
  "token",
]

const FILTERED = "[FILTERED]"

export function isKeySensitive(key: string): boolean {
  const normalizedKey = key.toLowerCase()
  return SensitiveKeys.some((s) => normalizedKey.includes(s))
}

// deno-lint-ignore no-explicit-any
type RedactableParam = any

export function redact(value: RedactableParam, sensitive = false): RedactableParam {
  if (is.string(value)) {
    return sensitive ? FILTERED : sanitize(value)
  } else if (value instanceof URL) {
    return redact(value.toString())
  } else if (is.object(value)) {
    const entries = Object.entries(value)
    return entries.reduce((result, [key, value]) => {
      result[key] = redact(value, isKeySensitive(key))
      return result
    }, {} as RedactableParam)
  } else if (is.array(value)) {
    return value.map((v) => redact(v))
  }
  return value
}

//-------------------------------------------------------------------------------------------------

function sanitize(value: string) {
  value = redactUrlPassword(value)
  return value
}

function redactUrlPassword(value: string) {
  const regex = /^(?<scheme>[^:]*):\/\/(?<user>[^:]*):(?<password>[^@]*)@(?<rest>.*)$/
  const matches = regex.exec(value)
  if (matches?.groups) {
    const { scheme, user, rest } = matches.groups
    return `${scheme}://${user}:${FILTERED}@${rest}`
  } else {
    return value
  }
}

//-------------------------------------------------------------------------------------------------

export type QueryParam = string | number | bigint | boolean | undefined
export type QueryParams = Record<string, QueryParam>

export function urlSearchParams(params?: QueryParams): URLSearchParams | undefined {
  if (params) {
    const result = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        result.set(key, value.toString())
      }
    }
    return result
  }
}

//-------------------------------------------------------------------------------------------------
