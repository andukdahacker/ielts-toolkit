import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import fastifyEnv from '@fastify/env'
import { envJsonSchema, type Env } from './env.js'
import swaggerPlugin from './plugins/swagger.js'
import corsPlugin from './plugins/cors.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import dbPlugin from './plugins/db.js'
import authPlugin from './middleware/auth.js'
import rateLimitPlugin from './middleware/rate-limit.js'
import healthRoutes from './routes/health.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: Env
  }
}

export interface BuildAppOptions {
  envOverrides?: Partial<Env>
}

export async function buildApp(opts: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Environment validation
  await app.register(fastifyEnv, {
    schema: envJsonSchema as Record<string, unknown>,
    dotenv: true,
    data: opts.envOverrides,
  })

  // Plugins
  await app.register(swaggerPlugin)
  await app.register(corsPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(dbPlugin)

  // Auth & rate limiting
  await app.register(authPlugin)
  await app.register(rateLimitPlugin)

  // Routes
  await app.register(healthRoutes)

  return app
}
