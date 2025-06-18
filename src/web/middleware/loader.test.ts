import { assert, nextFn, Test, testWebContext } from "@test"
import { NotFoundError } from "@web"
import { LoadGame, LoadOrganization } from "./loader.ts"

//=================================================================================================
// TEST LoadOrganization MIDDLEWARE
//=================================================================================================

Test.domain("LoadOrganization", async ({ factory, domain }) => {
  const slug = "my-org"
  const org = await factory.org.create({ slug })
  const user = await factory.user.create({ organizations: [org] })
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: slug },
    state: { domain },
  })

  assert.equals(ctx.params.org, slug)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(next.called, false)

  await LoadOrganization(ctx, next)

  assert.present(ctx.state.organization)
  assert.equals(ctx.state.organization, org)
  assert.equals(next.called, true)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadOrganization - not found", async ({ factory, domain }) => {
  const slug = "no-such-org"
  const user = await factory.user.create()
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: slug },
    state: { domain },
  })

  assert.equals(ctx.params.org, slug)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(next.called, false)

  await assert.rejects(() => LoadOrganization(ctx, next), NotFoundError, "Not Found")
  assert.equals(next.called, false)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadOrganization - not requested", async ({ factory, domain }) => {
  const user = await factory.user.create()
  const next = nextFn()

  const ctx = testWebContext({
    user,
    state: { domain },
  })

  assert.equals(ctx.params, undefined)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(next.called, false)

  await LoadOrganization(ctx, next)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(next.called, true)
})

//=================================================================================================
// TEST LoadGame MIDDLEWARE
//=================================================================================================

Test.domain("LoadOrganization then LoadGame", async ({ factory, domain }) => {
  const orgSlug = "my-org"
  const gameSlug = "my-game"
  const org = await factory.org.create({ slug: orgSlug })
  const user = await factory.user.create({ organizations: [org] })
  const game = await factory.game.create({ organization: org, slug: gameSlug })
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: orgSlug, game: gameSlug },
    state: { domain, organization: org },
  })

  assert.equals(ctx.params.org, orgSlug)
  assert.equals(ctx.params.game, gameSlug)
  assert.equals(ctx.state.organization, org)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, false)

  await LoadGame(ctx, next)

  assert.present(ctx.state.game)
  assert.equals(ctx.state.game, game)
  assert.equals(next.called, true)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadGame - organization not loaded", async ({ factory, domain }) => {
  const user = await factory.user.load("active")
  const orgSlug = "my-org"
  const gameSlug = "my-game"
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: orgSlug, game: gameSlug },
    state: { domain },
  })

  assert.equals(ctx.params.org, orgSlug)
  assert.equals(ctx.params.game, gameSlug)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, false)

  await assert.rejects(
    () => LoadGame(ctx, next),
    Error,
    "organization missing, did you forget LoadOrganization middleware?",
  )
  assert.equals(next.called, false)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadGame - game not found", async ({ factory, domain }) => {
  const orgSlug = "my-org"
  const gameSlug = "no-such-org"
  const org = await factory.org.create({ slug: orgSlug })
  const user = await factory.user.create({ organizations: [org] })
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: orgSlug, game: gameSlug },
    state: { domain, organization: org },
  })

  assert.equals(ctx.params.org, orgSlug)
  assert.equals(ctx.params.game, gameSlug)
  assert.equals(ctx.state.organization, org)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, false)

  await assert.rejects(() => LoadGame(ctx, next), NotFoundError, "Not Found")
  assert.equals(next.called, false)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadGame - game doesn't belong to that organization", async ({ factory, domain }) => {
  const org1Slug = "org-1"
  const org2Slug = "org-2"
  const gameSlug = "no-such-org"
  const org1 = await factory.org.create({ slug: org1Slug })
  const org2 = await factory.org.create({ slug: org2Slug })
  const game = await factory.game.create({ organization: org2, slug: gameSlug })
  const user = await factory.user.create({ organizations: [org1] })
  const next = nextFn()

  assert.equals(game.organizationId, org2.id, "preconditions")

  const ctx = testWebContext({
    user,
    params: { org: org1Slug, game: gameSlug },
    state: { domain, organization: org1 },
  })

  assert.equals(ctx.params.org, org1Slug)
  assert.equals(ctx.params.game, gameSlug)
  assert.equals(ctx.state.organization, org1)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, false)

  await assert.rejects(() => LoadGame(ctx, next), NotFoundError, "Not Found")
  assert.equals(next.called, false)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadGame - game not requested", async ({ factory, domain }) => {
  const user = await factory.user.create()
  const next = nextFn()

  const ctx = testWebContext({
    user,
    state: { domain },
  })

  assert.equals(ctx.params, undefined)
  assert.equals(ctx.state.organization, undefined)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, false)

  await LoadGame(ctx, next)

  assert.equals(ctx.state.organization, undefined)
  assert.equals(ctx.state.game, undefined)
  assert.equals(next.called, true)
})

//-------------------------------------------------------------------------------------------------

Test.domain("LoadGame - game is archived", async ({ factory, domain }) => {
  const orgSlug = "my-org"
  const gameSlug = "my-game"
  const org = await factory.org.create({ slug: orgSlug })
  const user = await factory.user.create({ organizations: [org] })
  await factory.game.create({ organization: org, slug: gameSlug, archived: true })
  
  const next = nextFn()

  const ctx = testWebContext({
    user,
    params: { org: orgSlug, game: gameSlug },
    state: { domain, organization: org },
  })

  await LoadGame(ctx, next)
  assert.equals(ctx.response.status, 302)
  assert.equals(ctx.response.headers.get("location"), `/${orgSlug}/${gameSlug}/settings`)
})

//-------------------------------------------------------------------------------------------------
