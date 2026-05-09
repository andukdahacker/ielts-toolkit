import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/gas', () => ({
  submitGrade: vi.fn().mockResolvedValue({ data: { jobId: 'test-job-id' } }),
  pollGradingStatus: vi.fn().mockResolvedValue({ data: { status: 'completed', result: { bandScores: { overall: 6.5, taskAchievement: 6.0, coherenceAndCohesion: 6.5, lexicalResource: 7.0, grammaticalRangeAndAccuracy: 6.0 }, comments: [] } } }),
  getActiveGradingJob: vi.fn().mockResolvedValue({ data: null }),
  getEssayText: vi.fn().mockResolvedValue('Test essay text'),
  insertDocComments: vi.fn().mockResolvedValue({ inserted: 0, anchored: 0, general: 0, failed: 0, appended: false, commentIds: [] }),
  deleteDocComments: vi.fn().mockResolvedValue({ deleted: 3, notFound: 0 }),
  logGradingEvents: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn((_pollFn, _onResult, _opts) => {
    return { cancel: vi.fn() }
  }),
}))

vi.mock('./students', () => ({
  selectedStudent: { value: 'Test Student' },
}))

vi.mock('./scores', () => ({
  currentScores: { value: null },
  savedScores: { value: null },
}))

import {
  showRegradeConfirm,
  feedbackGiven,
  feedbackShowTextInput,
  feedbackText,
  feedbackSubmitted,
  feedbackSelectedRating,
  insertedCommentIds,
  gradingJobId,
  gradingStatus,
  requestRegrade,
  cancelRegrade,
  confirmRegrade,
  resetGrading,
} from './grading'

import { deleteDocComments, logGradingEvents } from '../lib/gas'

describe('re-grade flow', () => {
  beforeEach(() => {
    resetGrading()
    vi.clearAllMocks()
  })

  it('requestRegrade shows confirmation dialog', () => {
    requestRegrade()
    expect(showRegradeConfirm.value).toBe(true)
  })

  it('cancelRegrade hides confirmation dialog', () => {
    showRegradeConfirm.value = true
    cancelRegrade()
    expect(showRegradeConfirm.value).toBe(false)
  })

  it('confirmRegrade(true) deletes comments and logs event', async () => {
    insertedCommentIds.value = ['c1', 'c2', 'c3']
    gradingJobId.value = 'old-job-id'
    showRegradeConfirm.value = true

    await confirmRegrade(true)

    expect(deleteDocComments).toHaveBeenCalledWith(['c1', 'c2', 'c3'])
    expect(logGradingEvents).toHaveBeenCalledWith('old-job-id', [{
      eventType: 'regrade_started',
      payload: { clearedComments: true, previousCommentCount: 3 },
    }])
    expect(showRegradeConfirm.value).toBe(false)
    expect(feedbackGiven.value).toBe(false)
  })

  it('confirmRegrade(false) keeps comments and logs event', async () => {
    insertedCommentIds.value = ['c1', 'c2']
    gradingJobId.value = 'old-job-id'
    showRegradeConfirm.value = true

    await confirmRegrade(false)

    expect(deleteDocComments).not.toHaveBeenCalled()
    expect(logGradingEvents).toHaveBeenCalledWith('old-job-id', [{
      eventType: 'regrade_started',
      payload: { clearedComments: false, previousCommentCount: 2 },
    }])
    expect(showRegradeConfirm.value).toBe(false)
  })

  it('confirmRegrade resets feedbackGiven', async () => {
    feedbackGiven.value = true
    gradingJobId.value = 'job-id'

    await confirmRegrade(false)

    expect(feedbackGiven.value).toBe(false)
  })

  it('confirmRegrade is no-op when already submitting', async () => {
    gradingStatus.value = 'submitting'
    gradingJobId.value = 'job-id'

    await confirmRegrade(false)

    expect(logGradingEvents).not.toHaveBeenCalled()
  })

  it('resetGrading clears all re-grade and feedback UI state', () => {
    showRegradeConfirm.value = true
    feedbackGiven.value = true
    insertedCommentIds.value = ['c1']
    feedbackShowTextInput.value = true
    feedbackText.value = 'some text'
    feedbackSubmitted.value = true
    feedbackSelectedRating.value = 'positive'

    resetGrading()

    expect(showRegradeConfirm.value).toBe(false)
    expect(feedbackGiven.value).toBe(false)
    expect(insertedCommentIds.value).toEqual([])
    expect(feedbackShowTextInput.value).toBe(false)
    expect(feedbackText.value).toBe('')
    expect(feedbackSubmitted.value).toBe(false)
    expect(feedbackSelectedRating.value).toBeNull()
  })
})
