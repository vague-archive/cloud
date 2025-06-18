# Migration Cheat Sheet

## Migration Structure

```typescript
import { irreversible, MigrationDb } from "@db/migration"

export async function up(db: MigrationDb) {
  // ...
}

export function down() {
  irreversible() // never look back
}
```

## Create a new table

```typescript
  import { createTable } from "db/migration"
  await createTable(db, "users")
    .addColumn("id", "bigint", (col) => col.autoIncrement().primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.unique())
    .addColumn("username", "varchar(255)")
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("disabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("sysadmin", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("token", "varchar(255)", (col) => col.notNull())
    .addColumn("timezone", "varchar(255)", (col) => col.notNull().defaultTo("America/Los_Angeles"))
    .addColumn("source", sql`ENUM('github')`, (col) => col.notNull())
    .execute()
```

## Drop a table

```typescript
  await db.schema.dropTable("tokens").execute()
```

## Create a foreign key constraint

```typescript
  await db.schema
    .alterTable("tokens")
    .addForeignKeyConstraint("tokens_user_id_fkey", ["user_id"], "users", ["id"])
    .onDelete("cascade")
    .execute()
```

## Create a multi-column primary key constraint

```typescript
  await db.schema
    .alterTable("members")
    .addPrimaryKeyConstraint("members_pkey", ["organization_id", "user_id"])
    .execute()
```

## Create a unique index

```typescript
  await db.schema
    .createIndex("users_source_username_index")
    .on("users")
    .columns(["source", "username"])
    .unique()
    .execute()
```


## Create a general index

```typescript
  await db.schema
    .createIndex("tokens_type_digest_index")
    .on("tokens")
    .columns(["type", "digest"])
    .execute()
```

## Drop an index

```typescript
  await db.schema
    .alterTable("users")
    .dropIndex("users_source_username_index")
    .execute()
```

## Drop a constraint

```typescript
  await db.schema
    .alterTable("users")
    .dropConstraint("deploys_game_id_fkey")
    .execute()
```

## Add a column

```typescript
  await db.schema.alterTable("deploys")
    .addColumn(
      "state",
      sql`ENUM('deploying', 'ready', 'error')`,
      (col) => col.notNull().defaultTo("deploying"),
    )
    .addColumn("error", "text")
    .execute()
```

## Modify a column

```typescript
  await db.schema.alterTable("identities")
    .modifyColumn("identifier", "varchar(255)", (col) => col.notNull())
    .modifyColumn("username", "varchar(255)", (col) => col.notNull())
    .execute()

  await db.schema.alterTable("tokens")
    .modifyColumn("type", toEnum('access', 'invite'), (col) => col.notNull())
    .execute()
```

## Drop a column

```typescript
  await db.schema
    .alterTable("users")
    .dropColumn("source")
    .dropColumn("username")
    .execute()
```

## Execute arbitrary SQL

```typescript
  await sql`
  UPDATE users
    JOIN identities ON users.id = identities.user_id
     SET users.provider = 'github',
         users.identifier = identities.identifier,
         users.username = identities.username;
  `.execute(db)
```

## Update value

```typescript
  await db.updateTable("deploys")
    .set({ state: "ready" })
    .execute()

  for await (const { provider, username, identifier } of IDENTIFIERS) {
    await db.updateTable("identities")
      .set({ identifier })
      .where("provider", "=", provider)
      .where("username", "=", username)
      .execute()
  }
```

## Select and insert data

```typescript
  const identities = (await db
    .selectFrom("users")
    .select(["id", "username"])
    .execute())
    .map(({ id, username }) => ({ userId: id, provider: "github", username }))

  if (identities.length > 0) {
    await db
      .insertInto("identities")
      .values(identities)
      .execute()
  }
```
