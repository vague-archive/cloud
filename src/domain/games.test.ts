import { assert, Fixture, Test } from "@test"
import { Deploy, DeployState, Game, GamePurpose } from "@domain"
 
const PATH = "/path/to/my/game"
const PASSWORD = "you shall not pass!"
const LATEST = "latest"

//=============================================================================
// TEST GAMES
//=============================================================================

Test.domain("game slug must be unique within org", async ({ factory }) => {
  const org1 = await factory.org.create({ id: 100 })
  const org2 = await factory.org.create({ id: 200 })
  await factory.game.create({ organization: org1, slug: "foo" })
  await factory.game.create({ organization: org1, slug: "bar" })
  await factory.game.create({ organization: org2, slug: "foo" })

  const err = await assert.rejects(() => factory.game.create({ organization: org1, slug: "foo" }))
  assert.instanceOf(err, Error)
  assert.equals(err.message, "Duplicate entry '100-foo' for key 'games.games_slug_index'")
})

//-------------------------------------------------------------------------------------------------

Test.domain("getGame and getGameBySlug", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const game1 = await factory.game.create({ organization: org, id: 100, slug: "first" })
  const game2 = await factory.game.create({ organization: org, id: 200, slug: "second" })

  let reload1 = await domain.games.getGame(100)
  let reload2 = await domain.games.getGame(200)
  let reload3 = await domain.games.getGame(Fixture.UnknownId)

  assert.present(reload1)
  assert.present(reload2)
  assert.absent(reload3)

  assert.equals(reload1.id, game1.id)
  assert.equals(reload2.id, game2.id)

  reload1 = await domain.games.getGameBySlug(org, "first")
  reload2 = await domain.games.getGameBySlug(org, "second")
  reload3 = await domain.games.getGameBySlug(org, "unknown")

  assert.present(reload1)
  assert.present(reload2)
  assert.absent(reload3)

  assert.equals(reload1.id, game1.id)
  assert.equals(reload2.id, game2.id)
})

//-------------------------------------------------------------------------------------------------

Test.domain("getGamesForOrg", async ({ factory, domain }) => {
  const org1 = await factory.org.create()
  const org2 = await factory.org.create()
  await factory.game.create({ organization: org1, name: "CCC" })
  await factory.game.create({ organization: org1, name: "AAA", purpose: GamePurpose.Game })
  await factory.game.create({ organization: org1, name: "BBB", purpose: GamePurpose.Tool })
  await factory.game.create({ organization: org2, name: "XXX" })

  let games = await domain.games.getGamesForOrg(org1)
  assert.present(games)
  assert.equals(games.length, 3)
  assert.equals(games[0].name, "AAA")
  assert.equals(games[1].name, "BBB")
  assert.equals(games[2].name, "CCC")

  games = await domain.games.getGamesForOrg(org2)
  assert.present(games)
  assert.equals(games.length, 1)
  assert.equals(games[0].name, "XXX")
})

//-------------------------------------------------------------------------------------------------

Test.domain("createGame", async ({ factory, domain, clock }) => {
  const org = await factory.org.create()
  const game = await domain.games.createGame(org, {
    name: "My Game",
    description: "Awesome",
  })
  assert.present(game)
  assert.instanceOf(game, Game)
  assert.equals(game.organizationId, org.id)
  assert.equals(game.organization, org)
  assert.equals(game.name, "My Game")
  assert.equals(game.slug, "my-game")
  assert.equals(game.description, "Awesome")
  assert.equals(game.purpose, GamePurpose.Game)
  assert.equals(game.archived, false)
  assert.equals(game.createdOn, clock.now)
  assert.equals(game.updatedOn, clock.now)
})

//-------------------------------------------------------------------------------------------------

Test.domain("createTool", async ({ factory, domain, clock }) => {
  const org = await factory.org.create()
  const game = await domain.games.createGame(org, {
    name: "My Game",
    description: "Awesome",
    purpose: GamePurpose.Tool,
  })
  assert.present(game)
  assert.instanceOf(game, Game)
  assert.equals(game.organizationId, org.id)
  assert.equals(game.organization, org)
  assert.equals(game.name, "My Game")
  assert.equals(game.slug, "my-game")
  assert.equals(game.description, "Awesome")
  assert.equals(game.purpose, GamePurpose.Tool)
  assert.equals(game.archived, false)
  assert.equals(game.createdOn, clock.now)
  assert.equals(game.updatedOn, clock.now)
})

//-------------------------------------------------------------------------------------------------

Test.domain("createGame - missing name", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const error = await domain.games.createGame(org, {
    name: "",
    description: "",
  })
  assert.zodError(error)
  assert.zodStringMissing(error, "name")
  assert.zodNoIssue(error, "description")
})

//-------------------------------------------------------------------------------------------------

Test.domain("createGame - slug already exists", async ({ factory, domain }) => {
  const org = await factory.org.create()

  await domain.games.createGame(org, {
    name: "First Game",
    slug: "my-slug",
  })

  const error = await domain.games.createGame(org, {
    name: "Second Game",
    slug: "my-slug",
  })

  assert.zodError(error)
  assert.zodCustomError(error, "name", "Name already taken for this organization")
})

//-------------------------------------------------------------------------------------------------

Test.domain("archiveGame", async ({ clock, factory, domain }) => {
  const game = await factory.game.load("tetris")

  assert.equals(game.archived, false)
  assert.equals(game.archivedOn, undefined)
  await domain.games.archiveGame(game, true)
  assert.equals(game.archived, true)
  assert.equals(game.archivedOn, clock.now)

  await domain.games.archiveGame(game, false)
  assert.equals(game.archived, false)
  assert.equals(game.archivedOn, undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("updateGame - name, slug, and description", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const game = await factory.game.create({ 
    organization: org,
    id: "test",
    name: "Old Name",
    slug: "old-slug",
    description: "Old Description"
  })

  assert.equals(game.name, "Old Name", "preconditions")
  assert.equals(game.slug, "old-slug", "preconditions")
  assert.equals(game.description, "Old Description", "preconditions")

  const newName = "New Name"
  const newSlug = "new-slug"
  const newDescription = "New Description"

  const result = await domain.games.updateGame(game, {
    name: newName,
    slug: newSlug,
    description: newDescription,
  })

  assert.instanceOf(result, Game)

  assert.equals(result.id, game.id)
  assert.equals(result.name, newName)
  assert.equals(result.slug, newSlug)
  assert.equals(result.description, newDescription)

  const reload = await factory.game.load("test")
  assert.equals(reload.id, game.id)
  assert.equals(reload.name, newName)
  assert.equals(reload.slug, newSlug)
  assert.equals(reload.description, newDescription)
})

//-------------------------------------------------------------------------------------------------

Test.domain("updateGame - blank name", async ({ factory, domain }) => {
  const game = await factory.game.load("tetris")

  const error = await domain.games.updateGame(game, {
    name: "",
    description: "",
  })

  assert.zodError(error)
  assert.zodStringMissing(error, "name")
})

//-------------------------------------------------------------------------------------------------

Test.domain("updateGame - slug already exists", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const game1 = await factory.game.create({ slug: "first-game", organization: org })
  const game2 = await factory.game.create({ slug: "second-game", organization: org })

  const error = await domain.games.updateGame(game2, {
    slug: game1.slug
  })

  assert.zodError(error)
  assert.zodCustomError(error, "name", "Name already taken for this organization")
})

//-------------------------------------------------------------------------------------------------

Test.domain("deleteGame", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({
    organization: org,
    id: "test",
    name: "Test",
  })
  const deploy = await factory.deploy.create({
    game,
    deployedByUser: user,
    slug: LATEST,
    path: PATH,
  })

  assert.present(game)
  assert.present(deploy)

  const result = await domain.games.deleteGame(game)
  assert.equals(result, 1n)

  assert.false(await factory.game.exists("test"))
  assert.false(await factory.deploy.exists(LATEST))

  // Ensure assets delete jobs have been queued
  assert.minion(domain.minions, { name: "file:rmdir", path: PATH })

  // That the game name/id is available post-delete
  const gameRemade = await factory.game.create({
    organization: org,
    id: "test",
    name: "Test",
  })
  assert.present(gameRemade)
})

//-------------------------------------------------------------------------------------------------

Test.domain("getPublicTools", async ({ domain, factory }) => {
  const user = await factory.user.create()

  const magic = await factory.game.load("magicTool")
  const retro = await factory.game.load("retroTool")
  const share = await factory.game.load("shareTool")
  const star  = await factory.game.load("starTool")

  const day1 = DT`2024-01-01`
  const day2 = DT`2024-01-02`

  await factory.deploy.create({ id: 111, slug: "magic1", path: "/path/magic1", game: magic, deployedByUser: user, deployedOn: day1 })
  await factory.deploy.create({ id: 222, slug: "magic2", path: "/path/magic2", game: magic, deployedByUser: user, deployedOn: day2 })
  await factory.deploy.create({ id: 333, slug: "retro",  path: "/path/retro",  game: retro, deployedByUser: user })
  await factory.deploy.create({ id: 444, slug: "share",  path: "/path/share",  game: share, deployedByUser: user })

  const games = await domain.games.getPublicTools()

  assert.equals(games.length, 4)

  assert.equals(games[0].id, magic.id)
  assert.equals(games[1].id, retro.id)
  assert.equals(games[2].id, share.id)
  assert.equals(games[3].id, star.id)

  assert.equals(games[0].name, "Magic Tool")
  assert.equals(games[1].name, "Retro Tool")
  assert.equals(games[2].name, "Share Tool")
  assert.equals(games[3].name, "Star Tool")

  assert.present(games[0].organization)
  assert.present(games[1].organization)
  assert.present(games[2].organization)
  assert.present(games[3].organization)

  assert.equals(games[0].organization.name, "Void")
  assert.equals(games[1].organization.name, "Atari")
  assert.equals(games[2].organization.name, "Void")
  assert.equals(games[3].organization.name, "Nintendo")

  assert.present(games[0].deploys)
  assert.present(games[1].deploys)
  assert.present(games[2].deploys)
  assert.present(games[3].deploys)

  assert.equals(games[0].deploys.map((d) => d.slug), ["magic2", "magic1"])
  assert.equals(games[1].deploys.map((d) => d.slug), ["retro"])
  assert.equals(games[2].deploys.map((d) => d.slug), ["share"])
  assert.equals(games[3].deploys.map((d) => d.slug), [])
})

//=============================================================================
// TEST DEPLOYS
//=============================================================================

Test.domain("create deploy", async ({ factory, domain, clock }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await domain.games.createDeploy(game, user, {
    slug: LATEST,
    path: PATH,
  })

  assert.present(deploy.id)
  assert.equals(deploy.organizationId, org.id)
  assert.equals(deploy.gameId, game.id)
  assert.equals(deploy.game, game)
  assert.equals(deploy.state, DeployState.Deploying)
  assert.equals(deploy.active, 0)
  assert.equals(deploy.slug, LATEST)
  assert.equals(deploy.path, PATH)
  assert.equals(deploy.hasPassword, false)
  assert.equals(deploy.password, undefined)
  assert.equals(deploy.pinned, false)
  assert.equals(deploy.error, undefined)
  assert.equals(deploy.deployedBy, user.id)
  assert.equals(deploy.deployedByUser, user)
  assert.equals(deploy.deployedOn, clock.now)
  assert.equals(deploy.createdOn, clock.now)
  assert.equals(deploy.updatedOn, clock.now)
})

//-----------------------------------------------------------------------------

Test.domain("create deploy with password", async ({ factory, domain, clock }) => {
  const { encryptKey } = domain.keys
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await domain.games.createDeploy(game, user, {
    slug: LATEST,
    path: PATH,
    password: PASSWORD,
  })

  assert.present(deploy.id)
  assert.equals(deploy.organizationId, org.id)
  assert.equals(deploy.gameId, game.id)
  assert.equals(deploy.game, game)
  assert.equals(deploy.state, DeployState.Deploying)
  assert.equals(deploy.active, 0)
  assert.equals(deploy.slug, LATEST)
  assert.equals(deploy.path, PATH)
  assert.equals(deploy.error, undefined)
  assert.equals(deploy.deployedBy, user.id)
  assert.equals(deploy.deployedByUser, user)
  assert.equals(deploy.deployedOn, clock.now)
  assert.equals(deploy.createdOn, clock.now)
  assert.equals(deploy.updatedOn, clock.now)

  assert.equals(deploy.hasPassword, true)
  assert.throws(() => deploy.password, Error, "must call decryptPassword() first")
  assert.equals(await deploy.decryptPassword(encryptKey), PASSWORD)
  assert.equals(deploy.password, PASSWORD)
})

//-----------------------------------------------------------------------------

Test.domain("create pinned deploy", async ({ factory, domain, clock }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await domain.games.createDeploy(game, user, {
    slug: LATEST,
    path: PATH,
    pinned: true
  })

  assert.present(deploy.id)
  assert.equals(deploy.organizationId, org.id)
  assert.equals(deploy.gameId, game.id)
  assert.equals(deploy.game, game)
  assert.equals(deploy.state, DeployState.Deploying)
  assert.equals(deploy.active, 0)
  assert.equals(deploy.slug, LATEST)
  assert.equals(deploy.path, PATH)
  assert.equals(deploy.pinned, true)
  assert.equals(deploy.error, undefined)
  assert.equals(deploy.deployedBy, user.id)
  assert.equals(deploy.deployedByUser, user)
  assert.equals(deploy.deployedOn, clock.now)
  assert.equals(deploy.createdOn, clock.now)
  assert.equals(deploy.updatedOn, clock.now)
})

//-----------------------------------------------------------------------------

Test.domain("create deploy upserts on slug", async ({ factory, clock, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const dt1 = DT`2024-01-01T01:01:01Z`
  const dt2 = DT`2024-02-02T02:02:02Z`
  const slug = "my-game"
  const path1 = "/first/path"
  const path2 = "/second/path"

  clock.freeze(dt1)

  const deploy1 = await domain.games.createDeploy(game, user, {
    slug: slug,
    path: path1,
    pinned: true,
  })

  await domain.games.updateDeploy(deploy1, { state: DeployState.Ready })

  assert.equals(deploy1.state, DeployState.Ready)
  assert.equals(deploy1.active, 1)
  assert.equals(deploy1.slug, slug)
  assert.equals(deploy1.path, path1)
  assert.equals(deploy1.pinned, true)
  assert.equals(deploy1.createdOn, dt1)
  assert.equals(deploy1.updatedOn, dt1)
  assert.equals(deploy1.deployedOn, dt1)

  clock.freeze(dt2)

  const deploy2 = await domain.games.createDeploy(game, user, {
    slug: slug,
    path: path2,
  })

  assert.equals(deploy2.state, DeployState.Deploying) // back to deploying (from ready)
  assert.equals(deploy2.active, 1)
  assert.equals(deploy2.id, deploy1.id)
  assert.equals(deploy2.slug, slug)
  assert.equals(deploy2.path, path2)
  assert.equals(deploy2.pinned, true)
  assert.equals(deploy2.createdOn, dt1)
  assert.equals(deploy2.updatedOn, dt2)
  assert.equals(deploy2.deployedOn, dt2)
})

//-----------------------------------------------------------------------------

Test.domain("update deploy", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await factory.deploy.create({ game, deployedByUser: user })
  assert.equals(deploy.state, DeployState.Deploying)
  assert.equals(deploy.error, undefined)

  await domain.games.updateDeploy(deploy, {
    state: DeployState.Ready,
  })
  assert.equals(deploy.state, DeployState.Ready)
  assert.equals(deploy.active, 1)
  assert.equals(deploy.error, undefined)

  await domain.games.updateDeploy(deploy, {
    state: DeployState.Failed,
    error: "failed to upload",
  })
  assert.equals(deploy.state, DeployState.Failed)
  assert.equals(deploy.active, 0)
  assert.equals(deploy.error, "failed to upload")
})

//-----------------------------------------------------------------------------

Test.domain("pin deploy", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await factory.deploy.create({ game, deployedByUser: user })
  assert.equals(deploy.pinned, false)

  await domain.games.pinDeploy(deploy, true)
  assert.equals(deploy.pinned, true)

  await domain.games.pinDeploy(deploy, false)
  assert.equals(deploy.pinned, false)
})

//-----------------------------------------------------------------------------

Test.domain("set (and clear) deploy password", async ({ factory, domain }) => {
  const { encryptKey } = domain.keys
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy = await factory.deploy.create({ game, deployedByUser: user })

  assert.equals(deploy.hasPassword, false)
  assert.equals(deploy.password, undefined)
  assert.equals(await deploy.decryptPassword(encryptKey), undefined)

  await domain.games.setDeployPassword(deploy, PASSWORD)

  assert.equals(deploy.hasPassword, true)
  assert.equals(deploy.password, PASSWORD)
  assert.equals(await deploy.decryptPassword(encryptKey), PASSWORD)

  await domain.games.clearDeployPassword(deploy)

  assert.equals(deploy.hasPassword, false)
  assert.equals(deploy.password, undefined)
  assert.equals(await deploy.decryptPassword(encryptKey), undefined)
})

//-----------------------------------------------------------------------------

Test.domain("get deploy by id", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })
  const deploy1 = await factory.deploy.create({ game, id: 100, slug: "first",  deployedByUser: user })
  const deploy2 = await factory.deploy.create({ game, id: 200, slug: "second", deployedByUser: user })

  const reload1 = await domain.games.getDeploy(100)
  const reload2 = await domain.games.getDeploy(200)
  const reload3 = await domain.games.getDeploy(Fixture.UnknownId)

  assert.present(reload1)
  assert.present(reload2)
  assert.absent(reload3)

  assert.equals(reload1.id, deploy1.id)
  assert.equals(reload2.id, deploy2.id)

  assert.equals(reload1.slug, "first")
  assert.equals(reload2.slug, "second")
})

//-----------------------------------------------------------------------------

Test.domain("get deploy by slug", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()

  const game1 = await factory.game.create({ organization: org })
  const game2 = await factory.game.create({ organization: org })

  const deploy1a = await factory.deploy.create({ game: game1, id: 101, slug: "1a", deployedByUser: user })
  const deploy1b = await factory.deploy.create({ game: game1, id: 102, slug: "1b", deployedByUser: user })
  const deploy2a = await factory.deploy.create({ game: game2, id: 200, slug: "2a", deployedByUser: user })

  const reload1a = await domain.games.getDeployBySlug(game1, "1a")
  const reload1b = await domain.games.getDeployBySlug(game1, "1b")
  const reload2a = await domain.games.getDeployBySlug(game2, "2a")

  assert.present(reload1a)
  assert.present(reload1b)
  assert.present(reload2a)

  assert.equals(reload1a.id, deploy1a.id)
  assert.equals(reload1b.id, deploy1b.id)
  assert.equals(reload2a.id, deploy2a.id)

  assert.equals(reload1a.slug, "1a")
  assert.equals(reload1b.slug, "1b")
  assert.equals(reload2a.slug, "2a")

  assert.absent(await domain.games.getDeployBySlug(game1, "2a"))
  assert.absent(await domain.games.getDeployBySlug(game2, "1a"))
})

//-----------------------------------------------------------------------------

Test.domain("get deploys for game", async ({ factory, domain }) => {
  const game1 = await factory.game.load("pong")
  const game2 = await factory.game.load("asteroids")
  const user1 = await factory.user.load("active")
  const user2 = await factory.user.load("other")

  const day1 = DT`2024-01-01`
  const day2 = DT`2024-01-02`
  const day3 = DT`2024-01-03`
  const day4 = DT`2024-01-04`

  const game1day1user1 = await factory.deploy.create({ game: game1, deployedByUser: user1, deployedOn: day1 })
  const game1day2user2 = await factory.deploy.create({ game: game1, deployedByUser: user2, deployedOn: day2 })
  const game2day3user1 = await factory.deploy.create({ game: game2, deployedByUser: user1, deployedOn: day3 })
  const game2day4user2 = await factory.deploy.create({ game: game2, deployedByUser: user2, deployedOn: day4 })

  let deploys = await domain.games.getDeploys(game1)
  await domain.games.withDeployedBy(deploys)

  assert.equals(deploys.length, 2)
  assert.equals(deploys[0].id, game1day2user2.id)
  assert.equals(deploys[0].game, game1)
  assert.equals(deploys[0].deployedBy, user2.id)
  assert.equals(deploys[0].deployedByUser, user2)
  assert.equals(deploys[1].id, game1day1user1.id)
  assert.equals(deploys[1].game, game1)
  assert.equals(deploys[1].deployedBy, user1.id)
  assert.equals(deploys[1].deployedByUser, user1)

  deploys = await domain.games.getDeploys(game2)

  assert.equals(deploys.length, 2)
  assert.equals(deploys[0].id, game2day4user2.id)
  assert.equals(deploys[1].id, game2day3user1.id)
})

//-----------------------------------------------------------------------------

Test.domain("get expired deploys", async ({ factory, domain, clock }) => {
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })

  const freshDate = DateTime.fromMillis(clock.now.minus({ days: Deploy.ExpirationDays - 1 }).toMillis())
  const expiredDate = DateTime.fromMillis(clock.now.minus({ days: Deploy.ExpirationDays + 1 }).toMillis())

  const freshDeploy = await factory.deploy.create({ game: game, deployedByUser: user, id: 101, slug: "1a", deployedOn: freshDate })
  const expiredDeploy = await factory.deploy.create({ game: game, deployedByUser: user, id: 102, slug: "1b", deployedOn: expiredDate })
  // Pinned deploy should never be selected, even if it is past the expiration date
  await factory.deploy.create({ game: game, deployedByUser: user, id: 103, slug: "1c", deployedOn: expiredDate, pinned: true })

  const expired = await domain.games.getExpiredDeploys()
  assert.equals(expired.length, 1)
  assert.equals(expired[0].id, expiredDeploy.id)

  const expiredFurtherCutoffDate = await domain.games.getExpiredDeploys(Deploy.ExpirationDays * 2)
  assert.equals(expiredFurtherCutoffDate.length, 0)

  const expiredCloserCutoffDate = await domain.games.getExpiredDeploys(Deploy.ExpirationDays / 2)
  assert.equals(expiredCloserCutoffDate.length, 2)
  assert.equals(expiredCloserCutoffDate[0].id, freshDeploy.id)
  assert.equals(expiredCloserCutoffDate[1].id, expiredDeploy.id)
})

//-----------------------------------------------------------------------------

Test.domain("delete deploy", async ({ factory, domain }) => {
  const org = await factory.org.create()
  const game = await factory.game.create({ organization: org })
  const user = await factory.user.create()
  const day1 = DT`2024-01-01`
  const day2 = DT`2024-01-02`
  const day3 = DT`2024-01-03`
  const deploy1 = await factory.deploy.create({ id: 1, game, deployedByUser: user, deployedOn: day1, path: "/path/to/first" })
  const deploy2 = await factory.deploy.create({ id: 2, game, deployedByUser: user, deployedOn: day2, path: "/path/to/second" })
  const deploy3 = await factory.deploy.create({ id: 3, game, deployedByUser: user, deployedOn: day3, path: "/path/to/third" })

  const numDeletedRows = await domain.games.deleteDeploy(deploy2)
  assert.equals(numDeletedRows, 1n)
  assert.false(await factory.deploy.exists(2))

  const reloaded = await domain.games.getDeploy(deploy2.id)
  assert.absent(reloaded)

  const deploys = await domain.games.getDeploys(game)
  assert.equals(deploys.length, 2)
  assert.equals(deploys[0].id, deploy3.id)
  assert.equals(deploys[1].id, deploy1.id)

  assert.minion(domain.minions, { name: "file:rmdir", path: `/path/to/second` }) // cleanup deploy assets
})

//=============================================================================
// TEST MISC
//=============================================================================

Test.domain("sharePath", ({ factory, domain }) => {
  const org = factory.org.build({ id: 100, slug: "my-org" })
  const game = factory.game.build({ id: 200, slug: "my-game", organizationId: org.id })
  const slug = "my-deploy"
  assert.equals(domain.games.sharePath(org, game, slug), "share/100/200/my-deploy")
})

//-------------------------------------------------------------------------------------------------
