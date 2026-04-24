import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
  getStudentRoster: vi.fn(),
  addStudentToRoster: vi.fn(),
}))

import {
  studentRoster, selectedStudent, studentIndex, loadRoster, selectStudent,
  addStudent, addingStudent, addStudentError, pendingNavigation,
  canNavigateNext, canNavigatePrev, navigateNext, navigatePrev,
  confirmNavigation, cancelNavigation,
} from './students'
import { currentScores, savedScores, resetScores } from './scores'
import { getStudentRoster, addStudentToRoster } from '../lib/gas'

const mockGetStudentRoster = vi.mocked(getStudentRoster)
const mockAddStudentToRoster = vi.mocked(addStudentToRoster)

describe('students state', () => {
  beforeEach(() => {
    studentRoster.value = []
    selectedStudent.value = null
    addingStudent.value = false
    addStudentError.value = null
    pendingNavigation.value = null
    resetScores()
    sessionStorage.clear()
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

  describe('canNavigateNext / canNavigatePrev', () => {
    it('both false when no student selected', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      expect(canNavigateNext.value).toBe(false)
      expect(canNavigatePrev.value).toBe(false)
    })

    it('canNavigatePrev false on first student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      expect(canNavigatePrev.value).toBe(false)
      expect(canNavigateNext.value).toBe(true)
    })

    it('canNavigateNext false on last student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Anh'
      expect(canNavigateNext.value).toBe(false)
      expect(canNavigatePrev.value).toBe(true)
    })

    it('both true for mid-roster student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Trang'
      expect(canNavigateNext.value).toBe(true)
      expect(canNavigatePrev.value).toBe(true)
    })
  })

  describe('navigateNext / navigatePrev', () => {
    it('navigateNext advances to next student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      navigateNext()
      expect(selectedStudent.value).toBe('Trang')
    })

    it('navigatePrev goes to previous student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Trang'
      navigatePrev()
      expect(selectedStudent.value).toBe('Minh')
    })

    it('navigateNext does nothing on last student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Anh'
      navigateNext()
      expect(selectedStudent.value).toBe('Anh')
    })

    it('navigatePrev does nothing on first student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      navigatePrev()
      expect(selectedStudent.value).toBe('Minh')
    })

    it('sets pendingNavigation when unsaved changes exist', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      currentScores.value = { ...currentScores.value, taskAchievement: 7.0 }

      navigateNext()

      expect(pendingNavigation.value).toBe('next')
      expect(selectedStudent.value).toBe('Minh')
    })

    it('sets pendingNavigation to prev when navigating back with unsaved changes', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Trang'
      currentScores.value = { ...currentScores.value, overall: 6.5 }

      navigatePrev()

      expect(pendingNavigation.value).toBe('prev')
      expect(selectedStudent.value).toBe('Trang')
    })
  })

  describe('confirmNavigation / cancelNavigation', () => {
    it('confirmNavigation proceeds to next student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      pendingNavigation.value = 'next'

      confirmNavigation()

      expect(selectedStudent.value).toBe('Trang')
      expect(pendingNavigation.value).toBeNull()
    })

    it('confirmNavigation proceeds to previous student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Trang'
      pendingNavigation.value = 'prev'

      confirmNavigation()

      expect(selectedStudent.value).toBe('Minh')
      expect(pendingNavigation.value).toBeNull()
    })

    it('cancelNavigation clears pending and stays on current student', () => {
      studentRoster.value = ['Minh', 'Trang', 'Anh']
      selectedStudent.value = 'Minh'
      pendingNavigation.value = 'next'

      cancelNavigation()

      expect(selectedStudent.value).toBe('Minh')
      expect(pendingNavigation.value).toBeNull()
    })
  })

  describe('session persistence', () => {
    it('selectStudent stores name in sessionStorage', () => {
      studentRoster.value = ['Minh', 'Trang']
      selectStudent('Trang')
      expect(sessionStorage.getItem('ielts_selected_student')).toBe('Trang')
    })

    it('loadRoster restores from sessionStorage if name in roster', async () => {
      sessionStorage.setItem('ielts_selected_student', 'Trang')
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang', 'Anh'])
      await loadRoster()
      expect(selectedStudent.value).toBe('Trang')
    })

    it('loadRoster ignores stale sessionStorage name not in roster', async () => {
      sessionStorage.setItem('ielts_selected_student', 'Deleted Student')
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang'])
      await loadRoster()
      expect(selectedStudent.value).toBe('Minh')
    })

    it('loadRoster persists first student when no stored selection', async () => {
      mockGetStudentRoster.mockResolvedValueOnce(['Minh', 'Trang'])
      await loadRoster()
      expect(sessionStorage.getItem('ielts_selected_student')).toBe('Minh')
    })
  })
})
