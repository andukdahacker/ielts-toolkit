type GasRunner = typeof google.script.run

function callGas<T>(fn: (runner: GasRunner) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler((result: T) => resolve(result))
      .withFailureHandler((error: Error) => reject(error))
    fn(runner)
  })
}

export function checkBackendHealth() {
  return callGas<{ data: { status: string } }>((r) => r.checkBackendHealth())
}
