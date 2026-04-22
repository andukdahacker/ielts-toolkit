import { defineConfig } from 'kysely-ctl'
import { PostgresDialect, CamelCasePlugin } from 'kysely'
import { Pool } from 'pg'

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
  plugins: [new CamelCasePlugin()],
  migrations: {
    migrationFolder: './src/db/migrations',
  },
})
