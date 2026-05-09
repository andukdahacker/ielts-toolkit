import { useEffect, useRef } from 'preact/hooks'
import { showRegradeConfirm, confirmRegrade, cancelRegrade } from '../state/grading'

export function RegradeConfirm() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showRegradeConfirm.value || !containerRef.current) return
    const firstButton = containerRef.current.querySelector('button')
    firstButton?.focus()
  }, [showRegradeConfirm.value])

  useEffect(() => {
    if (!showRegradeConfirm.value) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelRegrade()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showRegradeConfirm.value])

  if (!showRegradeConfirm.value) return null

  return (
    <div class="block" ref={containerRef} role="dialog" aria-modal="true" aria-label="Re-grade confirmation">
      <p>Clear previous AI comments before re-grading?</p>
      <div class="block">
        <button class="action" onClick={() => { confirmRegrade(true).catch(() => {}) }}>
          Yes, clear comments
        </button>
        {' '}
        <button onClick={() => { confirmRegrade(false).catch(() => {}) }}>
          No, keep them
        </button>
      </div>
      <a href="#" class="secondary" onClick={(e) => { e.preventDefault(); cancelRegrade() }}>
        Cancel
      </a>
    </div>
  )
}
