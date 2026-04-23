import { signal, computed } from '@preact/signals'
import { getStudentRoster as gasGetStudentRoster, addStudentToRoster as gasAddStudent } from '../lib/gas'

export const studentRoster = signal<string[]>([])
export const selectedStudent = signal<string | null>(null)
export const addingStudent = signal<boolean>(false)
export const addStudentError = signal<string | null>(null)

export function clearAddStudentError(): void {
  addStudentError.value = null
}

export const studentIndex = computed(() => {
  if (!selectedStudent.value) return -1
  return studentRoster.value.indexOf(selectedStudent.value)
})

export async function loadRoster(): Promise<void> {
  const names = await gasGetStudentRoster()
  studentRoster.value = names
  if (names.length > 0) {
    if (!selectedStudent.value || !names.includes(selectedStudent.value)) {
      selectedStudent.value = names[0]
    }
  } else {
    selectedStudent.value = null
  }
}

export function selectStudent(name: string): void {
  if (studentRoster.value.includes(name)) {
    selectedStudent.value = name
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
