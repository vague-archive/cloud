function isPresent(value: unknown): value is NonNullable<unknown> {
  return value !== null && value !== undefined
}

function isObject(value: unknown): value is object {
  return isPresent(value) && typeof value === "object" && !Array.isArray(value) && !isBytes(value) && !isDate(value) && !isDateTime(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value)
}

function isBigInt(value: unknown): value is bigint {
  return typeof value === "bigint"
}

function isDate(value: unknown): value is Date {
  return value instanceof Date
}

function isDateTime(value: unknown): value is DateTime {
  return value instanceof DateTime
}

function isBytes(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}

export const is: {
  present: typeof isPresent
  object: typeof isObject
  array: typeof Array.isArray
  string: typeof isString
  number: typeof isNumber
  bigint: typeof isBigInt
  date: typeof isDate
  datetime: typeof isDateTime
  bytes: typeof isBytes
} = {
  present: isPresent,
  object: isObject,
  array: Array.isArray,
  string: isString,
  number: isNumber,
  bigint: isBigInt,
  date: isDate,
  datetime: isDateTime,
  bytes: isBytes,
}

export default is
