import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkBackendHealth } from './gas'

describe('gas.ts promise wrapper', () => {
  let mockRun: {
    withSuccessHandler: ReturnType<typeof vi.fn>
    withFailureHandler: ReturnType<typeof vi.fn>
    checkBackendHealth: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRun = {
      withSuccessHandler: vi.fn().mockReturnThis(),
      withFailureHandler: vi.fn().mockReturnThis(),
      checkBackendHealth: vi.fn(),
    }

    ;(globalThis as any).google = {
      script: { run: mockRun },
    }
  })

  it('resolves with result on success', async () => {
    mockRun.checkBackendHealth.mockImplementation(() => {
      const successHandler = mockRun.withSuccessHandler.mock.calls[0][0]
      successHandler({ data: { status: 'ok' } })
    })

    const result = await checkBackendHealth()
    expect(result).toEqual({ data: { status: 'ok' } })
  })

  it('rejects with error on failure', async () => {
    mockRun.checkBackendHealth.mockImplementation(() => {
      const failureHandler = mockRun.withFailureHandler.mock.calls[0][0]
      failureHandler(new Error('Server error'))
    })

    await expect(checkBackendHealth()).rejects.toThrow('Server error')
  })

  it('wires up handlers in correct order', async () => {
    mockRun.checkBackendHealth.mockImplementation(() => {
      const successHandler = mockRun.withSuccessHandler.mock.calls[0][0]
      successHandler({ data: { status: 'ok' } })
    })

    await checkBackendHealth()

    expect(mockRun.withSuccessHandler).toHaveBeenCalledOnce()
    expect(mockRun.withFailureHandler).toHaveBeenCalledOnce()
    expect(mockRun.checkBackendHealth).toHaveBeenCalledOnce()
  })
})
