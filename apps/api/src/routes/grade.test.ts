import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import errorHandlerPlugin from '../plugins/error-handler.js'
import gradeRoutes from './grade.js'
import type { GeminiClient } from '../services/gemini.js'

// --- Test helpers ---

const mockGenerateContent = vi.fn()
const mockGeminiClient: GeminiClient = {
  gradeEssay: vi.fn().mockResolvedValue({
    bandScores: {
      overall: 6.5,
      taskAchievement: 7.0,
      coherenceAndCohesion: 6.5,
      lexicalResource: 6.0,
      grammaticalRangeAndAccuracy: 6.5,
    },
    comments: [{ text: 'Good', anchorText: 'test', category: 'coherenceAndCohesion' }],
  }),
}

// Mock DB that handles common Kysely chain patterns
function createMockDb() {
  const executeTakeFirst = vi.fn().mockResolvedValue(null)
  const executeTakeFirstOrThrow = vi.fn().mockResolvedValue({ id: 'job-uuid-123', status: 'pending' })
  const execute = vi.fn().mockResolvedValue([])

  const chainable: Record<string, unknown> = {
    executeTakeFirst,
    executeTakeFirstOrThrow,
    execute,
  }

  const where = vi.fn().mockReturnValue(chainable)
  chainable.where = where
  chainable.selectAll = vi.fn().mockReturnValue(chainable)
  chainable.set = vi.fn().mockReturnValue(chainable)
  chainable.orderBy = vi.fn().mockReturnValue(chainable)
  chainable.limit = vi.fn().mockReturnValue(chainable)

  const selectAll = vi.fn().mockReturnValue(chainable)
  const selectFrom = vi.fn().mockReturnValue({ selectAll, where })

  const returningAll = vi.fn().mockReturnValue({ executeTakeFirstOrThrow, executeTakeFirst })
  const onConflict = vi.fn().mockReturnValue({ returningAll })
  const values = vi.fn().mockReturnValue({ returningAll, onConflict })
  const insertInto = vi.fn().mockReturnValue({ values })

  const updateTable = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue(chainable) })

  return {
    selectFrom,
    insertInto,
    updateTable,
    _mocks: { executeTakeFirst, executeTakeFirstOrThrow },
  }
}

// Fake auth plugin that sets teacherId
const fakeAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('teacherId', '')
  fastify.decorateRequest('teacherEmail', '')
  fastify.decorate('authenticate', async (request: any) => {
    request.teacherId = 'teacher-uuid-test'
    request.teacherEmail = 'teacher@test.com'
  })
}

async function buildTestApp() {
  const app = Fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(errorHandlerPlugin)
  await app.register(fp(fakeAuthPlugin, { name: 'auth', dependencies: [] }))

  const mockDb = createMockDb()
  app.decorate('db', mockDb as any)

  await app.register(gradeRoutes({ geminiClient: mockGeminiClient }))
  await app.ready()

  return { app, mockDb }
}

let app: FastifyInstance
let mockDb: ReturnType<typeof createMockDb>

beforeEach(async () => {
  const result = await buildTestApp()
  app = result.app
  mockDb = result.mockDb
})

afterEach(async () => {
  await app.close()
})

describe('POST /grade', () => {
  it('returns 201 with jobId for valid request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/grade',
      headers: {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      },
      payload: {
        essayText: 'This is a test essay about climate change and its effects.',
        taskType: 'task2',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.jobId).toBeDefined()
  })

  it('returns 400 when missing idempotency key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/grade',
      payload: {
        essayText: 'This is a test essay.',
        taskType: 'task2',
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid body (missing essayText)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/grade',
      headers: {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      },
      payload: {
        taskType: 'task2',
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid taskType', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/grade',
      headers: {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      },
      payload: {
        essayText: 'Essay text',
        taskType: 'invalid_type',
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns existing jobId for duplicate idempotency key', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue({
      id: 'existing-job-id',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/grade',
      headers: {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      },
      payload: {
        essayText: 'Test essay',
        taskType: 'task2',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().data.jobId).toBe('existing-job-id')
  })
})

describe('GET /grade/:jobId/status', () => {
  it('returns job status for valid job', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'processing',
      resultScores: null,
      resultComments: null,
      errorCode: null,
      errorMessage: null,
      errorRetryable: null,
    })

    const res = await app.inject({
      method: 'GET',
      url: '/grade/550e8400-e29b-41d4-a716-446655440000/status',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('processing')
  })

  it('returns 404 for non-existent job (tenant isolation)', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/grade/550e8400-e29b-41d4-a716-446655440000/status',
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 400 for invalid jobId format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grade/not-a-uuid/status',
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns completed job with result', async () => {
    const bandScores = {
      overall: 7.0,
      taskAchievement: 7.0,
      coherenceAndCohesion: 7.0,
      lexicalResource: 7.0,
      grammaticalRangeAndAccuracy: 7.0,
    }
    mockDb._mocks.executeTakeFirst.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'completed',
      resultScores: bandScores,
      resultComments: [{ text: 'Good' }],
      errorCode: null,
      errorMessage: null,
      errorRetryable: null,
    })

    const res = await app.inject({
      method: 'GET',
      url: '/grade/550e8400-e29b-41d4-a716-446655440000/status',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.status).toBe('completed')
    expect(body.data.result.bandScores.overall).toBe(7.0)
  })

  it('returns failed job with error', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'failed',
      resultScores: null,
      resultComments: null,
      errorCode: 'GRADING_FAILED',
      errorMessage: 'Gemini timeout',
      errorRetryable: true,
    })

    const res = await app.inject({
      method: 'GET',
      url: '/grade/550e8400-e29b-41d4-a716-446655440000/status',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.status).toBe('failed')
    expect(body.data.error.code).toBe('GRADING_FAILED')
    expect(body.data.error.retryable).toBe(true)
  })
})

describe('GET /grade/active', () => {
  it('returns active job for teacher', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue({
      id: 'active-job-id',
      status: 'processing',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/grade/active',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).not.toBeNull()
    expect(res.json().data.jobId).toBe('active-job-id')
  })

  it('returns null when no active job', async () => {
    mockDb._mocks.executeTakeFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/grade/active',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toBeNull()
  })
})
