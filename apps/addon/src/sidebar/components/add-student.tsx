import { signal } from '@preact/signals'
import { addStudent, addingStudent, addStudentError, clearAddStudentError } from '../state/students'

export const expanded = signal<boolean>(false)
export const inputValue = signal<string>('')

function handleSubmit(): void {
  if (!inputValue.value.trim() || addingStudent.value) return
  addStudent(inputValue.value).then(() => {
    if (!addStudentError.value) {
      expanded.value = false
      inputValue.value = ''
    }
  })
}

function handleCancel(): void {
  expanded.value = false
  inputValue.value = ''
  clearAddStudentError()
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  } else if (e.key === 'Escape') {
    handleCancel()
  }
}

export function AddStudent() {
  if (!expanded.value) {
    return (
      <p>
        <a
          href="#"
          class="secondary"
          onClick={(e) => {
            e.preventDefault()
            expanded.value = true
            clearAddStudentError()
          }}
        >
          + Add student
        </a>
      </p>
    )
  }

  return (
    <div class="block">
      <div class="form-group">
        <label for="add-student-input">Student name</label>
        <input
          id="add-student-input"
          type="text"
          maxLength={100}
          value={inputValue.value}
          onInput={(e) => { inputValue.value = (e.target as HTMLInputElement).value }}
          onKeyDown={handleKeyDown}
          disabled={addingStudent.value}
          aria-label="Student name"
        />
      </div>
      {addStudentError.value && (
        <p class="error" role="alert">{addStudentError.value}</p>
      )}
      <div>
        <button
          class="create"
          onClick={handleSubmit}
          disabled={addingStudent.value || !inputValue.value.trim()}
        >
          {addingStudent.value ? 'Adding...' : 'Add'}
        </button>
        {' '}
        <a
          href="#"
          class="secondary"
          onClick={(e) => {
            e.preventDefault()
            handleCancel()
          }}
        >
          Cancel
        </a>
      </div>
    </div>
  )
}
