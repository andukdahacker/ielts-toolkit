import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
}))

import { resetScores, currentScores, updateScore } from '../state/scores'
import { ScoreEditor } from './score-editor'

describe('ScoreEditor', () => {
  beforeEach(() => {
    resetScores()
  })

  it('renders all 5 criteria labels', () => {
    render(<ScoreEditor />)
    expect(screen.getByText('Task Achievement')).toBeTruthy()
    expect(screen.getByText('Coherence & Cohesion')).toBeTruthy()
    expect(screen.getByText('Lexical Resource')).toBeTruthy()
    expect(screen.getByText('Grammatical Range & Accuracy')).toBeTruthy()
    expect(screen.getByText('Overall')).toBeTruthy()
  })

  it('clicking + increments score by 0.5', () => {
    updateScore('taskAchievement', 6.0)
    render(<ScoreEditor />)
    fireEvent.click(screen.getByLabelText('Increase Task Achievement'))
    expect(currentScores.value.taskAchievement).toBe(6.5)
  })

  it('clicking − decrements score by 0.5', () => {
    updateScore('taskAchievement', 6.0)
    render(<ScoreEditor />)
    fireEvent.click(screen.getByLabelText('Decrease Task Achievement'))
    expect(currentScores.value.taskAchievement).toBe(5.5)
  })

  it('+ disabled at 9.0', () => {
    updateScore('overall', 9.0)
    render(<ScoreEditor />)
    const btn = screen.getByLabelText('Increase Overall')
    expect(btn).toBeDisabled()
  })

  it('− disabled at 0.0', () => {
    updateScore('overall', 0)
    render(<ScoreEditor />)
    const btn = screen.getByLabelText('Decrease Overall')
    expect(btn).toBeDisabled()
  })

  it('first click from null: + sets 0.0', () => {
    render(<ScoreEditor />)
    fireEvent.click(screen.getByLabelText('Increase Task Achievement'))
    expect(currentScores.value.taskAchievement).toBe(0)
  })

  it('first click from null: − sets 9.0', () => {
    render(<ScoreEditor />)
    fireEvent.click(screen.getByLabelText('Decrease Task Achievement'))
    expect(currentScores.value.taskAchievement).toBe(9)
  })

  it('displays validation error when present', () => {
    // Force an invalid value directly
    currentScores.value = { ...currentScores.value, overall: 0.3 }
    render(<ScoreEditor />)
    expect(screen.getByText('Must be 0.0–9.0 in 0.5 steps')).toBeTruthy()
  })

  it('stepper buttons are keyboard accessible with tabindex', () => {
    render(<ScoreEditor />)
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.getAttribute('tabindex')).toBe('0')
    }
  })
})
