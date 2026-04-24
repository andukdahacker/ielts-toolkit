import { describe, it, expect, vi } from 'vitest'
import {
  createGradingJob,
  processGradingJob,
  getJobStatus,
  cleanupStaleJobs,
  stripPii,
  getActiveJob,
} from './grading.js'
import type { GeminiClient } from './gemini.js'

// --- Mock helpers ---

function createMockDb(overrides: {
  executeTakeFirst?: unknown
  executeTakeFirstOrThrow?: unknown
  execute?: unknown[]
} = {}) {
  const executeTakeFirst = typeof overrides.executeTakeFirst === 'function'
    ? overrides.executeTakeFirst
    : vi.fn().mockResolvedValue(overrides.executeTakeFirst ?? null)
  const executeTakeFirstOrThrow = vi.fn().mockResolvedValue(overrides.executeTakeFirstOrThrow ?? {})
  const execute = vi.fn().mockResolvedValue(overrides.execute ?? [])
  const limit = vi.fn().mockReturnValue({ executeTakeFirst })
  const orderBy = vi.fn().mockReturnValue({ limit })

  // Use a proxy-like approach for chainable where
  const chainable: Record<string, unknown> = {
    executeTakeFirst,
    executeTakeFirstOrThrow,
    execute,
    orderBy,
    limit,
  }

  const where = vi.fn().mockReturnValue(chainable)
  chainable.where = where
  chainable.selectAll = vi.fn().mockReturnValue(chainable)
  chainable.set = vi.fn().mockReturnValue(chainable)

  const selectAll = vi.fn().mockReturnValue(chainable)
  const selectFrom = vi.fn().mockReturnValue({ selectAll, where, select: vi.fn().mockReturnValue(chainable) })

  const returningAll = vi.fn().mockReturnValue({ executeTakeFirstOrThrow, executeTakeFirst })
  const onConflict = vi.fn().mockReturnValue({ returningAll })
  const values = vi.fn().mockReturnValue({ returningAll, onConflict })
  const insertInto = vi.fn().mockReturnValue({ values })

  const updateTable = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue(chainable) })

  return {
    selectFrom,
    insertInto,
    updateTable,
  } as unknown as Parameters<typeof createGradingJob>[0] & { updateTable: ReturnType<typeof vi.fn> }
}

function createMockGeminiClient(result?: unknown, shouldThrow?: Error): GeminiClient {
  return {
    gradeEssay: shouldThrow
      ? vi.fn().mockRejectedValue(shouldThrow)
      : vi.fn().mockResolvedValue(result ?? {
          bandScores: {
            overall: 6.5,
            taskAchievement: 7.0,
            coherenceAndCohesion: 6.5,
            lexicalResource: 6.0,
            grammaticalRangeAndAccuracy: 6.5,
          },
          comments: [{ text: 'Good essay structure', anchorText: 'In conclusion', category: 'coherenceAndCohesion' }],
        }),
  } as GeminiClient
}

const mockLog = { log: { error: vi.fn(), info: vi.fn() } } as unknown as Parameters<typeof processGradingJob>[4]

describe('stripPii', () => {
  it('removes student name from text', () => {
    const result = stripPii('Hello John Smith wrote this essay about climate change', 'John Smith')
    expect(result).not.toContain('John')
    expect(result).not.toContain('Smith')
    expect(result).toContain('climate change')
  })

  it('returns text unchanged when no student name provided', () => {
    const text = 'This is an essay about global warming'
    expect(stripPii(text)).toBe(text)
  })

  it('handles case-insensitive matching', () => {
    const result = stripPii('john wrote well', 'John')
    expect(result.toLowerCase()).not.toContain('john')
  })
})

describe('createGradingJob', () => {
  it('returns existing jobId for duplicate idempotency key', async () => {
    const db = createMockDb({
      executeTakeFirst: { id: 'existing-job-id', idempotencyKey: 'key-1' },
    })

    const result = await createGradingJob(db, 'teacher-1', {
      essayText: 'My essay',
      taskType: 'task2',
    }, 'key-1')

    expect(result.jobId).toBe('existing-job-id')
    expect(result.duplicate).toBe(true)
  })

  it('creates a new job when idempotency key is fresh', async () => {
    // executeTakeFirst returns null for SELECT (no existing), then returns the new job for INSERT
    const executeTakeFirst = vi.fn()
      .mockResolvedValueOnce(null)       // idempotency SELECT
      .mockResolvedValueOnce({ id: 'new-job-id', status: 'pending' }) // INSERT RETURNING
    const db = createMockDb({ executeTakeFirst })

    const result = await createGradingJob(db, 'teacher-1', {
      essayText: 'My essay',
      taskType: 'task2',
    }, 'new-key')

    expect(result.jobId).toBe('new-job-id')
    expect(result.duplicate).toBe(false)
  })
})

describe('processGradingJob', () => {
  it('never throws unhandled rejection — catches all errors and marks job as failed', async () => {
    const db = createMockDb({
      executeTakeFirstOrThrow: { id: 'job-1', essayText: 'essay', taskType: 'task2', teacherId: 'teacher-1' },
      executeTakeFirst: { numUpdatedRows: BigInt(1) },
    })
    const gemini = createMockGeminiClient(undefined, new Error('Gemini exploded'))

    // Should NOT throw — must catch internally
    await expect(
      processGradingJob(db, 'job-1', 'teacher-1', gemini, mockLog)
    ).resolves.toBeUndefined()
  })

  it('updates job to completed on success', async () => {
    const gradeResult = {
      bandScores: {
        overall: 7.0,
        taskAchievement: 7.0,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.0,
        grammaticalRangeAndAccuracy: 7.0,
      },
      comments: [{ text: 'Well written', anchorText: 'test', category: 'coherenceAndCohesion' }],
    }
    const db = createMockDb({
      executeTakeFirstOrThrow: { id: 'job-1', essayText: 'essay', taskType: 'task2', teacherId: 'teacher-1' },
      executeTakeFirst: { numUpdatedRows: BigInt(1) },
    })
    const gemini = createMockGeminiClient(gradeResult)

    await processGradingJob(db, 'job-1', 'teacher-1', gemini, mockLog)

    expect(db.updateTable).toHaveBeenCalled()
  })
})

describe('getJobStatus', () => {
  it('returns job status with tenant isolation', async () => {
    const db = createMockDb({
      executeTakeFirst: {
        id: 'job-1',
        status: 'completed',
        resultScores: { overall: 7.0, taskAchievement: 7.0, coherenceAndCohesion: 7.0, lexicalResource: 7.0, grammaticalRangeAndAccuracy: 7.0 },
        resultComments: [{ text: 'Good' }],
        errorCode: null,
        errorMessage: null,
        errorRetryable: null,
      },
    })

    const result = await getJobStatus(db, 'job-1', 'teacher-1')
    expect(result).not.toBeNull()
    expect(result!.status).toBe('completed')
    expect(result!.result).toBeDefined()
  })

  it('returns null when job belongs to different teacher (tenant isolation)', async () => {
    const db = createMockDb({ executeTakeFirst: null })

    const result = await getJobStatus(db, 'job-1', 'teacher-other')
    expect(result).toBeNull()
  })
})

describe('cleanupStaleJobs', () => {
  it('marks stale jobs as failed', async () => {
    const db = createMockDb()
    await cleanupStaleJobs(db)
    expect(db.updateTable).toHaveBeenCalled()
  })
})

describe('getActiveJob', () => {
  it('returns most recent active job for teacher', async () => {
    const db = createMockDb({
      executeTakeFirst: { id: 'job-1', status: 'processing' },
    })

    const result = await getActiveJob(db, 'teacher-1')
    expect(result).not.toBeNull()
    expect(result!.jobId).toBe('job-1')
  })

  it('returns null when no active job exists', async () => {
    const db = createMockDb({ executeTakeFirst: null })

    const result = await getActiveJob(db, 'teacher-1')
    expect(result).toBeNull()
  })
})
