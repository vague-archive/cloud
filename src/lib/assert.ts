import { is } from "./is.ts" /* DO NOT REMAP THIS to @lib, IT IS USED IN CLIENT SIDE CODE AND WILL BREAK ESBUILD */

//-----------------------------------------------------------------------------

function $assert(condition: boolean, message?: string): asserts condition is true {
  if (!condition) {
    throw new Error(message ?? "condition is not true")
  }
}

function assertUnreachable(value: never): never {
  throw new Error(`unreachable ${value}`)
}

function assertFailed(message?: string) {
  $assert(false, message ?? "assertion failed")
}

function assertUndefined(value: unknown, message?: string): asserts value is undefined {
  $assert(value === undefined, message ?? `${JSON.stringify(value)} is not undefined`)
}

function assertTrue(value: boolean, message?: string): asserts value is true {
  $assert(value, message ?? "value is not true")
}

function assertFalse(value: boolean, message?: string): asserts value is false {
  $assert(value === false, message ?? "value is not false")
}

function assertPresent(value: unknown, message?: string): asserts value is NonNullable<unknown> {
  $assert(value !== null && value !== undefined, message ?? "value is not present")
}

function assertAbsent(value: unknown, message?: string): asserts value is null | undefined {
  $assert(value === null || value === undefined, message ?? "value is not absent")
}

function assertDistinct(value1: unknown, value2: unknown, message?: string) {
  $assert(value1 !== value2, message ?? "values are not distinct")
}

function assertIsObject(value: unknown, message?: string): asserts value is object {
  $assert(is.object(value), message ?? `${JSON.stringify(value)} is not an object`)
}

function assertIsArray(value: unknown, message?: string): asserts value is unknown[] {
  $assert(is.array(value), message ?? `${JSON.stringify(value)} is not an array`)
}

function assertIsString(value: unknown, message?: string): asserts value is string {
  $assert(is.string(value), message ?? `${JSON.stringify(value)} is not a string`)
}

function assertIsNumber(value: unknown, message?: string): asserts value is number {
  $assert(is.number(value), message ?? `${JSON.stringify(value)} is not a number`)
}

function assertIsFile(value: unknown): asserts value is File {
  $assert(
    value !== undefined &&
      value !== null &&
      typeof value === "object" &&
      "size" in value &&
      "type" in value &&
      "name" in value,
    "value is not a file",
  )
}

function assertNonEmptyArray<T>(value: T[], message?: string): asserts value is [T, ...T[]] {
  $assert(value.length > 0, message ?? `value is an empty array`)
}

//-----------------------------------------------------------------------------

export interface RuntimeAssertions {
  unreachable: typeof assertUnreachable
  failed: typeof assertFailed
  undefined: typeof assertUndefined
  true: typeof assertTrue
  false: typeof assertFalse
  present: typeof assertPresent
  absent: typeof assertAbsent
  distinct: typeof assertDistinct
  isObject: typeof assertIsObject
  isArray: typeof assertIsArray
  isString: typeof assertIsString
  isNumber: typeof assertIsNumber
  isFile: typeof assertIsFile
  nonEmptyArray: typeof assertNonEmptyArray
}

export const assert: RuntimeAssertions = {
  unreachable: assertUnreachable,
  failed: assertFailed,
  undefined: assertUndefined,
  true: assertTrue,
  false: assertFalse,
  present: assertPresent,
  absent: assertAbsent,
  distinct: assertDistinct,
  isObject: assertIsObject,
  isArray: assertIsArray,
  isString: assertIsString,
  isNumber: assertIsNumber,
  isFile: assertIsFile,
  nonEmptyArray: assertNonEmptyArray,
}

export default assert

//-----------------------------------------------------------------------------
