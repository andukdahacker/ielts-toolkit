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
  insertDocComments: vi.fn(),
}))

vi.mock('../lib/polling', () => ({
  startPolling: vi.fn().mockReturnValue({ cancel: vi.fn() }),
}))

import { aiComments, commentInsertionResult, feedbackExpanded, resetGrading } from '../state/grading'
import { FeedbackSummary } from './feedback-summary'

const sampleComments = [
  { text: 'Good introduction with clear thesis', anchorText: 'The main argument is', category: 'TA' },
  { text: 'Improve linking between paragraphs', anchorText: 'however the evidence', category: 'CC' },
  { text: 'Good range of vocabulary', anchorText: 'furthermore the implications', category: 'LR' },
]

describe('FeedbackSummary', () => {
  beforeEach(() => {
    resetGrading()
    feedbackExpanded.value = true
    vi.clearAllMocks()
  })

  it('renders nothing when no comments', () => {
    aiComments.value = null
    const { container } = render(<FeedbackSummary />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when comments array is empty', () => {
    aiComments.value = []
    const { container } = render(<FeedbackSummary />)
    expect(container.innerHTML).toBe('')
  })

  it('renders all comments with category labels, text, and anchor text', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    expect(screen.getByText('AI Feedback Summary')).toBeTruthy()
    expect(screen.getByText('Task Achievement')).toBeTruthy()
    expect(screen.getByText('Good introduction with clear thesis')).toBeTruthy()
    expect(screen.getByText('Coherence & Cohesion')).toBeTruthy()
    expect(screen.getByText('Improve linking between paragraphs')).toBeTruthy()
    expect(screen.getByText('Lexical Resource')).toBeTruthy()
    expect(screen.getByText('Good range of vocabulary')).toBeTruthy()
  })

  it('shows comment count', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)
    expect(screen.getByText('(3)')).toBeTruthy()
  })

  it('displays quoted anchor text', () => {
    aiComments.value = [sampleComments[0]]
    render(<FeedbackSummary />)
    expect(screen.getByText(/The main argument is/)).toBeTruthy()
  })

  it('collapses and expands on click', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    // Initially expanded
    expect(screen.getByText('Good introduction with clear thesis')).toBeTruthy()

    // Click to collapse
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Good introduction with clear thesis')).toBeNull()

    // Click to expand
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Good introduction with clear thesis')).toBeTruthy()
  })

  it('collapses and expands on Enter key', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    const toggle = screen.getByRole('button')
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(screen.queryByText('Good introduction with clear thesis')).toBeNull()

    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(screen.getByText('Good introduction with clear thesis')).toBeTruthy()
  })

  it('collapses and expands on Space key', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    const toggle = screen.getByRole('button')
    fireEvent.keyDown(toggle, { key: ' ' })
    expect(screen.queryByText('Good introduction with clear thesis')).toBeNull()
  })

  it('has correct aria-expanded attribute', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    const toggle = screen.getByRole('button')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('has tabindex on toggle button', () => {
    aiComments.value = sampleComments
    render(<FeedbackSummary />)

    const toggle = screen.getByRole('button')
    expect(toggle.getAttribute('tabindex')).toBe('0')
  })

  it('shows status message when partial anchoring', () => {
    aiComments.value = sampleComments
    commentInsertionResult.value = {
      inserted: 3, anchored: 2, general: 1, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3'],
    }
    render(<FeedbackSummary />)

    expect(screen.getByText('2 comments anchored to text, 1 added as general feedback')).toBeTruthy()
  })

  it('shows status message when appended fallback', () => {
    aiComments.value = sampleComments
    commentInsertionResult.value = {
      inserted: 0, anchored: 0, general: 0, failed: 3, appended: true, commentIds: [],
    }
    render(<FeedbackSummary />)

    expect(screen.getByText('Comments added as a feedback section at the end of the document')).toBeTruthy()
  })

  it('does not show status message when all anchored (clean success)', () => {
    aiComments.value = sampleComments
    commentInsertionResult.value = {
      inserted: 3, anchored: 3, general: 0, failed: 0, appended: false, commentIds: ['c1', 'c2', 'c3'],
    }
    render(<FeedbackSummary />)

    expect(screen.queryByText(/anchored/)).toBeNull()
    expect(screen.queryByText(/feedback section/)).toBeNull()
  })

  it('falls back to raw category string for unknown categories', () => {
    aiComments.value = [{ text: 'Some feedback', anchorText: 'text', category: 'CUSTOM' }]
    render(<FeedbackSummary />)

    expect(screen.getByText('CUSTOM')).toBeTruthy()
  })
})
