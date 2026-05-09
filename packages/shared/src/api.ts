import { z } from 'zod'
import { bandScoresSchema, taskTypeSchema } from './ielts.js'
import { appErrorSchema } from './errors.js'

export const gradingCommentSchema = z.object({
  text: z.string(),
  anchorText: z.string(),
  category: z.string(),
})
export type GradingComment = z.infer<typeof gradingCommentSchema>

export const gradeRequestSchema = z.object({
  essayText: z.string().min(1).max(15_000),
  taskType: taskTypeSchema,
  studentName: z.string().optional(),
})
export type GradeRequest = z.infer<typeof gradeRequestSchema>

export const gradeResultSchema = z.object({
  bandScores: bandScoresSchema,
  comments: z.array(gradingCommentSchema),
})
export type GradeResult = z.infer<typeof gradeResultSchema>

export const jobStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  result: gradeResultSchema.optional(),
  error: appErrorSchema.optional(),
})
export type JobStatus = z.infer<typeof jobStatusSchema>

export const gradingEventSchema = z.object({
  eventType: z.enum(['score_overridden', 'feedback', 'feedback_comment', 'regrade_started']),
  payload: z.record(z.unknown())
    .refine(
      (obj) => Object.keys(obj).length <= 20,
      { message: 'Payload must have at most 20 keys' },
    )
    .refine(
      (obj) => JSON.stringify(obj).length <= 8192,
      { message: 'Payload must be under 8KB' },
    )
    .optional(),
})
export type GradingEvent = z.infer<typeof gradingEventSchema>

export const scoreWritePayloadSchema = z.object({
  studentName: z.string(),
  bandScores: bandScoresSchema,
  taskType: taskTypeSchema,
  gradedAt: z.string(),
})
export type ScoreWritePayload = z.infer<typeof scoreWritePayloadSchema>
