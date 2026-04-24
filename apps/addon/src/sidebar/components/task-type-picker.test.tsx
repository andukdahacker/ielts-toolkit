import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  saveScoresToSheet: vi.fn(),
}))

import { selectedTaskType } from '../state/grading'
import { TaskTypePicker } from './task-type-picker'

describe('TaskTypePicker', () => {
  beforeEach(() => {
    selectedTaskType.value = 'task2'
  })

  it('renders all three task type options', () => {
    render(<TaskTypePicker />)
    expect(screen.getByText('Task 1 Academic')).toBeTruthy()
    expect(screen.getByText('Task 1 General')).toBeTruthy()
    expect(screen.getByText('Task 2')).toBeTruthy()
  })

  it('selecting an option updates the signal', () => {
    render(<TaskTypePicker />)
    const select = screen.getByLabelText('Task type') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'task1_academic' } })
    expect(selectedTaskType.value).toBe('task1_academic')
  })

  it('default is Task 2', () => {
    render(<TaskTypePicker />)
    const select = screen.getByLabelText('Task type') as HTMLSelectElement
    expect(select.value).toBe('task2')
  })
})
