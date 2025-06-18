import { assert, nextFn, Test, testWebContext } from "@test"
import { ContentType, Header } from "@lib/http"
import { RequestBodyParser } from "@web/middleware/body.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("RequestBodyParser preloads request body if it's a form", async ({ domain }) => {
  const ctx = testWebContext({
    method: "POST",
    state: { domain },
    session: false,
    body: "foo=bar",
    headers: [
      [ Header.ContentType, ContentType.Form ]
    ],
  })

  const middleware = RequestBodyParser()
  const next = nextFn()

  assert.undefined(ctx.state.form, "preconditions")

  await middleware(ctx, next)

  const form = ctx.state.form!
  assert.present(form)
  assert.instanceOf(form, FormData)
  assert.equals(form.get("foo"), "bar")
})

//-------------------------------------------------------------------------------------------------

Test.domain("RequestBodyParser does NOT parse json request body (yet)", async ({ domain }) => {
  const ctx = testWebContext({
    method: "POST",
    state: { domain },
    session: false,
    body: JSON.stringify({ foo: "bar" }),
    headers: [
      [ Header.ContentType, ContentType.Json ]
    ],
  })

  const middleware = RequestBodyParser()
  const next = nextFn()

  assert.undefined(ctx.state.form, "preconditions")
  await middleware(ctx, next)
  assert.undefined(ctx.state.form)

  // verify middleware did not swallow the request body
  const body = await ctx.request.body.json()
  assert.equals(body, { foo: "bar" }, "verify we can still consume the JSON")
})

//-------------------------------------------------------------------------------------------------

Test.domain("RequestBodyParser does NOT swallow plain text request body", async ({ domain }) => {
  const ctx = testWebContext({
    method: "POST",
    state: { domain },
    session: false,
    body: "hello world",
    headers: [
      [ Header.ContentType, ContentType.Text ]
    ],
  })

  const middleware = RequestBodyParser()
  const next = nextFn()

  assert.undefined(ctx.state.form, "preconditions")
  await middleware(ctx, next)
  assert.undefined(ctx.state.form)

  // verify middleware did not swallow the request body
  const body = await ctx.request.body.text()
  assert.equals(body, "hello world", "verify we can still consume the JSON")
})

//-------------------------------------------------------------------------------------------------

Test.domain("RequestBodyParser does nothing by default", async ({ domain }) => {
  const ctx = testWebContext({
    state: { domain },
    session: false,
  })

  const middleware = RequestBodyParser()
  const next = nextFn()

  assert.undefined(ctx.state.form, "preconditions")
  await middleware(ctx, next)
  assert.undefined(ctx.state.form)
})

//-------------------------------------------------------------------------------------------------
