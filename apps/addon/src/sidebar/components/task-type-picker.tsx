import { TASK_TYPES, type TaskType } from '@ielts-toolkit/shared'
import { selectedTaskType, selectTaskType } from '../state/grading'

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  task1_academic: 'Task 1 Academic',
  task1_general: 'Task 1 General',
  task2: 'Task 2',
}

export function TaskTypePicker() {
  return (
    <div class="form-group">
      <label for="task-type-select">Task type</label>
      <select
        id="task-type-select"
        value={selectedTaskType.value}
        onChange={(e) => selectTaskType((e.target as HTMLSelectElement).value as TaskType)}
      >
        {TASK_TYPES.map((type) => (
          <option key={type} value={type}>
            {TASK_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </div>
  )
}
