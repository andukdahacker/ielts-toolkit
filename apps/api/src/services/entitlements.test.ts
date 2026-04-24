import { describe, it, expect } from 'vitest'
import { checkEntitlement } from './entitlements.js'

describe('checkEntitlement', () => {
  it('always returns entitled:true in Phase 1', async () => {
    const result = await checkEntitlement('any-teacher-id')
    expect(result.entitled).toBe(true)
    expect(result.remaining).toBe(Infinity)
  })

  it('works for any teacher ID', async () => {
    const result1 = await checkEntitlement('teacher-1')
    const result2 = await checkEntitlement('teacher-2')
    expect(result1.entitled).toBe(true)
    expect(result2.entitled).toBe(true)
  })
})
