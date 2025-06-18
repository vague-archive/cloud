import { assert } from "@lib"
import { count, Database } from "@db"
import { Domain, GamePurpose } from "@domain"

export class SysAdminDomain {
  readonly domain: Domain

  constructor(domain: Domain) {
    this.domain = domain
  }

  get db() {
    return this.domain.db
  }

  get filestore() {
    return this.domain.filestore
  }

  async stats() {
    const files = await this.filestore.stats()
    return {
      organizations: await count(this.db, "organizations"),
      users: await count(this.db, "users"),
      games: await this.countGames(this.db, GamePurpose.Game),
      tools: await this.countGames(this.db, GamePurpose.Tool),
      deploys: await count(this.db, "deploys"),
      files,
    }
  }

  private async countGames(db: Database, purpose: GamePurpose) {
    const result = await db.selectFrom("games")
      .select(db.fn.count("id").as("rowCount"))
      .where("purpose", "=", purpose)
      .executeTakeFirst()
    assert.present(result)
    assert.isNumber(result.rowCount)
    return result.rowCount
  }
}
