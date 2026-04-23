import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/preact'

vi.mock('../lib/gas', () => ({
  checkBackendHealth: vi.fn(),
}))

import { connectionStatus } from '../state/connection'
import { linkedSheet } from '../state/sheet'
import { checkBackendHealth } from '../lib/gas'
import { App } from './app'

const mockCheckBackendHealth = vi.mocked(checkBackendHealth)

describe('App', () => {
  beforeEach(() => {
    connectionStatus.value = 'idle'
    linkedSheet.value = null
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)
    expect(screen.getByText('Connecting...')).toBeTruthy()
  })

  it('calls health check on mount', () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)
    expect(mockCheckBackendHealth).toHaveBeenCalledOnce()
  })

  it('shows setup placeholder when connected and no sheet linked', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    render(<App />)

    await waitFor(() => {
      expect(connectionStatus.value).toBe('connected')
    })

    expect(screen.getByText('Set up your Score Sheet to get started')).toBeTruthy()
  })

  it('does not show setup placeholder when sheet is linked', async () => {
    mockCheckBackendHealth.mockResolvedValueOnce({ data: { status: 'ok' } })
    linkedSheet.value = { id: 'sheet-1', name: 'Test Sheet' }
    render(<App />)

    await waitFor(() => {
      expect(connectionStatus.value).toBe('connected')
    })

    expect(screen.queryByText('Set up your Score Sheet to get started')).toBeNull()
  })
})
