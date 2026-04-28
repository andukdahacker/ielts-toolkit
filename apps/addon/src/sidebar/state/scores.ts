import { signal, computed } from '@preact/signals'
import { type BandScores, BAND_RANGE, CRITERIA_LIST } from '@ielts-toolkit/shared'
import { saveScoresToSheet, logScoreOverrides } from '../lib/gas'
import { selectedTaskType, savedTaskType } from './grading'

type ScoreMap = Record<keyof BandScores, number | null>

export const SCORE_KEYS: (keyof BandScores)[] = [...CRITERIA_LIST, 'overall']

const EMPTY_SCORES: ScoreMap = {
  overall: null,
  taskAchievement: null,
  coherenceAndCohesion: null,
  lexicalResource: null,
  grammaticalRangeAndAccuracy: null,
}

export const currentScores = signal<ScoreMap>({ ...EMPTY_SCORES })
export const savedScores = signal<ScoreMap>({ ...EMPTY_SCORES })

export const saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle')
export const saveError = signal<string | null>(null)
export const saveConfirmStudent = signal<string | null>(null)

function isValidBandScore(value: number): boolean {
  return BAND_RANGE.includes(value)
}

export function updateScore(key: keyof BandScores, value: number | null): void {
  if (value !== null && !isValidBandScore(value)) return
  currentScores.value = { ...currentScores.value, [key]: value }
  if (saveStatus.value === 'saved' || saveStatus.value === 'error') {
    saveStatus.value = 'idle'
  }
}

export const validationErrors = computed<Record<keyof BandScores, string | null>>(() => {
  const current = currentScores.value
  const errors = {} as Record<keyof BandScores, string | null>
  for (const key of SCORE_KEYS) {
    const val = current[key]
    if (val !== null && !isValidBandScore(val)) {
      errors[key] = 'Must be 0.0\u20139.0 in 0.5 steps'
    } else {
      errors[key] = null
    }
  }
  return errors
})

export const canSave = computed(() => {
  const current = currentScores.value
  const allFilled = SCORE_KEYS.every(key => current[key] !== null)
  const noErrors = SCORE_KEYS.every(key => validationErrors.value[key] === null)
  return allFilled && noErrors && saveStatus.value !== 'saving'
})

export const hasUnsavedChanges = computed(() => {
  const current = currentScores.value
  const saved = savedScores.value
  const scoresChanged = SCORE_KEYS.some(key => current[key] !== saved[key])
  const taskTypeChanged = selectedTaskType.value !== savedTaskType.value
  return scoresChanged || taskTypeChanged
})

export async function saveScores(): Promise<void> {
  // Guard: prevent concurrent saves and incomplete score submission
  if (saveStatus.value === 'saving') return
  if (!canSave.value) return

  // Import selectedStudent lazily to avoid circular dep (students.ts imports scores.ts)
  const { selectedStudent } = await import('./students')

  const student = selectedStudent.value
  const taskType = selectedTaskType.value
  if (!student) return

  saveStatus.value = 'saving'
  saveError.value = null

  const scores: BandScores = {
    overall: currentScores.value.overall ?? 0,
    taskAchievement: currentScores.value.taskAchievement ?? 0,
    coherenceAndCohesion: currentScores.value.coherenceAndCohesion ?? 0,
    lexicalResource: currentScores.value.lexicalResource ?? 0,
    grammaticalRangeAndAccuracy: currentScores.value.grammaticalRangeAndAccuracy ?? 0,
  }

  try {
    await saveScoresToSheet(student, scores, taskType)
    savedScores.value = { ...currentScores.value }
    savedTaskType.value = taskType
    saveConfirmStudent.value = student
    saveStatus.value = 'saved'
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save scores'
    saveStatus.value = 'error'
    return
  }

  // Fire-and-forget: log score overrides if AI grading was used (outside try/catch so failures don't affect save status)
  try {
    const { gradingJobId, getScoreOverrides } = await import('./grading')
    const jobId = gradingJobId.value
    if (jobId) {
      const overrides = await getScoreOverrides()
      if (overrides.length > 0) {
        logScoreOverrides(jobId, overrides).catch(() => {})
      }
    }
  } catch {
    // Override logging is best-effort — never affect save status
  }
}

export function dismissConfirmation(): void {
  saveStatus.value = 'idle'
  saveConfirmStudent.value = null
}

export function resetScores(): void {
  currentScores.value = { ...EMPTY_SCORES }
  savedScores.value = { ...EMPTY_SCORES }
  saveStatus.value = 'idle'
  saveError.value = null
  saveConfirmStudent.value = null
  selectedTaskType.value = 'task2'
  savedTaskType.value = 'task2'
}

export function discardChanges(): void {
  currentScores.value = { ...savedScores.value }
  selectedTaskType.value = savedTaskType.value
}
