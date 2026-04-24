import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
}))

import { resetScores, saveStatus, saveError, saveConfirmStudent, canSave, updateScore, SCORE_KEYS } from '../state/scores'
import { selectedStudent } from '../state/students'
import { SaveButton } from './save-button'

function fillAllScores(value = 6.5): void {
  for (const key of SCORE_KEYS) {
    updateScore(key, value)
  }
}

describe('SaveButton', () => {
  beforeEach(() => {
    resetScores()
    selectedStudent.value = 'Minh'
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('button disabled when no scores entered', () => {
    render(<SaveButton />)
    expect(screen.getByText('Save to Sheet')).toBeDisabled()
  })

  it('button enabled when valid scores present', () => {
    fillAllScores(7.0)
    render(<SaveButton />)
    expect(screen.getByText('Save to Sheet')).not.toBeDisabled()
  })

  it('shows "Saving..." during save', () => {
    saveStatus.value = 'saving'
    render(<SaveButton />)
    expect(screen.getByText('Saving...')).toBeTruthy()
    expect(screen.getByText('Saving...')).toBeDisabled()
  })

  it('shows confirmation message on success', () => {
    saveStatus.value = 'saved'
    saveConfirmStudent.value = 'Minh'
    render(<SaveButton />)
    expect(screen.getByText('✓ Scores saved for Minh')).toBeTruthy()
  })

  it('shows error with retry on failure', () => {
    saveStatus.value = 'error'
    saveError.value = 'Sheet is busy'
    render(<SaveButton />)
    expect(screen.getByText("Scores couldn't be saved to your Sheet.")).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('auto-dismisses confirmation after 3 seconds', () => {
    saveStatus.value = 'saved'
    saveConfirmStudent.value = 'Minh'
    render(<SaveButton />)
    expect(screen.getByText('✓ Scores saved for Minh')).toBeTruthy()

    vi.advanceTimersByTime(3000)

    expect(saveStatus.value).toBe('idle')
    expect(saveConfirmStudent.value).toBeNull()
  })

  it('retry calls saveScores again', async () => {
    fillAllScores(6.5)
    const { saveScoresToSheet } = await import('../lib/gas')
    const mockSave = vi.mocked(saveScoresToSheet)
    mockSave.mockResolvedValueOnce(undefined)

    saveStatus.value = 'error'
    saveError.value = 'Sheet is busy'
    render(<SaveButton />)
    fireEvent.click(screen.getByText('Retry'))

    await vi.waitFor(() => {
      expect(mockSave).toHaveBeenCalled()
    })
  })
})
