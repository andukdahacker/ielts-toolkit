import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import cors from '@fastify/cors'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const env = fastify.config.NODE_ENV

  let origin: boolean | string[]
  if (env === 'production') {
    const allowed = process.env.ALLOWED_ORIGINS
    origin = allowed ? allowed.split(',').map((o) => o.trim()) : []
  } else {
    origin = true
  }

  await fastify.register(cors, { origin })
}

export default fp(corsPlugin, { name: 'cors' })
