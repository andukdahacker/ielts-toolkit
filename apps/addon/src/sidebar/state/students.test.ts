import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  addStudentToRoster: vi.fn(),
}))

import { studentRoster, selectedStudent, studentIndex, loadRoster, selectStudent, addStudent, addingStudent, addStudentError } from './students'
import { getStudentRoster, addStudentToRoster } from '../lib/gas'

const mockGetStudentRoster = vi.mocked(getStudentRoster)
const mockAddStudentToRoster = vi.mocked(addStudentToRoster)

describe('students state', () => {
  beforeEach(() => {
    studentRoster.value = []
    selectedStudent.value = null
    addingStudent.value = false
    addStudentError.value = null
    vi.clearAllMocks()
  })

  describe('loadRoster', () => {
    it('populates roster from gas call', async () => {
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang', 'Anh'])
      await loadRoster()
      expect(studentRoster.value).toEqual(['Minh', 'Trang', 'Anh'])
    })

    it('selects first student when none selected', async () => {
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang'])
      await loadRoster()
      expect(selectedStudent.value).toBe('Minh')
    })

    it('does not change selected student if already set', async () => {
      selectedStudent.value = 'Trang'
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang', 'Anh'])
      await loadRoster()
      expect(selectedStudent.value).toBe('Trang')
    })

    it('resets stale selected student to first name', async () => {
      selectedStudent.value = 'Deleted Student'
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang'])
      await loadRoster()
      expect(selectedStudent.value).toBe('Minh')
    })

    it('sets selectedStudent to null when roster is empty', async () => {
      selectedStudent.value = 'Minh'
      mockGetStudentRoster.mockResolvedValueOnce([])
      await loadRoster()
      expect(selectedStudent.value).toBeNull()
    })

    it('throws on failure', async () => {
      mockGetStudentRoster.mockRejectedValueOnce(new Error('Sheet inaccessible'))
      await expect(loadRoster()).rejects.toThrow('Sheet inaccessible')
    })
  })

  describe('selectStudent', () => {
    it('selects a student from the roster', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectStudent('Trang')
      expect(selectedStudent.value).toBe('Trang')
    })

    it('does not select a student not in the roster', () => {
      studentRoster.value = ['Minh', 'Trang']
      selectStudent('Unknown')
      expect(selectedStudent.value).toBeNull()
    })
  })

  describe('studentIndex', () => {
    it('returns index of selected student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Trang'
      expect(studentIndex.value).toBe(1)
    })

    it('returns -1 when no student selected', () => {
      studentRoster.value = ['Minh', 'Trang']
      expect(studentIndex.value).toBe(-1)
    })
  })

  describe('addStudent', () => {
    it('adds student and updates roster on success', async () => {
      studentRoster.value = ['Minh', 'Trang']
      mockAddStudentToRoster.mockResolvedValueOnce(['Minh', 'Trang', 'Huy'])

      await addStudent('Huy')

      expect(mockAddStudentToRoster).toHaveBeenCalledWith('Huy')
      expect(studentRoster.value).toEqual(['Minh', 'Trang', 'Huy'])
      expect(selectedStudent.value).toBe('Huy')
      expect(addingStudent.value).toBe(false)
      expect(addStudentError.value).toBeNull()
    })

    it('trims whitespace from name', async () => {
      mockAddStudentToRoster.mockResolvedValueOnce(['Huy'])
      await addStudent('  Huy  ')
      expect(mockAddStudentToRoster).toHaveBeenCalledWith('Huy')
    })

    it('rejects empty name', async () => {
      await addStudent('   ')
      expect(addStudentError.value).toBe('Please enter a student name')
      expect(mockAddStudentToRoster).not.toHaveBeenCalled()
    })

    it('rejects name longer than 100 characters', async () => {
      const longName = 'A'.repeat(101)
      await addStudent(longName)
      expect(addStudentError.value).toBe('Student name must be 100 characters or fewer')
      expect(mockAddStudentToRoster).not.toHaveBeenCalled()
    })

    it('rejects duplicate name (case-insensitive)', async () => {
      studentRoster.value = ['Minh', 'Trang']
      await addStudent('minh')
      expect(addStudentError.value).toBe('A student with this name already exists')
      expect(mockAddStudentToRoster).not.toHaveBeenCalled()
    })

    it('sets addingStudent during async call', async () => {
      let resolveAdd: (value: string[]) => void
      mockAddStudentToRoster.mockReturnValueOnce(
        new Promise<string[]>((resolve) => { resolveAdd = resolve })
      )

      const promise = addStudent('Huy')
      expect(addingStudent.value).toBe(true)

      resolveAdd!(['Huy'])
      await promise
      expect(addingStudent.value).toBe(false)
    })

    it('sets error on server failure', async () => {
      mockAddStudentToRoster.mockRejectedValueOnce(new Error('Sheet is busy'))
      await addStudent('Huy')
      expect(addStudentError.value).toBe('Sheet is busy')
      expect(addingStudent.value).toBe(false)
    })
  })
})
