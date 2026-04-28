import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
  logScoreOverrides: vi.fn().mockResolvedValue(undefined),
  submitGrade: vi.fn(),
  pollGradingStatus: vi.fn(),
  getActiveGradingJob: vi.fn(),
  getEssayText: vi.fn(),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn().mockReturnValue({ cancel: vi.fn() }),
}))

import {
  currentScores,
  savedScores,
  hasUnsavedChanges,
  saveStatus,
  saveError,
  saveConfirmStudent,
  canSave,
  validationErrors,
  resetScores,
  discardChanges,
  updateScore,
  saveScores,
  SCORE_KEYS,
} from './scores'
import { selectedStudent } from './students'
import { selectedTaskType, savedTaskType } from './grading'
import { saveScoresToSheet } from '../lib/gas'

const mockSaveScoresToSheet = vi.mocked(saveScoresToSheet)

function fillAllScores(value = 6.5): void {
  for (const key of SCORE_KEYS) {
    updateScore(key, value)
  }
}

describe('scores state', () => {
  beforeEach(() => {
    resetScores()
    selectedStudent.value = 'Minh'
    selectedTaskType.value = 'task2'
    vi.clearAllMocks()
  })

  describe('updateScore', () => {
    it('accepts valid values (0, 4.5, 9.0)', () => {
      updateScore('taskAchievement', 0)
      expect(currentScores.value.taskAchievement).toBe(0)

      updateScore('taskAchievement', 4.5)
      expect(currentScores.value.taskAchievement).toBe(4.5)

      updateScore('taskAchievement', 9.0)
      expect(currentScores.value.taskAchievement).toBe(9.0)
    })

    it('rejects invalid values (0.3, 9.5, -1, 10)', () => {
      updateScore('taskAchievement', 0.3)
      expect(currentScores.value.taskAchievement).toBeNull()

      updateScore('taskAchievement', 9.5)
      expect(currentScores.value.taskAchievement).toBeNull()

      updateScore('taskAchievement', -1)
      expect(currentScores.value.taskAchievement).toBeNull()

      updateScore('taskAchievement', 10)
      expect(currentScores.value.taskAchievement).toBeNull()
    })

    it('accepts null to clear a score', () => {
      updateScore('overall', 7.0)
      updateScore('overall', null)
      expect(currentScores.value.overall).toBeNull()
    })

    it('resets saveStatus from saved to idle', () => {
      saveStatus.value = 'saved'
      updateScore('overall', 5.0)
      expect(saveStatus.value).toBe('idle')
    })

    it('resets saveStatus from error to idle', () => {
      saveStatus.value = 'error'
      updateScore('overall', 5.0)
      expect(saveStatus.value).toBe('idle')
    })
  })

  describe('validationErrors', () => {
    it('returns null for all keys when all values are valid or null', () => {
      updateScore('taskAchievement', 7.0)
      for (const key of SCORE_KEYS) {
        expect(validationErrors.value[key]).toBeNull()
      }
    })

    it('returns error message for invalid values', () => {
      // Force an invalid value by directly setting the signal
      currentScores.value = { ...currentScores.value, taskAchievement: 0.3 }
      expect(validationErrors.value.taskAchievement).toBe('Must be 0.0\u20139.0 in 0.5 steps')
    })
  })

  describe('canSave', () => {
    it('returns false when all scores are null', () => {
      expect(canSave.value).toBe(false)
    })

    it('returns false when only some scores are filled', () => {
      updateScore('overall', 7.0)
      updateScore('taskAchievement', 6.5)
      expect(canSave.value).toBe(false)
    })

    it('returns false when there are validation errors', () => {
      fillAllScores(6.5)
      currentScores.value = { ...currentScores.value, taskAchievement: 0.3 }
      expect(canSave.value).toBe(false)
    })

    it('returns true when all five scores are valid', () => {
      fillAllScores(6.5)
      expect(canSave.value).toBe(true)
    })

    it('returns false during saving', () => {
      fillAllScores(6.5)
      saveStatus.value = 'saving'
      expect(canSave.value).toBe(false)
    })
  })

  describe('saveScores', () => {
    it('success path: saveStatus flows idle→saving→saved, savedScores updated', async () => {
      fillAllScores(7.0)
      mockSaveScoresToSheet.mockResolvedValueOnce(undefined)

      await saveScores()

      expect(saveStatus.value).toBe('saved')
      expect(savedScores.value.overall).toBe(7.0)
      expect(saveConfirmStudent.value).toBe('Minh')
      expect(saveError.value).toBeNull()
    })

    it('error path: saveStatus flows idle→saving→error, currentScores preserved, saveError set', async () => {
      fillAllScores(6.0)
      mockSaveScoresToSheet.mockRejectedValueOnce(new Error('Sheet is busy'))

      await saveScores()

      expect(saveStatus.value).toBe('error')
      expect(saveError.value).toBe('Sheet is busy')
      expect(currentScores.value.overall).toBe(6.0)
    })

    it('does nothing when canSave is false (incomplete scores)', async () => {
      updateScore('overall', 7.0)
      // Only one score filled — canSave is false

      await saveScores()

      expect(mockSaveScoresToSheet).not.toHaveBeenCalled()
      expect(saveStatus.value).toBe('idle')
    })

    it('does nothing when already saving (concurrent guard)', async () => {
      fillAllScores(7.0)
      saveStatus.value = 'saving'

      await saveScores()

      expect(mockSaveScoresToSheet).not.toHaveBeenCalled()
    })

    it('does nothing when no student is selected', async () => {
      selectedStudent.value = null
      fillAllScores(6.0)

      await saveScores()

      expect(mockSaveScoresToSheet).not.toHaveBeenCalled()
    })

    it('calls saveScoresToSheet with correct arguments', async () => {
      fillAllScores(7.5)
      selectedTaskType.value = 'task1_academic'
      mockSaveScoresToSheet.mockResolvedValueOnce(undefined)

      await saveScores()

      expect(mockSaveScoresToSheet).toHaveBeenCalledWith(
        'Minh',
        {
          overall: 7.5,
          taskAchievement: 7.5,
          coherenceAndCohesion: 7.5,
          lexicalResource: 7.5,
          grammaticalRangeAndAccuracy: 7.5,
        },
        'task1_academic'
      )
    })
  })

  describe('hasUnsavedChanges', () => {
    it('returns false when both scores are empty defaults', () => {
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('returns true after updateScore', () => {
      updateScore('taskAchievement', 7.0)
      expect(hasUnsavedChanges.value).toBe(true)
    })

    it('returns false after successful save', async () => {
      fillAllScores(6.5)
      mockSaveScoresToSheet.mockResolvedValueOnce(undefined)
      await saveScores()
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('returns false after discardChanges', () => {
      updateScore('overall', 8.0)
      discardChanges()
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('returns true when task type changed', () => {
      selectedTaskType.value = 'task1_academic'
      expect(hasUnsavedChanges.value).toBe(true)
    })

    it('returns false after save updates savedTaskType', async () => {
      fillAllScores(6.5)
      selectedTaskType.value = 'task1_academic'
      mockSaveScoresToSheet.mockResolvedValueOnce(undefined)
      await saveScores()
      expect(savedTaskType.value).toBe('task1_academic')
      expect(hasUnsavedChanges.value).toBe(false)
    })

    it('returns false after discardChanges restores task type', () => {
      selectedTaskType.value = 'task1_general'
      discardChanges()
      expect(selectedTaskType.value).toBe('task2')
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
    it('clears all state including saveError, saveConfirmStudent, and task type', () => {
      fillAllScores(8.0)
      saveStatus.value = 'saved'
      saveError.value = 'some error'
      saveConfirmStudent.value = 'Minh'
      selectedTaskType.value = 'task1_academic'
      savedTaskType.value = 'task1_academic'

      resetScores()

      expect(currentScores.value.overall).toBeNull()
      expect(savedScores.value.overall).toBeNull()
      expect(saveStatus.value).toBe('idle')
      expect(saveError.value).toBeNull()
      expect(saveConfirmStudent.value).toBeNull()
      expect(selectedTaskType.value).toBe('task2')
      expect(savedTaskType.value).toBe('task2')
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
