import "@std/dotenv/load"

import { mysql2, outdent } from "@deps"
import { join } from "@std/path"
import { config, DatabaseConfig, parseDatabaseUrl } from "@config"
import { createConnection, createDatabase } from "@db"
import { migrateToLatest } from "@db/migration"
import { Format } from "@lib/format"
import { logger } from "@lib/logger"
import { insertFixtures } from "@test"

//-----------------------------------------------------------------------------

async function exec(command: string, args: string[]) {
  const databases = []
  let isProduction = false
  if (args.length === 1 && args[0].toLowerCase() === "production") {
    isProduction = true
    databases.push(productionConfig())
  } else if (args.length === 1 && args[0].toLowerCase() === "test") {
    databases.push(config.test.database)
  } else {
    databases.push(config.database)
    databases.push(config.test.database)
  }

  switch (command) {
    case "reset":
      assertNotProduction(isProduction)
      await drop(databases)
      await create(databases)
      await migrate(databases)
      await fixtures(databases)
      break
    case "create":
      assertNotProduction(isProduction)
      await create(databases)
      break
    case "drop":
      assertNotProduction(isProduction)
      await drop(databases)
      break
    case "migrate":
      await migrate(databases)
      break
    case "fixtures":
      assertNotProduction(isProduction)
      await fixtures(databases)
      break
    case "new":
      await newMigration(args)
      break
    default:
      logger.error(`Unknown command ${command}`)
      Deno.exit(1)
  }
}

//-----------------------------------------------------------------------------

async function create(configs: DatabaseConfig[]) {
  for (const config of configs) {
    assertNotProductionConfig(config)
    if (!await exists(config)) {
      await dbexec(config, `CREATE DATABASE ${config.database}`)
      logger.info(`Created database ${config.database}`)
    }
  }
}

async function drop(configs: DatabaseConfig[]) {
  for (const config of configs) {
    assertNotProductionConfig(config)
    if (await exists(config)) {
      await dbexec(config, `DROP DATABASE ${config.database}`)
      logger.info(`Dropped database ${config.database}`)
    }
  }
}

async function exists(config: DatabaseConfig) {
  interface ExistsRow extends mysql2.RowDataPacket {
    SCHEMA_NAME: string
  }

  const rows = await dbexec<ExistsRow[]>(
    config,
    outdent`
    SELECT schema_name
      FROM information_schema.schemata
     WHERE schema_name = ?`,
    [config.database],
  )
  return (rows.length === 1 && rows[0].SCHEMA_NAME === config.database)
}

//-----------------------------------------------------------------------------

async function newMigration(args: string[]) {
  if (args.length !== 1) {
    logger.error("Usage: deno task db new [MIGRATION NAME]")
    Deno.exit(1)
  }

  const name = args[0]
  const timestamp = Format.migrationDate(DateTime.now())
  const filename = `${timestamp}_${name}.ts`
  const path = join("src", "db", "migration", filename)
  const content = outdent`
    import { createTable, irreversible, MigrationDb } from "@db/migration"

    // SEE src/db/migration/cheat-sheet.md FOR EXAMPLES

    export async function up(db: MigrationDb) {
      await createTable(db, "example")
        .addColumn(...)
        .execute()
    }

    export function down() {
      irreversible() // never look back
    }
  `
  await Deno.writeFile(path, new TextEncoder().encode(content))
}

//-----------------------------------------------------------------------------

async function migrate(configs: DatabaseConfig[]) {
  for (const config of configs) {
    if (await exists(config)) {
      const db = await createDatabase(config)
      const { results, error } = await migrateToLatest(db)

      if (results) {
        results.forEach((it) => {
          if (it.status === "Success") {
            logger.info(`migration ${it.migrationName} succeeded on ${config.database}`)
          } else if (it.status === "Error") {
            logger.error(`migration ${it.migrationName} failed on ${config.database}`)
          }
        })
      }

      if (error) {
        logger.error("failed to run migrations", error)
      }
    }
  }
}

//-----------------------------------------------------------------------------

async function fixtures(configs: DatabaseConfig[]) {
  for (const config of configs) {
    const db = await createDatabase(config)
    await insertFixtures(db)
  }
}

//-----------------------------------------------------------------------------

function productionConfig(): DatabaseConfig {
  const url = Deno.env.get("PRODUCTION_DATABASE_URL")
  if (!url) {
    throw new Error("PRODUCTION_DATABASE_URL is missing")
  }
  return parseDatabaseUrl(url)
}

function assertNotProduction(isProduction: boolean) {
  if (isProduction) {
    throw new Error("DO NOT RUN THIS COMMAND ON THE PRODUCTION DATABASE")
  }
}

function assertNotProductionConfig(config: DatabaseConfig) {
  // best guess at detecting production URLs being accidentally used by a developer
  assertNotProduction(
    config.host.includes("aws") ||
      config.host.includes("psdb") ||
      config.host.includes("cloud") ||
      config.password.includes("pscale") ||
      config.ssl?.rejectUnauthorized === true,
  )
}

//-----------------------------------------------------------------------------

async function dbexec<T extends mysql2.RowDataPacket[]>(
  config: DatabaseConfig,
  command: string,
  values?: mysql2.QueryOptions["values"],
) {
  try {
    const connection = await createConnection({ ...config, database: undefined })
    const [rows, _] = await connection.query<T>(command, values)
    await connection.end()
    return rows
  } catch (e: unknown) {
    logger.error(e)
    Deno.exit(1)
  }
}

//-----------------------------------------------------------------------------

if (Deno.args.length === 0) {
  logger.error("No command specified")
  Deno.exit(1)
}

const [command, ...args] = Deno.args
await exec(command, args)
Deno.exit(0)

//-----------------------------------------------------------------------------
