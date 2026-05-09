import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { showRegradeConfirm } from '../state/grading'

vi.mock('../lib/gas', () => ({
  submitGrade: vi.fn().mockResolvedValue({ data: { jobId: 'test-job-id' } }),
  pollGradingStatus: vi.fn().mockResolvedValue({ data: { status: 'pending' } }),
  getActiveGradingJob: vi.fn().mockResolvedValue({ data: null }),
  getEssayText: vi.fn().mockResolvedValue('Test essay'),
  insertDocComments: vi.fn().mockResolvedValue({ inserted: 0, anchored: 0, general: 0, failed: 0, appended: false, commentIds: [] }),
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

import { RegradeConfirm } from './regrade-confirm'

describe('RegradeConfirm', () => {
  beforeEach(() => {
    showRegradeConfirm.value = false
  })

  it('renders nothing when showRegradeConfirm is false', () => {
    const { container } = render(<RegradeConfirm />)
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when showRegradeConfirm is true', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    expect(screen.getByText('Clear previous AI comments before re-grading?')).toBeTruthy()
  })

  it('shows Yes and No buttons', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    expect(screen.getByText('Yes, clear comments')).toBeTruthy()
    expect(screen.getByText('No, keep them')).toBeTruthy()
  })

  it('shows Cancel link', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('Cancel link closes dialog', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(showRegradeConfirm.value).toBe(false)
  })

  it('Escape key closes dialog', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(showRegradeConfirm.value).toBe(false)
  })

  it('has role="dialog" with aria-modal', () => {
    showRegradeConfirm.value = true
    render(<RegradeConfirm />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })
})
