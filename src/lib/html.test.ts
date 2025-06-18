import { assert, Test } from "@test"
import { cls } from "./html.ts"

//-----------------------------------------------------------------------------

Test("cls - single string", () => {
  assert.equals(cls("foo"), "foo")
})

Test("cls - multiple strings", () => {
  assert.equals(cls("foo", "bar", "baz"), "foo bar baz")
})

Test("cls - arrays of strings", () => {
  assert.equals(cls([]), "")
  assert.equals(cls(["foo", "bar", "baz"]), "foo bar baz")
  assert.equals(cls("foo", ["bar", "baz"]), "foo bar baz")
  assert.equals(cls("foo", ["bar"], "baz"), "foo bar baz")
  assert.equals(cls(["foo", ["bar", ["baz"]]]), "foo bar baz")
})

Test("cls - key/value object", () => {
  assert.equals(cls({}), "")
  assert.equals(cls({ foo: true }), "foo")
  assert.equals(cls({ foo: true, bar: true }), "foo bar")
  assert.equals(cls({ foo: true, bar: false, baz: true }), "foo baz")
  assert.equals(cls({ foo: true, bar: undefined, baz: true }), "foo baz")
  assert.equals(cls({ foo: true, bar: null, baz: true }), "foo baz")
})

Test("cls undefined", () => {
  assert.equals(cls(), "")
  assert.equals(cls(undefined), "")
  assert.equals(cls(null), "")
  assert.equals(cls("foo", undefined, "bar", null, "baz"), "foo bar baz")
  assert.equals(cls(["foo", undefined, "bar", null, "baz"]), "foo bar baz")
  assert.equals(cls(["foo", [undefined], "bar", [null], "baz"]), "foo bar baz")
})

Test("cls trims strings", () => {
  assert.equals(cls("          "), "")
  assert.equals(cls("    foo   "), "foo")
})

Test("cls - kitchen sink", () => {
  const result = cls(
    "foo",
    undefined,
    null,
    ["bar"],
    {},
    {
      baz: true,
      nope: false,
      nada: undefined,
      nein: null,
      yup: true,
    },
    [[["hello"], { world: true }]],
  )
  assert.equals(result, "foo bar baz yup hello world")
})

//-----------------------------------------------------------------------------
