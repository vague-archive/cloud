import { z } from "@deps"
import { Config, KeyConfig } from "@config"
import { createDatabase, Database, Id } from "@db"
import { is } from "@lib"
import { Clock } from "@lib/clock"
import { FileStore } from "@lib/filestore"
import { Mailer } from "@mail"
import { KvStore, RedisKvStore } from "@lib/kvstore"
import { AccountDomain } from "./domain/account.ts"
import { GamesDomain } from "./domain/games.ts"
import { SysAdminDomain } from "./domain/sysadmin.ts"
import { buildMinionsQueue, MinionsQueue } from "@minions"

//-----------------------------------------------------------------------------

export { Identity, IdentityProvider, Member, Organization, Token, TokenType, User, UserRole, UserRoleType } from "./domain/account.ts"
export { Deploy, DeployState, Game, GamePurpose } from "./domain/games.ts"

//-----------------------------------------------------------------------------

export { type Id }
export const zid = z.union([z.number(), z.bigint()])

export interface Model {
  id: Id
  createdOn: DateTime
  updatedOn: DateTime
}

export interface ModelWithoutId {
  createdOn: DateTime
  updatedOn: DateTime
}

export function isModel(value: unknown): value is Model {
  return is.object(value) && ("id" in value) && is.present(value.id)
}

//-----------------------------------------------------------------------------

export interface DomainOptions {
  keys: KeyConfig
  kv: KvStore
  db: Database
  filestore: FileStore
  mailer: Mailer
  minions: MinionsQueue
  clock?: Clock
}

export class Domain {
  readonly keys: KeyConfig
  readonly kv: KvStore
  readonly db: Database
  readonly filestore: FileStore
  readonly mailer: Mailer
  readonly minions: MinionsQueue
  readonly clock: Clock
  readonly account: AccountDomain
  readonly games: GamesDomain
  readonly sysadmin: SysAdminDomain

  constructor(opts: DomainOptions) {
    this.keys = opts.keys
    this.kv = opts.kv
    this.db = opts.db
    this.filestore = opts.filestore
    this.mailer = opts.mailer
    this.minions = opts.minions
    this.clock = opts.clock ?? Clock.live
    this.account = new AccountDomain(this)
    this.games = new GamesDomain(this)
    this.sysadmin = new SysAdminDomain(this)
  }

  async close() {
    await this.kv.close()
    await this.db.destroy()
    await this.minions.close()
  }

  static async configure(config: Config) {
    const keys = config.keys
    const kv = new RedisKvStore(config.redis.cache.url)
    const db = await createDatabase(config.database)
    const filestore = new FileStore(config.filestore.url)
    const mailer = new Mailer(config.mailer)
    const minions = buildMinionsQueue(config.redis.workers.url)
    return new Domain({
      keys,
      kv,
      db,
      filestore,
      mailer,
      minions,
    })
  }
}

//-----------------------------------------------------------------------------
