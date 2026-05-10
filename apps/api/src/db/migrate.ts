import { Kysely, PostgresDialect, CamelCasePlugin, Migrator, FileMigrationProvider } from 'kysely'
import pg from 'pg'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('[migrate] starting')
console.log('[migrate] node version:', process.version)
console.log('[migrate] cwd:', process.cwd())
console.log('[migrate] migration folder:', path.join(__dirname, 'migrations'))
console.log('[migrate] DATABASE_URL set:', !!process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  console.error('[migrate] FATAL: DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function main() {
  console.log('[migrate] connecting to database...')

  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }),
    }),
    plugins: [new CamelCasePlugin()],
  })

  // Verify connectivity before running migrations
  try {
    await (db as any).selectFrom('pg_catalog.pg_tables').select('tablename').limit(1).execute()
    console.log('[migrate] database connection verified')
  } catch (connErr) {
    console.error('[migrate] FATAL: cannot connect to database')
    console.error(connErr)
    await db.destroy()
    process.exit(1)
  }

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  })

  console.log('[migrate] running migrations...')
  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`[migrate] ✓ "${it.migrationName}" executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`[migrate] ✗ "${it.migrationName}" failed`)
    } else {
      console.log(`[migrate] - "${it.migrationName}" skipped (already applied)`)
    }
  })

  if (error) {
    console.error('[migrate] FATAL: migration failed')
    console.error(error)
    await db.destroy()
    process.exit(1)
  }

  if (!results || results.length === 0) {
    console.log('[migrate] no pending migrations')
  }

  console.log('[migrate] done')
  await db.destroy()
}

main().catch((err) => {
  console.error('[migrate] unhandled error in main()')
  console.error(err)
  process.exit(1)
})
