import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ConfirmDialog } from './confirm-dialog'

describe('ConfirmDialog', () => {
  const defaultActions = [
    { label: 'Save', onClick: vi.fn(), primary: true },
    { label: 'Discard', onClick: vi.fn() },
    { label: 'Cancel', onClick: vi.fn() },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open is true', () => {
    render(<ConfirmDialog message="Unsaved changes" actions={defaultActions} open={true} />)
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmDialog message="Unsaved changes" actions={defaultActions} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('calls correct action on button click', () => {
    render(<ConfirmDialog message="Test" actions={defaultActions} open={true} />)
    fireEvent.click(screen.getByText('Save'))
    expect(defaultActions[0].onClick).toHaveBeenCalledOnce()
  })

  it('calls last non-primary action on Escape key', () => {
    render(<ConfirmDialog message="Test" actions={defaultActions} open={true} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultActions[2].onClick).toHaveBeenCalledOnce()
  })

  it('has role="dialog" and aria-modal', () => {
    render(<ConfirmDialog message="Test message" actions={defaultActions} open={true} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Test message')
  })

  it('primary button gets action class', () => {
    render(<ConfirmDialog message="Test" actions={defaultActions} open={true} />)
    const saveBtn = screen.getByText('Save')
    expect(saveBtn.className).toBe('action')
  })

  it('non-primary buttons get create class', () => {
    render(<ConfirmDialog message="Test" actions={defaultActions} open={true} />)
    const discardBtn = screen.getByText('Discard')
    expect(discardBtn.className).toBe('create')
  })

  it('traps focus within dialog on Tab', () => {
    render(<ConfirmDialog message="Test" actions={defaultActions} open={true} />)
    const buttons = screen.getAllByRole('button')
    const lastBtn = buttons[buttons.length - 1];
    (lastBtn as HTMLElement).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(buttons[0])
  })
})
