import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import { studentRoster, selectedStudent, pendingNavigation } from '../state/students'
import { currentScores, resetScores } from '../state/scores'
import { StudentNav } from './student-nav'

describe('StudentNav', () => {
  beforeEach(() => {
    studentRoster.value = []
    selectedStudent.value = null
    pendingNavigation.value = null
    resetScores()
  })

  it('renders nothing when roster has 0 students', () => {
    const { container } = render(<StudentNav />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when roster has 1 student', () => {
    studentRoster.value = ['Minh']
    selectedStudent.value = 'Minh'
    const { container } = render(<StudentNav />)
    expect(container.innerHTML).toBe('')
  })

  it('renders position text for multiple students', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Trang'
    render(<StudentNav />)
    expect(screen.getByText('Student 2 of 3')).toBeTruthy()
  })

  it('disables prev button on first student', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    render(<StudentNav />)
    const prevBtn = screen.getByLabelText('Previous student')
    expect(prevBtn).toHaveProperty('disabled', true)
  })

  it('disables next button on last student', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Anh'
    render(<StudentNav />)
    const nextBtn = screen.getByLabelText('Next student')
    expect(nextBtn).toHaveProperty('disabled', true)
  })

  it('clicking next advances to next student', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    render(<StudentNav />)
    const nextBtn = screen.getByLabelText('Next student')
    fireEvent.click(nextBtn)
    expect(selectedStudent.value).toBe('Trang')
  })

  it('clicking prev goes to previous student', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Trang'
    render(<StudentNav />)
    const prevBtn = screen.getByLabelText('Previous student')
    fireEvent.click(prevBtn)
    expect(selectedStudent.value).toBe('Minh')
  })

  it('right arrow key navigates next', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Minh'
    render(<StudentNav />)
    const nav = document.querySelector('.student-nav')!
    fireEvent.keyDown(nav, { key: 'ArrowRight' })
    expect(selectedStudent.value).toBe('Trang')
  })

  it('left arrow key navigates prev', () => {
    studentRoster.value = ['Minh', 'Trang', 'Anh']
    selectedStudent.value = 'Trang'
    render(<StudentNav />)
    const nav = document.querySelector('.student-nav')!
    fireEvent.keyDown(nav, { key: 'ArrowLeft' })
    expect(selectedStudent.value).toBe('Minh')
  })
})
