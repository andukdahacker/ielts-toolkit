export interface PollingOptions {
  interval?: number
  maxDuration?: number
  onTimeout?: () => void
}

export function startPolling<T>(
  pollFn: () => Promise<T>,
  onResult: (result: T) => boolean,
  options?: PollingOptions,
): { cancel: () => void } {
  const interval = options?.interval ?? 4000
  const maxDuration = options?.maxDuration ?? 45000

  let cancelled = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pollTimeoutId: ReturnType<typeof setTimeout> | null = null
  let timeoutFired = false

  function cleanup(): void {
    cancelled = true
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (pollTimeoutId !== null) {
      clearTimeout(pollTimeoutId)
      pollTimeoutId = null
    }
  }

  async function poll(): Promise<void> {
    if (cancelled) return
    try {
      const result = await pollFn()
      if (cancelled) return
      const shouldStop = onResult(result)
      if (shouldStop) {
        cleanup()
        return
      }
    } catch {
      if (cancelled) return
    }
    if (!cancelled) {
      pollTimeoutId = setTimeout(poll, interval)
    }
  }

  if (maxDuration > 0 && options?.onTimeout) {
    timeoutId = setTimeout(() => {
      if (!cancelled && !timeoutFired) {
        timeoutFired = true
        options.onTimeout!()
      }
    }, maxDuration)
  }

  poll()

  return { cancel: cleanup }
}
