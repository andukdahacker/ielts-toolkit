import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  addStudentToRoster: vi.fn(),
}))

import { studentRoster, selectedStudent, addingStudent, addStudentError } from '../state/students'
import { addStudentToRoster } from '../lib/gas'
import { AddStudent, expanded, inputValue } from './add-student'

const mockAddStudent = vi.mocked(addStudentToRoster)

describe('AddStudent', () => {
  beforeEach(() => {
    studentRoster.value = ['Minh', 'Trang']
    selectedStudent.value = 'Minh'
    addingStudent.value = false
    addStudentError.value = null
    expanded.value = false
    inputValue.value = ''
    vi.clearAllMocks()
  })

  it('renders collapsed by default with add link', () => {
    render(<AddStudent />)
    expect(screen.getByText('+ Add student')).toBeTruthy()
    expect(screen.queryByLabelText('Student name')).toBeNull()
  })

  it('expands on click to show input form', () => {
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))
    expect(screen.getByLabelText('Student name')).toBeTruthy()
    expect(screen.getByText('Add')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })

  it('collapses on cancel', () => {
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('+ Add student')).toBeTruthy()
    expect(screen.queryByLabelText('Student name')).toBeNull()
  })

  it('submits form and collapses on success', async () => {
    mockAddStudent.mockResolvedValueOnce(['Minh', 'Trang', 'Huy'])
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))

    const input = screen.getByLabelText('Student name') as HTMLInputElement
    fireEvent.input(input, { target: { value: 'Huy' } })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByText('+ Add student')).toBeTruthy()
    })
  })

  it('shows error from addStudentError signal', async () => {
    mockAddStudent.mockRejectedValueOnce(new Error('Sheet is busy'))
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))

    const input = screen.getByLabelText('Student name') as HTMLInputElement
    fireEvent.input(input, { target: { value: 'Huy' } })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByText('Sheet is busy')).toBeTruthy()
    })
  })

  it('disables Add button when input is empty', () => {
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))
    const addButton = screen.getByText('Add') as HTMLButtonElement
    expect(addButton.disabled).toBe(true)
  })

  it('submits on Enter key', async () => {
    mockAddStudent.mockResolvedValueOnce(['Minh', 'Trang', 'Huy'])
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))

    const input = screen.getByLabelText('Student name') as HTMLInputElement
    fireEvent.input(input, { target: { value: 'Huy' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockAddStudent).toHaveBeenCalledWith('Huy')
    })
  })

  it('cancels on Escape key', () => {
    render(<AddStudent />)
    fireEvent.click(screen.getByText('+ Add student'))

    const input = screen.getByLabelText('Student name')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByText('+ Add student')).toBeTruthy()
    expect(screen.queryByLabelText('Student name')).toBeNull()
  })
})
