import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'IELTS Toolkit API',
        version: '0.1.0',
        description: 'Backend API for the IELTS Toolkit Google Workspace Add-on',
      },
    },
  })
  await fastify.register(swaggerUi, { routePrefix: '/docs' })
}

export default fp(swaggerPlugin, { name: 'swagger' })
