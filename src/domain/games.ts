import { z, zod } from "@deps"
import { dbid, schema, violatedUniqueKey } from "@db"
import { assert } from "@lib"
import { Format } from "@lib/format"
import { Required } from "@lib/validation"
import { Domain, Id, Organization, User, zid } from "@domain"

//==============================================================================
// MODELS
//==============================================================================

import { Deploy, DeployState } from "./games/deploy.ts"
export { Deploy, DeployState }

import { Game, GamePurpose } from "./games/game.ts"
export { Game, GamePurpose }

//==============================================================================
// DOMAIN INTERFACE
//==============================================================================

export class GamesDomain {
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

  get filestore() {
    return this.domain.filestore
  }

  get clock() {
    return this.domain.clock
  }

  // GAMES ----------------------------------------------------------------------------------------

  async getGame(id: Id) {
    return Game.maybe(
      await this.db
        .selectFrom("games")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst(),
    )
  }

  async getGameBySlug(org: Organization, slug: string) {
    return Game.maybe(
      await this.db
        .selectFrom("games")
        .selectAll()
        .where("organizationId", "=", org.id)
        .where("slug", "=", Format.slugify(slug))
        .executeTakeFirst(),
    )
  }

  async getGamesForOrg(org: Organization) {
    return Game.many(
      await this.db
        .selectFrom("games")
        .selectAll()
        .where("organizationId", "=", org.id)
        .orderBy("name")
        .execute(),
    )
  }

  async getPublicTools() {
    const tools = Game.many(await this.db
      .selectFrom("games")
      .selectAll()
      .where("purpose", "=", GamePurpose.Tool)
      .where("archived", "=", false)
      .orderBy("games.name")
      .execute())
    const orgs = Organization.many(await this.db
      .selectFrom("organizations")
      .selectAll()
      .where("id", "in", tools.map((t) => t.organizationId))
      .execute()).reduce((index, org) => { index.set(org.id, org); return index }, new Map<Id, Organization>())
    const deploys = Deploy.many(await this.db
      .selectFrom("deploys")
      .selectAll()
      .where("gameId", "in", tools.map((t) => t.id))
      .orderBy("deploys.deployedOn desc")
      .execute())
    tools.forEach((tool) => {
      tool.organization = orgs.get(tool.organizationId)
      tool.deploys = deploys.filter((d) => d.gameId === tool.id)
    })
    return tools
  }

  async createGame(org: Organization, params: {
    name: string
    description?: string
    slug?: string
    purpose?: GamePurpose
  }) {
    const now = this.clock.now
    const validation = z.object({
      organizationId: zid.default(org.id),
      name: z.string().min(1, Required).max(255),
      description: z.string().max(1024).optional(),
      purpose: z.nativeEnum(GamePurpose).default(GamePurpose.Game),
      archived: z.boolean().default(false),
      slug: z.string().min(1, Required).max(255).default(params.name).transform((val) => Format.slugify(val)),
      createdOn: z.datetime().default(now),
      updatedOn: z.datetime().default(now),
    }).safeParse(params)
    if (!validation.success) {
      return validation.error
    }
    try {
      const gameResult = await this.db
        .insertInto("games")
        .values(validation.data)
        .executeTakeFirst()
      const gameId = dbid(gameResult)
      return Game.one({ id: gameId, organization: org, ...validation.data })
    } catch (e) {
      if (violatedUniqueKey(e, "games_slug_index")) {
        return new zod.ZodError([
          {
            path: ["name"],
            message: "Name already taken for this organization",
            code: z.ZodIssueCode.custom,
          },
        ])
      } else {
        throw e
      }
    }
  }

  async archiveGame(game: Game, archived: boolean) {
    const archivedOn = archived ? this.clock.now : undefined
    const result = await this.db.updateTable("games")
      .set({ archived, archivedOn })
      .where("id", "=", game.id)
      .executeTakeFirst()
    assert.true(result.numUpdatedRows === 1n)
    game.archived = archived
    game.archivedOn = archivedOn
    return game
  }

  async updateGame(game: Game, params: {
    name?: string
    slug?: string
    description?: string
  }) {
    const validation = z.object({
      name: z.string().min(1, Required).max(255).default(game.name),
      slug: z.string().min(1, Required).max(255).default(game.slug),
      description: z.string().max(1024).default(game.description!),
    }).safeParse(params)
    if (!validation.success) {
      return validation.error
    }
    const attr = validation.data
    try {
      const result = await this.db.updateTable("games")
        .set(attr)
        .where("id", "=", game.id)
        .executeTakeFirst()
      assert.true(result.numUpdatedRows === 1n)
      game.name = attr.name
      game.slug = attr.slug
      game.description = attr.description
      return game
    } catch (e) {
      if (violatedUniqueKey(e, "games_slug_index")) {
        return new zod.ZodError([
          {
            path: ["name"],
            message: "Name already taken for this organization",
            code: z.ZodIssueCode.custom,
          },
        ])
      } else {
        throw e
      }
    }
  }

  async deleteGame(game: Game){
    const deploys = await this.getDeploys(game)
    
    const [{ numDeletedRows }] = await this.db
      .deleteFrom("games")
      .where("id", "=", game.id)
      .execute()
    
    // Cascading deletes in the DB will not remove deploys from the FS
    for (const deploy of deploys) {
      await this.domain.minions.enqueue({ name: "file:rmdir", path: deploy.path })
    }
    
    return numDeletedRows
  }

  // DEPLOYS --------------------------------------------------------------------------------------

  async getDeploy(id: Id) {
    return Deploy.maybe(
      await this.db
        .selectFrom("deploys")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst(),
    )
  }

  async getDeployBySlug(game: Game, slug: string) {
    return Deploy.maybe(
      await this.db
        .selectFrom("deploys")
        .selectAll()
        .where("slug", "=", slug)
        .where("gameId", "=", game.id)
        .executeTakeFirst(),
    )
  }

  async reloadDeploy(id: Id) {
    const deploy = await this.getDeploy(id)
    assert.present(deploy)
    return deploy
  }

  async withDeployedBy(deploys: Deploy[]) {
    if (deploys.length === 0) return []
    const users = User.many(
      await this.db
        .selectFrom("users")
        .selectAll()
        .where("id", "in", deploys.map((d) => d.deployedBy))
        .execute(),
    ).reduce((map, u) => map.set(u.id, u), new Map<Id, User>())
    deploys.forEach((d) => d.deployedByUser = users.get(d.deployedBy))
    return deploys
  }

  async createDeploy(game: Game, user: User, params: {
    slug: string
    path: string
    password?: string // ONLY on INSERT, ignored on UPDATE
    pinned?: boolean
  }) {
    const { encryptKey } = this.domain.keys
    const now = this.clock.now
    const attr: schema.NewDeploy = await z.object({
      organizationId: zid.default(game.organizationId),
      gameId: zid.default(game.id),
      state: z.nativeEnum(DeployState).default(DeployState.Deploying),
      active: z.number().default(0),
      slug: z.string().min(1).max(255),
      path: z.string().min(1).max(255),
      password: z.string().min(1).max(64).or(z.literal(undefined)).transform(async (p) =>
        await Deploy.encryptPassword(p, encryptKey)
      ),
      pinned: z.boolean().default(false),
      deployedBy: zid.default(user.id),
      deployedOn: z.datetime().default(now),
      createdOn: z.datetime().default(now),
      updatedOn: z.datetime().default(now),
    }).parseAsync(params)
    const result = await this.db
      .insertInto("deploys")
      .values(attr)
      .onDuplicateKeyUpdate({
        gameId: attr.gameId,
        state: attr.state,
        slug: attr.slug,
        path: attr.path,
        pinned: params.pinned === undefined ? undefined : attr.pinned,
        deployedBy: attr.deployedBy,
        deployedOn: attr.deployedOn,
        updatedOn: attr.updatedOn,
      })
      .executeTakeFirst()
    const deploy = await this.reloadDeploy(dbid(result)) // need to reload after upsert
    deploy.deployedByUser = user
    deploy.game = game
    return deploy
  }

  async updateDeploy(deploy: Deploy, params: {
    state: DeployState,
    error?: string
  }) {
    deploy.state = params.state
    deploy.active = params.state === DeployState.Ready ? 1 : 0,
    deploy.error = params.error
    await this.db.updateTable("deploys")
      .set({
        state: deploy.state,
        active: deploy.active,
        error: deploy.error,
      })
      .where("id", "=", deploy.id)
      .execute()
  }

  async pinDeploy(deploy: Deploy, pinned: boolean) {
    await this.db.updateTable("deploys")
      .set({ pinned })
      .where("id", "=", deploy.id)
      .execute()
    deploy.pinned = pinned
  }

  async setDeployPassword(deploy: Deploy, password: string | undefined) {
    const { encryptKey } = this.domain.keys
    const encryptedPassword = await deploy.setPassword(password, encryptKey)
    await this.db.updateTable("deploys")
      .set("password", encryptedPassword)
      .where("id", "=", deploy.id)
      .execute()
  }

  async clearDeployPassword(deploy: Deploy) {
    await this.setDeployPassword(deploy, undefined)
  }

  async deleteDeploy(deploy: Deploy) {
    const [{ numDeletedRows }] = await this.db
      .deleteFrom("deploys")
      .where("id", "=", deploy.id)
      .execute()
    await this.domain.minions.enqueue({ name: "file:rmdir", path: deploy.path })
    return numDeletedRows
  }

  async getDeploys(game: Game): Promise<Deploy[]> {
    const rows = await this.db
      .selectFrom("deploys")
      .selectAll("deploys")
      .where("gameId", "=", game.id)
      .orderBy("pinned desc")
      .orderBy("deployedOn desc")
      .execute()
    return rows.map((row) => Deploy.one({ game, ...row }))
  }

  async withDecryptedPasswords(deploys: Deploy[], encryptKey: string) {
    for await (const deploy of deploys) {
      await deploy.decryptPassword(encryptKey)
    }
  }

  /**
   * 
   * @param ageInDays How many days old a deploy must be to be considered expired
   * @returns List of deploys that are older than the age specified and are not pinned
   */
  async getExpiredDeploys(ageInDays: number = Deploy.ExpirationDays){
    const cutOffDate = DateTime.fromMillis(this.clock.now.minus({ days: ageInDays }).toMillis())

    const rows = await this.db
      .selectFrom("deploys")
      .innerJoin("users", "users.id", "deploys.deployedBy")
      .innerJoin("games", "games.id", "deploys.gameId")
      .select(["users.id", "users.name as username"])
      .select(["games.id", "games.name as gamename"])
      .selectAll("deploys")
      .where("deployedOn", "<=", cutOffDate)
      .where("pinned", "=", false)
      .orderBy("deployedOn desc")
      .execute()

    // TEMPORARY - just to enable displaying the name of the game and user when viewing the expired deploys in the sysadmin page
    // TODO - remove this monstrocity when the cleanup is on a cron job
    return rows.map(row => Deploy.one({
      game: { name: row.gamename } as Game,
      deployedByUser: { name: row.username } as User,
      ...row
    }))
  }

  // MISC --------------------------------------------------------------------------------------

  sharePath(org: Organization, game: Game, slug: string) {
    return `share/${org.id}/${game.id}/${slug}`
  }

  // ----------------------------------------------------------------------------------------------
}
