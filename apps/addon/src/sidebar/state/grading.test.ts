import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

vi.mock('../lib/gas', () => ({
  submitGrade: vi.fn(),
  pollGradingStatus: vi.fn(),
  getActiveGradingJob: vi.fn(),
  getEssayText: vi.fn(),
  logScoreOverrides: vi.fn(),
  saveScoresToSheet: vi.fn(),
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  insertDocComments: vi.fn(),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn(),
}))

import {
  gradingStatus,
  gradingJobId,
  gradingError,
  gradingMessage,
  pollingTimedOut,
  aiScores,
  aiComments,
  selectedTaskType,
  startGrading,
  cancelGrading,
  retryGrading,
  retryCommentInsertion,
  switchToManualEntry,
  dismissTimeout,
  checkActiveJob,
  getScoreOverrides,
  resetGrading,
  commentInsertionProgress,
  commentInsertionResult,
  insertedCommentIds,
  commentStatusMessage,
  feedbackExpanded,
} from './grading'
import { currentScores, savedScores, resetScores } from './scores'
import { selectedStudent } from './students'
import { submitGrade, getEssayText, getActiveGradingJob, insertDocComments } from '../lib/gas'
import { startPolling } from '../lib/polling'

const mockSubmitGrade = vi.mocked(submitGrade)
const mockGetEssayText = vi.mocked(getEssayText)
const mockGetActiveGradingJob = vi.mocked(getActiveGradingJob)
const mockStartPolling = vi.mocked(startPolling)
const mockInsertDocComments = vi.mocked(insertDocComments)

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-uuid-1234' },
})

function resetState(): void {
  resetGrading()
  resetScores()
  selectedStudent.value = 'Minh'
  selectedTaskType.value = 'task2'
}

describe('grading state', () => {
  beforeEach(() => {
    resetState()
    vi.clearAllMocks()
    mockStartPolling.mockReturnValue({ cancel: vi.fn() })
  })

  describe('startGrading', () => {
    it('transitions idle → submitting → polling on success', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text here...')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-123' } })

      await startGrading()

      expect(gradingStatus.value).toBe('polling')
      expect(gradingJobId.value).toBe('job-123')
      expect(mockSubmitGrade).toHaveBeenCalledWith(
        'Essay text here...',
        'task2',
        'Minh',
        'test-uuid-1234',
      )
    })

    it('transitions to error on submit failure', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockRejectedValueOnce(new Error('API error: 500'))

      await startGrading()

      expect(gradingStatus.value).toBe('error')
      expect(gradingError.value).toBe('API error: 500')
    })

    it('shows network-specific error message for connectivity failures', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockRejectedValueOnce(new Error('Address unavailable'))

      await startGrading()

      expect(gradingStatus.value).toBe('error')
      expect(gradingError.value).toBe("Can't connect to grading service. Manual score entry is available.")
    })

    it('transitions to error on getEssayText failure', async () => {
      mockGetEssayText.mockRejectedValueOnce(new Error('No active document'))

      await startGrading()

      expect(gradingStatus.value).toBe('error')
      expect(gradingError.value).toBe('No active document')
    })

    it('does nothing when no student selected', async () => {
      selectedStudent.value = null

      await startGrading()

      expect(gradingStatus.value).toBe('idle')
      expect(mockGetEssayText).not.toHaveBeenCalled()
    })

    it('does nothing when already submitting', async () => {
      gradingStatus.value = 'submitting'

      await startGrading()

      expect(mockGetEssayText).not.toHaveBeenCalled()
    })

    it('does nothing when already polling', async () => {
      gradingStatus.value = 'polling'

      await startGrading()

      expect(mockGetEssayText).not.toHaveBeenCalled()
    })

    it('starts polling with correct options after submit', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-456' } })

      await startGrading()

      expect(mockStartPolling).toHaveBeenCalledOnce()
      const [pollFn, onResult, options] = mockStartPolling.mock.calls[0]
      expect(typeof pollFn).toBe('function')
      expect(typeof onResult).toBe('function')
      expect(options).toEqual({
        interval: 4000,
        maxDuration: 45000,
        onTimeout: expect.any(Function),
      })
    })
  })

  describe('polling callbacks', () => {
    it('sets done and populates scores on completed result', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-789' } })
      mockInsertDocComments.mockResolvedValueOnce({
        inserted: 1, anchored: 1, general: 0, failed: 0, appended: false, commentIds: ['c1'],
      })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      const result = {
        data: {
          status: 'completed' as const,
          result: {
            bandScores: {
              overall: 7.0,
              taskAchievement: 6.5,
              coherenceAndCohesion: 7.0,
              lexicalResource: 7.5,
              grammaticalRangeAndAccuracy: 6.0,
            },
            comments: [{ text: 'Good essay', anchorText: 'introduction', category: 'TA' }],
          },
        },
      }

      const shouldStop = onResult(result)
      // onGradingComplete is async, need to wait
      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })

      expect(shouldStop).toBe(true)
      expect(currentScores.value.overall).toBe(7.0)
      expect(savedScores.value.overall).toBe(7.0)
      expect(aiScores.value?.overall).toBe(7.0)
      expect(aiComments.value).toHaveLength(1)
    })

    it('sets error on failed result', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-fail' } })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      const shouldStop = onResult({
        data: {
          status: 'failed' as const,
          error: { message: 'AI service unavailable' },
        },
      })

      expect(shouldStop).toBe(true)
      expect(gradingStatus.value).toBe('error')
      expect(gradingError.value).toBe('AI service unavailable')
    })

    it('continues polling on processing status', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-proc' } })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      const shouldStop = onResult({
        data: { status: 'processing' as const },
      })

      expect(shouldStop).toBe(false)
      expect(gradingStatus.value).toBe('polling')
    })

    it('rotates progress messages on each poll', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-msg' } })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]

      onResult({ data: { status: 'processing' as const } })
      const msg1 = gradingMessage.value

      onResult({ data: { status: 'processing' as const } })
      const msg2 = gradingMessage.value

      expect(msg1).not.toBe(msg2)
    })

    it('fires pollingTimedOut on timeout callback', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-to' } })

      await startGrading()

      expect(pollingTimedOut.value).toBe(false)

      const options = mockStartPolling.mock.calls[0][2]
      options!.onTimeout!()

      expect(pollingTimedOut.value).toBe(true)
    })
  })

  describe('cancelGrading', () => {
    it('resets all grading state to idle', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-cancel' } })
      const mockCancel = vi.fn()
      mockStartPolling.mockReturnValueOnce({ cancel: mockCancel })

      await startGrading()

      cancelGrading()

      expect(mockCancel).toHaveBeenCalledOnce()
      expect(gradingStatus.value).toBe('idle')
      expect(gradingJobId.value).toBeNull()
      expect(gradingError.value).toBeNull()
      expect(gradingMessage.value).toBe('')
      expect(pollingTimedOut.value).toBe(false)
    })
  })

  describe('retryGrading', () => {
    it('resets error state and restarts grading', async () => {
      gradingStatus.value = 'error'
      gradingError.value = 'Previous error'

      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-retry' } })

      await retryGrading()

      expect(gradingError.value).toBeNull()
      expect(mockGetEssayText).toHaveBeenCalled()
    })
  })

  describe('switchToManualEntry', () => {
    it('resets to idle without scores', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-manual' } })
      const mockCancel = vi.fn()
      mockStartPolling.mockReturnValueOnce({ cancel: mockCancel })

      await startGrading()

      switchToManualEntry()

      expect(mockCancel).toHaveBeenCalledOnce()
      expect(gradingStatus.value).toBe('idle')
      expect(gradingJobId.value).toBeNull()
    })
  })

  describe('dismissTimeout', () => {
    it('clears pollingTimedOut without stopping polling', () => {
      pollingTimedOut.value = true
      gradingStatus.value = 'polling'

      dismissTimeout()

      expect(pollingTimedOut.value).toBe(false)
      expect(gradingStatus.value).toBe('polling')
    })
  })

  describe('checkActiveJob', () => {
    it('does nothing when no active job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({ data: null })

      await checkActiveJob()

      expect(gradingStatus.value).toBe('idle')
    })

    it('resumes polling for pending job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: { jobId: 'active-job', status: 'pending' },
      })

      await checkActiveJob()

      expect(gradingJobId.value).toBe('active-job')
      expect(gradingStatus.value).toBe('polling')
      expect(mockStartPolling).toHaveBeenCalledOnce()
    })

    it('resumes polling for processing job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: { jobId: 'active-job', status: 'processing' },
      })

      await checkActiveJob()

      expect(gradingStatus.value).toBe('polling')
    })

    it('populates scores for completed job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: {
          jobId: 'completed-job',
          status: 'completed',
          result: {
            bandScores: {
              overall: 8.0,
              taskAchievement: 7.5,
              coherenceAndCohesion: 8.0,
              lexicalResource: 8.0,
              grammaticalRangeAndAccuracy: 7.5,
            },
            comments: [],
          },
        },
      })

      await checkActiveJob()

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })
      expect(currentScores.value.overall).toBe(8.0)
      expect(aiScores.value?.overall).toBe(8.0)
    })

    it('shows error for failed job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: {
          jobId: 'failed-job',
          status: 'failed',
          error: { code: 'GRADING_FAILED', message: 'Grading failed' },
        },
      })

      await checkActiveJob()

      expect(gradingStatus.value).toBe('error')
      expect(gradingError.value).toBe('Grading failed')
    })

    it('does nothing when no student selected', async () => {
      selectedStudent.value = null
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: { jobId: 'orphan-job', status: 'processing' },
      })

      await checkActiveJob()

      expect(gradingStatus.value).toBe('idle')
    })

    it('discards job when student name does not match selected student', async () => {
      selectedStudent.value = 'Minh'
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: { jobId: 'other-student-job', status: 'processing', studentName: 'Linh' },
      })

      await checkActiveJob()

      expect(gradingStatus.value).toBe('idle')
      expect(gradingJobId.value).toBeNull()
    })

    it('resumes job when student name matches selected student', async () => {
      selectedStudent.value = 'Minh'
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: { jobId: 'matching-job', status: 'processing', studentName: 'Minh' },
      })

      await checkActiveJob()

      expect(gradingJobId.value).toBe('matching-job')
      expect(gradingStatus.value).toBe('polling')
    })

    it('silently handles API errors', async () => {
      mockGetActiveGradingJob.mockRejectedValueOnce(new Error('Network error'))

      await checkActiveJob()

      expect(gradingStatus.value).toBe('idle')
    })
  })

  describe('getScoreOverrides', () => {
    it('returns empty array when no AI scores', async () => {
      const overrides = await getScoreOverrides()
      expect(overrides).toEqual([])
    })

    it('detects score changes from AI originals', async () => {
      aiScores.value = {
        overall: 7.0,
        taskAchievement: 6.5,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.0,
      }
      currentScores.value = {
        overall: 7.0,
        taskAchievement: 7.0,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.5,
      }

      const overrides = await getScoreOverrides()

      expect(overrides).toEqual([
        { criterion: 'taskAchievement', before: 6.5, after: 7.0 },
        { criterion: 'grammaticalRangeAndAccuracy', before: 6.0, after: 6.5 },
      ])
    })

    it('returns empty array when scores unchanged', async () => {
      const scores = {
        overall: 7.0,
        taskAchievement: 6.5,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.0,
      }
      aiScores.value = { ...scores }
      currentScores.value = { ...scores }

      const overrides = await getScoreOverrides()

      expect(overrides).toEqual([])
    })
  })

  describe('comment insertion flow', () => {
    const commentsResult = {
      bandScores: {
        overall: 7.0,
        taskAchievement: 6.5,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.0,
      },
      comments: [
        { text: 'Good intro', anchorText: 'introduction paragraph', category: 'TA' },
        { text: 'Improve linking', anchorText: 'however the', category: 'CC' },
      ],
    }

    const emptyCommentsResult = {
      bandScores: {
        overall: 7.0,
        taskAchievement: 6.5,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.0,
      },
      comments: [],
    }

    it('transitions to inserting-comments when comments are non-empty', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-c1' } })
      mockInsertDocComments.mockResolvedValueOnce({
        inserted: 2, anchored: 2, general: 0, failed: 0, appended: false, commentIds: ['c1', 'c2'],
      })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      onResult({ data: { status: 'completed' as const, result: commentsResult } })

      await vi.waitFor(() => {
        expect(mockInsertDocComments).toHaveBeenCalledWith(commentsResult.comments)
      })

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })
      expect(insertedCommentIds.value).toEqual(['c1', 'c2'])
    })

    it('skips inserting-comments when comments are empty', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-c2' } })

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      onResult({ data: { status: 'completed' as const, result: emptyCommentsResult } })

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })
      expect(mockInsertDocComments).not.toHaveBeenCalled()
    })

    it('transitions to error when comment insertion fails', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-c3' } })
      mockInsertDocComments.mockRejectedValueOnce(new Error('Drive API error'))

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      onResult({ data: { status: 'completed' as const, result: commentsResult } })

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('error')
      })
      expect(gradingError.value).toBe('Drive API error')
    })

    it('stores commentInsertionResult on success', async () => {
      mockGetEssayText.mockResolvedValueOnce('Essay text')
      mockSubmitGrade.mockResolvedValueOnce({ data: { jobId: 'job-c4' } })
      const insertResult = {
        inserted: 3, anchored: 2, general: 1, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3'],
      }
      mockInsertDocComments.mockResolvedValueOnce(insertResult)

      await startGrading()

      const onResult = mockStartPolling.mock.calls[0][1]
      onResult({ data: { status: 'completed' as const, result: commentsResult } })

      await vi.waitFor(() => {
        expect(commentInsertionResult.value).toEqual(insertResult)
      })
    })

    it('does nothing when already inserting comments', async () => {
      gradingStatus.value = 'inserting-comments'

      await startGrading()

      expect(mockGetEssayText).not.toHaveBeenCalled()
    })
  })

  describe('commentStatusMessage', () => {
    it('returns empty string when no result', () => {
      commentInsertionResult.value = null
      expect(commentStatusMessage.value).toBe('')
    })

    it('returns empty string when all comments anchored (clean success)', () => {
      commentInsertionResult.value = {
        inserted: 5, anchored: 5, general: 0, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      }
      expect(commentStatusMessage.value).toBe('')
    })

    it('returns partial anchor message', () => {
      commentInsertionResult.value = {
        inserted: 5, anchored: 4, general: 1, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      }
      expect(commentStatusMessage.value).toBe('4 comments anchored to text, 1 added as general feedback')
    })

    it('returns appended fallback message', () => {
      commentInsertionResult.value = {
        inserted: 0, anchored: 0, general: 0, failed: 3, appended: true, commentIds: [],
      }
      expect(commentStatusMessage.value).toBe('Comments added as a feedback section at the end of the document')
    })

    it('returns failed count message when some comments failed', () => {
      commentInsertionResult.value = {
        inserted: 3, anchored: 3, general: 0, failed: 2, appended: false, commentIds: ['c1', 'c2', 'c3'],
      }
      expect(commentStatusMessage.value).toBe("2 comments couldn't be inserted")
    })

    it('returns combined partial anchor and failed message', () => {
      commentInsertionResult.value = {
        inserted: 4, anchored: 3, general: 1, failed: 1, appended: false, commentIds: ['c1', 'c2', 'c3', 'c4'],
      }
      expect(commentStatusMessage.value).toBe("3 comments anchored to text, 1 added as general feedback. 1 comment couldn't be inserted")
    })
  })

  describe('resetGrading', () => {
    it('clears all grading state', () => {
      gradingStatus.value = 'done'
      gradingJobId.value = 'some-job'
      gradingError.value = 'some error'
      gradingMessage.value = 'some message'
      pollingTimedOut.value = true
      aiScores.value = {
        overall: 7.0,
        taskAchievement: 6.5,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.5,
        grammaticalRangeAndAccuracy: 6.0,
      }
      commentInsertionProgress.value = 'Inserting...'
      commentInsertionResult.value = { inserted: 1, anchored: 1, general: 0, failed: 0, appended: false, commentIds: ['c1'] }
      insertedCommentIds.value = ['c1']
      feedbackExpanded.value = false

      resetGrading()

      expect(gradingStatus.value).toBe('idle')
      expect(gradingJobId.value).toBeNull()
      expect(gradingError.value).toBeNull()
      expect(gradingMessage.value).toBe('')
      expect(pollingTimedOut.value).toBe(false)
      expect(aiScores.value).toBeNull()
      expect(aiComments.value).toBeNull()
      expect(commentInsertionProgress.value).toBe('')
      expect(commentInsertionResult.value).toBeNull()
      expect(insertedCommentIds.value).toEqual([])
      expect(feedbackExpanded.value).toBe(true)
    })
  })

  describe('retryCommentInsertion', () => {
    it('retries comment insertion without re-grading', async () => {
      aiComments.value = [
        { text: 'Good intro', anchorText: 'introduction', category: 'TA' },
      ]
      gradingStatus.value = 'error'
      gradingError.value = 'Drive API error'
      mockInsertDocComments.mockResolvedValueOnce({
        inserted: 1, anchored: 1, general: 0, failed: 0, appended: false, commentIds: ['c1'],
      })

      await retryCommentInsertion()

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })
      expect(gradingError.value).toBeNull()
      expect(mockGetEssayText).not.toHaveBeenCalled()
      expect(mockSubmitGrade).not.toHaveBeenCalled()
    })

    it('does nothing when no comments available', async () => {
      aiComments.value = null

      await retryCommentInsertion()

      expect(mockInsertDocComments).not.toHaveBeenCalled()
    })
  })

  describe('checkActiveJob skips comment insertion', () => {
    it('does not re-insert comments for completed resumed job', async () => {
      mockGetActiveGradingJob.mockResolvedValueOnce({
        data: {
          jobId: 'resumed-job',
          status: 'completed',
          result: {
            bandScores: {
              overall: 7.0,
              taskAchievement: 6.5,
              coherenceAndCohesion: 7.0,
              lexicalResource: 7.5,
              grammaticalRangeAndAccuracy: 6.0,
            },
            comments: [{ text: 'Good', anchorText: 'intro', category: 'TA' }],
          },
        },
      })

      await checkActiveJob()

      await vi.waitFor(() => {
        expect(gradingStatus.value).toBe('done')
      })
      expect(mockInsertDocComments).not.toHaveBeenCalled()
    })
  })
})
