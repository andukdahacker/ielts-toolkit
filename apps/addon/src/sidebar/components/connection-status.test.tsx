import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { connectionStatus } from '../state/connection'
import { ConnectionStatus } from './connection-status'

describe('ConnectionStatus', () => {
  beforeEach(() => {
    connectionStatus.value = 'idle'
  })

  it('shows "Connecting..." when idle', () => {
    render(<ConnectionStatus />)
    expect(screen.getByText('Connecting...')).toBeTruthy()
  })

  it('shows "Connecting..." when connecting', () => {
    connectionStatus.value = 'connecting'
    render(<ConnectionStatus />)
    expect(screen.getByText('Connecting...')).toBeTruthy()
  })

  it('shows "Connected" when connected', () => {
    connectionStatus.value = 'connected'
    render(<ConnectionStatus />)
    expect(screen.getByText('Connected')).toBeTruthy()
  })

  it('shows "Can\'t connect" with retry button when error', () => {
    connectionStatus.value = 'error'
    render(<ConnectionStatus />)
    expect(screen.getByText("Can't connect")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('has appropriate aria-label for each state', () => {
    connectionStatus.value = 'connecting'
    const { unmount } = render(<ConnectionStatus />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Checking connection')
    unmount()

    connectionStatus.value = 'connected'
    const { unmount: unmount2 } = render(<ConnectionStatus />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Connected to backend')
    unmount2()

    connectionStatus.value = 'error'
    render(<ConnectionStatus />)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'Connection failed')
  })
})
