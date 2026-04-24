import type { Generated, ColumnType } from 'kysely'

// CamelCasePlugin maps these camelCase keys to snake_case DB columns at runtime.
// Migrations define the actual snake_case column names.

export interface TeacherTable {
  id: Generated<string>
  googleSub: string
  email: string
  displayName: string | null
  plan: Generated<string>
  planStatus: Generated<string>
  planValidUntil: ColumnType<Date | null, string | undefined, string | undefined>
  lastGradingAt: ColumnType<Date | null, string | undefined, string | undefined>
  gradingsThisWeek: Generated<number>
  gradingsThisMonth: Generated<number>
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
}

export interface GradingJobTable {
  id: Generated<string>
  teacherId: string
  idempotencyKey: string
  status: Generated<string>
  taskType: string
  essayText: string
  studentName: string | null
  resultScores: ColumnType<unknown | null, string | undefined, string | undefined>
  resultComments: ColumnType<unknown | null, string | undefined, string | undefined>
  errorCode: string | null
  errorMessage: string | null
  errorRetryable: boolean | null
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
}

export interface GradingEventTable {
  id: Generated<string>
  teacherId: string
  jobId: string | null
  eventType: string
  payload: ColumnType<unknown | null, string | undefined, string | undefined>
  createdAt: Generated<Date>
}

export interface ProcessedWebhookIdTable {
  webhookId: string
  processedAt: Generated<Date>
}

export interface Database {
  teachers: TeacherTable
  gradingJobs: GradingJobTable
  gradingEvents: GradingEventTable
  processedWebhookIds: ProcessedWebhookIdTable
}
