import { z, zod } from "@deps"
import { assert, crypto, i18n } from "@lib"
import { Format } from "@lib/format"
import { Required } from "@lib/validation"
import { RouteGenerator } from "@lib/route"
import { dbid, schema, violatedUniqueKey, xact } from "@db"
import { Domain, Game, Id } from "@domain"

//==============================================================================
// MODELS
//==============================================================================

import { Organization } from "./account/organization.ts"
export { Organization }

import { User } from "./account/user.ts"
export { User }

import { UserRole, UserRoleType } from "./account/role.ts"
export { UserRole, UserRoleType }

import { Identity, IdentityProvider } from "./account/identity.ts"
export { Identity, IdentityProvider }

import { Member } from "./account/member.ts"
export { Member }

import { Token, TokenType } from "./account/token.ts"
export { Token, TokenType }

//==============================================================================
// ERRORS
//==============================================================================

const SendInviteAlreadyMemberError = new zod.ZodError([{
  path: ["invite"],
  message: "User is already a member of this organization",
  code: z.ZodIssueCode.custom,
}])

const SendInviteAlreadyInvitedError = new zod.ZodError([{
  path: ["invite"],
  message: "User has already been invited to join this organization",
  code: z.ZodIssueCode.custom,
}])

const InviteEmailAlreadyTakenError = new zod.ZodError([{
  path: ["invite"],
  message: "Email is already in use",
  code: z.ZodIssueCode.custom,
}])

const InviteIdentityAlreadyTakenError = (provider: IdentityProvider) => new zod.ZodError([{
  path: ["invite"],
  message: `${provider} identity is already in use`,
  code: z.ZodIssueCode.custom,
}])

//==============================================================================
// DOMAIN INTERFACE
//==============================================================================

export class AccountDomain {
  static OrganizationSlugTakenError = class extends Error {}
  static EmailTakenError = class extends Error {}
  static IdentifierTakenError = class extends Error {}
  static UsernameTakenError = class extends Error {}

  readonly domain: Domain

  constructor(domain: Domain) {
    this.domain = domain
  }

  get db() {
    return this.domain.db
  }

  get kv() {
    return this.domain.kv
  }

  get mailer() {
    return this.domain.mailer
  }

  get clock() {
    return this.domain.clock
  }

  // ORGANIZATIONS -------------------------------------------------------------------

  async allOrganizations() {
    return Organization.many(
      await this.db
        .selectFrom("organizations")
        .selectAll()
        .orderBy("name")
        .execute(),
    )
  }

  async getOrganization(id: Id) {
    return Organization.maybe(
      await this.db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst(),
    )
  }

  async getOrganizationBySlug(slug: string) {
    return Organization.maybe(
      await this.db
        .selectFrom("organizations")
        .selectAll()
        .where("slug", "=", Format.slugify(slug))
        .executeTakeFirst(),
    )
  }

  async createOrganization(params: {
    name: string
    slug?: string
  }) {
    const now = this.clock.now
    const orgAttr: schema.NewOrganization = z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(255).default(params.name).transform((val) => Format.slugify(val)),
      createdOn: z.datetime().default(now),
      updatedOn: z.datetime().default(now),
    }).parse(params)
    return await xact(this.db, async (tx) => {
      const slugExists = await tx
        .selectFrom("organizations")
        .selectAll()
        .where("slug", "=", orgAttr.slug)
        .executeTakeFirst()
      if (slugExists) {
        throw new AccountDomain.OrganizationSlugTakenError()
      }
      const orgResult = await tx
        .insertInto("organizations")
        .values(orgAttr)
        .executeTakeFirst()
      const orgId = dbid(orgResult)
      return Organization.one({ id: orgId, ...orgAttr })
    })
  }

  async withGames(orgs: Organization | Organization[]) {
    orgs = Array.isArray(orgs) ? orgs : [orgs]
    if (orgs.length === 0) return []
    const games = Game.many(
      await this.db
        .selectFrom("games")
        .selectAll()
        .where("organizationId", "in", orgs.map((o) => o.id))
        .orderBy(["organizationId", "name"])
        .execute(),
    )
    orgs.forEach((o) => o.games = games.filter((g) => g.organizationId === o.id))
    return orgs
  }

  async withMembers(org: Organization) {
    const result = await this.db
      .selectFrom("members")
      .innerJoin("users", "users.id", "members.userId")
      .selectAll(["members", "users"])
      .select([
        "members.createdOn as memberCreatedOn",
        "members.updatedOn as memberUpdatedOn",
      ])
      .where("organizationId", "=", org.id)
      .orderBy(["users.name"])
      .execute()
    org.members = result.map((row) => {
      const member = Member.one({
        userId: row.userId,
        organizationId: row.organizationId,
        createdOn: row.memberCreatedOn,
        updatedOn: row.memberUpdatedOn,
      })
      member.user = User.one({
        id: row.userId,
        email: row.email,
        name: row.name,
        disabled: row.disabled,
        timezone: row.timezone,
        locale: row.locale,
        createdOn: row.createdOn,
        updatedOn: row.updatedOn,
      })
      return member
    })
    const identities = Identity.many(await this.db
      .selectFrom("identities")
      .selectAll()
      .where("userId", "in", org.members.map((m) => m.userId))
      .orderBy("username")
      .execute())
    org.members.forEach((m) => {
      m.user!.identities = identities.filter((i) => i.userId == m.user!.id)
    });
    return org
  }

  async updateOrganization(org: Organization, params: {
    name: string
    slug: string
  }) {
    const validation = z.object({
      name: z.string().min(1, Required).max(255),
      slug: z.string().min(1, Required).max(255),

    }).safeParse(params)
    if (!validation.success) {
      return validation.error
    }
    const attr = validation.data
    try {
      const result = await this.db.updateTable("organizations")
        .set(attr)
        .where("id", "=", org.id)
        .executeTakeFirst()
      assert.true(result.numUpdatedRows === 1n)
      org.name = attr.name
      org.slug = attr.slug
      return org
    } catch (e) {
      if (violatedUniqueKey(e, "organizations_slug_index")) {
        return new zod.ZodError([
          {
            path: ["name"],
            message: "Organization with this name already exists",
            code: z.ZodIssueCode.custom,
          },
        ])
      } else {
        throw e
      }
    }
  }

  // USERS -------------------------------------------------------------------

  async getUser(id: Id): Promise<User | undefined> {
    const user = User.maybe(
      await this.db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst(),
    )
    return this.withIdentities(user)
  }

  async getUserByIdentifier(provider: IdentityProvider, identifier: string): Promise<User | undefined> {
    const user = User.maybe(
      await this.db
        .selectFrom("users")
        .selectAll("users")
        .innerJoin("identities", "identities.userId", "users.id")
        .where("identities.provider", "=", provider)
        .where("identities.identifier", "=", identifier)
        .executeTakeFirst(),
    )
    return this.withIdentities(user)
  }

  async getUserByAccessToken(tokenValue: string) {
    const token = await this.getAccessToken(tokenValue)
    if (token && token.userId) {
      return this.getUser(token.userId)
    }
  }

  async withAuthorizationContext(user: User | undefined) {
    if (user) {
      await this.withRoles(user)
      await this.withOrganizations(user)
      await this.withGames(user.organizations || [])
    }
    return user
  }

  async updateUser(user: User, params: {
    name?: string
    timezone?: string
    locale?: string
  }) {
    const validation = z.object({
      name: z.string().min(1, Required).max(255).default(user.name),
      timezone: z.enum(i18n.timezones),
      locale: z.enum(i18n.locales)
    }).safeParse(params)
    if (!validation.success) {
      return validation.error
    }
    const attr = validation.data
    const result = await this.db.updateTable("users")
      .set({
        name: attr.name,
        timezone: attr.timezone,
        locale: attr.locale,
      })
      .where("id", "=", user.id)
      .executeTakeFirst()
    assert.true(result.numUpdatedRows === 1n)
    user.name = attr.name
    user.timezone = attr.timezone
    user.locale = attr.locale
    return user
  }

  async getUsers() {
    return User.many(
      await this.db
        .selectFrom("users")
        .selectAll()
        .orderBy("name")
        .execute(),
    )
  }

  async withRoles(user: User | undefined): Promise<User | undefined> {
    if (user) {
      user.roles = UserRole.many(
        await this.db
          .selectFrom("user_roles")
          .selectAll()
          .where("userId", "=", user.id)
          .orderBy("role")
          .execute()
      )
    }
    return user
  }

  async withIdentities(user: User | undefined): Promise<User | undefined> {
    if (user) {
      user.identities = Identity.many(
        await this.db
          .selectFrom("identities")
          .selectAll("identities")
          .where("identities.userId", "=", user.id)
          .orderBy("identities.username")
          .execute(),
      )
    }
    return user
  }

  async withOrganizations(user: User | undefined) {
    if (user) {
      user.organizations = Organization.many(
        await this.db
          .selectFrom("organizations")
          .selectAll("organizations")
          .innerJoin("members", "members.organizationId", "organizations.id")
          .where("members.userId", "=", user.id)
          .orderBy("organizations.name")
          .execute(),
      )
    }
  }

  // MEMBERS

  async deleteMember(user: User, org: Organization) {
    const [{ numDeletedRows }] = await this.db
      .deleteFrom("members")
      .where("userId", "=", user.id)
      .where("organizationId", "=", org.id)
      .execute()
      return numDeletedRows
  }

  // TOKENS -------------------------------------------------------------------

  async getAccessToken(tokenValue: string) {
    return await this.getToken(TokenType.Access, tokenValue)
  }

  async getAccessTokens(user: User) {
    return Token.many(
      await this.db
        .selectFrom("tokens")
        .selectAll()
        .where("userId", "=", user.id)
        .where("type", "=", TokenType.Access)
        .orderBy("id")
        .execute(),
    )
  }

  async generateAccessToken(user: User) {
    return await this.createToken(TokenType.Access, {
      userId: user.id
    })
  }

  async revokeAccessToken(token: Token) {
    assert.true(token.type === TokenType.Access)
    return await this.deleteToken(token) === 1n
  }

  // INVITE TOKENS -------------------------------------------------------------------

  async getInvite(tokenValue: string) {
    return await this.getToken(TokenType.Invite, tokenValue)
  }

  async getInvitesForOrganization(org: Organization) {
    return Token.many(
      await this.db
        .selectFrom("tokens")
        .selectAll()
        .where("organizationId", "=", org.id)
        .where("type", "=", TokenType.Invite)
        .where("isSpent", "is", false)
        .where(({eb, or}) => or([
          eb("expiresOn", "is", null),
          eb("expiresOn", ">", this.clock.now)
        ]))
        .orderBy("sentTo")
        .execute()
    )
  }

  async sendInvite(org: Organization, email: string, route: RouteGenerator) {
    const validated = z.object({
      email: z.string().min(1, Required).email()
    }).safeParse({ email })
    if (!validated.success) {
      return validated.error
    }

    await this.withMembers(org)
    assert.present(org.members)
    const existingMember = org.members.find((m) => m.user!.email?.toLowerCase() === email.toLowerCase())
    if (existingMember) {
      return SendInviteAlreadyMemberError
    }

    const invites = await this.getInvitesForOrganization(org)
    const existingInvite = invites.find((i) => i.sentTo!.toLowerCase() === email.toLowerCase())
    if (existingInvite) {
      return SendInviteAlreadyInvitedError
    }

    const token = await this.createToken(TokenType.Invite, {
      organizationId: org.id,
      sentTo: email,
    })

    assert.present(token.value)

    const mail = this.mailer.template("invite", {
      to: email,
      organization: org.name,
      action_url: route("join", token.value, { full: true })
    })
    await this.mailer.deliver(mail)

    return token
  }
  
  async retractInvite(token: Token) {
    assert.true(token.type === TokenType.Invite)
    return await this.deleteToken(token) === 1n
  }

  async acceptInviteForNewUser(token: Token, params: {
    provider: IdentityProvider,
    identifier: string,
    username: string,
    name: string,
    timezone: string,
    locale: string
  }) {
    assert.true(token.type === TokenType.Invite)
    assert.present(token.organizationId)
    const org = await this.getOrganization(token.organizationId)
    assert.present(org)

    const validated = z.object({
      provider: z.nativeEnum(IdentityProvider),
      identifier: z.string().min(1, Required).max(255),
      username: z.string().min(1, Required).max(255),
      name: z.string().min(1, Required).max(255),
      timezone: z.string().min(1, Required).max(255),
      locale: z.string().min(1, Required).max(255),
    }).safeParse(params)
    if (!validated.success)
      return validated.error

    try {
      return await xact(this.db, async (tx) => {
        const userAttr: schema.NewUser = {
          name: validated.data.name,
          timezone: validated.data.timezone,
          locale: validated.data.locale,
          email: token.sentTo!,
          disabled: false,
          createdOn: this.clock.now,
          updatedOn: this.clock.now,
        }
        const userResult = await tx
          .insertInto("users")
          .values(userAttr)
          .executeTakeFirst()
        const userId = dbid(userResult)
        const user = User.one({ id: userId, ...userAttr })
        const identityAttr: schema.NewIdentity = {
          userId: userId,
          provider: validated.data.provider,
          identifier: validated.data.identifier,
          username: validated.data.username,
          createdOn: this.clock.now,
          updatedOn: this.clock.now,
        }
        const identityResult = await tx
          .insertInto("identities")
          .values(identityAttr)
          .executeTakeFirst()
        const identityId = dbid(identityResult)
        const identity = Identity.one({ id: identityId, ...identityAttr })
        user.identities = [identity]
        await tx
          .insertInto("members")
          .values({
            userId: user.id,
            organizationId: org.id,
            createdOn: this.clock.now,
            updatedOn: this.clock.now,
          })
          .execute()
        await tx
          .updateTable("tokens")
          .set({ isSpent: true })
          .where("id", "=", token.id)
          .execute()
        await this.withAuthorizationContext(user)
        return user
      })
    } catch (e) {
      if (violatedUniqueKey(e, "users.email")) {
        return InviteEmailAlreadyTakenError
      } else if (violatedUniqueKey(e, "identities_provider_identifier_index")) {
        return InviteIdentityAlreadyTakenError(validated.data.provider)
      } else if (violatedUniqueKey(e, "identities_provider_username_index")) {
        return InviteIdentityAlreadyTakenError(validated.data.provider)
      } else {
        throw e
      }
    }
  }

  async acceptInviteForExistingUser(token: Token, user: User) {
    assert.true(token.type === TokenType.Invite)
    assert.false(token.isSpent)
    assert.false(token.hasExpired(this.clock))
    assert.present(token.organizationId)
    const org =  await this.getOrganization(token.organizationId)
    assert.present(org)

    return await xact(this.db, async (tx) => {
      await tx
        .insertInto("members")
        .values({
          userId: user.id,
          organizationId: org.id,
          createdOn: this.clock.now,
          updatedOn: this.clock.now,
        })
        .onDuplicateKeyUpdate({ // gracefully ignore if user is already a member
          updatedOn: this.clock.now,
        })
        .execute()
      await tx
        .updateTable("tokens")
        .set({ isSpent: true })
        .where("id", "=", token.id)
        .execute()
      return await this.withAuthorizationContext(user)
    })
  }

  // SHARED TOKEN IMPLEMENTATION ------------------------------------------------------------------

  private async getToken(type: TokenType, tokenValue: string) {
    const digest = await crypto.hashToken(tokenValue)
    const now = this.clock.now
    return Token.maybe(
      await this.db
        .selectFrom("tokens")
        .selectAll()
        .where("tokens.type", "=", type)
        .where("tokens.digest", "=", digest)
        .where("tokens.isSpent", "is not", true)
        .where(({eb, or}) => or([
          eb("tokens.expiresOn", "is", null),
          eb("tokens.expiresOn", ">", now)
        ]))
        .executeTakeFirst()
    )
  }

  private async createToken(type: TokenType, params: Partial<Token>) {
    const now = this.clock.now
    const expires = this.clock.now.plus(Token.TTL[type])
    const value = crypto.generateToken()
    const digest = await crypto.hashToken(value)
    const full: schema.NewToken = {
      ...params,
      type,
      digest,
      tail: value.slice(-6),
      isSpent: false,
      expiresOn: expires,
      createdOn: now,
      updatedOn: now,
    }
    const result = await this.db
      .insertInto("tokens")
      .values(full)
      .executeTakeFirst()
    return Token.one({ id: dbid(result), value, ...full })
  }

  private async deleteToken(token: Token) {
    const [{ numDeletedRows }] = await this.db
      .deleteFrom("tokens")
      .where("id", "=", token.id)
      .execute()
    return numDeletedRows
  }

}

//------------------------------------------------------------------------------
