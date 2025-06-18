import { crc32 } from "@deps"
import { ulid } from "@std/ulid"
import { Database, dbid, Id } from "@db"
import { Model, ModelWithoutId } from "@domain"
import {
  Deploy,
  DeployState,
  Game,
  GamePurpose,
  Identity,
  IdentityProvider,
  Member,
  Organization,
  Token,
  TokenType,
  User,
  UserRole,
  UserRoleType
} from "@domain"
import { assert, crypto, is } from "@lib"
import { Format } from "@lib/format"
import { faker } from "@test"

function recent() {
  return DateTime.fromJSDate(faker.date.recent())
}

//-----------------------------------------------------------------------------

type Identifier = Id | string

interface Identifiable {
  id?: Identifier
}

export function identify(id?: Identifier) {
  if (is.string(id)) {
    return parseInt(crc32(id), 16)
  } else if (id) {
    return id
  } else {
    return faker.number.int()
  }
}

//-----------------------------------------------------------------------------

type Fixture = Model | ModelWithoutId

type Buildable<T extends Fixture> = Omit<Partial<T>, "id"> & Identifiable
type Creatable<T extends Fixture> = Omit<Partial<T>, "id"> & Identifiable

type Loader<T extends Fixture> = (id: Identifier) => Promise<T>
type Builder<T extends Fixture> = (attr?: Buildable<T>) => T
type Creator<T extends Fixture> = (attr?: Creatable<T>) => Promise<T>
type Verifier = (id: Identifier) => Promise<boolean>

interface EntityFactory<T extends Fixture> {
  load: Loader<T>
  build: Builder<T>
  create: Creator<T>
  exists: Verifier
}

//-----------------------------------------------------------------------------

export class Factory {
  readonly org: EntityFactory<Organization>
  readonly user: EntityFactory<User>
  readonly role: EntityFactory<UserRole>
  readonly identity: EntityFactory<Identity>
  readonly member: EntityFactory<Member>
  readonly token: EntityFactory<Token>
  readonly game: EntityFactory<Game>
  readonly deploy: EntityFactory<Deploy>

  constructor(db?: Database) {
    //
    // in the long run we could introspect the schema to generate these, but for now we'll do it manually...
    //

    this.org = {
      build: (attr?: Buildable<Organization>): Organization =>
        Organization.one({
          id: identify(attr?.id),
          name: attr?.name ?? faker.company.name(),
          slug: attr?.slug ?? faker.string.nanoid(),
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        }),

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("organizations")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return Organization.one(attr)
      },

      create: async (attr?: Creatable<Organization>) => {
        assert.present(db)
        const org = this.org.build(attr)
        const result = await db
          .insertInto("organizations")
          .values(org)
          .executeTakeFirst()
        org.id = dbid(result)
        return org
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("organizations")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      },
    }

    this.user = {
      build: (attr?: Buildable<User>): User =>
        User.one({
          id: identify(attr?.id) ?? faker.number.int(),
          email: attr?.email ?? faker.internet.email(),
          name: attr?.name ?? faker.person.fullName(),
          disabled: attr?.disabled ?? false,
          timezone: attr?.timezone ?? faker.location.timeZone(),
          locale: attr?.locale ?? "en-US",
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
          organizations: attr?.organizations,
        }),

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("users")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return User.one(attr)
      },

      create: async (attr?: Creatable<User>) => {
        assert.present(db)
        const user = this.user.build(attr)
        const { ["organizations"]: _org, ...values } = user
        const result = await db
          .insertInto("users")
          .values(values)
          .executeTakeFirst()
        user.id = dbid(result)
        return user
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("users")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      },
    }

    this.role = {
      build: (attr?: Buildable<UserRole>): UserRole =>
        UserRole.one({
          userId: identify(attr?.userId),
          role: attr?.role ?? UserRoleType.Sysadmin,
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        }),

      load: (_id: Id | string) => {
        throw new Error("not implemented")
      },

      create: async (attr?: Creatable<UserRole>) => {
        assert.present(db)
        const role = this.role.build(attr)
        await db
          .insertInto("user_roles")
          .values(role)
          .executeTakeFirst()
        return role
      },

      exists: (_id: Id | string) => {
        throw new Error("not implemented")
      },
    }

    this.identity = {
      build: (attr?: Buildable<Identity>): Identity =>
        Identity.one({
          id: identify(attr?.id) ?? faker.number.int(),
          userId: identify(attr?.userId),
          provider: attr?.provider ?? IdentityProvider.Github,
          identifier: attr?.identifier ?? faker.string.nanoid(),
          username: attr?.username ?? faker.internet.userName(),
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        }),

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("identities")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return Identity.one(attr)
      },

      create: async (attr?: Creatable<Identity>) => {
        assert.present(db)
        const identity = this.identity.build(attr)
        const result = await db
          .insertInto("identities")
          .values(identity)
          .executeTakeFirst()
        identity.id = dbid(result)
        return identity
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("identities")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      },
    }

    this.member = {
      build: (attr?: Buildable<Member>): Member =>
        Member.one({
          organizationId: identify(attr?.organizationId ?? attr?.organization?.id),
          userId: identify(attr?.userId ?? attr?.user?.id),
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        }),

      load: (_id: Id | string) => {
        throw new Error("not implemented")
      },

      create: async (attr?: Creatable<Member>) => {
        assert.present(db)
        const member = this.member.build(attr)
        await db
          .insertInto("members")
          .values(member)
          .executeTakeFirst()
        return member
      },

      exists: (_id: Id | string) => {
        throw new Error("not implemented")
      },
    }

    this.token = {
      build: (attr?: Buildable<Token>): Token => {
        const tokenValue = attr?.value ?? crypto.generateToken()
        const tokenDigest = attr?.digest ?? faker.string.hexadecimal() // grrr, cannot await for hashToken here
        return Token.one({
          id: identify(attr?.id) ?? faker.number.int(),
          type: attr?.type ?? TokenType.Access,
          value: tokenValue,
          digest: tokenDigest,
          tail: tokenValue.slice(-6),
          organizationId: attr?.organizationId,
          userId: attr?.userId,
          sentTo: attr?.sentTo,
          isSpent: attr?.isSpent ?? false,
          expiresOn: attr?.expiresOn,
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        })
      },

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("tokens")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return Token.one(attr)
      },

      create: async (attr?: Creatable<Token>) => {
        assert.present(db)
        attr = attr ?? {}
        attr.value = attr.value ?? crypto.generateToken()
        attr.digest = attr.digest ?? await crypto.hashToken(attr.value)
        const token = this.token.build(attr)
        const { ["value"]: _value, ...values } = token
        const result = await db
          .insertInto("tokens")
          .values(values)
          .executeTakeFirst()
        token.id = dbid(result)
        return token
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("tokens")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      },
    }

    this.game = {
      build: (attr?: Buildable<Game>): Game =>
        Game.one({
          id: identify(attr?.id),
          organizationId: identify(attr?.organizationId ?? attr?.organization?.id),
          name: attr?.name ?? faker.company.name(),
          slug: attr?.slug ?? faker.string.nanoid(),
          description: attr?.description ?? faker.lorem.paragraph(),
          purpose: attr?.purpose ?? GamePurpose.Game,
          archived: attr?.archived ?? false,
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        }),

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("games")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return Game.one(attr)
      },

      create: async (attr?: Creatable<Game>) => {
        assert.present(db)
        const org = this.game.build(attr)
        const result = await db
          .insertInto("games")
          .values(org)
          .executeTakeFirst()
        org.id = dbid(result)
        return org
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("games")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      }
    }

    this.deploy = {
      build: (attr?: Buildable<Deploy>): Deploy => {
        const organizationId = attr?.organizationId ?? attr?.game?.organizationId ?? faker.number.int()
        const gameId = attr?.gameId ?? attr?.game?.id ?? faker.number.int()
        const deployedBy = attr?.deployedBy ?? attr?.deployedByUser?.id ?? faker.number.int()
        return Deploy.one({
          id: identify(attr?.id) ?? faker.number.int(),
          organizationId,
          gameId,
          game: attr?.game,
          state: attr?.state ?? DeployState.Deploying,
          active: attr?.active ?? 1,
          slug: attr?.slug ?? Format.slugify(faker.word.words()),
          path: attr?.path ?? `/test/${organizationId}/${gameId}/${ulid()}`,
          error: attr?.error,
          pinned: attr?.pinned,
          deployedBy,
          deployedByUser: attr?.deployedByUser,
          deployedOn: attr?.deployedOn ?? recent(),
          createdOn: attr?.createdOn ?? recent(),
          updatedOn: attr?.updatedOn ?? recent(),
        })
      },

      load: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("deploys")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        assert.present(attr)
        return Deploy.one(attr)
      },

      create: async (attr?: Creatable<Deploy>) => {
        assert.present(db)
        const deploy = this.deploy.build(attr)
        const { ["deployedByUser"]: _deployedByUser, ["game"]: _game, ...values } = deploy
        const result = await db
          .insertInto("deploys")
          .values(values)
          .executeTakeFirst()
        deploy.id = dbid(result)
        return deploy
      },

      exists: async (id: Id | string) => {
        assert.present(db)
        const attr = await db.selectFrom("deploys")
          .selectAll()
          .where("id", "=", identify(id))
          .executeTakeFirst()
        return !!attr
      },
    }

  }
}

//-----------------------------------------------------------------------------

// export a non-DB factory for *anyone* to use .build methods without hitting DB
export const factory = new Factory()

//-----------------------------------------------------------------------------
