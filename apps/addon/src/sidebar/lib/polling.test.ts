import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startPolling } from './polling'

describe('polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls pollFn at the specified interval', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)

    startPolling(pollFn, onResult, { interval: 3000 })

    // First call is immediate
    await vi.advanceTimersByTimeAsync(0)
    expect(pollFn).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith('processing')

    // Second call after interval
    await vi.advanceTimersByTimeAsync(3000)
    expect(pollFn).toHaveBeenCalledTimes(2)

    // Third call after another interval
    await vi.advanceTimersByTimeAsync(3000)
    expect(pollFn).toHaveBeenCalledTimes(3)
  })

  it('uses default 4000ms interval when not specified', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)

    startPolling(pollFn, onResult)

    await vi.advanceTimersByTimeAsync(0)
    expect(pollFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3999)
    expect(pollFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(pollFn).toHaveBeenCalledTimes(2)
  })

  it('stops polling when onResult returns true', async () => {
    const pollFn = vi.fn()
      .mockResolvedValueOnce('processing')
      .mockResolvedValueOnce('completed')
    const onResult = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    startPolling(pollFn, onResult, { interval: 1000 })

    await vi.advanceTimersByTimeAsync(0)
    expect(pollFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(pollFn).toHaveBeenCalledTimes(2)
    expect(onResult).toHaveBeenLastCalledWith('completed')

    // No more calls after stop
    await vi.advanceTimersByTimeAsync(5000)
    expect(pollFn).toHaveBeenCalledTimes(2)
  })

  it('cancellation stops polling immediately', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)

    const { cancel } = startPolling(pollFn, onResult, { interval: 1000 })

    await vi.advanceTimersByTimeAsync(0)
    expect(pollFn).toHaveBeenCalledTimes(1)

    cancel()

    await vi.advanceTimersByTimeAsync(5000)
    expect(pollFn).toHaveBeenCalledTimes(1)
  })

  it('fires onTimeout after maxDuration without auto-cancelling', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)
    const onTimeout = vi.fn()

    startPolling(pollFn, onResult, {
      interval: 1000,
      maxDuration: 3000,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(onTimeout).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(3000)
    expect(onTimeout).toHaveBeenCalledOnce()

    // Polling continues after timeout (caller decides)
    await vi.advanceTimersByTimeAsync(1000)
    expect(pollFn.mock.calls.length).toBeGreaterThan(3)
  })

  it('uses default 45000ms maxDuration', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)
    const onTimeout = vi.fn()

    startPolling(pollFn, onResult, { interval: 5000, onTimeout })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(44999)
    expect(onTimeout).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('does not fire onTimeout if cancelled before maxDuration', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)
    const onTimeout = vi.fn()

    const { cancel } = startPolling(pollFn, onResult, {
      interval: 1000,
      maxDuration: 5000,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(0)
    cancel()

    await vi.advanceTimersByTimeAsync(10000)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('does not fire onTimeout if polling completes before maxDuration', async () => {
    const pollFn = vi.fn().mockResolvedValue('completed')
    const onResult = vi.fn().mockReturnValue(true)
    const onTimeout = vi.fn()

    startPolling(pollFn, onResult, {
      interval: 1000,
      maxDuration: 5000,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(onResult).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(10000)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('continues polling when pollFn rejects (error resilience)', async () => {
    const pollFn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('processing')
    const onResult = vi.fn().mockReturnValue(false)

    startPolling(pollFn, onResult, { interval: 1000 })

    // First call throws
    await vi.advanceTimersByTimeAsync(0)
    expect(pollFn).toHaveBeenCalledTimes(1)
    expect(onResult).not.toHaveBeenCalled()

    // Second call succeeds
    await vi.advanceTimersByTimeAsync(1000)
    expect(pollFn).toHaveBeenCalledTimes(2)
    expect(onResult).toHaveBeenCalledWith('processing')
  })

  it('cleanup clears all timers on cancel', async () => {
    const pollFn = vi.fn().mockResolvedValue('processing')
    const onResult = vi.fn().mockReturnValue(false)
    const onTimeout = vi.fn()

    const { cancel } = startPolling(pollFn, onResult, {
      interval: 1000,
      maxDuration: 5000,
      onTimeout,
    })

    await vi.advanceTimersByTimeAsync(0)
    cancel()

    // Verify no timers fire after cancel
    expect(vi.getTimerCount()).toBe(0)
  })
})
