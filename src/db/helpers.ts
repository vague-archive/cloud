import { kysely } from "@deps"
import { assert } from "@lib"
import { Database, Id, Tables } from "@db"

//-----------------------------------------------------------------------------

// A kysely query returns a BIGINT value directly from the mysql2 adapter, which will
// return it as a number if value is < MAX_SAFE_INTEGER and as a bigint otherwise...
// ... BUT it always returns an insertId as a bigint, which can sometimes lead
// to mismatched types in test assertions when testing for equality. We can workaround this
// by providing a helper to extract the insertId from the InsertResult using the same
// logic as the underlying mysql2 adapter

function dbid({ insertId }: kysely.InsertResult): Id {
  if (!insertId) {
    throw new Error("missing insertId")
  }
  if (insertId < Number.MAX_SAFE_INTEGER) {
    return Number(insertId)
  } else {
    return insertId
  }
}

//-----------------------------------------------------------------------------

// Kysely doesn't allow nested transactions, but we need to be able to run our unit
// tests in a transaction (that rolls back) so we need to provide a helper that
// may (or may not) start a new transaction

type XactMethod<T> = (db: Database) => Promise<T>

async function xact<T>(db: Database, fn: XactMethod<T>): Promise<T> {
  if (db.isTransaction) {
    return await fn(db)
  } else {
    return await db.transaction().execute(async (tx) => {
      return await fn(tx)
    })
  }
}

//-----------------------------------------------------------------------------

async function count(db: Database, table: keyof Tables): Promise<number> {
  const result = await db
    .selectFrom(table)
    .select(db.fn.count("id").as("rowCount"))
    .executeTakeFirst()
  assert.present(result)
  assert.isNumber(result.rowCount)
  return result.rowCount
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  dbid,
  xact,
  count,
}
