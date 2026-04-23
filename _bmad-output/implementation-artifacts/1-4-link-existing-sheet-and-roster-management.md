# Story 1.4: Link Existing Sheet & Roster Management

Status: done

## Story

As a teacher,
I want to link my existing Score Sheet and add new students over time,
So that I can use my current tracking spreadsheet and keep my roster up to date as I take on new students.

## Acceptance Criteria

1. **Given** the teacher selects "Link existing Sheet" from the setup flow **When** the link flow begins **Then** the teacher can paste a Google Sheets URL (same URL-paste approach as Story 1.3 import flow)
   > **Deviation from epic:** Epic AC1 says "file browser opens." URL paste is a deliberate Phase 1 simplification — Google Picker API requires additional client-side OAuth setup. URL paste was established in Story 1.3 and is consistent across both flows. Picker can be added in a future enhancement.

2. **Given** the teacher submits a Sheet URL **When** the add-on analyzes its structure **Then** it detects headers and shows a preview: column names, first few rows, and asks the teacher to confirm which column contains student names

3. **Given** the Sheet structure is detected successfully **When** the teacher confirms the column mapping **Then** the Sheet is linked (with the chosen student column stored), the student picker dropdown populates with the detected names, and the sidebar transitions to grading-ready state

4. **Given** the teacher selects a Sheet whose structure can't be detected (empty Sheet, no columns with data) **When** the add-on fails to identify usable columns **Then** the sidebar shows: "We couldn't detect a student roster in this Sheet. Would you like to create a new Score Sheet instead?" with options to try a different Sheet or create a new one

5. **Given** the teacher sees column previews but none contain student names **When** they can't identify a student name column **Then** a "None of these look right" link is available that shows the same fallback message from AC #4 with recovery options

6. **Given** a teacher with a linked Score Sheet and existing roster **When** they want to add a new student **Then** they can access an "Add student" option in the sidebar, enter the student name, and the name is appended to the roster in the linked Sheet and immediately available in the student picker dropdown

7. **Given** a teacher adds a new student **When** the student is added to the Sheet **Then** the new row is written to the stored student column (matching the column confirmed during linking), the new row copies formatting from the row above it (font, background, borders) to match the existing sheet structure, and the student picker refreshes to include the new name

## Tasks / Subtasks

- [x] Task 1: Add student column tracking to server-side Sheet functions (AC: #3, #7)
  - [x] 1.1 Update `linkSheet()` in `src/server/sheets.ts` — add `studentColumn` parameter (0-based column index). Store as `LINKED_SHEET_STUDENT_COL` in `UserProperties`. Signature: `linkSheet(sheetId: string, sheetName: string, sheetUrl: string, studentColumn: number): void`
  - [x] 1.2 Update `getLinkedSheet()` — return `studentColumn` field. Read from `LINKED_SHEET_STUDENT_COL` property, default to `0` if not present (backwards compatible with Story 1.3 sheets). Return type becomes `{ id, name, url, studentColumn }`
  - [x] 1.3 Update `unlinkSheet()` — also delete `LINKED_SHEET_STUDENT_COL` property
  - [x] 1.4 Update `getStudentRoster()` — read student column from `getLinkedSheet().studentColumn` instead of hardcoding column 1. Use `sheet.getRange(2, studentColumn + 1, lastRow - 1, 1)`
  - [x] 1.5 Add `addStudentToRoster(name: string): string[]` function — see Dev Notes for full spec including:
    - LockService for write safety
    - Column-specific last-row detection (NOT `sheet.getLastRow()`)
    - Server-side duplicate check (case-insensitive)
    - Name length validation (max 100 chars)
    - Formula injection sanitization
    - Format copying from row above
    - Error handling for deleted/inaccessible sheets
  - [x] 1.6 Add `getSheetMeta(sheetUrl: string): { id: string; name: string; url: string }` server function — opens Sheet by URL, returns its ID, name, and URL. Used by `confirmNames()` in link mode to get sheet metadata before calling `linkSheet()`. Wrap in try/catch with clear error: "Can't access this Sheet."

- [x] Task 2: Update type declarations and gas.ts wrappers (AC: #3, #6)
  - [x] 2.1 Update `SheetInfo` type in `src/sidebar/gas-types.d.ts` — add `studentColumn: number` field
  - [x] 2.2 Update `RunnerWithHandlers` interface in `gas-types.d.ts` — update `linkSheet` signature to include `studentColumn` param, add `addStudentToRoster(name: string): void` declaration, add `getSheetMeta(sheetUrl: string): void` declaration
  - [x] 2.3 Update `linkSheet()` in `src/sidebar/lib/gas.ts` — add `studentColumn: number` parameter, pass through to `callGas`
  - [x] 2.4 Add `addStudentToRoster(name: string)` export in `gas.ts` — returns `Promise<string[]>` (updated roster)
  - [x] 2.5 Add `getSheetMeta(sheetUrl: string)` export in `gas.ts` — returns `Promise<{ id: string; name: string; url: string }>`
  - [x] 2.6 Update `src/sidebar/lib/gas.test.ts` — update `linkSheet` test for new param, add `addStudentToRoster` and `getSheetMeta` tests

- [x] Task 3: Add link flow to sheet state (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Update `src/sidebar/state/sheet.ts`:
    - Add `setupMode` signal: `signal<'create' | 'link'>('create')` — tracks which flow is active
    - Add `selectedColumnIndex` signal: `signal<number>(-1)` — stores the column chosen during linking
    - Implement `startLinkExisting()` — set `setupMode` to `'link'`, push history, navigate directly to `'import-url'` step (deliberately skips `'choose-students'` — in link mode the teacher always selects from the sheet's existing data, so the "import vs. manual" choice doesn't apply)
    - Update `selectColumn()` — store `selectedColumnIndex.value = index` before extracting names
    - Update `confirmNames()` to check `setupMode` — see Dev Notes "confirmNames in Link Mode" for the exact spec
    - Update `confirmNames()` call to `gasLinkSheet` — pass `studentColumn` as 4th arg (0 for create mode, `selectedColumnIndex.value` for link mode)
    - Update `resetSetup()` — also reset `setupMode` to `'create'` and `selectedColumnIndex` to `-1`
  - [x] 3.2 Update `src/sidebar/state/sheet.test.ts` — add tests for link flow: `startLinkExisting()` sets mode and navigates to `import-url` (not `choose-students`), `confirmNames()` in link mode calls `getSheetMeta` + `linkSheet` (no `createScoreSheet`), `selectedColumnIndex` tracking, error handling when `getSheetMeta` fails mid-confirm

- [x] Task 4: Update linkedSheet signal type across codebase (AC: #3)
  - [x] 4.1 Update `linkedSheet` signal type in `sheet.ts` from `{ id: string; name: string; url: string } | null` to `{ id: string; name: string; url: string; studentColumn: number } | null`
  - [x] 4.2 Update `initializeSheet()` — `getLinkedSheet()` now returns `studentColumn`, pass through to `linkedSheet` signal
  - [x] 4.3 Update all test files that set `linkedSheet.value` — add `studentColumn: 0` to mock values:
    - `app.test.tsx`
    - `sheet-info.test.tsx`
    - `student-picker.test.tsx`
    - `sheet.test.ts`
  - [x] 4.4 Verify `sheet-info.tsx` and `student-picker.tsx` don't break — they only read `id`, `name`, `url` so the new field is additive

- [x] Task 5: Add "Add Student" functionality (AC: #6, #7)
  - [x] 5.1 Add `addStudent()` action in `src/sidebar/state/students.ts`:
    - Import `addStudentToRoster as gasAddStudent` from gas.ts
    - Add `addingStudent` signal: `signal<boolean>(false)` — simple busy guard (this is a single-action guard, not a multi-state async status — boolean is appropriate here, unlike grading status which needs typed states)
    - Add `addStudentError` signal: `signal<string | null>(null)`
    - `addStudent(name: string)` action:
      - Trim name, validate non-empty
      - Validate length <= 100 characters
      - Check for duplicate (case-insensitive) against current `studentRoster` — set error if exists: "A student with this name already exists"
      - Set `addingStudent` to true, clear `addStudentError`
      - Call `gasAddStudent(name)`
      - Update `studentRoster` signal with returned roster
      - Auto-select the newly added student
      - Reset `addingStudent` to false
      - On error: set `addStudentError`, reset busy flag
  - [x] 5.2 Update `src/sidebar/state/students.test.ts` — add tests for `addStudent()`: success, duplicate rejection, name too long, error handling, busy guard
  - [x] 5.3 Create `src/sidebar/components/add-student.tsx`:
    - Collapsible section with "Add student" link/button that expands to show:
      - Text input for student name (`.form-group` wrapper, label above, `maxlength="100"`)
      - "Add" button (gray `.create`, not blue — the main view already has its primary action)
      - "Cancel" link to collapse
    - Shows inline error from `addStudentError` signal
    - Disables "Add" button while `addingStudent` is true
    - On success: collapse form, clear input
    - Keyboard accessible: Enter to submit, Escape to cancel
  - [x] 5.4 Create `src/sidebar/components/add-student.test.tsx` — test expand/collapse, form submission, validation, error display
  - [x] 5.5 Update `src/sidebar/components/app.tsx` — add `<AddStudent />` component below `<StudentPicker />` in the grading-ready state

- [x] Task 6: Enable "Link existing Sheet" button in setup UI (AC: #1, #4, #5)
  - [x] 6.1 Update `src/sidebar/components/setup-sheet.tsx`:
    - In `ChooseMethod`: remove `disabled` from "Link existing Sheet" button, remove `title="Coming in next update"`, wire `onClick` to `startLinkExisting()`
    - The link flow reuses `ImportUrl`, `ImportColumns`, and `ImportPreview` steps — no new step components needed
    - In `ImportUrl`: initialize local `url` state from `importSheetUrl.value` so the URL is preserved on back navigation: `const [url, setUrl] = useState(importSheetUrl.value)`
    - In `ImportColumns`: add a "None of these look right" link at the bottom. When clicked, show fallback message: "We couldn't detect a student roster in this Sheet. Would you like to create a new Score Sheet instead?" with two buttons: "Try a different Sheet" (goes back to URL step) and "Create new Score Sheet" (calls `resetSetup()` then `startCreateNew()`)
    - In `ImportPreview`: when `setupMode.value === 'link'`, change confirm button text from "Confirm" to "Link this Sheet" and the busy text from "Creating..." to "Linking..."
    - In `Creating` step: show "Linking your Sheet..." when `setupMode.value === 'link'`, "Creating your Score Sheet..." when `setupMode.value === 'create'`
  - [x] 6.2 Update `src/sidebar/components/setup-sheet.test.tsx` — test "Link existing Sheet" button is enabled and fires `startLinkExisting()`, test "None of these look right" fallback, test link-mode confirm text, test URL preservation on back navigation

- [x] Task 7: Update mocks (AC: all)
  - [x] 7.1 Update `src/sidebar/__mocks__/gas-mock.ts`:
    - Update `linkSheet` mock to accept 4th param `studentColumn`
    - Add `addStudentToRoster` mock — returns `[...existingNames, newName]`
    - Add `getSheetMeta` mock — returns `{ id: 'mock-id', name: 'Linked Sheet', url: 'https://...' }`
    - Update `getLinkedSheet` mock response to include `studentColumn: 0`
  - [x] 7.2 Update mock runner interface to include `addStudentToRoster` and `getSheetMeta`

- [x] Task 8: Verify build and integration (AC: all)
  - [x] 8.1 Run `turbo build` — all workspaces build successfully
  - [x] 8.2 Run `turbo test` — all tests pass including Story 1.1, 1.2, 1.3 tests (no regressions)
  - [x] 8.3 Verify `dist/sidebar.html` remains under 100KB
  - [x] 8.4 Open `index.dev.html` — verify link flow works end-to-end with mocked data, verify add student works

## Dev Notes

### Architecture: Reuse Import Flow for Linking

The link flow reuses the existing import flow steps (`import-url` → `import-columns` → `import-preview` → `creating` → `done`) with a `setupMode` signal distinguishing behavior:

| Step | Create Mode (Story 1.3) | Link Mode (Story 1.4) |
|------|------------------------|----------------------|
| `choose-method` | Entry point | Entry point |
| `choose-students` | "Import vs. manual" choice | **SKIPPED** — link always reads from sheet |
| `import-url` | Paste URL to import names FROM | Paste URL of Sheet TO LINK |
| `import-columns` | Pick column with student names | Same |
| `import-preview` | "Found N names. Confirm?" | Same, button says "Link this Sheet" |
| `creating` | Creates new Sheet + links it | Links existing Sheet (no creation) |
| `done` | Grading-ready state | Same |

**Why link mode skips `choose-students`:** In link mode, the teacher is linking an existing sheet that already has student names in it. There's no "import vs. type manually" decision — they always select from the sheet's existing columns. `startLinkExisting()` navigates directly to `import-url`.

### Student Column Tracking

**Problem:** Story 1.3 sheets always use column A (index 0) for student names. Linked sheets may have student names in any column.

**Solution:** Store `LINKED_SHEET_STUDENT_COL` (0-based index) in `UserProperties`. All functions that read/write student names use this value.

**Backwards compatibility:** `getLinkedSheet()` defaults `studentColumn` to `0` when the property doesn't exist — sheets linked by Story 1.3 continue working without migration.

**Updated `SheetInfo` type:**
```typescript
type SheetInfo = {
  id: string
  name: string
  url: string
  studentColumn: number  // NEW: 0-based column index for student names
}
```

### Updated linkSheet Signature

```typescript
function linkSheet(sheetId: string, sheetName: string, sheetUrl: string, studentColumn: number): void {
  const props = PropertiesService.getUserProperties()
  props.setProperties({
    'LINKED_SHEET_ID': sheetId,
    'LINKED_SHEET_NAME': sheetName,
    'LINKED_SHEET_URL': sheetUrl,
    'LINKED_SHEET_STUDENT_COL': String(studentColumn),
  })
}
```

### Updated getStudentRoster

Must read from the stored student column, not hardcoded column 1:

```typescript
function getStudentRoster(): string[] {
  const linked = getLinkedSheet()
  if (!linked) throw new Error('No Score Sheet linked')
  // ... open sheet ...
  const col = linked.studentColumn + 1  // 0-based → 1-based for getRange
  const range = sheet.getRange(2, col, lastRow - 1, 1)
  // ... extract names ...
}
```

### getSheetMeta Server Function

Returns sheet metadata from a URL. Used by `confirmNames()` in link mode to get the sheet's ID and name before calling `linkSheet()`.

```typescript
function getSheetMeta(sheetUrl: string): { id: string; name: string; url: string } {
  const id = _sheetsParseUrl(sheetUrl)
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(id)
  } catch {
    throw new Error("Can't access this Sheet. It may have been deleted or you lost access.")
  }
  return {
    id: spreadsheet.getId(),
    name: spreadsheet.getName(),
    url: spreadsheet.getUrl(),
  }
}
```

### addStudentToRoster Server Function

```typescript
function addStudentToRoster(name: string): string[] {
  if (!name || !name.trim()) throw new Error('Student name is required')
  const trimmed = name.trim()
  if (trimmed.length > 100) throw new Error('Student name must be 100 characters or fewer')

  const linked = getLinkedSheet()
  if (!linked) throw new Error('No Score Sheet linked')

  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  try {
    spreadsheet = SpreadsheetApp.openById(linked.id)
  } catch {
    throw new Error('Score Sheet is no longer accessible. Try relinking your Sheet.')
  }

  const sheet = spreadsheet.getSheets()[0]
  const col = linked.studentColumn + 1  // 1-based for getRange

  // Find last occupied row in the SPECIFIC student column (not sheet-wide getLastRow)
  const sheetLastRow = sheet.getLastRow()
  let columnLastRow = 1  // default: only header exists
  if (sheetLastRow > 1) {
    const colValues = sheet.getRange(2, col, sheetLastRow - 1, 1).getValues()
    for (let i = colValues.length - 1; i >= 0; i--) {
      if (colValues[i][0] != null && String(colValues[i][0]).trim() !== '') {
        columnLastRow = i + 2  // +2: skip header row (1-based) + array offset
        break
      }
    }
  }

  // Server-side duplicate check (case-insensitive)
  if (sheetLastRow > 1) {
    const existingNames = sheet.getRange(2, col, columnLastRow - 1, 1).getValues()
    for (let i = 0; i < existingNames.length; i++) {
      if (String(existingNames[i][0]).trim().toLowerCase() === trimmed.toLowerCase()) {
        throw new Error('A student with this name already exists in the Sheet')
      }
    }
  }

  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) {
    throw new Error('Sheet is busy, try again in a moment')
  }

  try {
    const targetRow = columnLastRow + 1
    const targetCell = sheet.getRange(targetRow, col)
    targetCell.setValue(_sheetsSanitize(trimmed))

    // Copy formatting from the row above to match existing sheet structure (epic AC7)
    if (columnLastRow >= 2) {
      const sourceFormat = sheet.getRange(columnLastRow, col)
      sourceFormat.copyFormatToRange(sheet, col, col, targetRow, targetRow)
    }
  } finally {
    lock.releaseLock()
  }

  // Re-read and return full roster
  return getStudentRoster()
}
```

**Key design decisions:**
- **Column-specific last-row detection:** Scans the student column from bottom to top for the last non-empty cell. Does NOT use `sheet.getLastRow()` which returns the sheet-wide last row and would append below unrelated data in other columns.
- **Server-side duplicate check:** Validates before writing. The client also checks, but the server check catches races and stale client state.
- **Format copying:** Uses `copyFormatToRange()` from the row above so the new row matches existing sheet formatting (bold, background, borders). Satisfies epic AC7 "follows the same pre-formatted structure."
- **LockService:** Per architecture doc, all Sheet write operations use `LockService.getScriptLock()`. Lock released in `finally`.
- **Error handling:** Wraps `openById()` in try/catch with teacher-friendly message if sheet was deleted.
- **Name validation:** Trims, rejects empty, caps at 100 characters.

### confirmNames in Link Mode

When `setupMode.value === 'link'`, `confirmNames()` uses this exact flow:

```typescript
// Inside confirmNames(), after the mode check:
if (setupMode.value === 'link') {
  // Step 1: Get sheet metadata (id, name) from the URL
  let meta: { id: string; name: string; url: string }
  try {
    meta = await gasGetSheetMeta(importSheetUrl.value)
  } catch (err) {
    // Sheet became inaccessible between column selection and confirmation
    setupStep.value = previousStep
    setupError.value = err instanceof Error
      ? err.message
      : "Can't access this Sheet anymore. Try a different Sheet."
    asyncBusy.value = false
    return
  }

  // Step 2: Link the sheet with the chosen student column
  await gasLinkSheet(meta.id, meta.name, meta.url, selectedColumnIndex.value)
  linkedSheet.value = { ...meta, studentColumn: selectedColumnIndex.value }
  studentRoster.value = names
  stepHistory.push(previousStep)
  setupStep.value = 'done'
  return
}
// ... existing create mode logic with studentColumn=0 ...
```

**Error handling:** If `getSheetMeta()` fails (sheet deleted between column selection and confirm), the UI reverts to the previous step with a clear error message. The teacher can go back and try a different URL. If `linkSheet()` fails, the existing catch block in `confirmNames()` handles it the same as create mode.

### ImportUrl: Preserve URL on Back Navigation

The `ImportUrl` component currently uses `useState('')` which clears the URL when the teacher navigates back. Fix by initializing from the signal:

```typescript
// In ImportUrl component:
const [url, setUrl] = useState(importSheetUrl.value)
```

This ensures the previously entered URL is restored if the teacher goes back from column selection.

### Fallback for Unrecognizable Sheets (AC #4, #5)

Two fallback triggers:

1. **Automatic:** `getSheetColumns()` returns empty array or throws — error already handled by `submitSheetUrl()`. Update error message to match AC: "We couldn't detect a student roster in this Sheet."

2. **Manual:** Teacher sees columns but none look right — add "None of these look right" link in `ImportColumns` component that triggers a fallback view with options:
   - "Try a different Sheet" → navigate back to URL input
   - "Create a new Score Sheet instead" → reset and enter create flow

### Linking a Sheet with Existing Score Data

A teacher's existing sheet may already have score data, formulas, charts, or other content beyond student names. This story does NOT attempt to detect, migrate, or validate existing score data. The only data this story reads from the linked sheet is the student names from the selected column. Story 2.2 (score entry) adds score columns dynamically to the right of existing content — it will need to handle collision with existing columns, but that is Story 2.2's responsibility.

**What this story guarantees:**
- The student name column is correctly identified and stored
- `getStudentRoster()` reads only from the stored column
- `addStudentToRoster()` writes only to the stored column
- No existing data in the sheet is modified during linking

**What this story does NOT handle (and doesn't need to):**
- Validating that the sheet is "compatible" with future score writing
- Detecting or warning about existing score columns
- Migrating existing sheet structures

### Add Student UI Component

Placed below `<StudentPicker />` in the grading-ready state:

```
[Select a student        v]
Student 3 of 15
+ Add student

  ┌─────────────────────────────┐
  │ Student name                │
  │ [                         ] │
  │ [Add] Cancel                │
  └─────────────────────────────┘
```

- Collapsed by default (just the "+ Add student" link)
- Expands on click to show input + buttons
- Collapses after successful add or cancel
- Input validated: non-empty, max 100 characters, no duplicates (case-insensitive)
- Uses `.form-group` for input wrapper, gray `.create` button for "Add" (not blue — one blue button per view rule)
- Error messages in `.error` class
- `maxlength="100"` on input element as first-line defense

### Google Add-ons CSS Classes

| Element | CSS Class | Notes |
|---------|-----------|-------|
| "Link existing Sheet" button | `.create` (gray) | Now enabled, was disabled in 1.3 |
| "None of these look right" | `.secondary` text link | Below column list |
| Fallback message | `.block` with `.gray` text | Clear messaging |
| "Try a different Sheet" | `.create` (gray) | Recovery option |
| "Create new instead" | `.action` (blue) | Primary recovery |
| "Link this Sheet" confirm button | `.action` (blue) | Link mode confirm |
| "+ Add student" link | `.secondary` text | Collapsed trigger |
| Add student input | `.form-group` | Label above field |
| "Add" button | `.create` (gray) | Not primary action |
| Add student error | `.error` | Red text |

### Project Structure Notes

Files created/modified in this story:

```
apps/addon/
├── src/
│   ├── server/
│   │   └── sheets.ts                        # MODIFIED: linkSheet sig, getLinkedSheet, unlinkSheet, getStudentRoster, addStudentToRoster, getSheetMeta
│   └── sidebar/
│       ├── gas-types.d.ts                   # MODIFIED: SheetInfo type, linkSheet sig, addStudentToRoster + getSheetMeta decls
│       ├── components/
│       │   ├── app.tsx                      # MODIFIED: add <AddStudent /> to grading-ready state
│       │   ├── app.test.tsx                 # MODIFIED: update linkedSheet mock values with studentColumn
│       │   ├── setup-sheet.tsx              # MODIFIED: enable link button, add fallback, link-mode labels, ImportUrl init from signal
│       │   ├── setup-sheet.test.tsx         # MODIFIED: test link flow, fallback, URL preservation
│       │   ├── sheet-info.test.tsx          # MODIFIED: update linkedSheet mock values
│       │   ├── student-picker.test.tsx      # MODIFIED: update linkedSheet mock values
│       │   ├── add-student.tsx              # NEW
│       │   └── add-student.test.tsx         # NEW
│       ├── state/
│       │   ├── sheet.ts                     # MODIFIED: setupMode, selectedColumnIndex, startLinkExisting, confirmNames link mode
│       │   ├── sheet.test.ts                # MODIFIED: link flow tests
│       │   ├── students.ts                  # MODIFIED: addStudent action, addingStudent/addStudentError signals
│       │   └── students.test.ts             # MODIFIED: addStudent tests
│       ├── lib/
│       │   ├── gas.ts                       # MODIFIED: linkSheet sig, addStudentToRoster + getSheetMeta exports
│       │   └── gas.test.ts                  # MODIFIED: updated tests
│       └── __mocks__/
│           └── gas-mock.ts                  # MODIFIED: updated mocks
```

### Previous Story Intelligence (Story 1.3)

**Key learnings to apply:**
- `module: "none"` in `tsconfig.server.json` — server files share global scope. All functions must be uniquely named. Use `_sheets` prefix for internal helpers
- `gas.ts` wrapper pattern: `callGas<T>(fn)` generic. Follow same pattern for `addStudentToRoster` and `getSheetMeta`
- Signal pattern: typed defaults, action functions exported, no signal mutation in components
- `asyncBusy` signal guards all async actions — reuse for link flow; add separate `addingStudent` guard for add-student (boolean is appropriate for a single-action guard; the anti-pattern is about using booleans for multi-state async flows like grading status)
- `emptyOutDir: false` in vite config — Vite must not wipe server files
- Test pattern: `vi.mock('../lib/gas')` in component tests, test signal state transitions separately
- The step history array enables back navigation — push before changing step, same pattern for link flow
- `confirmNames()` push to stepHistory only on success — same pattern needed for link mode
- Sanitize user input with `_sheetsSanitize()` for formula injection prevention — apply to `addStudentToRoster`

**Files from previous stories this story modifies:**
- `apps/addon/src/server/sheets.ts` — linkSheet, getLinkedSheet, unlinkSheet, getStudentRoster signatures change
- `apps/addon/src/sidebar/gas-types.d.ts` — SheetInfo type, linkSheet sig, new declarations
- `apps/addon/src/sidebar/lib/gas.ts` — linkSheet sig, new exports
- `apps/addon/src/sidebar/state/sheet.ts` — new signals, updated flow
- `apps/addon/src/sidebar/state/students.ts` — addStudent action
- `apps/addon/src/sidebar/components/setup-sheet.tsx` — enable link button, add fallback, URL preservation
- `apps/addon/src/sidebar/components/app.tsx` — add AddStudent component
- Multiple test files — update `linkedSheet` mock values to include `studentColumn: 0`

### Regression Risk

**Type change propagation:** Adding `studentColumn` to `SheetInfo` affects:
- All test files that create mock `linkedSheet` values (add `studentColumn: 0`)
- The `initializeSheet()` function (passes through new field)
- The `gas-mock.ts` responses

**`linkSheet()` signature change:** All callers must be updated to pass `studentColumn`:
- `confirmNames()` in `sheet.ts` — pass `0` for create mode, `selectedColumnIndex.value` for link mode
- Tests that call `linkSheet` mock

**`getStudentRoster()` behavior change:** Now reads from dynamic column instead of column 1. Ensure backwards compatibility by defaulting to column 0 when property not stored.

### Anti-Patterns (NEVER do these)

- Direct `google.script.run.addStudentToRoster()` without the `gas.ts` wrapper
- Sheet operations going through `callApi()` → backend — Sheet ops are Apps Script only
- `import`/`export` statements in `src/server/sheets.ts` (only `import type` allowed)
- Using boolean flags for multi-state async operations (e.g., grading status should be typed `'idle' | 'submitting' | ...`, not `isGrading: boolean`). Note: `addingStudent: boolean` is fine — it's a simple busy guard for a single-action operation, not a multi-state flow
- Tailwind CSS, shadcn/ui, or Radix UI — use Google Add-ons CSS classes
- Putting new types in `packages/shared/` — addon types stay in addon
- Barrel files for new state or component directories
- Mutating signals directly in components — use action functions from state files
- Hardcoding column index instead of using stored `studentColumn`
- Writing to Sheet without `LockService.getScriptLock()`
- Using `sheet.getLastRow()` to find where to append in a specific column — use column-specific scan instead

### References

- [Source: epics.md#Story 1.4] — Full acceptance criteria (note: AC1 "file browser" replaced with URL paste per Phase 1 simplification)
- [Source: architecture.md#Frontend Architecture (Sidebar)] — Preact + signals + Google Add-ons CSS
- [Source: architecture.md#Communication Patterns] — Three-layer chain, gas.ts wrapper
- [Source: architecture.md#Data Boundaries] — Google Sheet owns score data, accessed by Apps Script only
- [Source: architecture.md#Cross-Cutting Concerns #5] — Dual data store boundary, LockService for writes
- [Source: prd.md#Journey 1] — Linh's first grading: "Link existing Sheet" as alternative onboarding
- [Source: project-context.md#Apps Script Communication Chain] — Three-layer chain rules
- [Source: project-context.md#Preact Sidebar Patterns] — Signal patterns, component rules
- [Source: project-context.md#Google Workspace Add-on UI Rules] — Max one primary button, labels above fields
- [Source: project-context.md#Google Sheets Edge Cases] — LockService before writes
- [Source: 1-3-create-new-score-sheet-with-student-import.md#Dev Notes] — Server-side constraints, global scope, setup flow state machine, gas.ts patterns

### Review Findings

- [x] [Review][Patch] TOCTOU race in `addStudentToRoster` — moved duplicate check and columnLastRow calculation inside lock [sheets.ts]
- [x] [Review][Patch] Off-by-one: `getRange` with 0 rows — changed guard from `sheetLastRow > 1` to `columnLastRow > 1` [sheets.ts]
- [x] [Review][Patch] `parseInt` NaN propagation — added `isNaN` guard, defaults to 0 [sheets.ts]
- [x] [Review][Patch] `selectedStudent` mismatch after sanitization — now selects from server-returned roster [students.ts]
- [x] [Review][Patch] Signal mutation from component — added `clearAddStudentError()` action, used in component [students.ts, add-student.tsx]
- [x] [Review][Patch] Misleading error message in link mode — outer catch now checks `setupMode` [sheet.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blocking issues.

### Completion Notes List

- **Task 1:** Updated all server-side Sheet functions: `linkSheet()` now stores `studentColumn`, `getLinkedSheet()` returns it with default `0` for backwards compatibility, `unlinkSheet()` cleans up the property, `getStudentRoster()` reads from dynamic column. Added `addStudentToRoster()` with LockService, column-specific last-row detection, duplicate check, format copying, and formula sanitization. Added `getSheetMeta()` for link-mode metadata retrieval.
- **Task 2:** Introduced `LinkedSheetInfo` type (extends `SheetInfo` with `studentColumn`) in `gas-types.d.ts`. Updated `gas.ts` wrappers: `linkSheet()` accepts `studentColumn`, added `addStudentToRoster()` and `getSheetMeta()` exports. Added 4 new gas wrapper tests (17 total).
- **Task 3:** Added `setupMode` and `selectedColumnIndex` signals to sheet state. `startLinkExisting()` navigates directly to `import-url` (skipping `choose-students`). `confirmNames()` branches on `setupMode` — link mode calls `getSheetMeta` + `linkSheet`, create mode calls `createScoreSheet` + `linkSheet`. `resetSetup()` clears new signals. Added 6 link flow tests (30 total).
- **Task 4:** Updated `linkedSheet` signal type to `LinkedSheetInfo | null`. Updated all test files with `studentColumn: 0` mock values. Verified `sheet-info.tsx` and `student-picker.tsx` are additive-compatible.
- **Task 5:** Added `addStudent()` action with validation (empty, length, duplicate), busy guard, and error handling. Created `AddStudent` collapsible component with keyboard accessibility (Enter/Escape). Added 7 student state tests (17 total) and 8 component tests.
- **Task 6:** Enabled "Link existing Sheet" button. `ImportUrl` preserves URL on back navigation. `ImportColumns` adds "None of these look right" fallback with recovery options. `ImportPreview` and `Creating` show link-mode labels. Added 5 new setup-sheet tests (24 total).
- **Task 7:** Updated `gas-mock.ts` with new methods and response data.
- **Task 8:** `turbo build` passes (sidebar.html = 33KB). `turbo test` passes (128 tests, 0 failures).

### Change Log

- 2026-04-23: Implemented Story 1.4 — Link Existing Sheet & Roster Management

### File List

- `apps/addon/src/server/sheets.ts` — MODIFIED: linkSheet sig, getLinkedSheet returns studentColumn, unlinkSheet cleanup, getStudentRoster dynamic column, addStudentToRoster, getSheetMeta
- `apps/addon/src/sidebar/gas-types.d.ts` — MODIFIED: LinkedSheetInfo type, linkSheet sig, addStudentToRoster + getSheetMeta declarations
- `apps/addon/src/sidebar/lib/gas.ts` — MODIFIED: linkSheet sig, addStudentToRoster + getSheetMeta exports, getLinkedSheet returns LinkedSheetInfo
- `apps/addon/src/sidebar/lib/gas.test.ts` — MODIFIED: updated linkSheet test, added addStudentToRoster + getSheetMeta tests
- `apps/addon/src/sidebar/state/sheet.ts` — MODIFIED: LinkedSheetInfo type, setupMode + selectedColumnIndex signals, startLinkExisting, selectColumn stores index, confirmNames link mode, resetSetup
- `apps/addon/src/sidebar/state/sheet.test.ts` — MODIFIED: link flow tests, updated mock values
- `apps/addon/src/sidebar/state/students.ts` — MODIFIED: addStudent action, addingStudent + addStudentError signals
- `apps/addon/src/sidebar/state/students.test.ts` — MODIFIED: addStudent tests
- `apps/addon/src/sidebar/components/add-student.tsx` — NEW: collapsible add student form component
- `apps/addon/src/sidebar/components/add-student.test.tsx` — NEW: add student component tests
- `apps/addon/src/sidebar/components/app.tsx` — MODIFIED: added AddStudent component to grading-ready state
- `apps/addon/src/sidebar/components/app.test.tsx` — MODIFIED: updated linkedSheet mock values
- `apps/addon/src/sidebar/components/setup-sheet.tsx` — MODIFIED: enabled link button, URL preservation, fallback UI, link-mode labels
- `apps/addon/src/sidebar/components/setup-sheet.test.tsx` — MODIFIED: link flow tests, fallback tests, URL preservation test
- `apps/addon/src/sidebar/components/sheet-info.test.tsx` — MODIFIED: updated linkedSheet mock values
- `apps/addon/src/sidebar/__mocks__/gas-mock.ts` — MODIFIED: updated mocks for new functions
