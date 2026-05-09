function submitGrade(essayText: string, taskType: string, studentName: string, idempotencyKey: string): unknown {
  return callApi('POST', '/grade', { essayText, taskType, studentName }, true, { 'X-Idempotency-Key': idempotencyKey })
}

function pollGradingStatus(jobId: string): unknown {
  return callApi('GET', `/grade/${jobId}/status`)
}

function getActiveGradingJob(): unknown {
  return callApi('GET', '/grade/active')
}

function logScoreOverrides(jobId: string, overrides: Array<{ criterion: string; before: number; after: number }>): unknown {
  return callApi('POST', `/grade/${jobId}/events`, { eventType: 'score_overridden', payload: { overrides } })
}

function logGradingEvents(jobId: string, events: Array<{ eventType: string; payload?: Record<string, unknown> }>): void {
  for (const event of events) {
    try {
      callApi('POST', `/grade/${jobId}/events`, { eventType: event.eventType, payload: event.payload })
    } catch (_e) {
      // Best-effort logging — don't block the caller
    }
  }
}
