import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  submitGrade: vi.fn(),
  pollGradingStatus: vi.fn(),
  getActiveGradingJob: vi.fn(),
  getEssayText: vi.fn(),
  insertDocComments: vi.fn(),
  deleteDocComments: vi.fn().mockResolvedValue({ deleted: 0, notFound: 0 }),
  logGradingEvents: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn(() => ({ cancel: vi.fn() })),
}))

vi.mock('../state/students', () => ({
  selectedStudent: { value: 'Test Student' },
}))

vi.mock('../state/scores', () => ({
  currentScores: { value: null },
  savedScores: { value: null },
}))

import { gradingJobId, feedbackGiven, resetGrading } from '../state/grading'
import { logGradingEvents } from '../lib/gas'
import { GradingFeedback, resetFeedbackUI } from './grading-feedback'

describe('GradingFeedback', () => {
  beforeEach(() => {
    resetGrading()
    resetFeedbackUI()
    gradingJobId.value = 'test-job-id'
    feedbackGiven.value = false
    vi.clearAllMocks()
  })

  it('renders feedback prompt', () => {
    render(<GradingFeedback />)
    expect(screen.getByText('Was this grading helpful?')).toBeTruthy()
  })

  it('renders nothing when feedbackGiven is true', () => {
    feedbackGiven.value = true
    const { container } = render(<GradingFeedback />)
    expect(container.innerHTML).toBe('')
  })

  it('shows thumbs up and thumbs down buttons', () => {
    render(<GradingFeedback />)
    expect(screen.getByLabelText('Grading was helpful')).toBeTruthy()
    expect(screen.getByLabelText('Grading was not helpful')).toBeTruthy()
  })

  it('clicking thumbs up immediately logs feedback and shows text input', () => {
    render(<GradingFeedback />)
    fireEvent.click(screen.getByLabelText('Grading was helpful'))

    // AC8: one tap = feedback submitted
    expect(logGradingEvents).toHaveBeenCalledWith('test-job-id', [{
      eventType: 'feedback',
      payload: { rating: 'positive' },
    }])
    expect(screen.getByPlaceholderText('Tell us more (optional)')).toBeTruthy()
    expect(screen.getByText('Submit')).toBeTruthy()
  })

  it('clicking thumbs down immediately logs feedback and shows text input', () => {
    render(<GradingFeedback />)
    fireEvent.click(screen.getByLabelText('Grading was not helpful'))

    expect(logGradingEvents).toHaveBeenCalledWith('test-job-id', [{
      eventType: 'feedback',
      payload: { rating: 'negative' },
    }])
    expect(screen.getByPlaceholderText('Tell us more (optional)')).toBeTruthy()
  })

  it('submitting without text shows thanks without extra event', () => {
    render(<GradingFeedback />)
    fireEvent.click(screen.getByLabelText('Grading was helpful'))
    vi.clearAllMocks()
    fireEvent.click(screen.getByText('Submit'))

    // No additional event logged when text is empty
    expect(logGradingEvents).not.toHaveBeenCalled()
    expect(screen.getByText('Thanks for your feedback!')).toBeTruthy()
  })

  it('includes optional comment in supplementary event', () => {
    render(<GradingFeedback />)
    fireEvent.click(screen.getByLabelText('Grading was not helpful'))
    vi.clearAllMocks()
    const input = screen.getByPlaceholderText('Tell us more (optional)')
    fireEvent.input(input, { target: { value: 'Scores too low' } })
    fireEvent.click(screen.getByText('Submit'))

    expect(logGradingEvents).toHaveBeenCalledWith('test-job-id', [{
      eventType: 'feedback_comment',
      payload: { rating: 'negative', comment: 'Scores too low' },
    }])
  })
})
