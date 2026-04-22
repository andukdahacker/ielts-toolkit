import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyError } from 'fastify'
import { DomainError } from '@ielts-toolkit/shared'

const STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  GRADING_FAILED: 500,
  SHEET_WRITE_FAILED: 500,
  USAGE_LIMIT_REACHED: 403,
  INTERNAL_ERROR: 500,
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | DomainError, _request, reply) => {
    if (error instanceof DomainError) {
      const status = STATUS_MAP[error.code] ?? 500
      return reply.status(status).send({
        error: error.toJSON(),
      })
    }

    const fastifyError = error as FastifyError

    // Zod validation errors from fastify-type-provider-zod
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: fastifyError.message,
          retryable: false,
        },
      })
    }

    // Fastify rate limit errors
    if (fastifyError.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          retryable: true,
        },
      })
    }

    fastify.log.error(error, 'Unhandled error')
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        retryable: true,
      },
    })
  })
}

export default fp(errorHandlerPlugin, { name: 'error-handler' })
