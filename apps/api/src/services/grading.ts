import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../db/schema.js'
import type { GradeResult, TaskType, JobStatus, BandScores } from '@ielts-toolkit/shared'
import type { GeminiClient } from './gemini.js'

export interface CreateJobRequest {
  essayText: string
  taskType: TaskType
  studentName?: string
}

export interface CreateJobResult {
  jobId: string
  duplicate: boolean
}

export interface ActiveJobResult {
  jobId: string
  status: string
  studentName: string | null
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function stripPii(text: string, studentName?: string | null): string {
  if (!studentName) return text

  const parts = studentName.trim().split(/\s+/)
  let result = text
  for (const part of parts) {
    if (part.length < 2) continue
    result = result.replace(new RegExp(escapeRegExp(part), 'gi'), '[STUDENT]')
  }
  return result
}

export async function createGradingJob(
  db: Kysely<Database>,
  teacherId: string,
  request: CreateJobRequest,
  idempotencyKey: string,
): Promise<CreateJobResult> {
  // Check idempotency key first
  const existing = await db
    .selectFrom('gradingJobs')
    .selectAll()
    .where('teacherId', '=', teacherId)
    .where('idempotencyKey', '=', idempotencyKey)
    .executeTakeFirst()

  if (existing) {
    return { jobId: existing.id, duplicate: true }
  }

  // Insert new job
  const job = await db
    .insertInto('gradingJobs')
    .values({
      teacherId,
      idempotencyKey,
      taskType: request.taskType,
      essayText: request.essayText,
      studentName: request.studentName ?? null,
    })
    .onConflict((oc) =>
      oc.columns(['teacherId', 'idempotencyKey']).doNothing(),
    )
    .returningAll()
    .executeTakeFirst()

  if (!job) {
    // ON CONFLICT hit — re-fetch the existing row
    const existing2 = await db
      .selectFrom('gradingJobs')
      .selectAll()
      .where('teacherId', '=', teacherId)
      .where('idempotencyKey', '=', idempotencyKey)
      .executeTakeFirstOrThrow()
    return { jobId: existing2.id, duplicate: true }
  }

  return { jobId: job.id, duplicate: false }
}

export async function processGradingJob(
  db: Kysely<Database>,
  jobId: string,
  teacherId: string,
  geminiClient: GeminiClient,
  context: { log: { error: (...args: unknown[]) => void; info: (...args: unknown[]) => void } },
): Promise<void> {
  try {
    // Load job
    const job = await db
      .selectFrom('gradingJobs')
      .selectAll()
      .where('id', '=', jobId)
      .where('teacherId', '=', teacherId)
      .executeTakeFirstOrThrow()

    // Update status to processing — guard against concurrent execution
    const updated = await db
      .updateTable('gradingJobs')
      .set({ status: 'processing', updatedAt: sql`now()` })
      .where('id', '=', jobId)
      .where('teacherId', '=', teacherId)
      .where('status', '=', 'pending')
      .executeTakeFirst()

    if (!updated.numUpdatedRows || updated.numUpdatedRows === BigInt(0)) {
      context.log.info({ jobId }, 'Job already processing or completed — skipping')
      return
    }

    // Strip PII and call Gemini
    const cleanEssay = stripPii(job.essayText, job.studentName)
    const result: GradeResult = await geminiClient.gradeEssay(cleanEssay, job.taskType as TaskType)

    // Update job to completed — guard against stale-job cleanup race
    await db
      .updateTable('gradingJobs')
      .set({
        status: 'completed',
        resultScores: JSON.stringify(result.bandScores),
        resultComments: JSON.stringify(result.comments),
        updatedAt: sql`now()`,
      })
      .where('id', '=', jobId)
      .where('teacherId', '=', teacherId)
      .where('status', '=', 'processing')
      .execute()

    // Log grading event
    await db
      .insertInto('gradingEvents')
      .values({
        teacherId: job.teacherId,
        jobId,
        eventType: 'ai_score_generated',
        payload: JSON.stringify(result.bandScores),
      })
      .execute()

    context.log.info({ jobId }, 'Grading job completed')
  } catch (err) {
    context.log.error({ jobId, err }, 'Grading job failed')

    try {
      await db
        .updateTable('gradingJobs')
        .set({
          status: 'failed',
          errorCode: 'GRADING_FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          errorRetryable: true,
          updatedAt: sql`now()`,
        })
        .where('id', '=', jobId)
        .where('teacherId', '=', teacherId)
        .execute()
    } catch (updateErr) {
      context.log.error({ jobId, updateErr }, 'Failed to update job status to failed')
    }
  }
}

export async function getJobStatus(
  db: Kysely<Database>,
  jobId: string,
  teacherId: string,
): Promise<JobStatus | null> {
  const job = await db
    .selectFrom('gradingJobs')
    .selectAll()
    .where('id', '=', jobId)
    .where('teacherId', '=', teacherId)
    .executeTakeFirst()

  if (!job) return null

  const status = job.status as JobStatus['status']

  if (status === 'completed') {
    try {
      return {
        status,
        result: {
          bandScores: (typeof job.resultScores === 'string' ? JSON.parse(job.resultScores) : job.resultScores) as BandScores,
          comments: (typeof job.resultComments === 'string' ? JSON.parse(job.resultComments) : job.resultComments) as GradeResult['comments'],
        },
      }
    } catch {
      return {
        status: 'failed' as const,
        error: {
          code: 'GRADING_FAILED' as const,
          message: 'Stored grading result is corrupt',
          retryable: true,
        },
      }
    }
  }

  if (status === 'failed') {
    return {
      status,
      error: {
        code: (job.errorCode as 'GRADING_FAILED') ?? 'GRADING_FAILED',
        message: job.errorMessage ?? 'Grading failed',
        retryable: job.errorRetryable ?? true,
      },
    }
  }

  return { status }
}

export async function cleanupStaleJobs(db: Kysely<Database>): Promise<void> {
  await db
    .updateTable('gradingJobs')
    .set({
      status: 'failed',
      errorCode: 'GRADING_FAILED',
      errorMessage: 'Job timed out after 5 minutes',
      errorRetryable: true,
      updatedAt: sql`now()`,
    })
    .where('status', 'in', ['pending', 'processing'])
    .where('createdAt', '<', sql<Date>`now() - interval '5 minutes'`)
    .execute()
}

export async function getActiveJob(
  db: Kysely<Database>,
  teacherId: string,
): Promise<ActiveJobResult | null> {
  const job = await db
    .selectFrom('gradingJobs')
    .selectAll()
    .where('teacherId', '=', teacherId)
    .where('status', 'in', ['pending', 'processing', 'completed'])
    .where('createdAt', '>', sql<Date>`now() - interval '30 minutes'`)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .executeTakeFirst()

  if (!job) return null

  return { jobId: job.id, status: job.status, studentName: job.studentName ?? null }
}

export async function logGradingEvent(
  db: Kysely<Database>,
  teacherId: string,
  jobId: string,
  eventType: string,
  payload: unknown,
): Promise<void> {
  await db
    .insertInto('gradingEvents')
    .values({
      teacherId,
      jobId,
      eventType,
      payload: JSON.stringify(payload),
    })
    .execute()
}
