import { describe, it, expect, beforeEach } from 'vitest'
import { currentScores, savedScores, hasUnsavedChanges, saveStatus, resetScores, discardChanges } from './scores'

describe('scores state', () => {
  beforeEach(() => {
    resetScores()
  })

  describe('hasUnsavedChanges', () => {
    it('returns false when both scores are empty defaults', () => {
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('returns true when currentScores differ from savedScores', () => {
      currentScores.value = { ...currentScores.value, taskAchievement: 7.0 }
      expect(hasUnsavedChanges.value).toBe(true)
    })

    it('returns false when currentScores match savedScores', () => {
      currentScores.value = { ...currentScores.value, taskAchievement: 7.0 }
      savedScores.value = { ...savedScores.value, taskAchievement: 7.0 }
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('detects changes across multiple keys', () => {
      currentScores.value = {
        overall: 6.5,
        taskAchievement: 7.0,
        coherenceAndCohesion: null,
        lexicalResource: null,
        grammaticalRangeAndAccuracy: null,
      }
      expect(hasUnsavedChanges.value).toBe(true)
    })
  })

  describe('resetScores', () => {
    it('clears both currentScores and savedScores to empty', () => {
      currentScores.value = { ...currentScores.value, overall: 8.0 }
      savedScores.value = { ...savedScores.value, overall: 7.0 }
      saveStatus.value = 'saved'

      resetScores()

      expect(currentScores.value.overall).toBeNull()
      expect(savedScores.value.overall).toBeNull()
      expect(saveStatus.value).toBe('idle')
    })
  })

  describe('discardChanges', () => {
    it('resets currentScores to savedScores values', () => {
      savedScores.value = { ...savedScores.value, taskAchievement: 6.5 }
      currentScores.value = { ...currentScores.value, taskAchievement: 8.0 }

      discardChanges()

      expect(currentScores.value.taskAchievement).toBe(6.5)
      expect(hasUnsavedChanges.value).toBe(false)
    })
  })
})
