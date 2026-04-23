declare namespace google {
  namespace script {
    interface RunnerWithHandlers {
      withSuccessHandler<T>(handler: (result: T) => void): RunnerWithHandlers
      withFailureHandler(handler: (error: Error) => void): RunnerWithHandlers
      checkBackendHealth(): void
      [key: string]: unknown
    }
    const run: RunnerWithHandlers
  }
}
