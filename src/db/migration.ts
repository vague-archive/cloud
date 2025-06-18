import { kysely } from "@deps"
import { join } from "@std/path"

const { sql } = kysely
export { sql }

//------------------------------------------------------------------------------

export const ColumnType: Record<string, kysely.ColumnDataType> = {
  bool: "boolean",
  id: "bigint",
  int: "integer",
  float: "float8",
  string: "varchar(255)",
  text: "text",
  timestamp: "timestamp(3)",
}

//------------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export type MigrationDb = kysely.Kysely<any>

//------------------------------------------------------------------------------

const MIGRATIONS_FOLDER = "src/db/migration"

//------------------------------------------------------------------------------

export async function migrateToLatest<T>(db: kysely.Kysely<T>) {
  const provider = new DenoFileMigrationProvider(MIGRATIONS_FOLDER)
  const migrator = new kysely.Migrator({ db, provider, allowUnorderedMigrations: true })
  return await migrator.migrateToLatest()
}

export function irreversible() {
  throw new Error("irreversible migration")
}

//------------------------------------------------------------------------------

class DenoFileMigrationProvider extends kysely.FileMigrationProvider {
  folder: string

  constructor(migrationFolder: string) {
    super({
      fs: {
        readdir(path) {
          return Promise.resolve(
            [...Deno.readDirSync(path)].map((file) => file.name),
          )
        },
      },
      path: {
        join,
      },
      migrationFolder,
    })
    this.folder = migrationFolder
  }

  async getMigrations(): Promise<Record<string, kysely.Migration>> {
    const migrations: Record<string, kysely.Migration> = {}
    const files = Deno.readDir(this.folder)
    for await (const file of files) {
      if (file.name.endsWith(".ts")) {
        migrations[file.name] = await import(
          ["./migration", file.name].join("/") // TODO: avoid hard coded path here
        )
      }
    }
    return migrations
  }
}

//------------------------------------------------------------------------------

interface CreateTableOptions {
  withTimestamps?: boolean
}

export function createTable<T>(db: kysely.Kysely<T>, name: string, opts?: CreateTableOptions) {
  const withTimestamps = opts?.withTimestamps ?? true

  let schema = db.schema.createTable(name)

  if (withTimestamps) {
    schema = schema
      .addColumn(
        "created_on",
        ColumnType.timestamp,
        (col) => col.defaultTo(sql`CURRENT_TIMESTAMP(3)`).notNull(),
      )
      .addColumn(
        "updated_on",
        ColumnType.timestamp,
        (col) => col.defaultTo(sql`CURRENT_TIMESTAMP(3)`).notNull(),
      )
  }
  return schema
}

//------------------------------------------------------------------------------

export async function dropTable<T>(db: kysely.Kysely<T>, name: string) {
  return await db.schema.dropTable(name).execute();
}

//------------------------------------------------------------------------------

export function toEnum(...args: string[]) {
  return sql`enum(${sql.join(args.map(sql.lit))})`
}

//------------------------------------------------------------------------------
