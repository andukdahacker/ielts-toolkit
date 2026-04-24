import {
  studentRoster, studentIndex, canNavigateNext, canNavigatePrev,
  navigateNext, navigatePrev,
} from '../state/students'

export function StudentNav() {
  const roster = studentRoster.value
  if (roster.length <= 1) return null
  if (studentIndex.value < 0) return null

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') navigateNext()
    else if (e.key === 'ArrowLeft') navigatePrev()
  }

  return (
    <div class="block student-nav" tabIndex={0} onKeyDown={handleKeyDown}>
      <button
        disabled={!canNavigatePrev.value}
        onClick={navigatePrev}
        aria-label="Previous student"
        aria-disabled={!canNavigatePrev.value}
      >
        &lsaquo; Prev
      </button>
      <span class="gray nav-position">
        Student {studentIndex.value + 1} of {roster.length}
      </span>
      <button
        disabled={!canNavigateNext.value}
        onClick={navigateNext}
        aria-label="Next student"
        aria-disabled={!canNavigateNext.value}
      >
        Next &rsaquo;
      </button>
    </div>
  )
}
