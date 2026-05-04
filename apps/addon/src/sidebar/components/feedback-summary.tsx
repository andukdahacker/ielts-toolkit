import { aiComments, commentStatusMessage, feedbackExpanded } from '../state/grading'

function toggleExpanded() {
  feedbackExpanded.value = !feedbackExpanded.value
}

const CATEGORY_LABELS: Record<string, string> = {
  TA: 'Task Achievement',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammatical Range & Accuracy',
}

export function FeedbackSummary() {
  const comments = aiComments.value
  if (!comments || comments.length === 0) return null

  const statusMsg = commentStatusMessage.value

  return (
    <div class="block">
      <div
        class="feedback-summary-header"
        role="button"
        tabIndex={0}
        aria-expanded={feedbackExpanded.value}
        aria-label="Toggle AI feedback summary"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleExpanded()
          }
        }}
      >
        <span class="feedback-summary-toggle" aria-hidden="true">
          {feedbackExpanded.value ? '▾' : '▸'}
        </span>
        <strong>AI Feedback Summary</strong>
        <span class="secondary"> ({comments.length})</span>
      </div>
      {feedbackExpanded.value && (
        <div class="feedback-summary-body">
          {statusMsg && (
            <p class="secondary feedback-status-message">{statusMsg}</p>
          )}
          <ul class="feedback-list">
            {comments.map((comment, i) => (
              <li key={i} class="feedback-item">
                <span class="feedback-category">
                  {CATEGORY_LABELS[comment.category] ?? comment.category}
                </span>
                <p class="feedback-text">{comment.text}</p>
                {comment.anchorText && (
                  <p class="secondary feedback-anchor">
                    &ldquo;{comment.anchorText}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
