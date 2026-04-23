import { linkedSheet } from '../state/sheet'
import { studentRoster } from '../state/students'

export function SheetInfo() {
  const sheet = linkedSheet.value
  if (!sheet) return null

  return (
    <div class="block">
      <p>
        <strong>Score Sheet: </strong>
        <a href={sheet.url} target="_blank" rel="noopener noreferrer">
          {sheet.name}
        </a>
      </p>
      <p class="gray">{studentRoster.value.length} students</p>
    </div>
  )
}
