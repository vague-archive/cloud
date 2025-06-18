import { assert, MockFileServer, Test } from "@test"

//-------------------------------------------------------------------------------------------------

Test.domain("stats", async ({ factory, domain }) => {
  const fileServer = new MockFileServer()
  const fileContent = "foo"
  const filePath = "/foo.txt"

  await domain.filestore.save(filePath, new TextEncoder().encode(fileContent))

  const user = await factory.user.load("active")
  const game = await factory.game.load("snakes")
  await factory.deploy.create({ game, deployedByUser: user })

  const stats = await domain.sysadmin.stats()

  assert.equals(stats, {
    organizations: 4,
    users: 10,
    games: 8,
    tools: 5,
    deploys: 1,
    files: {
      local: {
        root: fileServer.root,
        count: 1,
        bytes: fileContent.length,
      }
    },
  })
})

//-------------------------------------------------------------------------------------------------
