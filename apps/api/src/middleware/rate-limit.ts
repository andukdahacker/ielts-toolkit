import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 hour',
    keyGenerator: (request) => {
      return request.teacherId || request.ip
    },
  })
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['auth'],
})
