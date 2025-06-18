import { assert, Fixture, nextFn, Test, testWebContext } from "@test"
import { config } from "@config"
import { crypto } from "@lib"
import { Header } from "@lib/http"
import { User } from "@domain"
import { Session, USER_KEY } from "@web/middleware/session.ts"
import { Authenticate } from "@web/middleware/authenticate.ts"

//=================================================================================================
// TEST Authenticate.ViaSession
//=================================================================================================

Test.domain("authenticate via session", async ({ domain, factory }) => {
  const org1 = await factory.org.create({ name: "Org 1" })
  const org2 = await factory.org.create({ name: "Org 2" })
  const user = await factory.user.create()
  const next = nextFn()
  await factory.member.create({ organization: org1, user: user })
  await factory.member.create({ organization: org2, user: user })
  await factory.game.create({ organization: org1, name: "Game B" })
  await factory.game.create({ organization: org1, name: "Game A" })

  const session = Session.build(user)
  const ctx = testWebContext({
    state: {
      domain,
      session,
    },
  })

  assert.present(ctx.state.session, "preconditions")
  assert.equals(ctx.state.session.userId, user.id, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaSession(ctx, next)

  assert.equals(next.called, true)
  assert.present(ctx.state.user)
  assert.instanceOf(ctx.state.user, User)
  assert.equals(ctx.state.user.id, user.id)
  assert.equals(ctx.state.user.email, user.email)
  assert.equals(ctx.state.user.name, user.name)

  assert.present(ctx.state.user.organizations)
  assert.equals(ctx.state.user.organizations.map((o) => o.name), ["Org 1", "Org 2"])
  assert.equals(ctx.state.user.organizations.map((o) => o.games?.map((g) => g.name)), [["Game A", "Game B"], []])
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via session - no session", async ({ domain }) => {
  const next = nextFn()
  const ctx = testWebContext({
    state: { domain },
    session: false,
  })
  assert.absent(ctx.state.session)
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaSession(ctx, next)

  assert.equals(next.called, true)
  assert.equals(ctx.state.user, undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via session - empty session", async ({ domain }) => {
  const next = nextFn()
  const session = Session.build()
  const ctx = testWebContext({
    state: {
      domain,
      session,
    },
  })
  assert.present(ctx.state.session)
  assert.equals(ctx.state.session.userId, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaSession(ctx, next)

  assert.equals(next.called, true)
  assert.equals(ctx.state.user, undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via session - unknown userId", async ({ domain }) => {
  const next = nextFn()
  const session = Session.build()
  session.set(USER_KEY, Fixture.UnknownId)
  const ctx = testWebContext({
    state: {
      domain,
      session,
    },
  })
  assert.present(ctx.state.session)
  assert.equals(ctx.state.session.userId, Fixture.UnknownId, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaSession(ctx, next)

  assert.equals(next.called, true)
  assert.equals(ctx.state.user, undefined)
})

//=================================================================================================
// TEST Authenticate.ViaToken
//=================================================================================================

Test.domain("authenticate via token - accepts a personal access token", async ({ factory, domain }) => {
  const user = await factory.user.load("floater")
  const token = crypto.encodeBase64("floater")

  const ctx = testWebContext({
    state: { domain },
    session: false,
    headers: [
      [Header.Authorization, `Bearer ${token}`],
    ],
  })
  const next = nextFn()

  assert.equals(ctx.state.session, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaToken(ctx, next)

  assert.equals(next.called, true)
  assert.present(ctx.state.user)
  assert.instanceOf(ctx.state.user, User)
  assert.equals(ctx.state.user.id, user.id)
  assert.equals(ctx.state.user.email, user.email)
  assert.equals(ctx.state.user.name, user.name)
  assert.present(ctx.state.user.organizations)
  assert.equals(ctx.state.user.organizations.map((o) => o.name), ["Atari", "Nintendo", "Void"])
  assert.equals(ctx.state.user.organizations.map((o) => o.games?.map((g) => g.name)), [
    ["Asteroids", "Pitfall", "Pong", "Retro Tool"],
    ["Donkey Kong", "Star Tool"],
    ["Archived Tool", "Magic Tool", "Share Tool", "Snakes", "Tetris", "Tiny Platformer"]
  ])
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via token - accepts a signed JWT", async ({ domain, factory }) => {
  const org = await factory.org.create({ name: "My Org" })
  const user = await factory.user.create()
  await factory.member.create({ organization: org, user: user })
  await factory.game.create({ organization: org, name: "My Game" })

  const jwt = await crypto.createJWT({ sub: user.id.toString() }, config.keys.signingKey)

  const ctx = testWebContext({
    state: { config, domain },
    session: false,
    headers: [
      [Header.Authorization, `Bearer ${jwt}`],
    ],
  })
  const next = nextFn()

  assert.equals(ctx.state.session, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaToken(ctx, next)

  assert.equals(next.called, true)
  assert.present(ctx.state.user)
  assert.instanceOf(ctx.state.user, User)
  assert.equals(ctx.state.user.id, user.id)
  assert.equals(ctx.state.user.email, user.email)
  assert.equals(ctx.state.user.name, user.name)
  assert.present(ctx.state.user.organizations)
  assert.equals(ctx.state.user.organizations.map((o) => o.name), ["My Org"])
  assert.equals(ctx.state.user.organizations.map((o) => o.games?.map((g) => g.name)), [["My Game"]])
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via token - missing token", async ({ domain }) => {
  const ctx = testWebContext({
    state: { domain },
    session: false,
  })
  const next = nextFn()

  assert.equals(ctx.state.session, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaToken(ctx, next)

  assert.equals(next.called, true)
  assert.equals(ctx.state.user, undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via token - unknown token", async ({ domain }) => {
  const ctx = testWebContext({
    state: { domain },
    session: false,
    headers: [
      [Header.Authorization, `Bearer ${Fixture.UnknownToken} `],
    ],
  })
  const next = nextFn()

  assert.equals(ctx.state.session, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaToken(ctx, next)

  assert.equals(next.called, true)
  assert.absent(ctx.state.user)
})

//-------------------------------------------------------------------------------------------------

Test.domain("authenticate via token - invalid JWT signature", async ({ domain }) => {
  const signingKey = "some other signing key"
  const jwt = await crypto.createJWT({ sub: "123" }, signingKey)

  const ctx = testWebContext({
    state: { config, domain },
    session: false,
    headers: [
      [Header.Authorization, `Bearer ${jwt}`],
    ],
  })
  const next = nextFn()

  assert.equals(ctx.state.session, undefined, "preconditions")
  assert.equals(ctx.state.user, undefined, "preconditions")

  await Authenticate.ViaToken(ctx, next)

  assert.equals(next.called, true)
  assert.absent(ctx.state.user)
})

//-------------------------------------------------------------------------------------------------
