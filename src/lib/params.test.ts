import { assert, Test } from "@test"
import { redact, urlSearchParams } from "./params.ts"

//-----------------------------------------------------------------------------

Test("redact sensitive string params", () => {
  const params = {
    foo: "foo",
    bar: "bar",
    password: "password",
    digest: "digest",
    csrf: "csrf",
    _csrf_token: "csrf",
    secret: "secret",
    secret_thing: "secret thing",
    token: "token",
    magic_token: "token",
    name: "name",
    safe: "safe thing",
    key: "secret key",
    myKey: "secret key",
    my_key: "secret key",
  }
  assert.equals(redact(params), {
    foo: "foo",
    bar: "bar",
    password: "[FILTERED]",
    digest: "[FILTERED]",
    csrf: "[FILTERED]",
    _csrf_token: "[FILTERED]",
    secret: "[FILTERED]",
    secret_thing: "[FILTERED]",
    token: "[FILTERED]",
    magic_token: "[FILTERED]",
    name: "name",
    safe: "safe thing",
    key: "[FILTERED]",
    myKey: "[FILTERED]",
    my_key: "[FILTERED]",
  })
})

//-----------------------------------------------------------------------------

Test("redact in nested object", () => {
  const params = {
    nested: {
      safe: "safe",
      secret: "secret",
    },
  }
  assert.equals(redact(params), {
    nested: {
      safe: "safe",
      secret: "[FILTERED]",
    },
  })
})

//-----------------------------------------------------------------------------

Test("redact in nested array", () => {
  const params = {
    nested: ["foo", { safe: "safe", secret: "secret" }],
  }
  assert.equals(redact(params), {
    nested: ["foo", { safe: "safe", secret: "[FILTERED]" }],
  })
})

//-----------------------------------------------------------------------------

Test("redact also converts URL to string", () => {
  const params = {
    url: new URL("https://localhost:3000"),
    nested: {
      url: new URL("https://example.com"),
    },
  }
  assert.equals(redact(params), {
    url: "https://localhost:3000/",
    nested: {
      url: "https://example.com/",
    },
  })
})

//-------------------------------------------------------------------------------------------------

Test("redact passwords in urls", () => {
  assert.equals(redact("https://user:password@example.com"), "https://user:[FILTERED]@example.com")
  assert.equals(redact("https://user:password@example.com/"), "https://user:[FILTERED]@example.com/")
  assert.equals(redact("https://user:password@example.com/path"), "https://user:[FILTERED]@example.com/path")
  assert.equals(redact("https://user:password@example.com:1234"), "https://user:[FILTERED]@example.com:1234")
  assert.equals(redact("https://user:password@example.com:1234/"), "https://user:[FILTERED]@example.com:1234/")
  assert.equals(redact("https://user:password@example.com:1234/path"), "https://user:[FILTERED]@example.com:1234/path")
  assert.equals(
    redact("mysql://user:password@localhost:3306/database"),
    "mysql://user:[FILTERED]@localhost:3306/database",
  )
  assert.equals(redact("redis://user:password@localhost:6379/0"), "redis://user:[FILTERED]@localhost:6379/0")
  assert.equals(redact(new URL("https://user:password@example.com")), "https://user:[FILTERED]@example.com/")
})

//-------------------------------------------------------------------------------------------------

Test("convert QueryParams (flexible value type) to URLSearchParams (strict string value type)", () => {
  const params = urlSearchParams({
    string: "hello world",
    number: 123,
    bigint: 12345n,
    true: true,
    false: false,
    undefined: undefined,
  })

  assert.instanceOf(params, URLSearchParams)
  assert.equals(params.get("string"), "hello world")
  assert.equals(params.get("number"), "123")
  assert.equals(params.get("bigint"), "12345")
  assert.equals(params.get("true"), "true")
  assert.equals(params.get("false"), null)
  assert.equals(params.get("undefined"), null)
  assert.equals(params.has("false"), false)
  assert.equals(params.has("undefined"), false)

  assert.equals(urlSearchParams(), undefined)
  assert.equals(urlSearchParams(undefined), undefined)
})

//-------------------------------------------------------------------------------------------------
