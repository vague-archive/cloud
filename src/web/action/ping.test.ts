import { assert, Test, testWebContext, testWebServer } from "@test"
import Ping from "./ping.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("Ping Server", async ({ domain }) => {
  const server = await testWebServer({ domain })
  const request = new Request("/ping")
  const response = await server.handle(request)
  const text = await assert.response.text(response)
  assert.equals(text, "pong")
})

//-------------------------------------------------------------------------------------------------

Test.domain("Ping Action", async ({ domain }) => {
  const ctx = testWebContext({
    path: "/ping",
    state: { domain },
  })
  Ping(ctx)
  const text = await assert.response.text(ctx.response)
  assert.equals(text, "pong")
})

//-------------------------------------------------------------------------------------------------
