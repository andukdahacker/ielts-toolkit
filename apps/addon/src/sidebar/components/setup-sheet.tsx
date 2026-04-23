import { useState } from 'preact/hooks'
import {
  setupStep,
  setupError,
  importedColumns,
  previewNames,
  asyncBusy,
  startCreateNew,
  selectImportFromSheet,
  selectManualEntry,
  submitSheetUrl,
  selectColumn,
  confirmNames,
  submitManualNames,
  goBack,
} from '../state/sheet'

function ErrorMessage() {
  if (!setupError.value) return null
  return <p class="error">{setupError.value}</p>
}

function BackButton() {
  return (
    <a
      href="#"
      class="secondary"
      onClick={(e: Event) => {
        e.preventDefault()
        goBack()
      }}
    >
      &larr; Back
    </a>
  )
}

function ChooseMethod() {
  return (
    <div>
      <p>Set up your Score Sheet to get started</p>
      <div class="block">
        <button class="action" onClick={startCreateNew}>
          Create new Score Sheet
        </button>
        <p class="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>Recommended</p>
      </div>
      <div class="block" style={{ marginTop: '8px' }}>
        <button class="create" disabled title="Coming in next update">
          Link existing Sheet
        </button>
      </div>
    </div>
  )
}

function ChooseStudents() {
  return (
    <div>
      <BackButton />
      <p>How would you like to add students?</p>
      <div class="block">
        <button class="create" onClick={selectImportFromSheet}>
          Import names from a Google Sheet
        </button>
      </div>
      <div class="block" style={{ marginTop: '8px' }}>
        <button class="create" onClick={selectManualEntry}>
          Type names manually
        </button>
      </div>
    </div>
  )
}

function ImportUrl() {
  const [url, setUrl] = useState('')

  return (
    <div>
      <BackButton />
      <div class="form-group">
        <label>Google Sheets URL</label>
        <input
          type="text"
          value={url}
          onInput={(e: Event) => setUrl((e.target as HTMLInputElement).value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          style={{ width: '100%' }}
        />
      </div>
      <ErrorMessage />
      <button class="action" onClick={() => submitSheetUrl(url)} disabled={!url.trim() || asyncBusy.value}>
        {asyncBusy.value ? 'Loading...' : 'Load columns'}
      </button>
    </div>
  )
}

function ImportColumns() {
  const columns = importedColumns.value
  if (!columns) return null

  return (
    <div>
      <BackButton />
      <p>Select the column containing student names:</p>
      <ErrorMessage />
      {columns.map((col) => (
        <div
          key={col.index}
          class="block"
          style={{ cursor: 'pointer', marginBottom: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          onClick={() => selectColumn(col.index)}
          tabIndex={0}
          role="button"
          aria-label={`Select column ${col.header}`}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              selectColumn(col.index)
            }
          }}
        >
          <strong>{col.header}</strong>
          {col.preview.length > 0 && (
            <span class="gray" style={{ marginLeft: '8px' }}>
              {col.preview.join(', ')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function ImportPreview() {
  const names = previewNames.value
  if (!names) return null

  const showAll = names.length <= 10
  const displayNames = showAll ? names : names.slice(0, 5)

  return (
    <div>
      <BackButton />
      <p>We found {names.length} names. Correct?</p>
      <ul>
        {displayNames.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ul>
      {!showAll && <p class="gray">...and {names.length - 5} more</p>}
      <ErrorMessage />
      <div style={{ marginTop: '8px' }}>
        <button class="action" onClick={() => confirmNames(names)} disabled={asyncBusy.value}>
          {asyncBusy.value ? 'Creating...' : 'Confirm'}
        </button>
        <button
          style={{ marginLeft: '8px' }}
          onClick={() => goBack()}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ManualEntry() {
  const [text, setText] = useState('')

  return (
    <div>
      <BackButton />
      <div class="form-group">
        <label>Student names</label>
        <textarea
          value={text}
          onInput={(e: Event) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Enter student names, one per line or comma-separated"
          rows={6}
          style={{ width: '100%' }}
        />
      </div>
      <ErrorMessage />
      <button class="action" onClick={() => submitManualNames(text)} disabled={!text.trim()}>
        Preview names
      </button>
    </div>
  )
}

function Creating() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <p>Creating your Score Sheet...</p>
      <div class="gray">Please wait</div>
    </div>
  )
}

export function SetupSheet() {
  const step = setupStep.value

  switch (step) {
    case 'choose-method':
      return <ChooseMethod />
    case 'choose-students':
      return <ChooseStudents />
    case 'import-url':
      return <ImportUrl />
    case 'import-columns':
      return <ImportColumns />
    case 'import-preview':
      return <ImportPreview />
    case 'manual-entry':
      return <ManualEntry />
    case 'creating':
      return <Creating />
    case 'done':
      return null
    default:
      return null
  }
}
