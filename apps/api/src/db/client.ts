import { Kysely, PostgresDialect, CamelCasePlugin } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './schema.js'

export function createDb(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
    plugins: [new CamelCasePlugin()],
  })
}
