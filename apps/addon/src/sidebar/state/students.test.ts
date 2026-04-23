import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
}))

import { studentRoster, selectedStudent, studentIndex, loadRoster, selectStudent } from './students'
import { getStudentRoster } from '../lib/gas'

const mockGetStudentRoster = vi.mocked(getStudentRoster)

describe('students state', () => {
  beforeEach(() => {
    studentRoster.value = []
    selectedStudent.value = null
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
})
