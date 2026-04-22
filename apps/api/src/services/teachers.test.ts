import { describe, it, expect, vi } from 'vitest'
import { upsertTeacher, type UpsertTeacherInput } from './teachers.js'

// Mock Kysely db — CamelCasePlugin returns camelCase properties at runtime
function createMockDb(returnValue: Record<string, unknown>) {
  const executeTakeFirstOrThrow = vi.fn().mockResolvedValue(returnValue)
  const returningAll = vi.fn().mockReturnValue({ executeTakeFirstOrThrow })
  const doUpdateSet = vi.fn().mockReturnValue({ returningAll })
  const column = vi.fn().mockReturnValue({ doUpdateSet })
  const onConflict = vi.fn().mockImplementation((cb) => {
    cb({ column, doUpdateSet })
    return { returningAll }
  })
  const values = vi.fn().mockReturnValue({ onConflict })
  const insertInto = vi.fn().mockReturnValue({ values })

  return { insertInto } as unknown as Parameters<typeof upsertTeacher>[0]
}

describe('upsertTeacher', () => {
  const input: UpsertTeacherInput = {
    googleSub: 'google-sub-123',
    email: 'teacher@example.com',
    displayName: 'Test Teacher',
  }

  it('returns a teacher record with camelCase fields', async () => {
    const mockReturn = {
      id: 'uuid-123',
      googleSub: 'google-sub-123',
      email: 'teacher@example.com',
      displayName: 'Test Teacher',
    }
    const db = createMockDb(mockReturn)
    const result = await upsertTeacher(db, input)

    expect(result).toEqual({
      id: 'uuid-123',
      googleSub: 'google-sub-123',
      email: 'teacher@example.com',
      displayName: 'Test Teacher',
    })
  })

  it('calls insertInto on the teachers table', async () => {
    const mockReturn = {
      id: 'uuid-456',
      googleSub: 'google-sub-123',
      email: 'teacher@example.com',
      displayName: 'Test Teacher',
    }
    const db = createMockDb(mockReturn)
    await upsertTeacher(db, input)

    expect(db.insertInto).toHaveBeenCalledWith('teachers')
  })
})
