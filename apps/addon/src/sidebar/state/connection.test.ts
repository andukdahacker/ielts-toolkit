import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
}))

import { connectionStatus, checkConnection } from './connection'
import { checkBackendHealth } from '../lib/gas'

const mockCheckBackendHealth = vi.mocked(checkBackendHealth)

describe('connection state', () => {
  beforeEach(() => {
    connectionStatus.value = 'idle'
    vi.clearAllMocks()
  })

  it('starts with idle status', () => {
    expect(connectionStatus.value).toBe('idle')
  })

  it('sets status to connecting then connected on success', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })

    const promise = checkConnection()
    expect(connectionStatus.value).toBe('connecting')

    await promise
    expect(connectionStatus.value).toBe('connected')
  })

  it('sets status to connecting then error on failure', async () => {
    mockCheckBackendHealth.mockRejectedValueOnce(new Error('Network error'))

    const promise = checkConnection()
    expect(connectionStatus.value).toBe('connecting')

    await promise
    expect(connectionStatus.value).toBe('error')
  })
})
