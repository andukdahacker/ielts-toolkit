import { signal, computed } from '@preact/signals'

type ScoreKey = 'overall' | 'taskAchievement' | 'coherenceAndCohesion' | 'lexicalResource' | 'grammaticalRangeAndAccuracy'
type ScoreMap = Record<ScoreKey, number | null>

const SCORE_KEYS: ScoreKey[] = ['overall', 'taskAchievement', 'coherenceAndCohesion', 'lexicalResource', 'grammaticalRangeAndAccuracy']

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

export const hasUnsavedChanges = computed(() => {
  const current = currentScores.value
  const saved = savedScores.value
  return SCORE_KEYS.some(key => current[key] !== saved[key])
})

export function resetScores(): void {
  currentScores.value = { ...EMPTY_SCORES }
  savedScores.value = { ...EMPTY_SCORES }
  saveStatus.value = 'idle'
}

export function discardChanges(): void {
  currentScores.value = { ...savedScores.value }
}
