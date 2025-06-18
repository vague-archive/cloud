import { is } from "@lib"

interface Options<T> {
  default?: T
  label?: string
}

//-----------------------------------------------------------------------------

function toInt(value: string, opts?: Options<number>) {
  const result = parseInt(value)
  if (Number.isNaN(result)) {
    if (opts?.default !== undefined) {
      return opts.default
    } else {
      throw new Error(`${opts?.label ?? "value"} is not a number`)
    }
  }
  return result
}

function toNumber(value: string, opts?: Options<number>) {
  const result = parseFloat(value)
  if (Number.isNaN(result)) {
    if (opts?.default !== undefined) {
      return opts.default
    } else {
      throw new Error(`${opts?.label ?? "value"} is not a number`)
    }
  }
  return result
}

//-----------------------------------------------------------------------------

function toBool<T>(value: T): boolean {
  if (is.string(value)) {
    return ["true", "t", "yes", "on"].includes(value.toLowerCase())
  } else {
    return !!value
  }
}

//-----------------------------------------------------------------------------

function toArray<T>(value?: T | T[]) {
  if (Array.isArray(value)) {
    return value
  } else if (value === undefined) {
    return []
  } else {
    return [value]
  }
}

//-----------------------------------------------------------------------------

export const to = {
  int: toInt,
  number: toNumber,
  bool: toBool,
  array: toArray,
}

export default to

//-----------------------------------------------------------------------------
