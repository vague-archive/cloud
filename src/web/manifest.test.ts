import { outdent } from "@deps"
import { assert, Test } from "@test"

import { defaultManifest, loadManifest, newManifest } from "./manifest.ts"

//-------------------------------------------------------------------------------------------------

Test("default manifest", () => {
  const manifest = defaultManifest
  assert.equals(manifest("/assets/script.ts"), "/assets/script.ts")
  assert.equals(manifest("/assets/styles.ts"), "/assets/styles.ts")
  assert.equals(manifest("/assets/unknown.js"), "/assets/unknown.js")
})

//-------------------------------------------------------------------------------------------------

Test("new manifest", () => {
  const manifest = newManifest({
    "/assets/script.ts": "/assets/script.123456.js",
    "/assets/styles.css": "/assets/styles.987654.css",
  })
  assert.equals(manifest("/assets/script.ts"), "/assets/script.123456.js")
  assert.equals(manifest("/assets/styles.css"), "/assets/styles.987654.css")
  assert.equals(manifest("/assets/unknown.js"), "/assets/unknown.js")
})

//-------------------------------------------------------------------------------------------------

Test("load manifest", async () => {
  const file = await Deno.makeTempFile()
  Deno.writeTextFile(
    file,
    outdent`
    {
      "/assets/script.ts": "/assets/script.abc.js",
      "/assets/styles.css": "/assets/styles.xyz.css"
    }
  `,
  )
  const manifest = await loadManifest(file)
  assert.equals(manifest("/assets/script.ts"), "/assets/script.abc.js")
  assert.equals(manifest("/assets/styles.css"), "/assets/styles.xyz.css")
  assert.equals(manifest("/assets/unknown.js"), "/assets/unknown.js")
  await Deno.remove(file)
})

//-------------------------------------------------------------------------------------------------

Test("load missing manifest returns the default manifest", async () => {
  const manifest = await loadManifest("/path/to/missing/manifest.json")
  assert.equals(manifest, defaultManifest)
})

//-------------------------------------------------------------------------------------------------
