import { outdent } from "@deps"
import { assert, Test } from "@test"
import { logger, pp, sanitizeAlertWords } from "@lib/logger"

//-------------------------------------------------------------------------------------------------

Test("logger pp method", () => {
  assert.equals(pp(42), "42")
  assert.equals(pp(true), "true")
  assert.equals(pp(false), "false")
  assert.equals(pp("hello"), '"hello"')

  assert.equals(
    pp({ foo: "bar" }),
    outdent`
    {
      "foo": "bar"
    }`,
  )

  assert.equals(
    pp([1, 2, "hello world", "error", 3]),
    outdent`
    [
      1,
      2,
      "hello world",
      "[ALERTWORD]",
      3
    ]`,
  )
})

//-------------------------------------------------------------------------------------------------

Test("logger pp redacts sensitive params", () => {
  assert.equals(
    pp({ public: "yolo", secret: "shhhh", password: "password", token: "stop!" }),
    outdent`
    {
      "public": "yolo",
      "secret": "[FILTERED]",
      "password": "[FILTERED]",
      "token": "[FILTERED]"
    }
  `,
  )
})

//-------------------------------------------------------------------------------------------------

Test("logger.error", () => {
  logger.error("test logger.error")
  assert.equals(2 + 2, 4)
})

Test("logger.warn", () => {
  logger.warn("test logger.warn")
  assert.equals(2 + 2, 4)
})

Test("logger.info", () => {
  logger.info("test logger.info")
  assert.equals(2 + 2, 4)
})

Test("logger.debug", () => {
  logger.debug("test logger.debug")
  assert.equals(2 + 2, 4)
})

//-------------------------------------------------------------------------------------------------

Test("sanitizeAlertWords", () => {
  assert.equals(sanitizeAlertWords("hello world"), "hello world")
  assert.equals(sanitizeAlertWords("foo crash bar error baz exception yolo failed"), "foo [ALERTWORD] bar [ALERTWORD] baz [ALERTWORD] yolo [ALERTWORD]")
})

//-------------------------------------------------------------------------------------------------
