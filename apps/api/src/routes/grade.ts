import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { gradeRequestSchema, DomainError } from '@ielts-toolkit/shared'
import { NotFoundError } from '@ielts-toolkit/shared'
import { createGradingJob, processGradingJob, getJobStatus, getActiveJob } from '../services/grading.js'
import { checkEntitlement } from '../services/entitlements.js'
import type { GeminiClient } from '../services/gemini.js'

export interface GradeRouteOptions {
  geminiClient: GeminiClient
}

const uuidSchema = z.string().uuid()

const gradeRoutes = (opts: GradeRouteOptions): FastifyPluginAsync => {
  return async (fastify) => {
    // POST /grade — submit essay for AI grading
    fastify.post('/grade', {
      onRequest: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 hour',
          keyGenerator: (request: any) => request.teacherId,
        },
      },
      schema: {
        body: gradeRequestSchema,
        headers: z.object({
          'x-idempotency-key': z.string().uuid(),
        }).passthrough(),
      },
    }, async (request, reply) => {
      const body = request.body as z.infer<typeof gradeRequestSchema>
      const idempotencyKey = (request.headers as Record<string, string>)['x-idempotency-key']

      const entitlement = await checkEntitlement(request.teacherId)
      if (!entitlement.entitled) {
        throw new DomainError('RATE_LIMITED', 'Grading entitlement exhausted', false)
      }

      const { jobId, duplicate } = await createGradingJob(
        fastify.db,
        request.teacherId,
        body,
        idempotencyKey,
      )

      // Only start processing for new jobs — skip duplicates
      if (!duplicate) {
        processGradingJob(fastify.db, jobId, request.teacherId, opts.geminiClient, fastify)
          .catch((err: unknown) => fastify.log.error(err, 'Background grading failed'))
      }

      return reply.status(201).send({ data: { jobId } })
    })

    // GET /grade/active — get teacher's most recent active job
    // Must be registered BEFORE /grade/:jobId/status to avoid route conflict
    fastify.get('/grade/active', {
      onRequest: [fastify.authenticate],
    }, async (request) => {
      const result = await getActiveJob(fastify.db, request.teacherId)
      return { data: result }
    })

    // GET /grade/:jobId/status — poll job status
    fastify.get('/grade/:jobId/status', {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ jobId: uuidSchema }),
      },
    }, async (request) => {
      const { jobId } = request.params as { jobId: string }
      const result = await getJobStatus(fastify.db, jobId, request.teacherId)

      if (!result) {
        throw new NotFoundError('Grading job not found')
      }

      return { data: result }
    })
  }
}

export default gradeRoutes
