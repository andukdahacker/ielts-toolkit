import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { createDb } from '../db/client.js'
import type { Kysely } from 'kysely'
import type { Database } from '../db/schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const db = createDb(fastify.config.DATABASE_URL)

  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await db.destroy()
  })
}

export default fp(dbPlugin, { name: 'db' })
