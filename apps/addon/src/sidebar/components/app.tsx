import { useEffect } from 'preact/hooks'
import { ConnectionStatus } from './connection-status'
import { SetupSheetPlaceholder } from './setup-sheet-placeholder'
import { connectionStatus, checkConnection } from '../state/connection'
import { linkedSheet } from '../state/sheet'

export function App() {
  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div class="sidebar">
      <ConnectionStatus />
      {connectionStatus.value === 'connected' && !linkedSheet.value && (
        <SetupSheetPlaceholder />
      )}
    </div>
  )
}
