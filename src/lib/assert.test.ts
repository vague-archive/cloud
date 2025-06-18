import { Test } from "@test"
import { assert as $assert } from "@lib"
import { assertThrows } from "@std/assert"

Test("assert.failed", () => {
  assertThrows(() => $assert.failed(), Error, "assertion failed")
  assertThrows(() => $assert.failed("bang!"), Error, "bang!")
})

Test("assert.true", () => {
  $assert.true(true)
  assertThrows(() => $assert.true(false), Error, "value is not true")
  assertThrows(() => $assert.true(false, "uh oh"), Error, "uh oh")
})

Test("assert.false", () => {
  $assert.false(false)
  assertThrows(() => $assert.false(true), Error, "value is not false")
  assertThrows(() => $assert.false(true, "oops"), Error, "oops")
})

Test("assert.undefined", () => {
  $assert.undefined(undefined)
  assertThrows(() => $assert.undefined("hello"), Error, '"hello" is not undefined')
  assertThrows(() => $assert.undefined(42), Error, "42 is not undefined")
  assertThrows(() => $assert.undefined(null), Error, "null is not undefined")
  assertThrows(() => $assert.undefined(42, "oh no"), Error, "oh no")
})

Test("assert.present", () => {
  $assert.present("hello")
  $assert.present(42)
  $assert.present(true)
  $assert.present(false)
  $assert.present([])
  $assert.present({})
  assertThrows(() => $assert.present(undefined), Error, "value is not present")
  assertThrows(() => $assert.present(null), Error, "value is not present")
  assertThrows(() => $assert.present(null, "oh no"), Error, "oh no")
})

Test("assert.absent", () => {
  $assert.absent(undefined)
  $assert.absent(null)
  assertThrows(() => $assert.absent("hello"), Error, "value is not absent")
  assertThrows(() => $assert.absent(42), Error, "value is not absent")
  assertThrows(() => $assert.absent(true), Error, "value is not absent")
  assertThrows(() => $assert.absent(false), Error, "value is not absent")
  assertThrows(() => $assert.absent([]), Error, "value is not absent")
  assertThrows(() => $assert.absent({}), Error, "value is not absent")
  assertThrows(() => $assert.absent({}, "oops"), Error, "oops")
})

Test("assert.distinct", () => {
  $assert.distinct("hello", "world")
  $assert.distinct("42", 42)
  $assert.distinct(true, false)
  $assert.distinct(null, undefined)
  $assert.distinct(false, 0)
  $assert.distinct(true, 1)
  $assert.distinct([], {})
  $assert.distinct([], []) // arrays are always distinct from each other
  $assert.distinct({}, {}) // objects are always distinct from each other
  assertThrows(() => $assert.distinct("hello", "hello"), Error, "values are not distinct")
  assertThrows(() => $assert.distinct(42, 42), Error, "values are not distinct")
  assertThrows(() => $assert.distinct(42, 42.0), Error, "values are not distinct")
  assertThrows(() => $assert.distinct(undefined, undefined), Error, "values are not distinct")
  assertThrows(() => $assert.distinct(null, null), Error, "values are not distinct")
  assertThrows(() => $assert.distinct(null, null, "uh oh"), Error, "uh oh")
})

Test("assert.isString", () => {
  $assert.isString("hello")
  $assert.isString("")
  assertThrows(() => $assert.isString(undefined), Error, "undefined is not a string")
  assertThrows(() => $assert.isString(null), Error, "null is not a string")
  assertThrows(() => $assert.isString(42), Error, "42 is not a string")
  assertThrows(() => $assert.isString(true), Error, "true is not a string")
  assertThrows(() => $assert.isString(false), Error, "false is not a string")
  assertThrows(() => $assert.isString([]), Error, "[] is not a string")
  assertThrows(() => $assert.isString({}), Error, "{} is not a string")
  assertThrows(() => $assert.isString(42, "oh no"), Error, "oh no")
})

Test("assert.isFile", () => {
  $assert.isFile({ size: 42, type: "text/plain", name: "file.txt" })
  assertThrows(() => $assert.isFile({}), Error, "value is not a file")
  assertThrows(() => $assert.isFile({ size: 42 }), Error, "value is not a file")
  assertThrows(() => $assert.isFile({ type: "text/plain" }), Error, "value is not a file")
  assertThrows(() => $assert.isFile({ name: "file.txt" }), Error, "value is not a file")
})
