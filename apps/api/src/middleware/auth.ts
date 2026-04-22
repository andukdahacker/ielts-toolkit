import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { AuthError, DomainError } from '@ielts-toolkit/shared'
import { upsertTeacher } from '../services/teachers.js'

declare module 'fastify' {
  interface FastifyRequest {
    teacherId: string
    teacherEmail: string
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const oauth2Client = new OAuth2Client(fastify.config.GOOGLE_CLIENT_ID)

  fastify.decorateRequest('teacherId', '')
  fastify.decorateRequest('teacherEmail', '')

  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)

    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: fastify.config.GOOGLE_CLIENT_ID,
      })

      const payload = ticket.getPayload()
      if (!payload?.sub || !payload?.email) {
        throw new AuthError('Invalid token payload')
      }

      const teacher = await upsertTeacher(fastify.db, {
        googleSub: payload.sub,
        email: payload.email,
        displayName: payload.name ?? null,
      })

      request.teacherId = teacher.id
      request.teacherEmail = teacher.email
    } catch (err) {
      if (err instanceof AuthError) throw err
      if (err instanceof DomainError) throw err
      // Distinguish token verification errors from infrastructure errors
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('Token') || message.includes('token') || message.includes('audience')) {
        throw new AuthError('Invalid or expired token')
      }
      throw new DomainError('INTERNAL_ERROR', 'Authentication service unavailable')
    }
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['error-handler', 'db'],
})
