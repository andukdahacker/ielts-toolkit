import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
}))

import { studentRoster, selectedStudent, pendingNavigation } from '../state/students'
import { currentScores, resetScores, saveStatus, updateScore, SCORE_KEYS } from '../state/scores'
import { saveScoresToSheet } from '../lib/gas'
import { UnsavedPrompt } from './unsaved-prompt'

const mockSaveScoresToSheet = vi.mocked(saveScoresToSheet)

function fillAllScores(value = 6.5): void {
  for (const key of SCORE_KEYS) {
    updateScore(key, value)
  }
}

describe('UnsavedPrompt', () => {
  beforeEach(() => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    pendingNavigation.value = null
    resetScores()
    vi.clearAllMocks()
  })

  it('renders nothing when pendingNavigation is null', () => {
    const { container } = render(<UnsavedPrompt />)
    expect(container.innerHTML).toBe('')
  })

  it('shows dialog when pendingNavigation is set', () => {
    pendingNavigation.value = 'next'
    render(<UnsavedPrompt />)
    expect(screen.getByText('You have unsaved changes for Minh. Save before continuing?')).toBeTruthy()
  })

  it('dialog renders three buttons (Save, Discard, Cancel)', () => {
    pendingNavigation.value = 'next'
    render(<UnsavedPrompt />)
    expect(screen.getByText('Save')).toBeTruthy()
    expect(screen.getByText('Discard')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('Cancel button clears pendingNavigation and stays on student', () => {
    pendingNavigation.value = 'next'
    render(<UnsavedPrompt />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(pendingNavigation.value).toBeNull()
    expect(selectedStudent.value).toBe('Minh')
  })

  it('Discard button discards changes and navigates', () => {
    currentScores.value = { ...currentScores.value, taskAchievement: 7.0 }
    pendingNavigation.value = 'next'
    render(<UnsavedPrompt />)
    fireEvent.click(screen.getByText('Discard'))
    expect(pendingNavigation.value).toBeNull()
    expect(selectedStudent.value).toBe('Trang')
  })

  it('Save button calls saveScores then confirmNavigation on success', async () => {
    fillAllScores(7.0)
    pendingNavigation.value = 'next'
    mockSaveScoresToSheet.mockResolvedValueOnce(undefined)

    render(<UnsavedPrompt />)
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(selectedStudent.value).toBe('Trang')
    })
    expect(pendingNavigation.value).toBeNull()
  })

  it('Save button calls cancelNavigation on save failure', async () => {
    fillAllScores(7.0)
    pendingNavigation.value = 'next'
    mockSaveScoresToSheet.mockRejectedValueOnce(new Error('Sheet busy'))

    render(<UnsavedPrompt />)
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(pendingNavigation.value).toBeNull()
    })
    expect(selectedStudent.value).toBe('Minh')
  })
})
