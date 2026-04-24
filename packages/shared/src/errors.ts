import { z } from 'zod'

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'VALIDATION_ERROR',
  'GRADING_FAILED',
  'RATE_LIMITED',
  'SHEET_WRITE_FAILED',
  'USAGE_LIMIT_REACHED',
  'INTERNAL_ERROR',
  'NOT_FOUND',
] as const

export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  'GRADING_FAILED',
  'RATE_LIMITED',
  'SHEET_WRITE_FAILED',
  'INTERNAL_ERROR',
])

export const appErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
})
export type AppError = z.infer<typeof appErrorSchema>

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable: boolean = RETRYABLE_CODES.has(code),
  ) {
    super(message)
    this.name = 'DomainError'
  }

  toJSON(): AppError {
    return { code: this.code, message: this.message, retryable: this.retryable }
  }
}

export class AuthError extends DomainError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, false)
    this.name = 'AuthError'
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, false)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super('NOT_FOUND', message, false)
    this.name = 'NotFoundError'
  }
}

export class GradingError extends DomainError {
  constructor(message: string, retryable = true) {
    super('GRADING_FAILED', message, retryable)
    this.name = 'GradingError'
  }
}
