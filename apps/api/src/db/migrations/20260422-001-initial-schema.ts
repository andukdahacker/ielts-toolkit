import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // teachers
  await db.schema
    .createTable('teachers')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('google_sub', 'text', (col) => col.unique().notNull())
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('display_name', 'text')
    .addColumn('plan', 'text', (col) => col.notNull().defaultTo('free'))
    .addColumn('plan_status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('plan_valid_until', 'timestamptz')
    .addColumn('last_grading_at', 'timestamptz')
    .addColumn('gradings_this_week', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('gradings_this_month', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  // grading_jobs
  await db.schema
    .createTable('grading_jobs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('teacher_id', 'uuid', (col) =>
      col.references('teachers.id').notNull(),
    )
    .addColumn('idempotency_key', 'text', (col) => col.unique().notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('task_type', 'text', (col) => col.notNull())
    .addColumn('essay_text', 'text', (col) => col.notNull())
    .addColumn('result_scores', 'jsonb')
    .addColumn('result_comments', 'jsonb')
    .addColumn('error_code', 'text')
    .addColumn('error_message', 'text')
    .addColumn('error_retryable', 'boolean')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await db.schema
    .createIndex('idx_grading_jobs_teacher_id')
    .on('grading_jobs')
    .column('teacher_id')
    .execute()

  await db.schema
    .createIndex('idx_grading_jobs_idempotency_key')
    .on('grading_jobs')
    .column('idempotency_key')
    .execute()

  // grading_events
  await db.schema
    .createTable('grading_events')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('teacher_id', 'uuid', (col) =>
      col.references('teachers.id').notNull(),
    )
    .addColumn('job_id', 'uuid', (col) => col.references('grading_jobs.id'))
    .addColumn('event_type', 'text', (col) => col.notNull())
    .addColumn('payload', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await db.schema
    .createIndex('idx_grading_events_teacher_id')
    .on('grading_events')
    .column('teacher_id')
    .execute()

  await db.schema
    .createIndex('idx_grading_events_job_id')
    .on('grading_events')
    .column('job_id')
    .execute()

  // processed_webhook_ids
  await db.schema
    .createTable('processed_webhook_ids')
    .addColumn('webhook_id', 'text', (col) => col.primaryKey())
    .addColumn('processed_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('processed_webhook_ids').execute()
  await db.schema.dropTable('grading_events').execute()
  await db.schema.dropTable('grading_jobs').execute()
  await db.schema.dropTable('teachers').execute()
}
