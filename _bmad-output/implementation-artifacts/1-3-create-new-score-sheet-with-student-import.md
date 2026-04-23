# Story 1.3: Create New Score Sheet with Student Import

Status: done

## Story

As a teacher,
I want to create a new Score Sheet and import my student names from an existing spreadsheet or type them manually,
So that I have a clean, properly formatted roster ready for score tracking without rebuilding my student list from scratch.

## Acceptance Criteria

1. **Given** a teacher with no linked Score Sheet opens the sidebar **When** the setup flow presents options **Then** the teacher sees two choices: "Create new Score Sheet" (recommended) and "Link existing Sheet"

2. **Given** the teacher selects "Create new Score Sheet" **When** the setup flow asks how to add students **Then** the teacher sees two options: "Import names from a Google Sheet" and "Type names manually"

3. **Given** the teacher selects "Import names from a Google Sheet" **When** they provide a Sheet URL and the add-on reads its contents **Then** the sidebar shows the available columns and lets the teacher pick the one containing student names

4. **Given** the teacher picks a column from their existing Sheet **When** the add-on extracts the names **Then** a preview shows: "We found N names: Name1, Name2, Name3... Correct?" with Confirm and Cancel actions

5. **Given** the teacher confirms the imported names **When** the system creates the Score Sheet **Then** a new Google Sheet is created with pre-formatted columns (Student Name, plus expandable structure for IELTS band scores with dates), all student names in column A, and proper structure for future score entries. The original Sheet is not modified

6. **Given** the teacher selects "Type names manually" **When** they enter names (comma-separated or one per line) and confirm **Then** a new Score Sheet is created with the same pre-formatted structure and the manually entered names in column A

7. **Given** the new Score Sheet is created **When** the sidebar updates **Then** the linked Sheet info is displayed, the student picker dropdown is populated with the imported/typed names, and the sidebar transitions to the grading-ready state

8. **Given** a newly created Score Sheet with students but no scores **When** the teacher views the sidebar **Then** appropriate empty states are shown: "No scores yet — grade your first essay to get started" (not error states)

9. **Given** the teacher's import Sheet has no recognizable student name column **When** the add-on scans the Sheet **Then** it shows all columns with previews of their content so the teacher can manually identify the correct column

## Tasks / Subtasks

- [x] Task 1: Update OAuth scopes and server-side Sheet functions (AC: #3, #4, #5, #6)
  - [x] 1.1 Update `appsscript.json` — change `spreadsheets.currentonly` to `spreadsheets` (required for creating new Sheets and reading arbitrary Sheets from a Docs context)
  - [x] 1.2 Create `src/server/sheets.ts` — Sheet operations module with functions:
    - `getSheetColumns(sheetUrl: string)` — opens Sheet by URL, reads row 1 headers + first 3 data rows per column as preview. Limit to first 20 columns. Skip completely empty columns. Handle merged cells by reading the merge anchor value. Returns column metadata array
    - `extractNamesFromColumn(sheetUrl: string, columnIndex: number)` — reads all non-empty values from specified column (skip header row), trims whitespace, filters out whitespace-only entries. Returns string array
    - `createScoreSheet(studentNames: string[])` — creates new Sheet via `SpreadsheetApp.create('IELTS Score Sheet')`, formats headers (row 1: "Student Name" in A1, frozen), writes names to column A starting row 2, applies formatting (bold header, frozen first row and column, column widths). Returns `{ id: string, name: string, url: string }`
    - `getLinkedSheet()` — reads linked Sheet ID/name from `PropertiesService.getUserProperties()`, returns `{ id, name, url } | null`. **Does NOT validate that the Sheet still exists** — caller handles errors
    - `linkSheet(sheetId: string, sheetName: string, sheetUrl: string)` — saves linked Sheet info to `PropertiesService.getUserProperties()`
    - `unlinkSheet()` — clears all linked Sheet properties from `UserProperties`. Called when a linked Sheet is found to be deleted or inaccessible
    - `getStudentRoster()` — reads column A from linked Sheet (skip header), returns string array of student names. **Throws if Sheet is inaccessible** — caller must handle this
  - [x] 1.3 All functions are top-level named functions (no `import`/`export` — Apps Script global scope). Use `_sheets` prefix for internal helpers to avoid name collisions

- [x] Task 2: Add `gas.ts` wrapper functions and type declarations (AC: #3, #4, #5, #6, #7)
  - [x] 2.1 Update `src/sidebar/gas-types.d.ts` — add new function declarations: `getSheetColumns`, `extractNamesFromColumn`, `createScoreSheet`, `getLinkedSheet`, `linkSheet`, `unlinkSheet`, `getStudentRoster`
  - [x] 2.2 Update `src/sidebar/lib/gas.ts` — add typed exports for each new server function with correct return types
  - [x] 2.3 Update `src/sidebar/lib/gas.test.ts` — add tests for new wrapper functions

- [x] Task 3: Create state signals for setup flow and student roster (AC: #1, #7, #8)
  - [x] 3.1 Update `src/sidebar/state/sheet.ts`:
    - **Type change:** Update `linkedSheet` signal type from `{ id: string; name: string } | null` to `{ id: string; name: string; url: string } | null` — add `url` field
    - Add `setupStep` signal: `'choose-method' | 'choose-students' | 'import-url' | 'import-columns' | 'import-preview' | 'manual-entry' | 'creating' | 'done'`
    - Add `setupError` signal: `string | null`
    - Add `importedColumns` signal: `ColumnPreview[] | null` (holds column data during import flow)
    - Add `previewNames` signal: `string[] | null` (holds names pending confirmation)
    - Action functions: `startCreateNew()`, `startLinkExisting()`, `selectImportFromSheet()`, `selectManualEntry()`, `submitSheetUrl(url)`, `selectColumn(index)`, `confirmNames(names)`, `submitManualNames(text)`, `goBack()`, `resetSetup()`
    - `initializeSheet()` action: calls `getLinkedSheet()` on mount. If linked, populates `linkedSheet` signal, then calls `loadRoster()` from `students.ts` to populate student picker. If `getLinkedSheet()` returns a sheet but `loadRoster()` throws (Sheet deleted/inaccessible), catch the error, call `unlinkSheet()` via gas.ts, reset `linkedSheet` to null, and show setup flow — not an error screen
    - `confirmNames(names)` action: after `createScoreSheet()` + `linkSheet()`, directly set `studentRoster` signal from the confirmed names array (no redundant `loadRoster()` round-trip to re-read from Sheet)
  - [x] 3.2 Update `src/sidebar/components/app.test.tsx` — update existing tests to include `url` field in `linkedSheet` mock values (e.g., `linkedSheet.value = { id: '123', name: 'Test Sheet', url: 'https://...' }`)
  - [x] 3.3 Create `src/sidebar/state/students.ts` — student roster signals:
    - `studentRoster` signal: `string[]` (empty array default)
    - `selectedStudent` signal: `string | null`
    - `studentIndex` computed: current student index in roster
    - `loadRoster()` action: calls `getStudentRoster()` via gas.ts, populates signal. **Throws on failure** — caller (`initializeSheet`) handles the error
  - [x] 3.4 Create `src/sidebar/state/sheet.test.ts` — test setup flow transitions, initializeSheet with linked/unlinked/deleted Sheet scenarios
  - [x] 3.5 Create `src/sidebar/state/students.test.ts` — test roster signal actions

- [x] Task 4: Build setup sheet component (AC: #1, #2, #3, #4, #5, #6, #9)
  - [x] 4.1 Replace `src/sidebar/components/setup-sheet-placeholder.tsx` with `src/sidebar/components/setup-sheet.tsx` — multi-step setup wizard:
    - **Step: choose-method** — "Create new Score Sheet" (recommended, blue `.action` button) and "Link existing Sheet" (gray button, disabled — Story 1.4)
    - **Step: choose-students** — "Import names from a Google Sheet" and "Type names manually"
    - **Step: import-url** — text input for Sheet URL + "Load columns" button. Validate URL format before submitting
    - **Step: import-columns** — list of columns with header name + 3-row preview values. Teacher clicks to select column
    - **Step: import-preview** — "We found N names:" followed by name list (show all if <= 10, first 5 + "...and N more" otherwise). Confirm and Cancel buttons
    - **Step: manual-entry** — textarea (placeholder: "Enter student names, one per line or comma-separated") + "Preview names" button. Parse and validate: trim whitespace, remove empty entries, deduplicate, minimum 1 name. Transitions to `import-preview` (same preview/confirm step as import flow — both paths converge here)
    - **Step: creating** — "Creating your Score Sheet..." with spinner
    - **Step: done** — transitions to grading-ready state
    - Back button on each step to return to previous step
  - [x] 4.2 Create `src/sidebar/components/setup-sheet.test.tsx` — test each step renders correctly and transitions work
  - [x] 4.3 Delete `src/sidebar/components/setup-sheet-placeholder.tsx` (replaced)

- [x] Task 5: Build grading-ready landing state (AC: #7, #8)
  - [x] 5.1 Create `src/sidebar/components/sheet-info.tsx` — displays linked Sheet name (clickable link to open Sheet), student count, and sheet URL
  - [x] 5.2 Create `src/sidebar/components/student-picker.tsx` — dropdown to select student from roster. Shows "Student N of M" context. (Previous/next navigation is Story 2.1 — just the dropdown for now)
  - [x] 5.3 Create `src/sidebar/components/empty-state.tsx` — "No scores yet — grade your first essay to get started" message with friendly styling (`.gray` class, centered)
  - [x] 5.4 Update `src/sidebar/components/app.tsx` — after connection is established:
    - Call `initializeSheet()` on mount
    - If no linked Sheet → show `<SetupSheet />`
    - If linked Sheet → show `<SheetInfo />`, `<StudentPicker />`, `<EmptyState />` (scores section is Story 2.2)

- [x] Task 6: Update mocks and local dev harness (AC: #7)
  - [x] 6.1 Update `src/sidebar/__mocks__/gas-mock.ts` — add mock responses for all new server functions:
    - `getLinkedSheet` → return null (no sheet linked) by default
    - `getSheetColumns` → return sample column data (3 columns with headers and preview rows)
    - `extractNamesFromColumn` → return sample student names `['Minh', 'Trang', 'Anh', 'Huy', 'Linh']`
    - `createScoreSheet` → return `{ id: 'mock-id', name: 'IELTS Score Sheet', url: 'https://docs.google.com/spreadsheets/d/mock-id' }`
    - `linkSheet` → return void/success
    - `unlinkSheet` → return void/success
    - `getStudentRoster` → return sample student names array
  - [x] 6.2 Update mock runner interface to include all new function names

- [x] Task 7: Component and integration tests (AC: #1-#9)
  - [x] 7.1 Test setup-sheet.tsx — each step renders, back navigation works, form validation
  - [x] 7.2 Test sheet-info.tsx — displays linked Sheet data
  - [x] 7.3 Test student-picker.tsx — dropdown renders with roster, selection updates signal
  - [x] 7.4 Test app.tsx — landing states: no sheet → setup, linked sheet → grading-ready
  - [x] 7.5 Test state/sheet.ts — setup flow transitions, action functions
  - [x] 7.6 Test state/students.ts — roster loading, student selection

- [x] Task 8: Verify build and integration (AC: all)
  - [x] 8.1 Run `turbo build` — all workspaces build successfully
  - [x] 8.2 Run `turbo test` — all tests pass (including Story 1.1 and 1.2 tests — no regressions)
  - [x] 8.3 Verify `dist/sidebar.html` remains under 100KB
  - [x] 8.4 Open `index.dev.html` — verify full setup flow works with mocked data

## Dev Notes

### Critical: OAuth Scope Change

**The current `spreadsheets.currentonly` scope is insufficient for Story 1.3.** This scope only grants access to the "current" spreadsheet — but the add-on runs inside Google Docs where there IS no current spreadsheet.

**Required change in `appsscript.json`:**
```diff
- "https://www.googleapis.com/auth/spreadsheets.currentonly",
+ "https://www.googleapis.com/auth/spreadsheets",
```

This grants the add-on permission to create new Sheets and read existing Sheets on behalf of the teacher. The teacher will see an updated consent screen on first use after this change.

**Impact:** This is a scope escalation. It is necessary for the core feature (creating Score Sheets). In future Marketplace review, justify this as: "Add-on creates and manages a dedicated Score Sheet for IELTS score tracking."

### Sheet Persistence: UserProperties

The linked Sheet reference must persist across documents and sessions. Use `PropertiesService.getUserProperties()` — this stores data per-user per-script (not per-document).

```typescript
// Storing linked sheet
function linkSheet(sheetId: string, sheetName: string, sheetUrl: string): void {
  const props = PropertiesService.getUserProperties()
  props.setProperties({
    'LINKED_SHEET_ID': sheetId,
    'LINKED_SHEET_NAME': sheetName,
    'LINKED_SHEET_URL': sheetUrl,
  })
}

// Reading linked sheet
function getLinkedSheet(): { id: string; name: string; url: string } | null {
  const props = PropertiesService.getUserProperties()
  const id = props.getProperty('LINKED_SHEET_ID')
  if (!id) return null
  return {
    id,
    name: props.getProperty('LINKED_SHEET_NAME') || 'Score Sheet',
    url: props.getProperty('LINKED_SHEET_URL') || '',
  }
}
```

This ensures:
- FR12: Sidebar retains linked Sheet context across multiple essay documents in the same session
- FR13: Sidebar restores state when reopened

### Score Sheet Format

The new Score Sheet must be structured for future score entries (Epic 2):

```
Row 1 (headers, frozen): | Student Name | (expandable for assignments) |
Row 2:                    | Minh         |                              |
Row 3:                    | Trang        |                              |
...
```

**Column A** = Student names (always present)
**Columns B+** = Score columns added dynamically when scores are saved (Story 2.2). Each assignment creates a group: Date, Task Type, Overall, TA, CC, LR, GRA.

For initial creation, only column A with "Student Name" header is pre-formatted. Do NOT pre-create score columns — they are added on-demand in Story 2.2.

**Formatting applied on creation:**
- Bold header row (row 1)
- Freeze row 1 (headers) and column A (student names)
- Column A width: 200px
- Sheet name: "IELTS Score Sheet" (or teacher can rename later — it's their Sheet)

### File Selection: URL Paste (Phase 1 Simplicity)

For importing student names from an existing Sheet, use a **URL paste approach** rather than Google Picker API. Teacher pastes their Sheet URL, server-side opens it via `SpreadsheetApp.openByUrl()`.

**Rationale:** Google Picker API requires additional client-side setup (load Picker script, OAuth token dance, iframe permissions). For Phase 1 with a solo dev, URL paste is dramatically simpler and achieves the same outcome. Teachers already know how to copy Sheet URLs from their browser.

**URL validation:** Accept URLs matching `https://docs.google.com/spreadsheets/d/{id}/...`. Extract the Sheet ID from the URL server-side.

**Error handling:**
- Invalid URL format → "Please paste a valid Google Sheets URL"
- Sheet not accessible → "Can't access this Sheet. Make sure you have edit or view access to it."
- Sheet is empty → "This Sheet appears to be empty"

### Server-Side Function Design

All functions in `src/server/sheets.ts` must be **top-level named functions** (Apps Script global scope constraint from Story 1.2). Use `_sheets` prefix for internal helpers.

```typescript
// Public functions (exposed to sidebar via google.script.run)
function getSheetColumns(sheetUrl: string): ColumnPreview[]
function extractNamesFromColumn(sheetUrl: string, columnIndex: number): string[]
function createScoreSheet(studentNames: string[]): SheetInfo
function getLinkedSheet(): SheetInfo | null
function linkSheet(sheetId: string, sheetName: string, sheetUrl: string): void
function getStudentRoster(): string[]

function unlinkSheet(): void

// Internal helpers (prefixed to avoid global scope collision)
function _sheetsParseUrl(url: string): string  // Extract Sheet ID from URL
function _sheetsFormatHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): void
```

**Return types (plain objects — no classes across google.script.run boundary):**

```typescript
// Column preview for import step
type ColumnPreview = {
  index: number       // 0-based column index
  header: string      // Value in row 1 (or "Column A", "Column B" if empty)
  preview: string[]   // First 3 non-empty values from rows 2+
}

// Sheet info returned after creation or on load
type SheetInfo = {
  id: string
  name: string
  url: string
}
```

**Note:** These types are used locally in the addon only. They do NOT belong in `packages/shared/` because they are not API contract types — they're internal to the Apps Script ↔ sidebar communication.

### Setup Flow State Machine

The setup component is a multi-step wizard driven by a `setupStep` signal:

```
choose-method → choose-students → import-url → import-columns ↘
                                ↘ manual-entry ────────────────→ import-preview → creating → done
```

Both import and manual entry paths converge at `import-preview` — teacher always confirms the name list before Sheet creation.

Each step has a back button to return to the previous step. The `setupError` signal displays inline errors at any step.

**State transitions (action functions):**
- `startCreateNew()` → sets step to `choose-students`
- `startLinkExisting()` → *disabled* (Story 1.4) — show tooltip "Coming soon"
- `selectImportFromSheet()` → sets step to `import-url`
- `selectManualEntry()` → sets step to `manual-entry`
- `submitSheetUrl(url)` → validates URL, calls `getSheetColumns()`, sets step to `import-columns` (or sets error)
- `selectColumn(index)` → calls `extractNamesFromColumn()`, sets step to `import-preview` (or sets error)
- `confirmNames(names)` → calls `createScoreSheet()` then `linkSheet()`, sets `linkedSheet` signal, sets `studentRoster` directly from `names` array, sets step to `done`
- `submitManualNames(text)` → parses text into names array, validates, sets `previewNames` signal, sets step to `import-preview` (converges with import flow for confirmation)
- `goBack()` → returns to previous step (maintain a step history stack or hardcode transitions)
- `resetSetup()` → resets all setup signals to initial state

### Interaction with Existing Components

**`app.tsx` changes:**
- Call `initializeSheet()` on mount — runs independently of backend connection check (Sheet ops don't need the backend)
- Call `checkConnection()` on mount in parallel (existing behavior)
- Replace `<SetupSheetPlaceholder />` conditional with:
  - No linked Sheet → `<SetupSheet />`
  - Linked Sheet → `<SheetInfo />` + `<StudentPicker />` + `<EmptyState />`

**Sheet operations do NOT go through the backend.** All Sheet functions (`createScoreSheet`, `getStudentRoster`, etc.) go through `google.script.run` → server-side Apps Script → Google Sheets API. They do NOT use `callApi()`. The backend connection check and Sheet initialization are independent — Sheet setup works even if the backend is down. This is the "dual data store boundary" from the architecture: Sheet owns score data, Postgres owns grading jobs.

### Edge Case: Linked Sheet Deleted or Inaccessible

If the teacher previously linked a Sheet but has since deleted it, trashed it, or lost access:

1. `initializeSheet()` calls `getLinkedSheet()` — returns the stored `{ id, name, url }` from UserProperties
2. Then calls `loadRoster()` which calls `getStudentRoster()` which tries `SpreadsheetApp.openById(id)`
3. This **throws** because the Sheet no longer exists

**Recovery flow:**
- `initializeSheet()` catches the error from `loadRoster()`
- Calls `unlinkSheet()` via gas.ts to clear the stale UserProperties
- Resets `linkedSheet` signal to `null`
- The UI shows the setup flow — teacher creates a new Sheet or links a different one
- No error alert shown — just silently recovers to setup. The linked Sheet was stale, not a user error

### Column Preview Edge Cases

`getSheetColumns()` must handle messy real-world Sheets:
- **Merged cells:** Read the top-left cell value of the merge range. Don't crash on `getMergedRanges()`
- **Wide Sheets:** Limit to first 20 columns (no teacher has 20+ columns of student data)
- **Empty columns:** Exclude columns where both header and all preview rows are empty
- **Whitespace-only cells:** Treat as empty
- **Very long cell values:** Truncate preview values to 50 characters with "..." suffix
- **Non-text content (formulas, dates, numbers):** Convert to string via `toString()` for preview

### Manual Name Entry Parsing

When teacher types names manually:
1. Split by newlines first, then by commas within each line
2. Trim whitespace from each name
3. Filter out empty strings
4. Deduplicate (case-insensitive comparison, keep first occurrence)
5. Validate: minimum 1 name, maximum 200 names (reasonable limit)
6. Show preview before creating Sheet (same preview step as import flow)

### Empty State Design

After Sheet creation with students but no scores:
- Show linked Sheet info bar at top
- Show student picker dropdown (populated)
- Show empty state message: "No scores yet — grade your first essay to get started"
- The "Grade with AI" button area is a placeholder for Story 3.2
- The score editor area is a placeholder for Story 2.2
- Use `.gray` and `.secondary` Google Add-ons CSS classes for muted empty state styling

### Google Add-ons CSS Classes to Use

| Element | CSS Class | Notes |
|---------|-----------|-------|
| "Create new Score Sheet" button | `.action` (primary blue) | Max one blue button per view |
| "Link existing Sheet" button | `.create` (gray) | Disabled for Story 1.3 |
| "Import from Sheet" / "Type manually" | `.create` (gray) | Both equal weight |
| Back link | `.secondary` text | Not a button — use `<a>` or text link |
| URL input | `.form-group` wrapper | Label above field |
| Name textarea | `.form-group` wrapper | Label above field |
| Confirm button | `.action` (blue) | Primary action |
| Cancel button | default (gray) | Secondary |
| Error messages | `.error` class | Red text |
| Empty state text | `.gray` class | Muted color |
| Sheet info | `.block` | Content block |
| Student picker dropdown | native `<select>` | Google Add-ons CSS styles it |

### "Link existing Sheet" Button

This button must exist in the UI (AC #1) but its functionality is implemented in **Story 1.4**. For this story:
- Render the button as gray/secondary
- Disable it with `disabled` attribute
- Optionally add a tooltip or small text: "Coming in next update"

### Project Structure Notes

Files created/modified in this story:

```
apps/addon/
├── appsscript.json                          # MODIFIED: scope change
├── src/
│   ├── server/
│   │   └── sheets.ts                        # NEW: Sheet operations
│   └── sidebar/
│       ├── gas-types.d.ts                   # MODIFIED: new function declarations
│       ├── components/
│       │   ├── app.tsx                      # MODIFIED: landing state logic
│       │   ├── app.test.tsx                 # MODIFIED: new landing state tests
│       │   ├── setup-sheet.tsx              # NEW (replaces setup-sheet-placeholder.tsx)
│       │   ├── setup-sheet.test.tsx         # NEW
│       │   ├── setup-sheet-placeholder.tsx  # DELETED
│       │   ├── sheet-info.tsx               # NEW
│       │   ├── sheet-info.test.tsx          # NEW
│       │   ├── student-picker.tsx           # NEW
│       │   ├── student-picker.test.tsx      # NEW
│       │   └── empty-state.tsx              # NEW
│       ├── state/
│       │   ├── sheet.ts                     # MODIFIED: linkedSheet type + setup flow
│       │   ├── sheet.test.ts                # NEW
│       │   ├── students.ts                  # NEW
│       │   └── students.test.ts             # NEW
│       ├── lib/
│       │   ├── gas.ts                       # MODIFIED: new function exports
│       │   └── gas.test.ts                  # MODIFIED: new function tests
│       └── __mocks__/
│           └── gas-mock.ts                  # MODIFIED: new mock responses
```

### Previous Story Intelligence (Story 1.2)

**Key learnings to apply:**
- `module: "none"` in `tsconfig.server.json` — server files share global scope. All functions must be uniquely named. Use `_sheets` prefix for internal helpers in `sheets.ts`
- `gas.ts` wrapper pattern: `callGas<T>(fn)` generic. Follow same pattern for new functions
- `gas-mock.ts` pattern: add to `mockResponses` record + add methods to `MockRunner` interface + `createMockRunner()` body
- `gas-types.d.ts`: add declarations to `RunnerWithHandlers` interface
- Signal pattern: typed defaults, action functions exported, no signal mutation in components
- Build outputs `.js` (not `.gs`) — clasp accepts both. No rename needed
- `emptyOutDir: false` in vite config — Vite must not wipe server files
- Test pattern: `vi.mock('../lib/gas')` in component tests, test signal state transitions separately
- Review from 1.2: null guards, URL normalization, error path coverage — apply same rigor

**Files from previous stories this story interacts with:**
- `apps/addon/appsscript.json` — scope change
- `apps/addon/src/sidebar/lib/gas.ts` — add new function exports
- `apps/addon/src/sidebar/gas-types.d.ts` — add new declarations
- `apps/addon/src/sidebar/__mocks__/gas-mock.ts` — add new mocks
- `apps/addon/src/sidebar/components/app.tsx` — modify landing state
- `apps/addon/src/sidebar/components/app.test.tsx` — update `linkedSheet` mock values to include `url` field (regression fix)
- `apps/addon/src/sidebar/state/sheet.ts` — expand type + add setup flow
- `apps/addon/src/sidebar/components/setup-sheet-placeholder.tsx` — DELETE (replaced)

### Anti-Patterns (NEVER do these)

- Direct `google.script.run.createScoreSheet()` without the `gas.ts` wrapper
- Sheet operations going through `callApi()` → backend — Sheet ops are Apps Script ↔ Google Sheets only
- `import`/`export` statements in `src/server/sheets.ts` (only `import type` allowed)
- Boolean flags like `isCreating`, `isLoading` — use the typed `setupStep` signal
- Tailwind CSS, shadcn/ui, or Radix UI — use Google Add-ons CSS classes
- Putting `ColumnPreview` or `SheetInfo` types in `packages/shared/` — these are internal to addon
- Barrel files for new state or component directories
- Mutating signals directly in components — use action functions from state files
- Creating score columns in the new Sheet — only Student Name column A for now (scores are Story 2.2)

### References

- [Source: epics.md#Story 1.3] — Full acceptance criteria
- [Source: architecture.md#Frontend Architecture (Sidebar)] — Preact + signals + Google Add-ons CSS
- [Source: architecture.md#Communication Patterns] — Three-layer chain, gas.ts wrapper
- [Source: architecture.md#Data Boundaries] — Google Sheet owns score data, accessed by Apps Script only
- [Source: architecture.md#Cross-Cutting Concerns #5] — Dual data store boundary
- [Source: prd.md#Journey 1] — Linh's first grading: Sheet creation + name import flow
- [Source: project-context.md#Apps Script Communication Chain] — Three-layer chain rules
- [Source: project-context.md#Preact Sidebar Patterns] — Signal patterns, component rules
- [Source: project-context.md#Google Workspace Add-on UI Rules] — Max one primary button, labels above fields, sentence case
- [Source: 1-2-apps-script-add-on-shell-and-sidebar-pipeline.md#Dev Notes] — Server-side constraints, global scope, naming

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no debugging required.

### Completion Notes List

- Task 1: Updated OAuth scope from `spreadsheets.currentonly` to `spreadsheets`. Created `src/server/sheets.ts` with 7 public functions and 3 internal helpers, all top-level with `_sheets` prefix for helpers. Server-side compiles cleanly with `tsconfig.server.json`.
- Task 2: Added 7 new function declarations to `gas-types.d.ts`, 7 typed exports to `gas.ts` using existing `callGas<T>` pattern, and 13 tests covering all wrappers (success + failure paths).
- Task 3: Rewrote `state/sheet.ts` with full setup flow state machine (8 steps), 10 action functions, step history stack for back navigation, and `initializeSheet()` with deleted-sheet recovery. Created `state/students.ts` with roster/selection signals. Updated `app.test.tsx` to include `url` field in `linkedSheet`. 31 new state tests (23 sheet + 8 students).
- Task 4: Built `setup-sheet.tsx` multi-step wizard with 8 sub-components matching all setup steps. Google Add-ons CSS classes used throughout. Keyboard-accessible column selection. Deleted `setup-sheet-placeholder.tsx`. 19 component tests.
- Task 5: Created `sheet-info.tsx` (linked sheet display with link), `student-picker.tsx` (dropdown with "Student N of M" context), `empty-state.tsx`. Updated `app.tsx` to call `initializeSheet()` on mount and render correct landing state. 13 new component tests (3 sheet-info + 4 student-picker + 6 app).
- Task 6: Updated `gas-mock.ts` with all 7 new mock responses and typed `MockRunner` interface. Refactored to use `dispatch()` helper for DRY mock execution.
- Task 7: All tests already created alongside implementation. Full suite: 84 tests, 9 files, 0 failures.
- Task 8: `turbo build` succeeds across all 3 workspaces. `turbo test` passes 95 tests (84 addon + 11 api). `dist/sidebar.html` = 29.58 KB (well under 100KB limit).

### Change Log

- 2026-04-23: Implemented Story 1.3 — Create New Score Sheet with Student Import. All 8 tasks complete, 84 addon tests pass, no regressions.

### File List

**New files:**
- `apps/addon/src/server/sheets.ts`
- `apps/addon/src/sidebar/state/students.ts`
- `apps/addon/src/sidebar/state/students.test.ts`
- `apps/addon/src/sidebar/state/sheet.test.ts`
- `apps/addon/src/sidebar/components/setup-sheet.tsx`
- `apps/addon/src/sidebar/components/setup-sheet.test.tsx`
- `apps/addon/src/sidebar/components/sheet-info.tsx`
- `apps/addon/src/sidebar/components/sheet-info.test.tsx`
- `apps/addon/src/sidebar/components/student-picker.tsx`
- `apps/addon/src/sidebar/components/student-picker.test.tsx`
- `apps/addon/src/sidebar/components/empty-state.tsx`

**Modified files:**
- `apps/addon/appsscript.json` (scope change)
- `apps/addon/src/sidebar/gas-types.d.ts` (new function declarations + types)
- `apps/addon/src/sidebar/lib/gas.ts` (7 new wrapper exports)
- `apps/addon/src/sidebar/lib/gas.test.ts` (expanded to 13 tests)
- `apps/addon/src/sidebar/state/sheet.ts` (full rewrite: setup flow + initializeSheet)
- `apps/addon/src/sidebar/components/app.tsx` (landing state logic + initializeSheet)
- `apps/addon/src/sidebar/components/app.test.tsx` (updated for new components + url field)
- `apps/addon/src/sidebar/__mocks__/gas-mock.ts` (7 new mock responses)

**Deleted files:**
- `apps/addon/src/sidebar/components/setup-sheet-placeholder.tsx`

### Review Findings

- [x] [Review][Decision] `initializeSheet` unlinks sheet on ANY `loadRoster` failure — Fixed: now distinguishes permanent errors (unlinks) vs transient errors (keeps sheet, shows retry message) [sheet.ts]
- [x] [Review][Decision] `checkConnection` and `initializeSheet` fire concurrently — Fixed: sequenced with `checkConnection().then(() => initializeSheet())` [app.tsx]
- [x] [Review][Patch] Spreadsheet injection — Fixed: `_sheetsSanitize()` prefixes `=`, `+`, `-`, `@` with `'` in `createScoreSheet` [server/sheets.ts]
- [x] [Review][Patch] `confirmNames` history corruption — Fixed: push to stepHistory only on success, use local var for revert [sheet.ts]
- [x] [Review][Patch] No double-click guard — Fixed: `asyncBusy` signal guards all async actions, buttons disabled during in-flight [sheet.ts + setup-sheet.tsx]
- [x] [Review][Patch] `loadRoster` stale selectedStudent — Fixed: resets to first name when current selection not in roster [students.ts]
- [x] [Review][Patch] StudentPicker select/signal mismatch — Fixed: placeholder option when null, "Student N of M" hidden when no selection [student-picker.tsx]
- [x] [Review][Patch] `extractNamesFromColumn` bounds check — Fixed: validates columnIndex against sheet.getLastColumn() [server/sheets.ts]
- [x] [Review][Patch] `getLinkedSheet` URL fallback — Fixed: constructs URL from sheet ID instead of empty string [server/sheets.ts]
- [x] [Review][Patch] AC #4 copy mismatch — Fixed: "We found N names. Correct?" [setup-sheet.tsx]
- [x] [Review][Defer] `goBack()` callable during `creating` step via external code — currently UI-guarded but no programmatic guard [sheet.ts:148-153] — deferred, pre-existing
