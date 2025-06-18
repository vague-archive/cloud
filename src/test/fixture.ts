import { Database } from "@db"
import { encodeBase64, hashToken } from "@lib/crypto"
import { Game, GamePurpose, Identity, IdentityProvider, UserRole, UserRoleType, Member, Organization, Token, User } from "@domain"
import { Factory, identify } from "./factory.ts"

//-------------------------------------------------------------------------------------------------

export const Fixture = {
  Version: "1.0",
  Identifier: "identify-me",
  UnknownId: 1234567890,
  UnknownToken: encodeBase64("unknown-token"),
  Email: "john.doe@example.com",
  UserName: "johndoe",
  Name: "John Doe",

  UserAgent: "a browser user agent",
  IpAddress: "1.2.3.4",

  Path: "/path/to/something",
  ContentLength: 12345,

  Day0: DT`2023-12-31`,
  Day1: DT`2024-01-01`,
  Day2: DT`2024-01-02`,
  Day3: DT`2024-01-03`,
  Day4: DT`2024-01-04`,
  Day5: DT`2024-01-05`,
  Day6: DT`2024-01-06`,
  Day7: DT`2024-01-07`,

  LongLongAgo: DT`2000-01-01T00:00:00.000Z`,

  CreatedOn: DT`2024-01-01T01:11:11.123Z`,
  UpdatedOn: DT`2024-02-02T02:22:22.123Z`,

  Location: {
    Seattle: "Seattle, WA",
    Portland: "Portland, OR",
  },

  Timezone: {
    Pacific: "US/Pacific",
    Eastern: "US/Eastern",
    Mountain: "US/Mountain",
  },

  Locale: {
    US: "en-US",
    GB: "en-GB",
  }
}

//-------------------------------------------------------------------------------------------------

export const FixtureOrganizations: Record<string, Partial<Organization>> = {
  void: {
    name: "Void",
    slug: "void",
  },
  atari: {
    name: "Atari",
    slug: "atari",
  },
  nintendo: {
    name: "Nintendo",
    slug: "nintendo",
  },
  secret: {
    name: "Secret",
    slug: "secret",
  },
}

//-------------------------------------------------------------------------------------------------

export const FixtureUsers: Record<string, Partial<User>> = {
  active: {
    name: "Active User",
    email: "active@example.com",
    timezone: "America/Los_Angeles",
    disabled: false,
  },
  other: {
    name: "Other User",
    email: "other@example.com",
    timezone: "America/New_York",
    disabled: false,
  },
  disabled: {
    name: "Disabled User",
    email: "disabled@example.com",
    timezone: "America/Los_Angeles",
    disabled: true,
  },
  sysadmin: {
    name: "Sysadmin User",
    email: "sysadmin@example.com",
    timezone: "America/Los_Angeles",
    disabled: false,
  },
  floater: {
    name: "The Floater",
    email: "floater@unknown.com",
    timezone: "Europe/Paris",
    disabled: false,
  },
  outsider: {
    name: "The Outsider",
    email: "outsider@unknown.com",
    timezone: "Etc/UTC",
    disabled: false,
  },
  bushnell: {
    name: "Nolan Bushnell",
    email: "bushness@atari.com",
    timezone: "America/Los_Angeles",
    disabled: false,
  },
  miyamoto: {
    name: "Shigeru Miyamoto",
    email: "miyamoto@nintendo.com",
    timezone: "Asia/Tokyo",
    disabled: false,
  },
  jake: {
    name: "Jake Gordon",
    email: "jakesgordon@gmail.com",
    timezone: "America/Los_Angeles",
    disabled: false,
  },
  scarlett: {
    name: "Scarlett Blaiddyd",
    email: "scarlett.blaiddyd@gmail.com",
    timezone: "America/Los_Angeles",
    disabled: false,
  },
}

//-------------------------------------------------------------------------------------------------

export const FixtureRoles: Record<string, Partial<UserRole>> = {
  sysadmin: {
    userId: identify("sysadmin"),
    role: UserRoleType.Sysadmin,
  },
  jake: {
    userId: identify("jake"),
    role: UserRoleType.Sysadmin,
  },
  scarlett: {
    userId: identify("scarlett"),
    role: UserRoleType.Sysadmin,
  },
}

//-------------------------------------------------------------------------------------------------

export const FixtureIdentities: Record<string, Partial<Identity>> = {
  active: {
    userId: identify("active"),
    provider: IdentityProvider.Github,
    identifier: "active",
    username: "active",
  },
  other: {
    userId: identify("other"),
    provider: IdentityProvider.Github,
    identifier: "other",
    username: "other",
  },
  disabled: {
    userId: identify("disabled"),
    provider: IdentityProvider.Github,
    identifier: "disabled",
    username: "disabled",
  },
  sysadmin: {
    userId: identify("sysadmin"),
    provider: IdentityProvider.Github,
    identifier: "sysadmin",
    username: "sysadmin",
  },
  floater: {
    userId: identify("floater"),
    provider: IdentityProvider.Github,
    identifier: "floater",
    username: "floater",
  },
  outsider: {
    userId: identify("outsider"),
    provider: IdentityProvider.Github,
    identifier: "outsider",
    username: "outsider",
  },
  bushnell: {
    userId: identify("bushnell"),
    provider: IdentityProvider.Github,
    identifier: "bushnell",
    username: "bushnell",
  },
  miyamoto: {
    userId: identify("miyamoto"),
    provider: IdentityProvider.Github,
    identifier: "miyamoto",
    username: "miyamoto",
  },
  jake: {
    userId: identify("jake"),
    provider: IdentityProvider.Github,
    identifier: "738109",
    username: "jakesgordon",
  },
  scarlett: {
    userId: identify("scarlett"),
    provider: IdentityProvider.Github,
    identifier: "46874110",
    username: "scarlettblaiddyd",
  },
}

//-------------------------------------------------------------------------------------------------

export const FixtureTokens: Record<string, Partial<Token>> = {
  active:   { userId: identify("active"),   digest: await hashToken(encodeBase64("active"))   },
  other:    { userId: identify("other"),    digest: await hashToken(encodeBase64("other"))    },
  disabled: { userId: identify("disabled"), digest: await hashToken(encodeBase64("disabled")) },
  sysadmin: { userId: identify("sysadmin"), digest: await hashToken(encodeBase64("sysadmin")) },
  floater:  { userId: identify("floater"),  digest: await hashToken(encodeBase64("floater"))  },
  outsider: { userId: identify("outsider"), digest: await hashToken(encodeBase64("outsider")) },
  bushnell: { userId: identify("bushnell"), digest: await hashToken(encodeBase64("bushnell")) },
  miyamoto: { userId: identify("miyamoto"), digest: await hashToken(encodeBase64("miyamoto")) },
  jake:     { userId: identify("jake"),     digest: await hashToken(encodeBase64("jake"))     }, // VOID_ACCESS_TOKEN=amFrZQ==
  scarlett: { userId: identify("scarlett"), digest: await hashToken(encodeBase64("scarlett")) }, // VOID_ACCESS_TOKEN=c2NhcmxldHQ=
}

//-------------------------------------------------------------------------------------------------

export const FixtureMembers: Partial<Member>[] = [
  { organizationId: identify("void"),     userId: identify("jake") },
  { organizationId: identify("void"),     userId: identify("scarlett") },
  { organizationId: identify("void"),     userId: identify("floater") },
  { organizationId: identify("atari"),    userId: identify("active") },
  { organizationId: identify("atari"),    userId: identify("disabled") },
  { organizationId: identify("atari"),    userId: identify("sysadmin") },
  { organizationId: identify("atari"),    userId: identify("bushnell") },
  { organizationId: identify("atari"),    userId: identify("floater") },
  { organizationId: identify("atari"),    userId: identify("jake") },
  { organizationId: identify("atari"),    userId: identify("scarlett") },
  { organizationId: identify("nintendo"), userId: identify("miyamoto") },
  { organizationId: identify("nintendo"), userId: identify("floater") },
  { organizationId: identify("nintendo"), userId: identify("jake") },
  { organizationId: identify("nintendo"), userId: identify("scarlett") },
]

//-------------------------------------------------------------------------------------------------

export const FixtureGames: Record<string, Partial<Game>> = {
  snakes: {
    organizationId: identify("void"),
    name: "Snakes",
    slug: "snakes",
    description:
      "A game where players control a growing snake that navigates around the screen, eating food to grow longer while avoiding collisions with the walls or its own tail.",
  },
  tetris: {
    organizationId: identify("void"),
    name: "Tetris",
    slug: "tetris",
    description:
      "A tile-matching puzzle game where players manipulate falling tetrominoes to create and clear horizontal lines without gaps, preventing the stack from reaching the top of the playfield.",
  },
  tinyplatformer: {
    organizationId: identify("void"),
    name: "Tiny Platformer",
    slug: "tiny-platformer",
    description: "A tiny platform game, collect the gold boxes, and squash the monsters",
  },
  shareTool: {
    organizationId: identify("void"),
    name: "Share Tool",
    slug: "share-tool",
    description: "A Fiasco Editor Tool for sharing your game",
    purpose: GamePurpose.Tool,
  },
  magicTool: {
    organizationId: identify("void"),
    name: "Magic Tool",
    slug: "magic-tool",
    description: "A Fiasco Editor Tool for adding magic to your game",
    purpose: GamePurpose.Tool,
  },
  archivedTool: {
    organizationId: identify("void"),
    name: "Archived Tool",
    slug: "archived-tool",
    archived: true,
    description: "A Fiasco Editor Tool that has been archived",
    purpose: GamePurpose.Tool,
  },
  pong: {
    organizationId: identify("atari"),
    name: "Pong",
    slug: "pong",
    description:
      "A classic arcade game where two players control paddles to hit a ball back and forth across a screen, trying to score points by getting the ball past their opponent's paddle.",
  },
  pitfall: {
    organizationId: identify("atari"),
    name: "Pitfall",
    slug: "pitfall",
    description:
      "A side-scrolling adventure game where players control Pitfall Harry as he navigates a jungle filled with obstacles and hazards, such as pits, crocodiles, and rolling logs, to collect treasures within a time limit.",
  },
  asteroids: {
    organizationId: identify("atari"),
    name: "Asteroids",
    slug: "asteroids",
    description:
      "An arcade space shooter game where players control a spaceship that must destroy incoming asteroids and flying saucers while avoiding collisions.",
  },
  retroTool: {
    organizationId: identify("atari"),
    name: "Retro Tool",
    slug: "retro-tool",
    description: "A Fiasco Editor Tool for adding 8-bit retro style to your game",
    purpose: GamePurpose.Tool,
  },
  donkeykong: {
    organizationId: identify("nintendo"),
    name: "Donkey Kong",
    slug: "donkey-kong",
    description:
      "A classic arcade game where players control Jumpman (later known as Mario) as he climbs ladders and avoids obstacles to rescue a damsel in distress from the giant ape, Donkey Kong.",
  },
  starTool: {
    organizationId: identify("nintendo"),
    name: "Star Tool",
    slug: "star-tool",
    description: "A Fiasco Editor Tool for adding collectible stars to your game",
    purpose: GamePurpose.Tool,
  },
  surprise: {
    organizationId: identify("secret"),
    name: "Surprise Game",
    slug: "surprise",
    description:
      "A surprise game, in a secret organization, that nobody should every be able to see (used for auth testing)",
  },
}

//-------------------------------------------------------------------------------------------------

export async function insertFixtures(db: Database) {
  const factory = new Factory(db)

  for (const key of Object.keys(FixtureOrganizations)) {
    const attr: Partial<Organization> = FixtureOrganizations[key]
    await factory.org.create({
      id: identify(key),
      ...attr,
    })
  }

  for (const key of Object.keys(FixtureUsers)) {
    const attr: Partial<User> = FixtureUsers[key]
    await factory.user.create({
      id: identify(key),
      ...attr,
    })
  }

  for (const key of Object.keys(FixtureRoles)) {
    const attr: Partial<UserRole> = FixtureRoles[key]
    await factory.role.create({
      id: identify(key),
      ...attr,
    })
  }

  for (const key of Object.keys(FixtureIdentities)) {
    const attr: Partial<Identity> = FixtureIdentities[key]
    await factory.identity.create({
      id: identify(key),
      ...attr,
    })
  }

  for (const key of Object.keys(FixtureTokens)) {
    const attr: Partial<Token> = FixtureTokens[key]
    await factory.token.create({
      id: identify(key),
      ...attr,
    })
  }

  for (const member of FixtureMembers) {
    await factory.member.create(member)
  }

  for (const key of Object.keys(FixtureGames)) {
    const attr: Partial<Game> = FixtureGames[key]
    await factory.game.create({
      id: identify(key),
      ...attr,
    })
  }
}

//-------------------------------------------------------------------------------------------------
