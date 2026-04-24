import { CRITERIA_LIST } from '@ielts-toolkit/shared'
import { currentScores, validationErrors, hasUnsavedChanges, updateScore, SCORE_KEYS } from '../state/scores'

type ScoreKey = (typeof SCORE_KEYS)[number]

const LABELS: Record<ScoreKey, string> = {
  taskAchievement: 'Task Achievement',
  coherenceAndCohesion: 'Coherence & Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRangeAndAccuracy: 'Grammatical Range & Accuracy',
  overall: 'Overall',
}

function ScoreRow({ scoreKey }: { scoreKey: ScoreKey }) {
  const value = currentScores.value[scoreKey]
  const error = validationErrors.value[scoreKey]
  const isOverall = scoreKey === 'overall'

  function increment() {
    if (value === null) {
      updateScore(scoreKey, 0)
    } else if (value < 9) {
      updateScore(scoreKey, value + 0.5)
    }
  }

  function decrement() {
    if (value === null) {
      updateScore(scoreKey, 9)
    } else if (value > 0) {
      updateScore(scoreKey, value - 0.5)
    }
  }

  return (
    <div class={`score-row form-group${isOverall ? ' score-row--overall' : ''}`}>
      <label>{LABELS[scoreKey]}</label>
      <div class="score-stepper">
        <button
          type="button"
          onClick={decrement}
          disabled={value === 0}
          aria-label={`Decrease ${LABELS[scoreKey]}`}
          tabIndex={0}
        >
          −
        </button>
        <span class="score-value" aria-live="polite">
          {value !== null ? value.toFixed(1) : '—'}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={value === 9}
          aria-label={`Increase ${LABELS[scoreKey]}`}
          tabIndex={0}
        >
          +
        </button>
      </div>
      {error && <span class="error">{error}</span>}
    </div>
  )
}

export function ScoreEditor() {
  return (
    <div class="score-editor">
      {hasUnsavedChanges.value && (
        <span class="secondary score-dirty-indicator">● Unsaved changes</span>
      )}
      {CRITERIA_LIST.map((key) => (
        <ScoreRow key={key} scoreKey={key} />
      ))}
      <ScoreRow scoreKey="overall" />
    </div>
  )
}
