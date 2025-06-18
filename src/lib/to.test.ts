import { assert, Test } from "@test"
import { to } from "./to.ts"

//-----------------------------------------------------------------------------

Test("to.int", () => {
  assert.equals(to.int("123"), 123)
  assert.equals(to.int("123.45"), 123)
  assert.equals(to.int("0x123"), 291)

  assert.throws(() => to.int("not a number"), Error, "value is not a number")
  assert.throws(() => to.int("not a number", { label: "port" }), Error, "port is not a number")

  assert.equals(to.int("not a number", { default: 42 }), 42)
})

//-----------------------------------------------------------------------------

Test("to.number", () => {
  assert.equals(to.number("3.14"), 3.14)
  assert.equals(to.number("100"), 100)
  assert.equals(to.number("0x123"), 0) // edge case, don't worry about it for now

  assert.throws(() => to.number("not a number"), Error, "value is not a number")
  assert.throws(() => to.number("not a number", { label: "port" }), Error, "port is not a number")

  assert.equals(to.number("not a number", { default: 42.123 }), 42.123)
})

//-----------------------------------------------------------------------------

Test("to.bool", () => {
  assert.equals(to.bool("true"), true)
  assert.equals(to.bool("t"), true)
  assert.equals(to.bool("on"), true)
  assert.equals(to.bool("yes"), true)

  assert.equals(to.bool("false"), false)
  assert.equals(to.bool("f"), false)
  assert.equals(to.bool("off"), false)
  assert.equals(to.bool("no"), false)
  assert.equals(to.bool("yolo"), false)
  assert.equals(to.bool(""), false)
})

//-----------------------------------------------------------------------------

Test("to.array", () => {
  assert.equals(to.array(), [])
  assert.equals(to.array(undefined), [])

  assert.equals(to.array("first"), ["first"])
  assert.equals(to.array(["first"]), ["first"])
  assert.equals(to.array(["first", "second"]), ["first", "second"])

  assert.equals(to.array(1), [1])
  assert.equals(to.array([1]), [1])
  assert.equals(to.array([1, 2]), [1, 2])
})

//-----------------------------------------------------------------------------
