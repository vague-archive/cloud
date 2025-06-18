import { assert, nextFn, Test, testWebContext } from "@test"
import { configure } from "@config"
import { Status } from "@lib/http"
import { MemoryKvStore } from "@lib/kvstore"
import { Firewall } from "@web/middleware/firewall.ts"

//-------------------------------------------------------------------------------------------------

const config = configure(new Map<string, string>([
  ["WAF", "true"],
]))

const state = { config }

//-------------------------------------------------------------------------------------------------

Test("Firewall blocks IP address", async () => {
  const kv = new MemoryKvStore()
  const firewall = await Firewall(kv)
  const path = "/.env"

  assert.equals(kv.get(["blocked"]), undefined)

  const ctx = testWebContext({ path, state })
  const next = nextFn()
  await firewall(ctx, next)
  assert.equals(ctx.response.status, Status.NotFound, `expected ${path} to be 404, but was ${ctx.response.status}`)
  assert.equals(next.called, false, `expected ${path} to not call next, but it did`)

  assert.equals(kv.get(["blocked"]), [ "127.0.0.1" ])
})

//-------------------------------------------------------------------------------------------------

Test("Firewall", async () => {

  const valid = [
    "/",
    "/ping",
    "/login",
    "/profile",
    "/join",
    "/downloads",
    "/sysadmin",
    "/atari",
    "/atari/pong",
  ]

  const invalid = [
    "/.env",
    "/.php",
    "/.ssh",
    "/.git",
    "/foo/bar.php",
    "/foo/bar.env",
    "/wp-config",
    "/wp-config/foo/bar",
    "/tmp",
    "/tmp/foo/bar",
    "/autodiscover",
    "/autodiscover/autodiscover.json"
  ]

  for (const path of valid) {
    const kv = new MemoryKvStore()
    const firewall = await Firewall(kv)
    const ctx = testWebContext({ path, state })
    const next = nextFn(() => { ctx.response.status = Status.OK })
    await firewall(ctx, next)
    assert.equals(ctx.response.status, Status.OK, `expected ${path} to be 404, but was ${ctx.response.status}`)
    assert.equals(next.called, true, `expected ${path} to call next, but it did not`)
  }

  for (const path of invalid) {
    const kv = new MemoryKvStore()
    const firewall = await Firewall(kv)
    const ctx = testWebContext({ path, state })
    const next = nextFn()
    await firewall(ctx, next)
    assert.equals(ctx.response.status, Status.NotFound, `expected ${path} to be 404, but was ${ctx.response.status}`)
    assert.equals(next.called, false, `expected ${path} to not call next, but it did`)
  }
})

//-------------------------------------------------------------------------------------------------
