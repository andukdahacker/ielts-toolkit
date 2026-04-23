import { signal } from '@preact/signals'
import { checkBackendHealth } from '../lib/gas'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export const connectionStatus = signal<ConnectionStatus>('idle')

export async function checkConnection(): Promise<void> {
  connectionStatus.value = 'connecting'
  try {
    await checkBackendHealth()
    connectionStatus.value = 'connected'
  } catch (err) {
    console.error('Connection check failed:', err)
    connectionStatus.value = 'error'
  }
}
