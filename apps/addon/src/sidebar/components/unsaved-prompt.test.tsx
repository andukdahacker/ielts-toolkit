import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import { studentRoster, selectedStudent, pendingNavigation } from '../state/students'
import { currentScores, resetScores } from '../state/scores'
import { UnsavedPrompt } from './unsaved-prompt'

describe('UnsavedPrompt', () => {
  beforeEach(() => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    pendingNavigation.value = null
    resetScores()
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

  it('does not render Save button (deferred to Story 2.2)', () => {
    pendingNavigation.value = 'next'
    render(<UnsavedPrompt />)
    expect(screen.queryByText('Save')).toBeNull()
  })
})
