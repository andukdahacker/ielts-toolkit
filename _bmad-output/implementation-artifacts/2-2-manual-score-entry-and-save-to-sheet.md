# Story 2.2: Manual Score Entry & Save to Sheet

Status: done

## Story

As a teacher,
I want to enter band scores directly in the sidebar and save them to my Google Sheet with one click,
So that I can track student scores without using AI grading — for quick manual entry or when AI is unavailable.

## Acceptance Criteria

1. **Given** a teacher has a student selected in the sidebar **When** they view the scoring section **Then** they see editable fields for all five IELTS criteria: Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), and Overall — each accepting values from 0.0 to 9.0 in 0.5 increments

2. **Given** the teacher enters band scores in the sidebar **When** they input a value outside the valid range (negative, above 9.0, or not a 0.5 increment) **Then** the field shows a validation error and the Save button remains disabled

3. **Given** the teacher has entered valid band scores **When** they click "Save to Sheet" **Then** the scores are written to the correct student row and the appropriate assignment column in the linked Google Sheet, using `LockService.getScriptLock()` to prevent concurrent write corruption

4. **Given** scores are being saved **When** the save completes successfully **Then** the sidebar shows a confirmation message (e.g., "Scores saved for [Student Name]") and the save status signal transitions from `saving` to `saved`

5. **Given** scores are being saved **When** the Sheet write fails (e.g., Sheet deleted, permission revoked, lock acquisition fails) **Then** the sidebar shows a clear error: "Scores couldn't be saved to your Sheet. [Retry] — your scores are preserved here" and the entered scores remain in the sidebar

6. **Given** the teacher has entered scores but not saved **When** they view the sidebar **Then** a dirty indicator shows that unsaved changes exist (via the `hasUnsavedChanges` computed signal)

7. **Given** the teacher clicks "Save to Sheet" **When** AI comments exist on the document (from a future Epic 3 grading session) **Then** scores save regardless of whether comments are resolved — save is non-blocking with respect to comment state

8. **Given** the score write-back completes **When** measured end-to-end **Then** the save operation completes in under 5 seconds (NFR3)

## Tasks / Subtasks

- [x] Task 1: Expand score state with editing and save logic (AC: #1, #2, #6)
  - [x] 1.1 Update `src/sidebar/state/scores.ts`:
    - Import `BandScores`, `CRITERIA_LIST`, `BAND_RANGE` from `@ielts-toolkit/shared` — DO NOT redefine types locally. The existing `ScoreKey` and `ScoreMap` types should be replaced with the shared `BandScores` type
    - Replace local `ScoreKey` type: use `keyof BandScores` (which includes `'overall' | 'taskAchievement' | 'coherenceAndCohesion' | 'lexicalResource' | 'grammaticalRangeAndAccuracy'`) — keys already match from Story 2.1 stub
    - Add `updateScore(key: keyof BandScores, value: number | null)` action: validates value is in `BAND_RANGE` (0.0–9.0, 0.5 increments) or null, sets `currentScores.value = { ...currentScores.value, [key]: value }`, resets `saveStatus` to `'idle'` if it was `'saved'` or `'error'`
    - Add `validationErrors` computed: `Record<keyof BandScores, string | null>` — for each key, returns error string if value is not null and not in `BAND_RANGE` (e.g., "Must be 0.0–9.0 in 0.5 steps"), else null
    - Add `canSave` computed: returns `true` when ALL five scores are non-null AND `validationErrors` has no errors AND `saveStatus.value !== 'saving'`. Requiring all five prevents partial saves that would leave gaps in the Sheet and avoids the null→0 ambiguity
    - Add `saveScores()` async action: reads `selectedStudent.value` from `students.ts` and `selectedTaskType.value` from `grading.ts` (cross-domain imports — acceptable between state files per Story 2.1 precedent). Sets `saveStatus` to `'saving'`, builds a `BandScores` object from `currentScores` (converting nulls to 0.0 for any unfilled criteria), calls `saveScoresToSheet(studentName, scores, taskType)` via `gas.ts`, on success sets `savedScores = { ...currentScores.value }`, sets `saveConfirmStudent` to student name, and sets `saveStatus` to `'saved'`. On failure sets `saveStatus` to `'error'` and sets `saveError` signal with the error message. Does NOT clear `currentScores` on error — scores are preserved
    - Add `saveError` signal: `signal<string | null>(null)` — set on save failure, cleared on next save attempt or `resetScores()`
    - Add `saveConfirmStudent` signal: `signal<string | null>(null)` — set to student name on save success for confirmation message
    - Update `resetScores()`: also clear `saveError` and `saveConfirmStudent`
    - Export `SCORE_KEYS` (or derive from `CRITERIA_LIST` + `'overall'`) for use by components
  - [x] 1.2 Update `src/sidebar/state/scores.test.ts`:
    - Test `updateScore`: valid values accepted (0, 4.5, 9.0), invalid values rejected (0.3, 9.5, -1, 10)
    - Test `validationErrors`: clean when all valid or null, error messages for invalid values
    - Test `canSave`: false when all null, false when only some scores filled, false when validation errors, true when all five scores are valid
    - Test `saveScores`: success path (saveStatus flow idle→saving→saved, savedScores updated), error path (saveStatus flow idle→saving→error, currentScores preserved, saveError set)
    - Test `hasUnsavedChanges`: true after `updateScore`, false after successful save, false after `discardChanges`
    - Mock `gas.ts` `saveScoresToSheet` function

- [x] Task 2: Create GAS server-side `writeScoresToSheet()` function (AC: #3, #8)
  - [x] 2.1 Add to `apps/addon/src/server/sheets.ts`:
    - `writeScoresToSheet(studentName: string, scores: { overall: number; taskAchievement: number; coherenceAndCohesion: number; lexicalResource: number; grammaticalRangeAndAccuracy: number }, taskType: string): void`
    - Get linked Sheet via `getLinkedSheet()`; throw if not linked
    - Open the spreadsheet via `SpreadsheetApp.openById()`
    - Acquire `LockService.getScriptLock()` with `tryLock(10000)` — throw "Sheet is busy, try again in a moment" if lock acquisition fails
    - Find the student row: scan the student column (from `linked.studentColumn`) for `studentName` (case-sensitive exact match). Throw "Student not found in Sheet" if no match
    - Determine the assignment column: find or create a column header with today's date + task type (e.g., "2026-04-24 Task 2"). Format: `YYYY-MM-DD {taskType label}`. If header exists, reuse that column. If not, append a new column after the last used column
    - Task type labels: `task1_academic` → "Task 1 Academic", `task1_general` → "Task 1 General", `task2` → "Task 2"
    - Write the five band scores to the target row. Score layout within the column group: single column with Overall score displayed. Sub-scores (TA, CC, LR, GRA) in the next 4 columns. Column header pattern: main header "2026-04-24 Task 2" spans the Overall column, sub-headers "TA", "CC", "LR", "GRA" on adjacent columns
    - Format score cells: number format with one decimal place
    - Release lock in `finally` block
  - [x] 2.2 **No test file needed** for GAS server code in this story — `gas-local` test infrastructure is deferred (open question in project-context.md). The server function is tested via integration through the sidebar.

- [x] Task 3: Add `saveScoresToSheet` to GAS communication chain (AC: #3)
  - [x] 3.1 Add to `apps/addon/src/sidebar/lib/gas.ts`:
    ```typescript
    export function saveScoresToSheet(studentName: string, scores: BandScores, taskType: string) {
      return callGas<void>((r) => r.writeScoresToSheet(studentName, scores, taskType))
    }
    ```
  - [x] 3.2 Update `apps/addon/src/sidebar/gas-types.d.ts` — add `writeScoresToSheet` to the `RunnerWithHandlers` interface:
    ```typescript
    writeScoresToSheet(studentName: string, scores: { overall: number; taskAchievement: number; coherenceAndCohesion: number; lexicalResource: number; grammaticalRangeAndAccuracy: number }, taskType: string): void
    ```
  - [x] 3.3 Update `apps/addon/src/sidebar/__mocks__/gas-mock.ts`:
    - Add `writeScoresToSheet: undefined` to `mockResponses`
    - Add `writeScoresToSheet` method to `MockRunner` interface and `createMockRunner()`

- [x] Task 4: Create score-editor component with stepper controls (AC: #1, #2, #6)
  - [x] 4.1 Create `src/sidebar/components/score-editor.tsx`:
    - Renders five score input rows, one for each criterion:
      - Label (full name): "Task Achievement", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy", "Overall"
      - Stepper controls: `[−]  6.5  [+]` — decrement/increment by 0.5
      - Initial value: `—` (dash) when null (no score entered)
      - First click on `+` from null → 0.0. First click on `−` from null → 9.0
      - At boundaries: `−` disabled at 0.0, `+` disabled at 9.0
      - Each stepper calls `updateScore(key, newValue)` from scores state
    - Validation error display: if `validationErrors[key]` is non-null, show error text below the row in `.error` class
    - Overall score row visually separated (border-top or spacing) from the four criteria
    - Dirty indicator: when `hasUnsavedChanges` is true, show a subtle dot or text near the section header
    - Layout: label above stepper (not inline) to fit 300px width
    - Use `.form-group` class from Google Add-ons CSS for each row
    - Stepper button styling: custom CSS (not covered by add-ons CSS) — compact square buttons with `+`/`−` text, `aria-label` on each ("Increase Task Achievement", "Decrease Task Achievement")
    - `tabindex="0"` on stepper buttons for keyboard navigation
    - Score display: use `<span>` with `aria-live="polite"` so screen readers announce value changes
  - [x] 4.2 Create `src/sidebar/components/score-editor.test.tsx`:
    - Test: renders all 5 criteria labels
    - Test: clicking `+` increments score by 0.5
    - Test: clicking `−` decrements score by 0.5
    - Test: `+` disabled at 9.0, `−` disabled at 0.0
    - Test: first click from null sets correct initial value
    - Test: displays validation error when present
    - Test: keyboard accessibility (tabbing through steppers)

- [x] Task 5: Create save-button component with status feedback (AC: #4, #5)
  - [x] 5.1 Create `src/sidebar/components/save-button.tsx`:
    - "Save to Sheet" button using `.action` (primary blue) class
    - Disabled when `canSave` is false — tooltip/aria-label explains why (no scores entered, or validation errors)
    - When `saveStatus` is `'saving'`: button shows "Saving..." and is disabled, with a spinner or animated dots
    - When `saveStatus` is `'saved'`: show inline confirmation text "Scores saved for {studentName}" in `.secondary` gray text below the button. Auto-dismiss after 3 seconds (set a timeout that resets `saveStatus` to `'idle'` and clears `saveConfirmStudent`). **Cleanup:** clear the timeout on component unmount via `useEffect` cleanup return, and clear any pending timeout before starting a new one on subsequent saves
    - When `saveStatus` is `'error'`: show error message from `saveError` in `.error` class below the button, with a "Retry" link/button that calls `saveScores()` again. Text: "Scores couldn't be saved to your Sheet." + "[Retry]". Scores remain in the sidebar
    - Save button calls `saveScores()` on click
    - Only ONE primary blue button per view — this is the primary action when score editor is visible
  - [x] 5.2 Create `src/sidebar/components/save-button.test.tsx`:
    - Test: button disabled when no scores entered
    - Test: button enabled when valid scores present
    - Test: shows "Saving..." during save
    - Test: shows confirmation message on success
    - Test: shows error with retry on failure
    - Test: retry calls saveScores again

- [x] Task 6: Create task-type picker component (AC: #3)
  - [x] 6.1 Create `src/sidebar/state/grading.ts`:
    - Add `selectedTaskType` signal: `signal<TaskType>('task2')` — default to Task 2 (most common IELTS writing task)
    - Import `TaskType` from `@ielts-toolkit/shared`
    - Add `selectTaskType(type: TaskType)` action
    - This state file will be expanded in Epic 3 for AI grading status
  - [x] 6.2 Create `src/sidebar/components/task-type-picker.tsx`:
    - `<select>` dropdown with options: "Task 1 Academic", "Task 1 General", "Task 2"
    - Uses Google Add-ons CSS form styling — label "Task type" above the select
    - Calls `selectTaskType()` on change
    - Reads from `selectedTaskType` signal
  - [x] 6.3 Create `src/sidebar/components/task-type-picker.test.tsx`:
    - Test: renders all three task type options
    - Test: selecting an option updates the signal
    - Test: default is Task 2

- [x] Task 7: Add Save button to unsaved-prompt dialog and wire to real save (AC: #6)
  - [x] 7.1 Update `src/sidebar/components/unsaved-prompt.tsx`:
    - **IMPORTANT:** The Story 2.1 review (F1) removed the Save button — the dialog currently has only Discard + Cancel. This task **adds the Save button back** now that `saveScores()` is implemented.
    - Add a "Save" action (primary blue) as the first button in the actions array: calls `saveScores()`, awaits completion, then calls `confirmNavigation()` on success. On failure, calls `cancelNavigation()` to stay on current student (the save error will display in the save-button component)
    - Import `saveScores` from `../state/scores`
    - Final button order: Save (primary `.action`), Discard (gray `.create`), Cancel (gray `.create`)
  - [x] 7.2 Update `src/sidebar/components/unsaved-prompt.test.tsx`:
    - Test: dialog renders three buttons (Save, Discard, Cancel)
    - Test: Save button calls saveScores then confirmNavigation on success
    - Test: Save button calls cancelNavigation on save failure (stays on current student)

- [x] Task 8: Update app.tsx layout to include score editor and save (AC: #1, #4)
  - [x] 8.1 Update `src/sidebar/components/app.tsx`:
    - Replace `<EmptyState />` with the scoring section when a student is selected:
      1. `<TaskTypePicker />` (NEW)
      2. `<ScoreEditor />` (NEW — replaces EmptyState)
      3. `<SaveButton />` (NEW)
    - Keep `<EmptyState />` for the case when no student is selected (edge case: roster loaded but no student picked)
    - Layout order in grading-ready state:
      1. `<ConnectionStatus />`
      2. `<SheetInfo />`
      3. `<StudentPicker />`
      4. `<StudentNav />`
      5. `<AddStudent />`
      6. `<TaskTypePicker />` (NEW)
      7. `<ScoreEditor />` (NEW)
      8. `<SaveButton />` (NEW)
      9. `<UnsavedPrompt />`
  - [x] 8.2 Update `src/sidebar/components/app.test.tsx`:
    - Test: ScoreEditor renders when student is selected
    - Test: SaveButton renders when student is selected
    - Test: TaskTypePicker renders when student is selected

- [x] Task 9: Add score-editor CSS styles (AC: #1)
  - [x] 9.1 Update `src/sidebar/styles.css`:
    - Stepper control styles:
      ```css
      .score-stepper { display: flex; align-items: center; gap: 8px; }
      .score-stepper button { width: 32px; height: 32px; border: 1px solid #dadce0; border-radius: 4px; background: #fff; cursor: pointer; font-size: 16px; line-height: 1; }
      .score-stepper button:disabled { opacity: 0.3; cursor: default; }
      .score-stepper button:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
      .score-stepper .score-value { min-width: 32px; text-align: center; font-size: 16px; font-weight: 500; }
      ```
    - Score editor section:
      ```css
      .score-editor { padding: 8px 0; }
      .score-row { margin-bottom: 12px; }
      .score-row label { display: block; font-size: 12px; color: #5f6368; margin-bottom: 4px; }
      .score-row--overall { border-top: 1px solid #dadce0; padding-top: 12px; margin-top: 4px; }
      ```
    - Save confirmation auto-dismiss:
      ```css
      .save-confirmation { color: #34a853; font-size: 13px; padding: 4px 0; }
      .save-error { padding: 4px 0; }
      .save-error .retry-link { color: #1a73e8; cursor: pointer; text-decoration: underline; background: none; border: none; font-size: 13px; }
      ```

- [x] Task 10: Verify build and integration (AC: all)
  - [x] 10.1 Run `turbo build` — all workspaces build successfully
  - [x] 10.2 Run `turbo test` — all tests pass including Stories 1.1–2.1 (no regressions)
  - [x] 10.3 Verify `dist/sidebar.html` remains under 100KB
  - [x] 10.4 Open `index.dev.html` — verify score editor renders, stepper controls work, save triggers mock, confirmation displays
  - [x] 10.5 Verify `clasp push` will pick up the new `writeScoresToSheet` function in `dist/`

## Dev Notes

### Architecture: Score Entry & Sheet Write Chain

This story spans **three layers** of the communication chain:

```
Sidebar (Preact) → scores.ts actions → gas.ts → google.script.run → sheets.ts → Google Sheet
```

**What changes by layer:**

| Layer | Files | Changes |
|-------|-------|---------|
| Sidebar state | `state/scores.ts` | Expand from stub to full score editing + save logic |
| Sidebar state | `state/grading.ts` | NEW — task type selection (reused in Epic 3) |
| Sidebar components | `components/score-editor.tsx` | NEW — stepper controls for 5 criteria |
| Sidebar components | `components/save-button.tsx` | NEW — save action with status feedback |
| Sidebar components | `components/task-type-picker.tsx` | NEW — task type dropdown |
| Sidebar components | `components/unsaved-prompt.tsx` | MODIFIED — wire real save |
| Sidebar components | `components/app.tsx` | MODIFIED — integrate new components |
| GAS wrapper | `lib/gas.ts` | Add `saveScoresToSheet` wrapper |
| GAS types | `gas-types.d.ts` | Add `writeScoresToSheet` declaration |
| GAS mock | `__mocks__/gas-mock.ts` | Add `writeScoresToSheet` mock |
| GAS server | `server/sheets.ts` | Add `writeScoresToSheet` function |
| Sidebar styles | `styles.css` | Add stepper + save feedback styles |

**What does NOT change:**
- No backend API changes — score saving goes Sidebar → GAS → Sheet directly (Apps Script relay pattern)
- No database changes — manual score entry doesn't touch Postgres in Phase 1
- No migration files
- No changes to `packages/shared/` — existing `BandScores`, `CRITERIA_LIST`, `BAND_RANGE`, `TaskType` are sufficient

### Score Editor UX Design

Stepper controls per project-context.md requirement: "Score editor: use stepper controls (+/- buttons, 0.5 increments) — not free-text inputs, not dropdowns"

```
Task Achievement
[−]  6.5  [+]

Coherence & Cohesion
[−]  7.0  [+]

Lexical Resource
[−]  —   [+]        ← null = no score yet

Grammatical Range & Accuracy
[−]  6.0  [+]

─────────────────
Overall
[−]  6.5  [+]

[Save to Sheet]     ← primary blue button
Scores saved for Minh  ← auto-dismiss after 3s
```

**300px sidebar constraint:** Labels above steppers (not inline). Full criterion names are long ("Grammatical Range & Accuracy") — they wrap naturally in the 300px width. Do NOT abbreviate to "GRA" in the UI — teachers expect the full IELTS criterion names.

### Score Validation Rules

- Valid range: 0.0 to 9.0 inclusive
- Step: 0.5 increments only
- Null (no score) is valid — allows partial entry
- `BAND_RANGE` from `@ielts-toolkit/shared` provides the valid values array: `[0, 0.5, 1, 1.5, ..., 8.5, 9]`
- Validation happens in the `updateScore()` action, NOT in the component — components just call the action
- `canSave` requires ALL five scores to be non-null — prevents partial saves that leave gaps in the Sheet. Teachers must enter all criteria before saving

### Sheet Write Strategy

**Column structure for scores:**

```
| Student Name | 2026-04-24 Task 2 | TA  | CC  | LR  | GRA | 2026-04-25 Task 1 Academic | TA  | CC  | LR  | GRA |
|-------------|-------------------|-----|-----|-----|-----|---------------------------|-----|-----|-----|-----|
| Minh        | 6.5               | 6.0 | 7.0 | 6.0 | 6.5 |                           |     |     |     |     |
| Trang       |                   |     |     |     |     |                           |     |     |     |     |
```

- Each grading session adds 5 columns (Overall + 4 criteria)
- Main column header: `{date} {task type label}` — this is the Overall score column
- Sub-columns: TA, CC, LR, GRA — shorthand headers are acceptable in the Sheet (different from UI labels)
- `LockService.getScriptLock()` prevents concurrent write corruption
- Lock timeout: 10 seconds (`tryLock(10000)`)
- If same student + same date + same task type column exists, **overwrite** — teacher is re-entering scores
- Band scores written as numbers (not strings) — Sheet can format/sort them

### Save Status Flow

```
idle → saving → saved (auto-dismiss 3s → idle)
                └──→ error (stays until retry or reset)
```

Per project-context.md: "Async Operation Status — explicit typed signals, no boolean flags"
- `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`
- `saveError: string | null`
- `saveConfirmStudent: string | null`

### Save Confirmation UX

Per project-context.md: "Save confirmation: brief inline feedback ('Saved to Sheet') that auto-dismisses after 2-3s — not a modal, not a toast requiring dismissal"

Implementation:
- On save success: set `saveConfirmStudent` to student name, set `saveStatus` to `'saved'`
- In `save-button.tsx`: when `saveStatus === 'saved'`, show "Scores saved for {saveConfirmStudent}"
- Set `setTimeout(3000)` to reset `saveStatus` to `'idle'` and clear `saveConfirmStudent`
- Clear timeout on unmount or next save attempt

### Importing from @ielts-toolkit/shared

The `packages/shared/src/ielts.ts` already exports everything needed:

```typescript
import { BandScores, CRITERIA_LIST, BAND_RANGE, TaskType, TASK_TYPES } from '@ielts-toolkit/shared'
```

- `BandScores` type: `{ overall: number; taskAchievement: number; ... }` — 5 numeric fields
- `CRITERIA_LIST`: `['taskAchievement', 'coherenceAndCohesion', 'lexicalResource', 'grammaticalRangeAndAccuracy']` — 4 criteria without 'overall'
- `BAND_RANGE`: `[0, 0.5, 1, 1.5, ..., 8.5, 9]` — 19 valid values
- `TaskType`: `'task1_academic' | 'task1_general' | 'task2'`

**CRITICAL:** The `BandScores` type uses `number` (not `number | null`). The sidebar `currentScores` needs `number | null` to represent "not yet entered". Either:
- Option A: Use `Partial<BandScores>` for sidebar state (all optional) — simpler
- Option B: Define sidebar-specific `ScoreMap` as `Record<keyof BandScores, number | null>` — current approach from Story 2.1 stub

**Recommend Option B** (already in place). When saving, `canSave` requires all five scores to be non-null, so the conversion to `BandScores` is a safe cast — all values are guaranteed to be numbers. The `writeScoresToSheet` server function receives a complete `BandScores` object (no nulls).

### Previous Story Intelligence (Story 2.1)

**Key learnings to apply:**
- Score state keys MUST match `BandScores` from shared — already established in 2.1 stub. Do NOT introduce abbreviations
- `resetScores()` is called by `selectStudent()` before switching students — this contract must be preserved
- `hasUnsavedChanges` computed already works — extend, don't replace
- `discardChanges()` already works — extend, don't replace
- `pendingNavigation` + `confirmNavigation()` flow established — wire the Save button in `unsaved-prompt.tsx`
- `sessionStorage` persistence pattern with try/catch — follow for any new session state
- Confirm dialog is reusable — don't create a new dialog component for save errors
- Test baseline from Story 2.1: 162 addon tests — check for regressions

**Review findings from Story 2.1:**
- F2: StudentPicker dropdown bypasses unsaved-changes guard — **Decision: defer again.** Adding the guard to the dropdown requires intercepting the `<select>` onChange before calling `selectStudent()`, which changes the dropdown's current behavior. The risk is low because `selectStudent()` already calls `resetScores()` (F4 fix), so scores don't carry over — they're just lost silently. The nav buttons already guard properly. Adding dropdown guard is a polish item for a future story.
- F4: `resetScores()` moved into `selectStudent()` — this is the established pattern, don't duplicate the call

### Google Add-ons CSS Classes Used

| Element | CSS Class | Notes |
|---------|-----------|-------|
| Score row wrapper | `.form-group` | Standard form spacing |
| Score label | Default `<label>` | Label above input |
| Stepper buttons | Custom CSS | Not covered by add-ons CSS |
| Save button | `.action` (blue) | Primary action — ONLY blue button in view |
| Error text | `.error` | Red error messages |
| Confirmation text | `.secondary` or custom `.save-confirmation` | Gray auto-dismiss text |
| Task type picker | `.form-group` + `<select>` | Standard form select |
| Retry link | Custom `.retry-link` | Underlined blue text |

### Anti-Patterns (NEVER do these)

- Score keys like `ta`, `cc`, `lr`, `gra` — MUST use full names from `@ielts-toolkit/shared`: `taskAchievement`, `coherenceAndCohesion`, `lexicalResource`, `grammaticalRangeAndAccuracy`
- Free-text `<input type="number">` for scores — use stepper controls (+/- buttons) per project-context.md
- Dropdown `<select>` for score values — use stepper controls
- `isLoading` / `isSaving` boolean — use typed `saveStatus` signal
- Direct signal mutation in components — use `updateScore()`, `saveScores()` action functions from state
- Inline CSS in components — add to `styles.css`
- Modal or toast for save confirmation — use inline auto-dismiss text
- Clearing `currentScores` on save error — scores MUST be preserved for retry
- Calling backend API for manual score save — goes Sidebar → GAS → Sheet directly
- Multiple primary (blue) buttons in the view — only "Save to Sheet" is blue
- Re-validating in the component — validation is in the state layer via `validationErrors` computed
- Adding `@ts-ignore` or `any` — use proper types from shared package
- Raw `google.script.run` calls — always go through `gas.ts` wrapper

### Project Structure Notes

Files created/modified in this story:

```
apps/addon/
├── src/
│   ├── server/
│   │   └── sheets.ts                         # MODIFIED: add writeScoresToSheet
│   └── sidebar/
│       ├── __mocks__/
│       │   └── gas-mock.ts                   # MODIFIED: add writeScoresToSheet mock
│       ├── components/
│       │   ├── app.tsx                       # MODIFIED: integrate score editor + save
│       │   ├── app.test.tsx                  # MODIFIED: test new components
│       │   ├── score-editor.tsx              # NEW
│       │   ├── score-editor.test.tsx         # NEW
│       │   ├── save-button.tsx               # NEW
│       │   ├── save-button.test.tsx          # NEW
│       │   ├── task-type-picker.tsx          # NEW
│       │   ├── task-type-picker.test.tsx     # NEW
│       │   ├── unsaved-prompt.tsx            # MODIFIED: wire real save
│       │   └── unsaved-prompt.test.tsx       # MODIFIED: test real save
│       ├── lib/
│       │   └── gas.ts                        # MODIFIED: add saveScoresToSheet
│       ├── state/
│       │   ├── scores.ts                     # MODIFIED: expand stub to full implementation
│       │   ├── scores.test.ts                # MODIFIED: expand tests
│       │   └── grading.ts                    # NEW: task type selection
│       ├── gas-types.d.ts                    # MODIFIED: add writeScoresToSheet
│       └── styles.css                        # MODIFIED: stepper + save styles
```

### References

- [Source: epics.md#Story 2.2] — Full acceptance criteria and BDD scenarios
- [Source: prd.md#FR26-FR31] — Manual score entry and score tracking requirements
- [Source: prd.md#Journey 1] — Score save flow: "She clicks Save scores to Sheet. Band scores write to her Sheet in 2 seconds"
- [Source: prd.md#Journey 2] — Batch grading: adjust AI scores, save, next student rhythm
- [Source: architecture.md#Cross-Cutting Concerns] — Dual data store boundary, Sheet write strategy with LockService
- [Source: architecture.md#Technical Constraints] — 300px sidebar, LockService for Sheet writes
- [Source: project-context.md#Grading Session UX Constraints] — Stepper controls, save confirmation auto-dismiss, preserve scores on error
- [Source: project-context.md#Preact Sidebar Patterns] — Typed status signals, action functions, computed for derived values
- [Source: project-context.md#Apps Script Communication Chain] — Three-layer chain, gas.ts wrapper
- [Source: 2-1-sidebar-navigation-and-student-context.md] — Score state stub, navigation guard, previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- 3 test failures on first run: (1) score-editor double-render caused duplicate aria-labels — split into two tests; (2) unsaved-prompt Save failure expected throw but saveScores catches internally — changed to check saveStatus signal; (3) save-button retry test checked sync state of async call — changed to await mock call
- All 203 addon tests + 11 API tests pass (214 total, 0 regressions)
- dist/sidebar.html = 97.43 KB (under 100KB limit)

### Completion Notes List

- **Task 1**: Expanded `scores.ts` from stub to full implementation — `updateScore()`, `validationErrors`, `canSave`, `saveScores()`, `saveError`, `saveConfirmStudent` signals. Replaced local `ScoreKey` with `keyof BandScores` from shared. 23 passing tests.
- **Task 2**: Added `writeScoresToSheet()` to `server/sheets.ts` — finds student row, creates/reuses date+taskType column group (5 cols: Overall, TA, CC, LR, GRA), writes scores with LockService protection.
- **Task 3**: Added `saveScoresToSheet` wrapper to `gas.ts`, `writeScoresToSheet` declaration to `gas-types.d.ts`, mock to `gas-mock.ts`.
- **Task 4**: Created `score-editor.tsx` with stepper controls (−/+, 0.5 increments), labels above steppers, Overall visually separated, aria-labels, aria-live for screen readers. 8 passing tests.
- **Task 5**: Created `save-button.tsx` with status-driven UI (idle/saving/saved/error), auto-dismiss confirmation after 3s, retry on error. 6 passing tests.
- **Task 6**: Created `grading.ts` state with `selectedTaskType` signal (default: task2). Created `task-type-picker.tsx` with 3 task type options. 3 passing tests.
- **Task 7**: Added Save button to `unsaved-prompt.tsx` — Save (primary), Discard, Cancel. Save calls `saveScores()` then navigates on success, cancels on failure. 7 passing tests.
- **Task 8**: Updated `app.tsx` — shows TaskTypePicker + ScoreEditor + SaveButton when student selected, EmptyState when none. 10 passing tests.
- **Task 9**: Added stepper control CSS, score-row styles, save confirmation/error styles to `styles.css`.
- **Task 10**: `turbo build` passes, `turbo test` passes (214/214), sidebar.html 97.43KB, `writeScoresToSheet` in dist/sheets.js.

### Change Log

- 2026-04-24: Implemented Story 2-2 — manual score entry with stepper controls, save to Google Sheet via GAS chain, save status feedback, unsaved-prompt Save button

### File List

**New files:**
- apps/addon/src/sidebar/state/grading.ts
- apps/addon/src/sidebar/components/score-editor.tsx
- apps/addon/src/sidebar/components/score-editor.test.tsx
- apps/addon/src/sidebar/components/save-button.tsx
- apps/addon/src/sidebar/components/save-button.test.tsx
- apps/addon/src/sidebar/components/task-type-picker.tsx
- apps/addon/src/sidebar/components/task-type-picker.test.tsx

**Modified files:**
- apps/addon/src/sidebar/state/scores.ts
- apps/addon/src/sidebar/state/scores.test.ts
- apps/addon/src/sidebar/lib/gas.ts
- apps/addon/src/sidebar/gas-types.d.ts
- apps/addon/src/sidebar/__mocks__/gas-mock.ts
- apps/addon/src/sidebar/components/app.tsx
- apps/addon/src/sidebar/components/app.test.tsx
- apps/addon/src/sidebar/components/unsaved-prompt.tsx
- apps/addon/src/sidebar/components/unsaved-prompt.test.tsx
- apps/addon/src/sidebar/styles.css
- apps/addon/src/server/sheets.ts

### Review Findings

- [x] [Review][Patch] F8: Track task type in `hasUnsavedChanges` — added `savedTaskType` signal, included in dirty check, save/reset/discard flows [grading.ts, scores.ts] (resolved from D1: option 1 chosen)
- [x] [Review][Patch] F1: UnsavedPrompt Save bypasses `canSave` — added `canSave` guard in `saveScores()` [scores.ts:67]
- [x] [Review][Patch] F2: No concurrent save guard — added `saveStatus === 'saving'` early return in `saveScores()` [scores.ts:66]
- [x] [Review][Patch] F3: SaveButton directly mutates signals — extracted `dismissConfirmation()` action [scores.ts, save-button.tsx]
- [x] [Review][Patch] F4: Dirty indicator uses inline style — moved to `.score-dirty-indicator` CSS class [score-editor.tsx, styles.css]
- [x] [Review][Patch] F5: Save confirmation relies solely on color — added ✓ prefix and `role="status"` [save-button.tsx]
- [x] [Review][Patch] F6: Out-of-scope formatting change in teachers.ts — reverted [apps/api/src/services/teachers.ts]
- [x] [Review][Patch] F7: No test for auto-dismiss timer — added timer advancement test [save-button.test.tsx]
- [x] [Review][Defer] Server-side taskType validation in writeScoresToSheet [server/sheets.ts] — deferred, pre-existing gap
- [x] [Review][Defer] Arrow key support for stepper controls [score-editor.tsx] — deferred, accessibility enhancement beyond current AC
