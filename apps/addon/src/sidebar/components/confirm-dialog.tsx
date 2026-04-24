import { useEffect, useRef } from 'preact/hooks'

interface DialogAction {
  label: string
  onClick: () => void
  primary?: boolean
}

interface ConfirmDialogProps {
  message: string
  actions: DialogAction[]
  open: boolean
}

export function ConfirmDialog({ message, actions, open }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !dialogRef.current) return
    const firstButton = dialogRef.current.querySelector('button')
    firstButton?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cancelAction = [...actions].reverse().find(a => !a.primary)
        cancelAction?.onClick()
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const buttons = dialogRef.current.querySelectorAll('button')
        if (buttons.length === 0) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div class="confirm-overlay" role="dialog" aria-modal="true" aria-label={message}>
      <div class="confirm-dialog" ref={dialogRef}>
        <p>{message}</p>
        <div class="confirm-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              class={action.primary ? 'action' : 'create'}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
