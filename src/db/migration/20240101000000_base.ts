import { createTable, irreversible, sql, ColumnType, MigrationDb, toEnum } from "@db/migration"

export async function up(db: MigrationDb) {
  await organizations(db)
  await users(db)
  await userRoles(db)
  await identities(db)
  await members(db)
  await tokens(db)
  await games(db)
  await deploys(db)
}

export function down() {
  irreversible()
}

//=============================================================================
// ORGANIZATIONS
//=============================================================================

async function organizations(db: MigrationDb) {
  await createTable(db, "organizations")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("name", ColumnType.string, (col) => col.notNull())
    .addColumn("slug", ColumnType.string, (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex("organizations_slug_index")
    .on("organizations")
    .column("slug")
    .unique()
    .execute()
}

//=============================================================================
// USERS
//=============================================================================

async function users(db: MigrationDb) {
  await createTable(db, "users")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("name", ColumnType.string, (col) => col.notNull())
    .addColumn("email", ColumnType.string, (col) => col.notNull())
    .addColumn("password", ColumnType.string)
    .addColumn("disabled", ColumnType.bool, (col) => col.notNull().defaultTo(false))
    .addColumn("timezone", ColumnType.string, (col) => col.notNull())
    .addColumn("locale", ColumnType.string, (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex("email")
    .on("users")
    .column("email")
    .unique()
    .execute()
}

//=============================================================================
// USER ROLES
//=============================================================================

async function userRoles(db: MigrationDb) {
  await createTable(db, "user_roles")
    .addColumn("user_id", ColumnType.id)
    .addColumn("role", toEnum('sysadmin'), (col) => col.notNull())
    .execute()

  await db.schema
    .alterTable("user_roles")
    .addPrimaryKeyConstraint("user_roles_pkey", ["user_id", "role"])
    .execute()

  await db.schema
    .alterTable("user_roles")
    .addForeignKeyConstraint("user_roles_user_id_fkey", ["user_id"], "users", ["id"])
    .onDelete("cascade")
    .execute()
}

//=============================================================================
// IDENTITIES
//=============================================================================

async function identities(db: MigrationDb) {
  await createTable(db, "identities")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("user_id", ColumnType.id, (col) => col.notNull())
    .addColumn("provider", toEnum('google', 'github', 'microsoft', 'discord'), (col) => col.notNull())
    .addColumn("identifier", ColumnType.string, (col) => col.notNull())
    .addColumn("username", ColumnType.string, (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex("identities_provider_identifier_index")
    .on("identities")
    .columns(["provider", "identifier"])
    .unique()
    .execute()

  await db.schema
    .createIndex("identities_provider_username_index")
    .on("identities")
    .columns(["provider", "username"])
    .unique()
    .execute()
}

//=============================================================================
// MEMBERS
//=============================================================================

async function members(db: MigrationDb) {
  await createTable(db, "members")
    .addColumn("organization_id", ColumnType.id)
    .addColumn("user_id", ColumnType.id)
    .execute()

  await db.schema
    .alterTable("members")
    .addPrimaryKeyConstraint("members_pkey", ["organization_id", "user_id"])
    .execute()

  await db.schema
    .alterTable("members")
    .addForeignKeyConstraint("members_organization_id_fkey", ["organization_id"], "organizations", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .alterTable("members")
    .addForeignKeyConstraint("members_user_id_fkey", ["user_id"], "users", ["id"])
    .onDelete("cascade")
    .execute()
}

//=============================================================================
// TOKENS
//=============================================================================

async function tokens(db: MigrationDb) {
  await createTable(db, "tokens")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("type", toEnum('register', 'access', 'invite', 'resetpassword', 'changeemail'), (col) => col.notNull())
    .addColumn("digest", ColumnType.string, (col) => col.notNull())
    .addColumn("tail", ColumnType.string, (col) => col.notNull())
    .addColumn("user_id", ColumnType.id)              // optional - some tokens are tied to an existing user (:access)
    .addColumn("organization_id", ColumnType.id) // optional - some tokens are tied to an organization (:invite)
    .addColumn("sent_to", ColumnType.string)     // optional - was this token actually sent to an email address
    .addColumn("is_spent", ColumnType.bool, (col) => col.notNull().defaultTo(false))
    .addColumn("expires_on", ColumnType.timestamp)
    .execute()

  await db.schema
    .alterTable("tokens")
    .addForeignKeyConstraint("tokens_user_id_fkey", ["user_id"], "users", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .alterTable("tokens")
    .addForeignKeyConstraint("tokens_organization_id_fkey", ["organization_id"], "organizations", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .createIndex("tokens_organization_id_index")
    .on("tokens")
    .column("organization_id")
    .execute()

  await db.schema
    .createIndex("tokens_user_id_index")
    .on("tokens")
    .column("user_id")
    .execute()

  await db.schema
    .createIndex("tokens_expires_on_index")
    .on("tokens")
    .column("expires_on")
    .execute()

  await db.schema
    .createIndex("tokens_type_digest_index")
    .on("tokens")
    .columns(["type", "digest"])
    .execute()

  await db.schema
    .createIndex("tokens_digest_index")
    .on("tokens")
    .column("digest")
    .unique()
    .execute()
}

//=============================================================================
// GAMES
//=============================================================================

async function games(db: MigrationDb) {
  await createTable(db, "games")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("organization_id", ColumnType.id, (col) => col.notNull())
    .addColumn("purpose", sql`ENUM('game', 'tool')`, (col) => col.notNull())
    .addColumn("name", ColumnType.string, (col) => col.notNull())
    .addColumn("slug", ColumnType.string, (col) => col.notNull())
    .addColumn("description", ColumnType.text)
    .addColumn("archived", ColumnType.bool, (col) => col.notNull().defaultTo(false))
    .addColumn("archived_on", ColumnType.timestamp)
    .execute()

  await db.schema
    .alterTable("games")
    .addForeignKeyConstraint("games_organization_id_fkey", ["organization_id"], "organizations", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .createIndex("games_slug_index")
    .on("games")
    .columns(["organization_id", "slug"])
    .unique()
    .execute()
}

//=============================================================================
// DEPLOYS
//=============================================================================

async function deploys(db: MigrationDb) {
  await createTable(db, "deploys")
    .addColumn("id", ColumnType.id, (col) => col.autoIncrement().primaryKey())
    .addColumn("organization_id", ColumnType.id, (col) => col.notNull())
    .addColumn("state", toEnum('deploying', 'ready', 'failed'), (col) => col.notNull())
    .addColumn("active", ColumnType.int, (col) => col.notNull())
    .addColumn("slug", ColumnType.string, (col) => col.notNull())
    .addColumn("path", ColumnType.string, (col) => col.notNull())
    .addColumn("password", ColumnType.string)
    .addColumn("pinned", ColumnType.bool, (col) => col.notNull().defaultTo(false))
    .addColumn("game_id", ColumnType.id, (col) => col.notNull())
    .addColumn("deploying_by", ColumnType.id)
    .addColumn("deploying_on", ColumnType.timestamp)
    .addColumn("deployed_by", ColumnType.id, (col) => col.notNull())
    .addColumn("deployed_on", ColumnType.timestamp, (col) => col.notNull())
    .addColumn("failed_on", ColumnType.timestamp)
    .addColumn("error", ColumnType.text)
    .execute()

  await db.schema
    .alterTable("deploys")
    .addForeignKeyConstraint("deploys_organization_id_fkey", ["organization_id"], "organizations", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .alterTable("deploys")
    .addForeignKeyConstraint("deploys_game_id_fkey", ["game_id"], "games", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .alterTable("deploys")
    .addForeignKeyConstraint("deploys_deploying_by_fkey", ["deploying_by"], "users", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .alterTable("deploys")
    .addForeignKeyConstraint("deploys_deployed_by_fkey", ["deployed_by"], "users", ["id"])
    .onDelete("cascade")
    .execute()

  await db.schema
    .createIndex("deploys_game_slug_index")
    .on("deploys")
    .columns(["game_id", "slug"])
    .unique()
    .execute()
}

//-----------------------------------------------------------------------------
