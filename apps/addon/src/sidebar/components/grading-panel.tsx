import {
  gradingStatus,
  gradingError,
  gradingMessage,
  pollingTimedOut,
  startGrading,
  cancelGrading,
  retryGrading,
  switchToManualEntry,
  dismissTimeout,
} from '../state/grading'

export function GradingPanel() {
  const status = gradingStatus.value

  if (status === 'done') return null

  if (status === 'idle') {
    return (
      <div class="block grading-panel">
        <button
          class="action"
          onClick={startGrading}
          aria-label="Grade with AI"
        >
          Grade with AI
        </button>
      </div>
    )
  }

  if (status === 'submitting') {
    return (
      <div class="block grading-panel" role="status" aria-label="Submitting essay">
        <div class="grading-progress">
          <span class="grading-spinner" aria-hidden="true" />
          <span>{gradingMessage.value}</span>
        </div>
        <button class="share" disabled>
          Grade with AI
        </button>
      </div>
    )
  }

  if (status === 'polling') {
    return (
      <div class="block grading-panel">
        <div class="grading-progress" role="status" aria-label="Grading in progress">
          <span class="grading-spinner" aria-hidden="true" />
          <span>{gradingMessage.value}</span>
        </div>
        {pollingTimedOut.value && (
          <div class="grading-timeout" role="alert">
            <p class="secondary">Taking longer than expected...</p>
            <div class="grading-actions">
              <button class="share" onClick={dismissTimeout} aria-label="Keep waiting for grading">
                Keep waiting
              </button>
              <button class="share" onClick={switchToManualEntry} aria-label="Enter scores manually">
                Enter scores manually
              </button>
            </div>
          </div>
        )}
        <button
          class="share"
          onClick={cancelGrading}
          aria-label="Cancel grading"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div class="block grading-panel" role="alert">
        <p class="error">
          {gradingError.value ?? "Grading couldn't complete."}
        </p>
        <div class="grading-actions">
          <button class="action" onClick={retryGrading} aria-label="Retry grading">
            Retry
          </button>
          <button class="share" onClick={switchToManualEntry} aria-label="Enter scores manually">
            Enter scores manually
          </button>
        </div>
      </div>
    )
  }

  return null
}
