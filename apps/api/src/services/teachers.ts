import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../db/schema.js'

export interface UpsertTeacherInput {
  googleSub: string
  email: string
  displayName: string | null
}

export interface TeacherRecord {
  id: string
  googleSub: string
  email: string
  displayName: string | null
}

export async function upsertTeacher(
  db: Kysely<Database>,
  input: UpsertTeacherInput,
): Promise<TeacherRecord> {
  const result = await db
    .insertInto('teachers')
    .values({
      googleSub: input.googleSub,
      email: input.email,
      displayName: input.displayName,
    })
    .onConflict((oc) =>
      oc.column('googleSub').doUpdateSet((eb) => ({
        email: eb.val(input.email),
        displayName: eb.val(input.displayName),
        updatedAt: sql`now()`,
      })),
    )
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: result.id,
    googleSub: result.googleSub,
    email: result.email,
    displayName: result.displayName,
  }
}
