import { useEffect } from 'preact/hooks'
import {
  gradingJobId,
  feedbackGiven,
  feedbackShowTextInput as showTextInput,
  feedbackText,
  feedbackSubmitted as submitted,
  feedbackSelectedRating as selectedRating,
} from '../state/grading'
import { logGradingEvents } from '../lib/gas'

export function resetFeedbackUI(): void {
  showTextInput.value = false
  feedbackText.value = ''
  submitted.value = false
  selectedRating.value = null
}

function ThankYou() {
  useEffect(() => {
    const timer = setTimeout(() => {
      submitted.value = false
      feedbackGiven.value = true
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div class="block">
      <p class="gray">Thanks for your feedback!</p>
    </div>
  )
}

export function GradingFeedback() {
  if (feedbackGiven.value) return null

  if (submitted.value) {
    return <ThankYou />
  }

  function handleRating(rating: 'positive' | 'negative') {
    const jobId = gradingJobId.value
    if (!jobId) return

    selectedRating.value = rating
    feedbackText.value = ''

    // AC8: one tap = feedback submitted (fire-and-forget)
    logGradingEvents(jobId, [{ eventType: 'feedback', payload: { rating } }]).catch(() => {})
    showTextInput.value = true
  }

  function handleSubmit() {
    const rating = selectedRating.value
    const jobId = gradingJobId.value
    if (!jobId || !rating) return

    if (feedbackText.value.trim()) {
      logGradingEvents(jobId, [{ eventType: 'feedback_comment', payload: { rating, comment: feedbackText.value.trim() } }]).catch(() => {})
    }

    submitted.value = true
    showTextInput.value = false
  }

  return (
    <div class="block">
      {!showTextInput.value ? (
        <div>
          <p class="gray">Was this grading helpful?</p>
          <button
            class="create"
            onClick={() => handleRating('positive')}
            aria-label="Grading was helpful"
          >
            👍
          </button>
          {' '}
          <button
            class="create"
            onClick={() => handleRating('negative')}
            aria-label="Grading was not helpful"
          >
            👎
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Tell us more (optional)"
            value={feedbackText.value}
            onInput={(e) => { feedbackText.value = (e.target as HTMLInputElement).value }}
            aria-label="Additional feedback"
          />
          {' '}
          <button class="create" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
