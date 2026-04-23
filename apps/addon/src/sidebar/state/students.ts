import { signal, computed } from '@preact/signals'
import { getStudentRoster as gasGetStudentRoster } from '../lib/gas'

export const studentRoster = signal<string[]>([])
export const selectedStudent = signal<string | null>(null)

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
