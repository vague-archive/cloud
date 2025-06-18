import { kysely, mysql2, mysql2Promise } from "@deps"
import { Tables } from "@db/schema"
import { DateTimePlugin } from "@db/plugin/datetime.ts"

//-----------------------------------------------------------------------------

interface ConnectionOptions {
  host: string
  port: number
  user: string
  password: string
  database: string | undefined
}

interface PoolOptions extends ConnectionOptions {
  connectionLimit?: number
  prime?: boolean
}

//-----------------------------------------------------------------------------

export async function createConnection(connOpts: ConnectionOptions) {
  return await mysql2Promise.createConnection({
    ...connOpts,
    timezone: "Z", // ALWAYS CONNECT AS UTC
  })
}

export async function createDatabase(poolOpts: PoolOptions) {
  return new kysely.Kysely<Tables>({
    dialect: new kysely.MysqlDialect({
      pool: await createPool(poolOpts),
    }),
    plugins: [
      new kysely.CamelCasePlugin(),
      new DateTimePlugin(),
    ],
  })
}

//-----------------------------------------------------------------------------

function createPool(opts: PoolOptions): Promise<mysql2.Pool> {
  return new Promise((resolve, reject) => {
    const { prime, ...poolOpts } = opts
    const pool = mysql2.createPool({
      ...poolOpts,
      timezone: "Z", // ALWAYS CONNECT AS UTC
      supportBigNumbers: true,
      typeCast(field, next) {
        if (field.type === "TINY" && field.length === 1) {
          return castBool(field.string())
        } else {
          return next()
        }
      },
    })
    if (prime) {
      primePool(pool, pool.config.connectionLimit ?? 1, resolve, reject)
    } else {
      resolve(pool)
    }
  })
}

function primePool(
  pool: mysql2.Pool,
  count: number,
  resolve: (pool: mysql2.Pool) => void,
  reject: (reason: string) => void,
) {
  const promises: Promise<void>[] = []
  for (let n = 0; n < count; n++) {
    promises.push(
      new Promise<void>((innerResolve, innerReject) => {
        pool.getConnection((err, conn) => {
          if (err) {
            innerReject(err)
          } else {
            pool.releaseConnection(conn)
            innerResolve()
          }
        })
      }),
    )
  }
  Promise.all(promises)
    .then(() => resolve(pool))
    .catch((err) => reject(err))
}

//-----------------------------------------------------------------------------

function castBool(value: string | null) {
  return value === "1"
}

//-----------------------------------------------------------------------------
