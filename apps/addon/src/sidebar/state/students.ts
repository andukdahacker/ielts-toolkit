import { signal, computed } from '@preact/signals'
import { getStudentRoster as gasGetStudentRoster, addStudentToRoster as gasAddStudent } from '../lib/gas'
import { hasUnsavedChanges, resetScores } from './scores'

export const studentRoster = signal<string[]>([])
export const selectedStudent = signal<string | null>(null)
export const addingStudent = signal<boolean>(false)
export const addStudentError = signal<string | null>(null)
export const pendingNavigation = signal<'next' | 'prev' | null>(null)

export function clearAddStudentError(): void {
  addStudentError.value = null
}

export const studentIndex = computed(() => {
  if (!selectedStudent.value) return -1
  return studentRoster.value.indexOf(selectedStudent.value)
})

export const canNavigateNext = computed(() =>
  studentIndex.value >= 0 && studentIndex.value < studentRoster.value.length - 1
)

export const canNavigatePrev = computed(() =>
  studentIndex.value > 0
)

export function navigateNext(): void {
  if (!canNavigateNext.value) return
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = 'next'
    return
  }
  const nextName = studentRoster.value[studentIndex.value + 1]
  selectStudent(nextName)
}

export function navigatePrev(): void {
  if (!canNavigatePrev.value) return
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = 'prev'
    return
  }
  const prevName = studentRoster.value[studentIndex.value - 1]
  selectStudent(prevName)
}

export function confirmNavigation(): void {
  const dir = pendingNavigation.value
  pendingNavigation.value = null
  const idx = studentIndex.value
  if (dir === 'next' && idx >= 0 && idx < studentRoster.value.length - 1) {
    selectStudent(studentRoster.value[idx + 1])
  } else if (dir === 'prev' && idx > 0) {
    selectStudent(studentRoster.value[idx - 1])
  }
}

export function cancelNavigation(): void {
  pendingNavigation.value = null
}

const SESSION_KEY = 'ielts_selected_student'

function persistStudent(name: string): void {
  try { sessionStorage.setItem(SESSION_KEY, name) } catch {}
}

function restoreStudent(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

export async function loadRoster(): Promise<void> {
  const names = await gasGetStudentRoster()
  studentRoster.value = names
  if (names.length > 0) {
    const stored = restoreStudent()
    if (stored && names.includes(stored)) {
      selectedStudent.value = stored
    } else if (!selectedStudent.value || !names.includes(selectedStudent.value)) {
      selectedStudent.value = names[0]
      persistStudent(names[0])
    }
  } else {
    selectedStudent.value = null
  }
}

export function selectStudent(name: string): void {
  if (studentRoster.value.includes(name)) {
    resetScores()
    selectedStudent.value = name
    persistStudent(name)
  }
}

export async function addStudent(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    addStudentError.value = 'Please enter a student name'
    return
  }
  if (trimmed.length > 100) {
    addStudentError.value = 'Student name must be 100 characters or fewer'
    return
  }

  const duplicate = studentRoster.value.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  )
  if (duplicate) {
    addStudentError.value = 'A student with this name already exists'
    return
  }

  addingStudent.value = true
  addStudentError.value = null
  try {
    const updatedRoster = await gasAddStudent(trimmed)
    studentRoster.value = updatedRoster
    // Select from server-returned roster to match any sanitization applied server-side
    const addedName = updatedRoster.find(
      (n) => n.toLowerCase() === trimmed.toLowerCase()
    )
    selectedStudent.value = addedName ?? trimmed
  } catch (err) {
    addStudentError.value = err instanceof Error ? err.message : 'Failed to add student'
  } finally {
    addingStudent.value = false
  }
}
