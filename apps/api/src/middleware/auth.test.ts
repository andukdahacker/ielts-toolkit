import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import errorHandlerPlugin from '../plugins/error-handler.js'

// We need to mock google-auth-library and teachers service before importing auth
vi.mock('google-auth-library', () => {
  const verifyIdToken = vi.fn()
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken,
    })),
    __mockVerifyIdToken: verifyIdToken,
  }
})

vi.mock('../services/teachers.js', () => ({
  upsertTeacher: vi.fn().mockResolvedValue({
    id: 'teacher-uuid-123',
    googleSub: 'sub-123',
    email: 'teacher@example.com',
    displayName: 'Teacher Name',
  }),
}))

// Import after mocking
const { __mockVerifyIdToken } = await import('google-auth-library') as any

// Minimal env + db plugin mocks
const fakeEnvPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('config', {
    DATABASE_URL: 'postgresql://test',
    GEMINI_API_KEY: 'test',
    GOOGLE_CLIENT_ID: 'test-client-id',
    POLAR_WEBHOOK_SECRET: 'test',
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    PORT: 3000,
  })
}

const fakeDbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('db', {} as any)
}

describe('auth middleware', () => {
  let authPlugin: FastifyPluginAsync

  beforeEach(async () => {
    vi.clearAllMocks()
    const authModule = await import('./auth.js')
    authPlugin = authModule.default
  })

  async function buildTestApp() {
    const app = Fastify({ logger: false })
    await app.register(fp(fakeEnvPlugin, { name: 'env' }))
    await app.register(errorHandlerPlugin)
    await app.register(fp(fakeDbPlugin, { name: 'db' }))
    await app.register(authPlugin)
    app.get('/protected', { preHandler: [app.authenticate] }, async (request) => {
      return { data: { teacherId: request.teacherId } }
    })
    await app.ready()
    return app
  }

  it('returns 401 when no Authorization header', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/protected' })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
    await app.close()
  })

  it('returns 401 when token is invalid', async () => {
    __mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
    await app.close()
  })

  it('attaches teacherId on valid token', async () => {
    __mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'sub-123',
        email: 'teacher@example.com',
        name: 'Teacher Name',
      }),
    })

    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ data: { teacherId: 'teacher-uuid-123' } })
    await app.close()
  })
})
