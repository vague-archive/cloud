import { assert, Fixture, Test } from "@test"
import { crypto, i18n, enc64 } from "@lib"
import { AccountDomain, IdentityProvider, Organization, Token, TokenType, User } from "./account.ts"

//=============================================================================
// TEST ORGANIZATIONS
//=============================================================================

Test.domain("get all organizations", async ({ domain }) => {
  const orgs = await domain.account.allOrganizations()
  assert.equals(orgs.map((o) => o.name), [
    "Atari",
    "Nintendo",
    "Secret",
    "Void",
  ])
})

//-------------------------------------------------------------------------------------------------

Test.domain("get organization by id or slug", async ({ factory, domain }) => {
  const org1 = await factory.org.create({ name: "org1", slug: "org-1" })
  const org2 = await factory.org.create({ name: "org2", slug: "org-2" })

  assert.equals(await domain.account.getOrganization(org1.id), org1)
  assert.equals(await domain.account.getOrganization(org2.id), org2)
  assert.equals(await domain.account.getOrganization(Fixture.UnknownId), undefined)

  assert.equals(await domain.account.getOrganizationBySlug(org1.slug), org1)
  assert.equals(await domain.account.getOrganizationBySlug(org2.slug), org2)
  assert.equals(await domain.account.getOrganizationBySlug("unknown"), undefined)
})

//-------------------------------------------------------------------------------------------------

Test.domain("create organization", async ({ domain, clock }) => {
  const org = await domain.account.createOrganization({
    name: "Jake's Game Studio",
  })
  assert.present(org)
  assert.instanceOf(org, Organization)
  assert.equals(org.name, "Jake's Game Studio")
  assert.equals(org.slug, "jakes-game-studio")
  assert.equals(org.createdOn, clock.now)
  assert.equals(org.updatedOn, clock.now)
})

//-------------------------------------------------------------------------------------------------

Test.domain("organization name and slug are required", async ({ domain }) => {
  const error = await assert.rejects(() => {
    return domain.account.createOrganization({
      name: "",
    })
  })
  assert.zodError(error)
  assert.zodIssue(error, "name", ["String must contain at least 1 character(s)"])
  assert.zodIssue(error, "slug", ["String must contain at least 1 character(s)"])
})

//-------------------------------------------------------------------------------------------------

Test.domain("organization slug must be unique", async ({ domain }) => {
  await domain.account.createOrganization({
    name: "Example 1",
    slug: "example-slug",
  })

  const error = await assert.rejects(() => {
    return domain.account.createOrganization({
      name: "Example 2",
      slug: "example-slug",
    })
  })
  assert.instanceOf(error, AccountDomain.OrganizationSlugTakenError)
})

//-------------------------------------------------------------------------------------------------

Test.domain("organization(s) with games", async ({ factory, domain }) => {
  const org1 = await factory.org.create({ name: "org1", slug: "org1" })
  const org2 = await factory.org.create({ name: "org2", slug: "org2" })
  await factory.game.create({ name: "game1a", organization: org1 })
  await factory.game.create({ name: "game1b", organization: org1 })
  await factory.game.create({ name: "game2b", organization: org2 })
  await factory.game.create({ name: "game2a", organization: org2 })

  assert.equals(org1.games, undefined, "preconditions")
  assert.equals(org2.games, undefined, "preconditions")

  await domain.account.withGames(org1)

  assert.present(org1.games)
  assert.equals(org1.games.map((g) => g.name), ["game1a", "game1b"])
  assert.equals(org2.games, undefined)

  await domain.account.withGames([org1, org2])

  assert.present(org1.games)
  assert.present(org2.games)
  assert.equals(org1.games.map((g) => g.name), ["game1a", "game1b"])
  assert.equals(org2.games.map((g) => g.name), ["game2a", "game2b"])
})

//-------------------------------------------------------------------------------------------------

Test.domain("organization with members", async ({ factory, domain }) => {
  const org1 = await factory.org.load("void")
  const org2 = await factory.org.load("atari")

  assert.equals(org1.members, undefined)
  assert.equals(org2.members, undefined)

  await domain.account.withMembers(org1)

  assert.present(org1.members)
  assert.equals(org1.members.map((m) => m.user!.name), [
    "Jake Gordon",
    "Scarlett Blaiddyd",
    "The Floater",
  ])

  assert.equals(org1.members.map((m) => m.user!.identities?.map((i) => i.username)), [
    [ "jakesgordon" ],
    [ "scarlettblaiddyd" ],
    [ "floater" ],
  ])

  await domain.account.withMembers(org2)

  assert.present(org2.members)
  assert.equals(org2.members.map((m) => m.user!.name), [
    "Active User",
    "Disabled User",
    "Jake Gordon",
    "Nolan Bushnell",
    "Scarlett Blaiddyd",
    "Sysadmin User",
    "The Floater",
  ])

  assert.equals(org2.members.map((m) => m.user!.identities?.map((i) => i.username)), [
    [ "active" ],
    [ "disabled" ],
    [ "jakesgordon" ],
    [ "bushnell" ],
    [ "scarlettblaiddyd" ],
    [ "sysadmin" ],
    [ "floater" ],
  ])
})

//-------------------------------------------------------------------------------------------------

Test.domain("update organization", async ({ factory, domain }) => {
  const org1 = await factory.org.load("void")
  const org2 = await factory.org.load("atari")

  assert.present(org1)
  assert.present(org2)

  const newName = "New Name"
  const newSlug = "new-name"

  const result = await domain.account.updateOrganization(org1, {
    name: newName,
    slug: newSlug,
  })

  assert.instanceOf(result, Organization)
  assert.equals(result.id, org1.id)
  assert.equals(result.name, newName)
  assert.equals(result.slug, newSlug)

  const reload = await factory.org.load(org1.id)
  assert.equals(reload.id, org1.id)
  assert.equals(reload.name, newName)
  assert.equals(reload.slug, newSlug)
})

//-------------------------------------------------------------------------------------------------

Test.domain("update organization - blank name", async ({ factory, domain }) => {
  const org1 = await factory.org.load("void")

  const error = await domain.account.updateOrganization(org1, {
    name: "",
    slug: "",
  })

  assert.zodError(error)
  assert.zodStringMissing(error, "name")
})

//-------------------------------------------------------------------------------------------------

Test.domain("update organization - slug already exists", async ({ factory, domain }) => {
  const org1 = await factory.org.load("void")
  const org2 = await factory.org.load("atari")

  const error = await domain.account.updateOrganization(org1, {
    name: org2.name,
    slug: org2.slug,
  })

  assert.zodError(error)
  assert.zodCustomError(error, "name", "Organization with this name already exists")
})


//=============================================================================
// TEST USERS
//=============================================================================

Test.domain("get all users ordered by name", async ({ domain }) => {
  const users = await domain.account.getUsers()
  assert.equals(users.map((u) => u.name), [
    "Active User",
    "Disabled User",
    "Jake Gordon",
    "Nolan Bushnell",
    "Other User",
    "Scarlett Blaiddyd",
    "Shigeru Miyamoto",
    "Sysadmin User",
    "The Floater",
    "The Outsider",
  ])
})

//-----------------------------------------------------------------------------

Test.domain("get user by id", async ({ domain, factory }) => {
  const org = await factory.org.create()
  const user1 = await factory.user.create()
  const user2 = await factory.user.create()
  const identity1 = await factory.identity.create({ userId: user1.id })
  await factory.identity.create({ userId: user2.id })
  await factory.member.create({ user: user1, organization: org })

  assert.present(user1)
  assert.present(user2)

  const reload = await domain.account.getUser(user1.id)

  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user1.id)
  assert.equals(reload.name, user1.name)
  assert.equals(reload.email, user1.email)
  assert.equals(reload.disabled, user1.disabled)
  assert.equals(reload.timezone, user1.timezone)
  assert.equals(reload.locale, user1.locale)
  assert.equals(reload.createdOn, user1.createdOn)
  assert.equals(reload.updatedOn, user1.updatedOn)
  assert.equals(reload.roles, undefined)
  assert.equals(reload.organizations, undefined)

  assert.present(reload.identities)
  assert.equals(reload.identities.length, 1)
  assert.equals(reload.identity.provider, identity1.provider)
  assert.equals(reload.identity.identifier, identity1.identifier)
  assert.equals(reload.identity.username, identity1.username)

  const user = await domain.account.getUser(42)
  assert.equals(user, undefined)
})

//-----------------------------------------------------------------------------

Test.domain("get user by (provider and) identifier", async ({ domain, factory }) => {
  const provider1 = IdentityProvider.Github
  const provider2 = IdentityProvider.Discord

  const email1 = "john.doe@example.com"
  const email2 = "jane.doe@example.com"
  const identifier1 = "first"
  const identifier2 = "second"

  const org = await factory.org.create()
  const user1 = await factory.user.create({ email: email1 })
  const user2 = await factory.user.create({ email: email2 })
  const identity1 = await factory.identity.create({ userId: user1.id, provider: provider1, identifier: identifier1 })
  const identity2 = await factory.identity.create({ userId: user2.id, provider: provider2, identifier: identifier2 })
  await factory.member.create({ user: user1, organization: org })

  assert.present(user1)
  assert.present(user2)
  assert.present(identity1)
  assert.present(identity2)

  const reload = await domain.account.getUserByIdentifier(provider1, identifier1)

  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user1.id)
  assert.equals(reload.identity.provider, identity1.provider)
  assert.equals(reload.identity.identifier, identity1.identifier)
  assert.equals(reload.identity.username, identity1.username)
  assert.equals(reload.name, user1.name)
  assert.equals(reload.email, user1.email)
  assert.equals(reload.disabled, user1.disabled)
  assert.equals(reload.timezone, user1.timezone)
  assert.equals(reload.locale, user1.locale)
  assert.equals(reload.createdOn, user1.createdOn)
  assert.equals(reload.updatedOn, user1.updatedOn)
  assert.equals(reload.roles, undefined)
  assert.equals(reload.organizations, undefined)

  assert.undefined(await domain.account.getUserByIdentifier(provider1, identifier2))
  assert.undefined(await domain.account.getUserByIdentifier(provider2, identifier1))

  assert.undefined(await domain.account.getUserByIdentifier(provider1, "unknown"))
  assert.undefined(await domain.account.getUserByIdentifier(provider2, "unknown"))
})

//-----------------------------------------------------------------------------

Test.domain("get user by access token", async ({ domain, factory }) => {
  const identity1 = await factory.identity.load("active")
  const identity2 = await factory.identity.load("other")
  const user1 = await factory.user.load("active")
  const user2 = await factory.user.load("other")

  const token1 = enc64("active")
  const token2 = enc64("other")
  const token3 = enc64("unknown")

  let reload = await domain.account.getUserByAccessToken(token1)

  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user1.id)
  assert.equals(reload.identity.provider, identity1.provider)
  assert.equals(reload.identity.identifier, identity1.identifier)
  assert.equals(reload.identity.username, identity1.username)
  assert.equals(reload.name, user1.name)
  assert.equals(reload.email, user1.email)
  assert.equals(reload.disabled, user1.disabled)
  assert.equals(reload.timezone, user1.timezone)
  assert.equals(reload.locale, user1.locale)
  assert.equals(reload.createdOn, user1.createdOn)
  assert.equals(reload.updatedOn, user1.updatedOn)
  assert.equals(reload.roles, undefined)
  assert.equals(reload.organizations, undefined)

  reload = await domain.account.getUserByAccessToken(token2)
  assert.present(reload)
  assert.equals(reload.id, user2.id)
  assert.equals(reload.identity.provider, identity2.provider)
  assert.equals(reload.identity.identifier, identity2.identifier)
  assert.equals(reload.identity.username, identity2.username)
  assert.equals(reload.name, user2.name)
  assert.equals(reload.email, user2.email)
  assert.equals(reload.disabled, user2.disabled)
  assert.equals(reload.timezone, user2.timezone)
  assert.equals(reload.locale, user2.locale)
  assert.equals(reload.createdOn, user2.createdOn)
  assert.equals(reload.updatedOn, user2.updatedOn)
  assert.equals(reload.roles, undefined)
  assert.equals(reload.organizations, undefined)

  reload = await domain.account.getUserByAccessToken(token3)
  assert.absent(reload)
})

//-----------------------------------------------------------------------------

Test.domain("get user with authorization context", async ({ domain, factory }) => {
  const org1 = await factory.org.create({ name: "First" })
  const org2 = await factory.org.create({ name: "Second" })
  const org3 = await factory.org.create({ name: "Third" })

  const user1 = await factory.user.create()
  const user2 = await factory.user.create()

  await factory.member.create({ user: user1, organization: org1 })
  await factory.member.create({ user: user1, organization: org2 })
  await factory.member.create({ user: user1, organization: org3 })
  await factory.member.create({ user: user2, organization: org2 })

  await factory.game.create({ name: "Game B", organization: org2 })
  await factory.game.create({ name: "Game A", organization: org1 })
  await factory.game.create({ name: "Game C", organization: org3 })

  assert.equals(user1.organizations, undefined)
  assert.equals(user2.organizations, undefined)

  await domain.account.withAuthorizationContext(user1)
  await domain.account.withAuthorizationContext(user2)

  assert.present(user1.organizations)
  assert.present(user2.organizations)

  assert.equals(user1.organizations.map((o) => o.name), ["First", "Second", "Third"])
  assert.equals(user2.organizations.map((o) => o.name), ["Second"])

  assert.equals(user1.organizations.map((o) => o.games?.map((g) => g.name)), [["Game A"], ["Game B"], ["Game C"]])
  assert.equals(user2.organizations.map((o) => o.games?.map((g) => g.name)), [["Game B"]])
})

//-----------------------------------------------------------------------------

Test.domain("update user", async ({ domain, factory }) => {
  const user = await factory.user.load("active")
  assert.equals(user.name, "Active User", "preconditions")
  assert.equals(user.timezone, "America/Los_Angeles", "preconditions")
  assert.equals(user.locale, "en-US", "preconditions")

  const newName = "New Name"
  const newTimezone = "Europe/Paris"
  const newLocale = "en-GB"

  const result = await domain.account.updateUser(user, {
    name: newName,
    timezone: newTimezone,
    locale: newLocale
  })

  assert.instanceOf(result, User)

  assert.equals(result.id, user.id)
  assert.equals(result.name, newName)
  assert.equals(result.timezone, newTimezone)
  assert.equals(result.locale, newLocale)

  const reload = await domain.account.getUser(user.id)
  assert.present(reload)
  assert.equals(reload.id, user.id)
  assert.equals(reload.name, newName)
  assert.equals(reload.timezone, newTimezone)
  assert.equals(reload.locale, newLocale)
})

//-----------------------------------------------------------------------------

Test.domain("update user - missing values", async ({ domain, factory }) => {
  const user = await factory.user.load("active")

  const error = await domain.account.updateUser(user, {
    name: "",
    timezone: "",
    locale: "",
  })

  assert.zodError(error)
  assert.zodStringMissing(error, "name")
  assert.zodInvalidEnum(error, "timezone", i18n.timezones)
  assert.zodInvalidEnum(error, "locale", i18n.locales)
})

//=============================================================================
// TEST MEMBERS
//=============================================================================

Test.domain("disconnect member", async ({ domain, factory}) => {
  const org1 = await factory.org.load("void")
  const org2 = await factory.org.load("atari")

  assert.equals(org1.members, undefined)
  assert.equals(org2.members, undefined)

  await domain.account.withMembers(org1)

  const org2Members = (await domain.account.withMembers(org2)).members

  assert.present(org2Members)

  assert.present(org1.members)
  assert.equals(org1.members.map((m) => m.user!.name), [
    "Jake Gordon",
    "Scarlett Blaiddyd",
    "The Floater",
  ])

  const user1 = org1.members[0].user
  assert.present(user1)
  assert.equals(await domain.account.deleteMember(user1, org1), 1n)

  await domain.account.withMembers(org1)
  
  assert.present(org1.members)
  assert.equals(org1.members.length, 2)

  // Only disconnected member from org1, expect org2 members list to be untouched
  await domain.account.withMembers(org2)
  assert.equals(org2Members, org2.members)
})

//=============================================================================
// TEST TOKENS
//=============================================================================

Test.domain("get access token", async ({ domain, factory, clock }) => {
  const now = DT`2024-01-01T12:00:00Z`
  const earlier = now.minus({ seconds: 1 })
  const later   = now.plus({ seconds: 1 })

  clock.freeze(now)

  const user = await factory.user.load("active")

  const infiniteAccessToken  = await factory.token.create({ type: TokenType.Access, userId: user.id })
  const temporaryAccessToken = await factory.token.create({ type: TokenType.Access, userId: user.id, expiresOn: later })
  const expiredAccessToken   = await factory.token.create({ type: TokenType.Access, userId: user.id, expiresOn: earlier })

  assert.equals(infiniteAccessToken.hasExpired(clock),  false, "preconditions")
  assert.equals(temporaryAccessToken.hasExpired(clock), false, "preconditions")
  assert.equals(expiredAccessToken.hasExpired(clock),   true,  "preconditions")

  assert.equals(infiniteAccessToken.isSpent,  false, "preconditions")
  assert.equals(temporaryAccessToken.isSpent, false, "preconditions")
  assert.equals(expiredAccessToken.isSpent,   false, "preconditions")

  let token = await domain.account.getAccessToken(infiniteAccessToken.value!)
  assert.present(token)
  assert.instanceOf(token, Token)
  assert.equals(token.id, infiniteAccessToken.id)
  assert.equals(token.userId, user.id)
  assert.equals(token.value, undefined)
  assert.equals(token.digest, infiniteAccessToken.digest)
  assert.equals(token.expiresOn, undefined)
  assert.equals(token.isSpent, false)

  token = await domain.account.getAccessToken(temporaryAccessToken.value!)
  assert.present(token)
  assert.instanceOf(token, Token)
  assert.equals(token.id, temporaryAccessToken.id)
  assert.equals(token.userId, user.id)
  assert.equals(token.value, undefined)
  assert.equals(token.digest, temporaryAccessToken.digest)
  assert.equals(token.expiresOn, later)
  assert.equals(token.isSpent, false)

  token = await domain.account.getAccessToken(expiredAccessToken.value!)
  assert.absent(token)

  token = await domain.account.getAccessToken(enc64("unknown"))
  assert.absent(token)
})

//-----------------------------------------------------------------------------

Test.domain("get access tokens for user", async ({ domain, factory }) => {
  const user1 = await factory.user.create()
  const user2 = await factory.user.create()

  const token1a = await factory.token.create({ id: 101, userId: user1.id })
  const token1b = await factory.token.create({ id: 102, userId: user1.id })
  const token2a = await factory.token.create({ id: 201, userId: user2.id })

  const tokens1: Token[] = await domain.account.getAccessTokens(user1)
  assert.present(tokens1)
  assert.equals(tokens1.length, 2)
  assert.equals(tokens1[0].id, token1a.id)
  assert.equals(tokens1[1].id, token1b.id)

  const tokens2: Token[] = await domain.account.getAccessTokens(user2)
  assert.present(tokens2)
  assert.equals(tokens2.length, 1)
  assert.equals(tokens2[0].id, token2a.id)
})

//-----------------------------------------------------------------------------

Test.domain("generate access token for user", async ({ domain, factory, clock }) => {
  const user = await factory.user.create()
  const token = await domain.account.generateAccessToken(user)

  assert.instanceOf(token, Token)
  assert.present(token.id)
  assert.equals(token.type, TokenType.Access)
  assert.present(token.value)
  assert.equals(token.digest, await crypto.hashToken(token.value))
  assert.equals(token.userId, user.id)
  assert.equals(token.isSpent, false)
  assert.equals(token.expiresOn, clock.now.plus({ years: 1 }))
  assert.equals(token.createdOn, clock.now)
  assert.equals(token.updatedOn, clock.now)
})

//-----------------------------------------------------------------------------

Test.domain("revoke access token", async ({ domain, factory }) => {
  const user = await factory.user.create()
  const token = await factory.token.create({ userId: user.id })
  assert.present(token.value)

  let reloaded = await domain.account.getUserByAccessToken(token.value)
  assert.present(reloaded)
  assert.equals(reloaded.id, user.id)

  const result = await domain.account.revokeAccessToken(token)
  assert.equals(result, true)

  reloaded = await domain.account.getUserByAccessToken(token.value)
  assert.absent(reloaded)
})

//=============================================================================
// TEST INVITE TOKENS
//=============================================================================

Test.domain("get invite", async ({ domain, factory, clock }) => {
  const now     = clock.freeze(DT`2024-01-01T12:00:00Z`)
  const earlier = now.minus({ seconds: 1 })
  const later   = now.plus({ seconds: 1 })

  const org = await factory.org.load("nintendo")
  const email = "someone@example.com"

  const inviteToken        = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: email, expiresOn: later })
  const expiredInviteToken = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: email, expiresOn: earlier })
  const spentInviteToken   = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: email, isSpent: true })

  assert.equals(inviteToken.hasExpired(clock),        false, "preconditions")
  assert.equals(expiredInviteToken.hasExpired(clock), true,  "preconditions")
  assert.equals(spentInviteToken.hasExpired(clock),   false, "preconditions")

  assert.equals(inviteToken.isSpent,        false, "preconditions")
  assert.equals(expiredInviteToken.isSpent, false, "preconditions")
  assert.equals(spentInviteToken.isSpent,   true,  "preconditions")

  let token = await domain.account.getInvite(inviteToken.value!)
  assert.present(token)
  assert.instanceOf(token, Token)
  assert.equals(token.id, inviteToken.id)
  assert.equals(token.organizationId, org.id)
  assert.equals(token.sentTo, email)
  assert.equals(token.value, undefined)
  assert.equals(token.digest, inviteToken.digest)
  assert.equals(token.expiresOn, later)
  assert.equals(token.isSpent, false)

  token = await domain.account.getInvite(expiredInviteToken.value!)
  assert.absent(token)

  token = await domain.account.getInvite(spentInviteToken.value!)
  assert.absent(token)

  token = await domain.account.getInvite(enc64("unknown"))
  assert.absent(token)
})

//-------------------------------------------------------------------------------------------------

Test.domain("get invites for org", async ({ domain, factory, clock }) => {
  const now     = clock.freeze(DT`2024-01-01T12:00:00Z`)
  const earlier = now.minus({ seconds: 1 })
  const later   = now.plus({ seconds: 1 })

  const org1 = await factory.org.create()
  const org2 = await factory.org.create()

  await factory.token.create({ type: TokenType.Invite, organizationId: org1.id, sentTo: "first" })
  await factory.token.create({ type: TokenType.Invite, organizationId: org1.id, sentTo: "second", expiresOn: later })
  await factory.token.create({ type: TokenType.Invite, organizationId: org1.id, sentTo: "expired", expiresOn: earlier })
  await factory.token.create({ type: TokenType.Invite, organizationId: org1.id, sentTo: "spent", isSpent: true })
  await factory.token.create({ type: TokenType.Invite, organizationId: org2.id, sentTo: "other", expiresOn: later })

  let invites = await domain.account.getInvitesForOrganization(org1)
  assert.equals(invites.map((i) => i.sentTo), ["first", "second"])

  invites = await domain.account.getInvitesForOrganization(org2)
  assert.equals(invites.map((i) => i.sentTo), ["other"])
})

//=============================================================================
// TEST SENDING INVITES
//=============================================================================

Test.domain.web("send invite", async ({ mailer, domain, factory, clock, route }) => {
  const org = await factory.org.load("nintendo")
  const email = "someone@example.com"
  const token = await domain.account.sendInvite(org, email, route)
  assert.present(token)
  assert.instanceOf(token, Token)
  assert.equals(token.type, TokenType.Invite)
  assert.present(token.value)
  assert.equals(token.digest, await crypto.hashToken(token.value))
  assert.equals(token.organizationId, org.id)
  assert.equals(token.userId, undefined)
  assert.equals(token.sentTo, email)
  assert.equals(token.isSpent, false)
  assert.equals(token.expiresOn, clock.now.plus(Token.TTL[TokenType.Invite]))
  assert.equals(token.createdOn, clock.now)
  assert.equals(token.updatedOn, clock.now)
  assert.mailed(mailer, "invite", {
    to: email,
    organization: org.name,
    action_url: route("join", token.value, { full: true }),
  })
})

Test.domain.web("send invite - missing email", async ({ domain, mailer, factory, route }) => {
  const org = await factory.org.load("nintendo")
  const result = await domain.account.sendInvite(org, "", route)
  assert.zodError(result)
  assert.zodStringMissing(result, "email")
  assert.nothingMailed(mailer)
})

Test.domain.web("send invite - invalid email", async ({ domain, mailer, factory, route }) => {
  const org = await factory.org.load("nintendo")
  const result = await domain.account.sendInvite(org, "not an email", route)
  assert.zodError(result)
  assert.zodIssue(result, "email", "Invalid email")
  assert.nothingMailed(mailer)
})

Test.domain.web("send invite - email already a member", async ({ domain, mailer, factory, route }) => {
  const user = await factory.user.load("active")
  const org = await factory.org.load("atari")
  const result = await domain.account.sendInvite(org, user.email!, route)
  assert.zodError(result)
  assert.zodIssue(result, "invite", "User is already a member of this organization")
  assert.nothingMailed(mailer)
})

Test.domain.web("send invite - email already invited", async ({ domain, mailer, factory, route }) => {
  const email = Fixture.Email
  const org = await factory.org.load("atari")
  await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: email })
  const result = await domain.account.sendInvite(org, email, route)
  assert.zodError(result)
  assert.zodIssue(result, "invite", "User has already been invited to join this organization")
  assert.nothingMailed(mailer)
})

//=============================================================================
// TEST RETRACTING INVITES
//=============================================================================

Test.domain("retractInvite", async ({ domain, factory }) => {
  const token = await factory.token.create({ type: TokenType.Invite })
  assert.present(token.value)

  let reload = await domain.account.getInvite(token.value)
  assert.present(reload)
  assert.instanceOf(reload, Token)
  assert.equals(reload.id, token.id)

  const result = await domain.account.retractInvite(token)
  assert.equals(result, true)

  reload = await domain.account.getInvite(token.value)
  assert.absent(reload)
})

//=============================================================================
// TEST ACCEPTING INVITES
//=============================================================================

Test.domain("accept invite for new user", async ({ domain, factory, clock }) => {
  const org = await factory.org.load("nintendo")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })

  const user = await domain.account.acceptInviteForNewUser(token, {
    provider: IdentityProvider.Github,
    identifier: Fixture.Identifier,
    username: Fixture.UserName,
    name: Fixture.Name,
    timezone: Fixture.Timezone.Mountain,
    locale: Fixture.Locale.GB
  })

  assert.present(user)
  assert.instanceOf(user, User)
  assert.equals(user.identity.provider, IdentityProvider.Github)
  assert.equals(user.identity.identifier, Fixture.Identifier)
  assert.equals(user.identity.username, Fixture.UserName)
  assert.equals(user.name, Fixture.Name)
  assert.equals(user.email, Fixture.Email)
  assert.equals(user.disabled, false)
  assert.equals(user.timezone, Fixture.Timezone.Mountain)
  assert.equals(user.locale, Fixture.Locale.GB)
  assert.equals(user.createdOn, clock.now)
  assert.equals(user.updatedOn, clock.now)
  assert.equals(user.roles, [])
  assert.equals(user.organizations?.map((o) => o.id), [org.id])

  const reload = await domain.account.getUser(user.id)
  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user.id)

  await domain.account.withOrganizations(reload)
  assert.equals(reload.organizations?.map((o) => o.id), [org.id])

  const reloadToken = await domain.account.getInvite(token.value!)
  assert.absent(reloadToken)
})

//-------------------------------------------------------------------------------------------------

Test.domain("accept invite - existing user", async ({ domain, factory }) => {
  const org = await factory.org.create({ name: "Acme" })
  const user = await factory.user.load("active")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email! })

  await domain.account.withOrganizations(user)
  assert.equals(user.belongsTo(org), false, "preconditions")

  const result = await domain.account.acceptInviteForExistingUser(token, user)
  assert.present(result)
  assert.instanceOf(result, User)
  assert.equals(result.id, user.id)
  assert.equals(result.belongsTo(org), true)

  const reload = await domain.account.getUser(user.id)
  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user.id)

  await domain.account.withOrganizations(reload)
  assert.equals(reload.belongsTo(org), true)

  const reloadToken = await domain.account.getInvite(token.value!)
  assert.absent(reloadToken)
})

//-------------------------------------------------------------------------------------------------

Test.domain("accept invite - existing user is already a member", async ({ domain, factory }) => {
  const org = await factory.org.load("atari")
  const user = await factory.user.load("active")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email! })

  await domain.account.withOrganizations(user)
  assert.equals(user.belongsTo(org), true, "preconditions")

  const result = await domain.account.acceptInviteForExistingUser(token, user)
  assert.present(result)
  assert.instanceOf(result, User)
  assert.equals(result.id, user.id)
  assert.equals(result.belongsTo(org), true)

  const reload = await domain.account.getUser(user.id)
  assert.present(reload)
  assert.instanceOf(reload, User)
  assert.equals(reload.id, user.id)

  await domain.account.withOrganizations(reload)
  assert.equals(reload.belongsTo(org), true)

  const reloadToken = await domain.account.getInvite(token.value!)
  assert.absent(reloadToken)
})

//-------------------------------------------------------------------------------------------------

Test.domain("accept invite - new user validation error", async ({ domain, factory }) => {
  const user = await factory.user.load("active")
  const org = await factory.org.load("nintendo")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email! })

  const result = await domain.account.acceptInviteForNewUser(token, {
    provider: "" as IdentityProvider,
    identifier: "",
    username: "",
    name: "",
    timezone: "",
    locale: "",
  })

  assert.zodError(result)
  assert.zodInvalidEnum(result, "provider", Object.values(IdentityProvider))
  assert.zodStringMissing(result, "identifier")
  assert.zodStringMissing(result, "username")
  assert.zodStringMissing(result, "name")
  assert.zodStringMissing(result, "timezone")
  assert.zodStringMissing(result, "locale")
})

Test.domain("accept invite - new user email is already taken", async ({ domain, factory }) => {
  const user = await factory.user.load("active")
  const org = await factory.org.load("nintendo")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: user.email! })

  const result = await domain.account.acceptInviteForNewUser(token, {
    provider: IdentityProvider.Github,
    identifier: Fixture.Identifier,
    username: Fixture.UserName,
    name: Fixture.Name,
    timezone: Fixture.Timezone.Mountain,
    locale: Fixture.Locale.US,
  })
  assert.zodError(result)
  assert.zodIssue(result, "invite", "Email is already in use")
})

Test.domain("accept invite - new user identifier is already taken", async ({ domain, factory }) => {
  const identity = await factory.identity.load("active")
  const org = await factory.org.load("nintendo")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })

  const result = await domain.account.acceptInviteForNewUser(token, {
    provider: identity.provider,
    identifier: identity.identifier,
    username: Fixture.UserName,
    name: Fixture.Name,
    timezone: Fixture.Timezone.Mountain,
    locale: Fixture.Locale.US,
  })
  assert.zodError(result)
  assert.zodIssue(result, "invite", "github identity is already in use")
})

Test.domain("accept invite - new user username is already taken", async ({ domain, factory }) => {
  const identity = await factory.identity.load("active")
  const org = await factory.org.load("nintendo")
  const token = await factory.token.create({ type: TokenType.Invite, organizationId: org.id, sentTo: Fixture.Email })

  const result = await domain.account.acceptInviteForNewUser(token, {
    provider: identity.provider,
    identifier: Fixture.Identifier,
    username: identity.username,
    name: Fixture.Name,
    timezone: Fixture.Timezone.Mountain,
    locale: Fixture.Locale.US,
  })
  assert.zodError(result)
  assert.zodIssue(result, "invite", "github identity is already in use")
})

//-------------------------------------------------------------------------------------------------
