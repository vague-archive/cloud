import { assert, MockFileServer, Test, testMinionsContext } from "@test"
import { RemoveDirectory } from "./rmdir.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("RemoveDirectory", async ({ domain, clock }) => {
  const server = new MockFileServer()

  const path = "path/to/somewhere"
  const context = testMinionsContext(domain)
  const result = await RemoveDirectory({ name: "file:rmdir", path }, context)

  assert.equals(result, {
    path,
    cleanedOn: clock.now,
  })

  server.assertRemoveDirectory("path/to/somewhere")
  server.close()
})

//-------------------------------------------------------------------------------------------------
