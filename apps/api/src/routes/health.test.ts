import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import healthRoutes from './health.js'

describe('GET /health', () => {
  it('returns 200 with standard data shape', async () => {
    const app = Fastify()
    await app.register(healthRoutes)
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: { status: 'ok' },
    })

    await app.close()
  })
})
