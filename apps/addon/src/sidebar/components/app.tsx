import { useEffect } from 'preact/hooks'
import { ConnectionStatus } from './connection-status'
import { SetupSheet } from './setup-sheet'
import { SheetInfo } from './sheet-info'
import { StudentPicker } from './student-picker'
import { EmptyState } from './empty-state'
import { AddStudent } from './add-student'
import { connectionStatus, checkConnection } from '../state/connection'
import { linkedSheet, initializeSheet } from '../state/sheet'

export function App() {
  useEffect(() => {
    checkConnection().then(() => initializeSheet())
  }, [])

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
          <AddStudent />
          <EmptyState />
        </>
      )}
    </div>
  )
}
