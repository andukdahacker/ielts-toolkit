import { connectionStatus, checkConnection } from '../state/connection'

export function ConnectionStatus() {
  const status = connectionStatus.value

  if (status === 'idle' || status === 'connecting') {
    return (
      <div class="connection-indicator" role="status" aria-label="Checking connection">
        <span class="connection-dot connection-dot--connecting" />
        <span>Connecting...</span>
      </div>
    )
  }

  if (status === 'connected') {
    return (
      <div class="connection-indicator" role="status" aria-label="Connected to backend">
        <span class="connection-dot connection-dot--connected" />
        <span>Connected</span>
      </div>
    )
  }

  return (
    <div class="connection-indicator" role="alert" aria-label="Connection failed">
      <span class="connection-dot connection-dot--error" />
      <span class="error">Can't connect</span>
      <button class="action" onClick={() => checkConnection()}>Retry</button>
    </div>
  )
}
