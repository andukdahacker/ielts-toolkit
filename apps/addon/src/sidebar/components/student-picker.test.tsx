import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import { studentRoster, selectedStudent } from '../state/students'
import { StudentPicker } from './student-picker'

describe('StudentPicker', () => {
  beforeEach(() => {
    studentRoster.value = []
    selectedStudent.value = null
  })

  it('renders nothing when roster is empty', () => {
    const { container } = render(<StudentPicker />)
    expect(container.innerHTML).toBe('')
  })

  it('renders dropdown with student names', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    render(<StudentPicker />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0].textContent).toBe('Minh')
    expect(options[1].textContent).toBe('Trang')
    expect(options[2].textContent).toBe('Anh')
  })

  it('shows student position context', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Trang'
    render(<StudentPicker />)
    expect(screen.getByText('Student 2 of 3')).toBeTruthy()
  })

  it('updates selection on change', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    render(<StudentPicker />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Trang' } })
    expect(selectedStudent.value).toBe('Trang')
  })
})
