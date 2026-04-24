import { useEffect, useRef } from 'preact/hooks'
import { canSave, saveStatus, saveError, saveConfirmStudent, saveScores, dismissConfirmation } from '../state/scores'

export function SaveButton() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveStatus.value === 'saved') {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(dismissConfirmation, 3000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [saveStatus.value])

  const isSaving = saveStatus.value === 'saving'

  return (
    <div class="block">
      <button
        class="action"
        onClick={saveScores}
        disabled={!canSave.value || isSaving}
        aria-label={!canSave.value ? 'Enter all scores before saving' : 'Save to Sheet'}
      >
        {isSaving ? 'Saving...' : 'Save to Sheet'}
      </button>

      {saveStatus.value === 'saved' && saveConfirmStudent.value && (
        <p class="save-confirmation" role="status">
          ✓ Scores saved for {saveConfirmStudent.value}
        </p>
      )}

      {saveStatus.value === 'error' && (
        <div class="save-error">
          <p class="error">Scores couldn't be saved to your Sheet.</p>
          <button class="retry-link" onClick={saveScores}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
