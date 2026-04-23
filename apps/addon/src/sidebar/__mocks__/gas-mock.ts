interface MockRunner {
  withSuccessHandler(handler: (result: unknown) => void): MockRunner
  withFailureHandler(handler: (error: Error) => void): MockRunner
  checkBackendHealth(): void
  [key: string]: unknown
}

const mockResponses: Record<string, unknown> = {
  checkBackendHealth: { data: { status: 'ok' } },
}

const mockErrors: Record<string, Error> = {
  // Add entries here to simulate failures, e.g.:
  // checkBackendHealth: new Error('Service unavailable'),
}

function createMockRunner(): MockRunner {
  let successHandler: ((result: unknown) => void) | null = null
  let failureHandler: ((error: Error) => void) | null = null

  const runner: MockRunner = {
    withSuccessHandler(handler: (result: unknown) => void) {
      successHandler = handler
      return runner
    },
    withFailureHandler(handler: (error: Error) => void) {
      failureHandler = handler
      return runner
    },
    checkBackendHealth() {
      const error = mockErrors['checkBackendHealth']
      const response = mockResponses['checkBackendHealth']
      setTimeout(() => {
        if (error && failureHandler) {
          failureHandler(error)
        } else if (successHandler) {
          successHandler(response)
        }
      }, 500)
    },
  }

  return runner
}

;(window as any).google = {
  script: {
    run: createMockRunner(),
  },
}

console.log('[gas-mock] google.script.run mocked for local development')
