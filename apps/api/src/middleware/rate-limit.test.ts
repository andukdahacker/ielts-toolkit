import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import rateLimitPlugin from './rate-limit.js'

// Minimal auth stub that sets teacherId on requests
const fakeAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('teacherId', '')
  fastify.decorateRequest('teacherEmail', '')
  fastify.decorate('authenticate', async () => {})
  fastify.addHook('onRequest', async (request) => {
    request.teacherId = 'teacher-uuid-test'
  })
}

describe('rate-limit plugin', () => {
  it('registers without error', async () => {
    const app = Fastify({ logger: false })
    await app.register(fp(fakeAuthPlugin, { name: 'auth', dependencies: [] }))
    await app.register(rateLimitPlugin)
    app.get('/test', async () => ({ data: { ok: true } }))
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(200)

    await app.close()
  })
})
