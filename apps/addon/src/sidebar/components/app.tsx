import { useEffect } from 'preact/hooks'
import { ConnectionStatus } from './connection-status'
import { SetupSheet } from './setup-sheet'
import { SheetInfo } from './sheet-info'
import { StudentPicker } from './student-picker'
import { StudentNav } from './student-nav'
import { EmptyState } from './empty-state'
import { AddStudent } from './add-student'
import { UnsavedPrompt } from './unsaved-prompt'
import { TaskTypePicker } from './task-type-picker'
import { ScoreEditor } from './score-editor'
import { SaveButton } from './save-button'
import { GradingPanel } from './grading-panel'
import { FeedbackSummary } from './feedback-summary'
import { connectionStatus, checkConnection } from '../state/connection'
import { linkedSheet, initializeSheet } from '../state/sheet'
import { selectedStudent } from '../state/students'
import { gradingStatus, aiComments, checkActiveJob } from '../state/grading'

export function App() {
  useEffect(() => {
    checkConnection()
      .then(() => initializeSheet())
      .then(() => checkActiveJob())
  }, [])

  const hasStudent = selectedStudent.value !== null

  return (
    <div class="sidebar">
      <ConnectionStatus />
      {connectionStatus.value === 'connected' && !linkedSheet.value && (
        <SetupSheet />
      )}
      {linkedSheet.value && (
        <>
          <SheetInfo />
          <StudentPicker />
          <StudentNav />
          <AddStudent />
          {hasStudent ? (
            <>
              <TaskTypePicker />
              <GradingPanel />
              {(gradingStatus.value === 'idle' || gradingStatus.value === 'done') && (
                <>
                  <ScoreEditor />
                  <SaveButton />
                </>
              )}
              {gradingStatus.value === 'done' && aiComments.value !== null && (
                <FeedbackSummary />
              )}
            </>
          ) : (
            <EmptyState />
          )}
          <UnsavedPrompt />
        </>
      )}
    </div>
  )
}
