import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import errorHandlerPlugin from './error-handler.js'
import { DomainError, AuthError, NotFoundError } from '@ielts-toolkit/shared'

describe('error handler', () => {
  async function buildTestApp() {
    const app = Fastify({ logger: false })
    await app.register(errorHandlerPlugin)
    return app
  }

  it('maps DomainError to standard error shape', async () => {
    const app = await buildTestApp()
    app.get('/test', async () => {
      throw new DomainError('GRADING_FAILED', 'AI service down', true)
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({
      error: { code: 'GRADING_FAILED', message: 'AI service down', retryable: true },
    })
    await app.close()
  })

  it('maps AuthError to 401', async () => {
    const app = await buildTestApp()
    app.get('/test', async () => {
      throw new AuthError('Bad token')
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
    expect(res.json().error.retryable).toBe(false)
    await app.close()
  })

  it('maps NotFoundError to 404', async () => {
    const app = await buildTestApp()
    app.get('/test', async () => {
      throw new NotFoundError('Resource not found')
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
    await app.close()
  })

  it('maps unknown errors to 500 INTERNAL_ERROR', async () => {
    const app = await buildTestApp()
    app.get('/test', async () => {
      throw new Error('something broke')
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', retryable: true },
    })
    await app.close()
  })
})
