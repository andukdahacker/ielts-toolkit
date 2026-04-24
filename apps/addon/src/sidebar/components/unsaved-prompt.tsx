import { ConfirmDialog } from './confirm-dialog'
import { selectedStudent, pendingNavigation, confirmNavigation, cancelNavigation } from '../state/students'
import { discardChanges } from '../state/scores'

export function UnsavedPrompt() {
  if (pendingNavigation.value === null) return null

  const studentName = selectedStudent.value ?? 'this student'

  const actions = [
    {
      label: 'Discard',
      onClick: () => {
        discardChanges()
        confirmNavigation()
      },
    },
    {
      label: 'Cancel',
      onClick: cancelNavigation,
    },
  ]

  return (
    <ConfirmDialog
      message={`You have unsaved changes for ${studentName}. Save before continuing?`}
      actions={actions}
      open={true}
    />
  )
}
