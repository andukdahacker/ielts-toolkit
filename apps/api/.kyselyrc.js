import { defineConfig } from 'kysely-ctl'
import { PostgresDialect, CamelCasePlugin } from 'kysely'
import pg from 'pg'

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  }),
  plugins: [new CamelCasePlugin()],
  migrations: {
    migrationFolder: './dist/db/migrations',
  },
})
