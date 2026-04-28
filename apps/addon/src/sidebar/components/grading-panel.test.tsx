import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  submitGrade: vi.fn(),
  pollGradingStatus: vi.fn(),
  getActiveGradingJob: vi.fn(),
  getEssayText: vi.fn(),
  logScoreOverrides: vi.fn(),
  saveScoresToSheet: vi.fn(),
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn().mockReturnValue({ cancel: vi.fn() }),
}))

import {
  gradingStatus,
  gradingError,
  gradingMessage,
  pollingTimedOut,
  resetGrading,
} from '../state/grading'
import { selectedStudent } from '../state/students'
import { GradingPanel } from './grading-panel'

describe('GradingPanel', () => {
  beforeEach(() => {
    resetGrading()
    selectedStudent.value = 'Minh'
    vi.clearAllMocks()
  })

  describe('idle state', () => {
    it('renders "Grade with AI" button', () => {
      render(<GradingPanel />)
      const button = screen.getByText('Grade with AI')
      expect(button).toBeTruthy()
      expect(button.className).toContain('action')
    })

    it('button has correct aria-label', () => {
      render(<GradingPanel />)
      expect(screen.getByLabelText('Grade with AI')).toBeTruthy()
    })
  })

  describe('submitting state', () => {
    it('shows submitting message and disabled button', () => {
      gradingStatus.value = 'submitting'
      gradingMessage.value = 'Submitting essay for grading...'
      render(<GradingPanel />)

      expect(screen.getByText('Submitting essay for grading...')).toBeTruthy()
      expect(screen.getByText('Grade with AI')).toBeDisabled()
    })

    it('has status role for screen readers', () => {
      gradingStatus.value = 'submitting'
      gradingMessage.value = 'Submitting...'
      render(<GradingPanel />)

      expect(screen.getByRole('status')).toBeTruthy()
    })
  })

  describe('polling state', () => {
    it('shows progress message and cancel button', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Analyzing essay...'
      render(<GradingPanel />)

      expect(screen.getByText('Analyzing essay...')).toBeTruthy()
      expect(screen.getByText('Cancel')).toBeTruthy()
    })

    it('cancel button has aria-label', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Scoring criteria...'
      render(<GradingPanel />)

      expect(screen.getByLabelText('Cancel grading')).toBeTruthy()
    })

    it('shows timeout warning when polling timed out', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Almost done...'
      pollingTimedOut.value = true
      render(<GradingPanel />)

      expect(screen.getByText('Taking longer than expected...')).toBeTruthy()
      expect(screen.getByText('Enter scores manually')).toBeTruthy()
    })

    it('does not show timeout warning when not timed out', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Analyzing essay...'
      pollingTimedOut.value = false
      render(<GradingPanel />)

      expect(screen.queryByText('Taking longer than expected...')).toBeNull()
    })
  })

  describe('error state', () => {
    it('shows error message with retry and manual entry buttons', () => {
      gradingStatus.value = 'error'
      gradingError.value = "Can't connect to grading service"
      render(<GradingPanel />)

      expect(screen.getByText("Can't connect to grading service")).toBeTruthy()
      expect(screen.getByText('Retry')).toBeTruthy()
      expect(screen.getByText('Enter scores manually')).toBeTruthy()
    })

    it('shows default error message when no specific error', () => {
      gradingStatus.value = 'error'
      gradingError.value = null
      render(<GradingPanel />)

      expect(screen.getByText("Grading couldn't complete.")).toBeTruthy()
    })

    it('has alert role for screen readers', () => {
      gradingStatus.value = 'error'
      gradingError.value = 'Some error'
      render(<GradingPanel />)

      expect(screen.getByRole('alert')).toBeTruthy()
    })

    it('retry button has correct aria-label', () => {
      gradingStatus.value = 'error'
      gradingError.value = 'Error'
      render(<GradingPanel />)

      expect(screen.getByLabelText('Retry grading')).toBeTruthy()
    })

    it('manual entry button has correct aria-label', () => {
      gradingStatus.value = 'error'
      gradingError.value = 'Error'
      render(<GradingPanel />)

      expect(screen.getByLabelText('Enter scores manually')).toBeTruthy()
    })
  })

  describe('done state', () => {
    it('renders nothing when grading is done', () => {
      gradingStatus.value = 'done'
      const { container } = render(<GradingPanel />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('button interactions', () => {
    it('clicking cancel calls cancelGrading', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Analyzing...'
      render(<GradingPanel />)

      fireEvent.click(screen.getByText('Cancel'))

      expect(gradingStatus.value).toBe('idle')
    })

    it('clicking "Enter scores manually" in error state resets to idle', () => {
      gradingStatus.value = 'error'
      gradingError.value = 'Some error'
      render(<GradingPanel />)

      fireEvent.click(screen.getByText('Enter scores manually'))

      expect(gradingStatus.value).toBe('idle')
    })

    it('clicking "Enter scores manually" in timeout state resets to idle', () => {
      gradingStatus.value = 'polling'
      gradingMessage.value = 'Almost done...'
      pollingTimedOut.value = true
      render(<GradingPanel />)

      fireEvent.click(screen.getByText('Enter scores manually'))

      expect(gradingStatus.value).toBe('idle')
    })
  })
})
