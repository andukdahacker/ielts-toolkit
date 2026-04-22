import type { FastifyPluginAsync } from 'fastify'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', { config: { rateLimit: false } }, async () => {
    return { data: { status: 'ok' } }
  })
}

export default healthRoutes
