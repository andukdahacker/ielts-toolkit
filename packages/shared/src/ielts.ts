import { z } from 'zod'

export const TASK_TYPES = ['task1_academic', 'task1_general', 'task2'] as const
export const taskTypeSchema = z.enum(TASK_TYPES)
export type TaskType = z.infer<typeof taskTypeSchema>

export const CRITERIA_LIST = [
  'taskAchievement',
  'coherenceAndCohesion',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
] as const

export const criteriaSchema = z.enum(CRITERIA_LIST)
export type Criteria = z.infer<typeof criteriaSchema>

const bandScoreValue = z.number().min(0).max(9).multipleOf(0.5)

export const BAND_RANGE = Array.from({ length: 19 }, (_, i) => i * 0.5)

export const bandScoresSchema = z.object({
  overall: bandScoreValue,
  taskAchievement: bandScoreValue,
  coherenceAndCohesion: bandScoreValue,
  lexicalResource: bandScoreValue,
  grammaticalRangeAndAccuracy: bandScoreValue,
})
export type BandScores = z.infer<typeof bandScoresSchema>
