import { studentRoster, selectedStudent, studentIndex, selectStudent } from '../state/students'

export function StudentPicker() {
  const roster = studentRoster.value
  if (roster.length === 0) return null

  return (
    <div class="block">
      <div class="form-group">
        <label>Student</label>
        <select
          value={selectedStudent.value || ''}
          onChange={(e: Event) => selectStudent((e.target as HTMLSelectElement).value)}
          style={{ width: '100%' }}
        >
          {!selectedStudent.value && <option value="" disabled>Select a student</option>}
          {roster.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {studentIndex.value >= 0 && (
        <p class="gray">
          Student {studentIndex.value + 1} of {roster.length}
        </p>
      )}
    </div>
  )
}
