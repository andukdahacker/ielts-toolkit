import { signal } from '@preact/signals'
import type { TaskType } from '@ielts-toolkit/shared'

export const selectedTaskType = signal<TaskType>('task2')
export const savedTaskType = signal<TaskType>('task2')

export function selectTaskType(type: TaskType): void {
  selectedTaskType.value = type
}
