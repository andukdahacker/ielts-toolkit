# Story 2.1: Sidebar Navigation & Student Context

Status: done

## Story

As a teacher,
I want to see my linked Sheet and student context when I open the sidebar, and navigate between students with previous/next controls,
So that I can quickly orient myself and move through my roster efficiently during grading sessions.

## Acceptance Criteria

1. **Given** a teacher with a linked Score Sheet opens the sidebar **When** the sidebar loads **Then** it displays: linked Sheet name, student picker dropdown populated from the roster, and recent grading activity summary (or empty state: "No scores yet — grade your first essay to get started" if no history)

2. **Given** the sidebar is open and a student is selected **When** the teacher views the sidebar **Then** the current student name and assignment context are visible at all times during the session (student name prominently displayed with "Student X of Y" position indicator)

3. **Given** a roster with multiple students **When** the teacher clicks the next/previous navigation controls **Then** the sidebar advances to the next/previous student in roster order, updating the student context display

4. **Given** the teacher is on the first student in the roster **When** they click the previous control **Then** the control is disabled (no wrapping — disabled at boundaries is the clearer UX for batch grading where position awareness matters)

5. **Given** the teacher has unsaved score edits for the current student **When** they click next/previous to navigate away **Then** a confirmation prompt appears: "You have unsaved changes for [Student Name]. Save before continuing?" with Save, Discard, and Cancel options

6. **Given** the teacher opens the sidebar, closes it, and reopens it in the same session **When** the sidebar reinitializes **Then** it restores the last session state (selected student, linked Sheet) or defaults to the student picker if no prior state exists

7. **Given** the teacher has a linked Sheet and opens a different Google Doc **When** the sidebar opens in the new document **Then** the same linked Sheet context is retained — student picker, roster, and Sheet reference persist across documents in the same session (already works via UserProperties — this AC validates existing behavior)

## Tasks / Subtasks

- [x] Task 1: Create student navigation state and actions (AC: #2, #3, #4, #5, #6)
  - [x] 1.1 Update `src/sidebar/state/students.ts`:
    - Add `navigateNext()` action: if `studentIndex.value < studentRoster.value.length - 1`, check for unsaved changes (read `hasUnsavedChanges` from scores state), if dirty set `pendingNavigation` and return, else call `resetScores()` then select next student. **CRITICAL:** Always call `resetScores()` before switching students to clear the previous student's score state
    - Add `navigatePrev()` action: if `studentIndex.value > 0`, same unsaved check, else call `resetScores()` then select previous student
    - Add `canNavigateNext` computed: `studentIndex.value < studentRoster.value.length - 1`
    - Add `canNavigatePrev` computed: `studentIndex.value > 0`
    - Add `pendingNavigation` signal: `signal<'next' | 'prev' | null>(null)` — stores deferred navigation direction when unsaved changes prompt is shown
    - Add `confirmNavigation()` action: calls `resetScores()`, proceeds with pending navigation direction, clears `pendingNavigation`
    - Add `cancelNavigation()` action: clears `pendingNavigation`, stays on current student
    - Add session persistence: in `selectStudent()`, store selected student name to `sessionStorage` (key: `ielts_selected_student`). In `loadRoster()`, read from `sessionStorage` to restore last selection
  - [x] 1.2 Add `src/sidebar/state/students.test.ts` updates — test navigateNext/navigatePrev: boundary disable, mid-roster navigation, unsaved changes triggers pendingNavigation, confirmNavigation proceeds, cancelNavigation stays, session persistence round-trip

- [x] Task 2: Create score state stub for unsaved changes detection (AC: #5)
  - [x] 2.1 Create `src/sidebar/state/scores.ts`:
    - **CRITICAL:** Use the same keys as `BandScores` from `@ielts-toolkit/shared` — `'overall' | 'taskAchievement' | 'coherenceAndCohesion' | 'lexicalResource' | 'grammaticalRangeAndAccuracy'`. Do NOT use abbreviations like `ta`, `cc`, `lr`, `gra`. Story 2.2 will import `BandScores` type directly; mismatched keys would require a refactor.
    - Add `currentScores` signal: `signal<Record<string, number | null>>({})` — keyed by criterion using shared type keys, values are band scores or null
    - Add `savedScores` signal: `signal<Record<string, number | null>>({})` — last-saved state, used for dirty comparison
    - Add `hasUnsavedChanges` computed: compares `currentScores` to `savedScores` field by field, returns `true` if any differ
    - Add `saveStatus` signal: `signal<'idle' | 'saving' | 'saved' | 'error'>('idle')` — typed status per architecture
    - Add `resetScores()` action: clears `currentScores` and `savedScores` to empty, resets `saveStatus` to `'idle'`
    - Add `discardChanges()` action: resets `currentScores` to `savedScores` values
    - **Note:** Score editing UI and save-to-Sheet logic are Story 2.2 scope. This task only creates the signals needed for navigation guard in this story.
  - [x] 2.2 Create `src/sidebar/state/scores.test.ts` — test `hasUnsavedChanges` computed: both empty = false, different values = true, same values = false. Test `resetScores()` and `discardChanges()`.

- [x] Task 3: Create student-nav component and update student-picker (AC: #2, #3, #4)
  - [x] 3.1 Create `src/sidebar/components/student-nav.tsx`:
    - Layout (vertically compact for 300px sidebar):
      ```
      [< Prev]  Student 3 of 15  [Next >]
      ```
    - Prev button: disabled when `canNavigatePrev` is false (`.secondary` gray, `disabled` attribute + `aria-disabled`)
    - Next button: disabled when `canNavigateNext` is false
    - Center text: "Student {index+1} of {total}" using `studentIndex` computed and `studentRoster.value.length`
    - Buttons call `navigatePrev()` / `navigateNext()`
    - Keyboard: left/right arrow keys navigate when component or its children have focus
    - `aria-label` on buttons: "Previous student" / "Next student"
    - Use `.block` wrapper for layout, gray `.secondary` text for count
  - [x] 3.2 **Remove "Student X of Y" text from `src/sidebar/components/student-picker.tsx`** — this position indicator is now displayed by `student-nav.tsx`. Delete lines 24-28 (the `<p class="gray">Student {index} of {total}</p>` block) to avoid duplicate display. `student-picker.tsx` keeps only the `<select>` dropdown.
  - [x] 3.3 Update `src/sidebar/components/student-picker.test.tsx` — remove the test `'shows student position context'` (line 34-38) since position text moves to `student-nav.tsx`
  - [x] 3.4 Create `src/sidebar/components/student-nav.test.tsx` — test: renders position text, prev disabled on first student, next disabled on last student, clicking next/prev updates selection, keyboard arrows work

- [x] Task 4: Create confirm-dialog component (AC: #5)
  - [x] 4.1 Create `src/sidebar/components/confirm-dialog.tsx`:
    - Generic reusable confirmation dialog (will be used for unsaved changes and future prompts)
    - Props: `message: string`, `actions: Array<{ label: string; onClick: () => void; primary?: boolean }>`, `open: boolean`
    - Renders overlay + dialog box when `open` is true
    - One primary (blue `.action`) button max, others gray (`.create`)
    - Trap focus inside dialog when open (tab cycles through action buttons)
    - Escape key calls first non-primary action (Cancel)
    - `role="dialog"`, `aria-modal="true"`, `aria-label` from message
    - Style: minimal custom CSS (overlay: semi-transparent background, dialog: white card centered)
  - [x] 4.2 Create `src/sidebar/components/confirm-dialog.test.tsx` — test: renders when open, hidden when closed, calls correct action on button click, escape key, focus trap, accessibility attributes

- [x] Task 5: Create unsaved-changes integration (AC: #5)
  - [x] 5.1 Create `src/sidebar/components/unsaved-prompt.tsx`:
    - Reads `pendingNavigation` from students state and `hasUnsavedChanges` from scores state
    - When `pendingNavigation !== null`: render `<ConfirmDialog>` with message "You have unsaved changes for {selectedStudent}. Save before continuing?" and three actions:
      - "Save" (primary blue) — calls placeholder save action (Story 2.2 will wire real save), then `confirmNavigation()`
      - "Discard" (gray) — calls `discardChanges()`, then `confirmNavigation()`
      - "Cancel" (gray) — calls `cancelNavigation()`
    - When `pendingNavigation === null`: renders nothing
  - [x] 5.2 Create `src/sidebar/components/unsaved-prompt.test.tsx` — test: shows dialog when pendingNavigation set, Save/Discard/Cancel call correct actions, hidden when null

- [x] Task 6: Update app.tsx layout for grading-ready state (AC: #1, #2)
  - [x] 6.1 Update `src/sidebar/components/app.tsx`:
    - Grading-ready state layout (top to bottom):
      1. `<ConnectionStatus />` (existing)
      2. `<SheetInfo />` (existing — linked Sheet name + student count)
      3. `<StudentPicker />` (existing — dropdown selector)
      4. `<StudentNav />` (NEW — prev/next with position)
      5. `<AddStudent />` (existing — collapsible add form)
      6. `<EmptyState />` (existing — "No scores yet" placeholder, will be replaced by score editor in Story 2.2)
      7. `<UnsavedPrompt />` (NEW — confirmation dialog, renders conditionally)
    - Import and render `StudentNav` and `UnsavedPrompt`
  - [x] 6.2 Update `src/sidebar/components/app.test.tsx` — test: StudentNav renders in grading-ready state, UnsavedPrompt present in component tree

- [x] Task 7: Add session persistence for selected student (AC: #6, #7)
  - [x] 7.1 Update `src/sidebar/state/students.ts`:
    - In `selectStudent()`: after setting `selectedStudent.value`, store to `sessionStorage.setItem('ielts_selected_student', name)`
    - In `loadRoster()`: after fetching roster, check `sessionStorage.getItem('ielts_selected_student')`. If the stored name exists in the fetched roster, auto-select it instead of defaulting to the first student
    - `sessionStorage` is appropriate here: persists across sidebar close/reopen within same browser session, auto-clears when browser closes (no stale state across days)
    - **Note on AC #7 (cross-document):** Linked Sheet context already persists via `UserProperties` (server-side, set in Story 1.3/1.4). Student selection persists via `sessionStorage` (client-side, same browser session). Both work across documents within a session without new code for the Sheet context itself.
  - [x] 7.2 Update `src/sidebar/state/students.test.ts` — mock `sessionStorage`, test: selectStudent stores to sessionStorage, loadRoster restores from sessionStorage if name in roster, loadRoster ignores stale sessionStorage name not in roster

- [x] Task 8: Update mocks and types (AC: all)
  - [x] 8.1 No new GAS functions needed for this story — navigation is purely client-side. Session persistence uses browser `sessionStorage`, not `UserProperties`
  - [x] 8.2 Verify `gas-mock.ts` needs no changes — confirm no new server functions required

- [x] Task 9: Verify build and integration (AC: all)
  - [x] 9.1 Run `turbo build` — all workspaces build successfully
  - [x] 9.2 Run `turbo test` — all tests pass including Story 1.1–1.4 tests (no regressions)
  - [x] 9.3 Verify `dist/sidebar.html` remains under 100KB
  - [x] 9.4 Open `index.dev.html` — verify navigation works with mocked roster, confirm dialog appears when navigating with dirty scores

## Dev Notes

### Architecture: Client-Side Navigation

This story is primarily a **sidebar-only** story. No new server-side GAS functions or backend API endpoints are needed. Navigation, session persistence, and unsaved-change detection are all client-side concerns handled by Preact signals and browser `sessionStorage`.

**What changes:**
- `state/students.ts` — nav actions, computed guards, session persistence
- `state/scores.ts` — NEW file (stub for dirty detection, full implementation in Story 2.2)
- `components/student-nav.tsx` — NEW (prev/next controls with position indicator)
- `components/student-picker.tsx` — MODIFIED (remove "Student X of Y" text — moved to student-nav)
- `components/student-picker.test.tsx` — MODIFIED (remove position text test)
- `components/confirm-dialog.tsx` — NEW (reusable dialog)
- `components/unsaved-prompt.tsx` — NEW (wires confirm dialog to nav guard)
- `components/app.tsx` — MODIFIED (layout update)

**What does NOT change:**
- No new GAS server functions
- No new `gas.ts` wrapper functions
- No `gas-types.d.ts` changes
- No `gas-mock.ts` changes
- No backend API changes

### Student Navigation State Design

```typescript
// In state/students.ts — new exports

// Computed guards (read-only)
export const canNavigateNext = computed(() =>
  studentIndex.value < studentRoster.value.length - 1
)
export const canNavigatePrev = computed(() =>
  studentIndex.value > 0
)

// Pending navigation for unsaved changes prompt
export const pendingNavigation = signal<'next' | 'prev' | null>(null)

export function navigateNext(): void {
  if (!canNavigateNext.value) return
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = 'next'
    return  // dialog will handle the rest
  }
  resetScores()  // CRITICAL: clear previous student's scores before switching
  const nextName = studentRoster.value[studentIndex.value + 1]
  selectStudent(nextName)
}

export function navigatePrev(): void {
  if (!canNavigatePrev.value) return
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = 'prev'
    return
  }
  resetScores()  // CRITICAL: clear previous student's scores before switching
  const prevName = studentRoster.value[studentIndex.value - 1]
  selectStudent(prevName)
}

export function confirmNavigation(): void {
  // Called after user chooses Save or Discard in the unsaved-changes dialog
  // discardChanges() is called by the dialog before this if user chose Discard
  // Save action (Story 2.2) will save before calling this
  resetScores()  // CRITICAL: clear scores for the new student
  const dir = pendingNavigation.value
  pendingNavigation.value = null
  if (dir === 'next') {
    const nextName = studentRoster.value[studentIndex.value + 1]
    selectStudent(nextName)
  } else if (dir === 'prev') {
    const prevName = studentRoster.value[studentIndex.value - 1]
    selectStudent(prevName)
  }
}

export function cancelNavigation(): void {
  pendingNavigation.value = null
}
```

**Import dependency:** `students.ts` imports `hasUnsavedChanges` and `resetScores` from `scores.ts`. This is a cross-domain import. Per project-context.md rules: "Components only import signals from their own domain file; cross-domain state is passed as props or exposed via a designated cross-cutting signals file." Since this is state-to-state (not component-to-state), a direct import between state files is acceptable — the rule targets components. If this feels wrong, an alternative is to pass a `checkDirty: () => boolean` function to the navigate actions, but that adds unnecessary indirection.

### Score State Stub (scores.ts)

This story creates the **minimum viable** `scores.ts` to support the navigation dirty-check. Story 2.2 will expand it significantly with score editing, validation (0.0–9.0, 0.5 increments), and save-to-Sheet logic.

```typescript
// state/scores.ts — Story 2.1 stub
// CRITICAL: Keys MUST match BandScores from @ielts-toolkit/shared (packages/shared/src/ielts.ts)

import { signal, computed } from '@preact/signals'

// Use exact keys from packages/shared BandScores type — NOT abbreviations
type ScoreKey = 'overall' | 'taskAchievement' | 'coherenceAndCohesion' | 'lexicalResource' | 'grammaticalRangeAndAccuracy'
type ScoreMap = Record<ScoreKey, number | null>

const SCORE_KEYS: ScoreKey[] = ['overall', 'taskAchievement', 'coherenceAndCohesion', 'lexicalResource', 'grammaticalRangeAndAccuracy']

const EMPTY_SCORES: ScoreMap = {
  overall: null,
  taskAchievement: null,
  coherenceAndCohesion: null,
  lexicalResource: null,
  grammaticalRangeAndAccuracy: null,
}

export const currentScores = signal<ScoreMap>({ ...EMPTY_SCORES })
export const savedScores = signal<ScoreMap>({ ...EMPTY_SCORES })

export const saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle')

export const hasUnsavedChanges = computed(() => {
  const current = currentScores.value
  const saved = savedScores.value
  return SCORE_KEYS.some(key => current[key] !== saved[key])
})

export function resetScores(): void {
  currentScores.value = { ...EMPTY_SCORES }
  savedScores.value = { ...EMPTY_SCORES }
  saveStatus.value = 'idle'
}

export function discardChanges(): void {
  currentScores.value = { ...savedScores.value }
}
```

**Why create this now instead of waiting for Story 2.2:** The `hasUnsavedChanges` computed is needed by `navigateNext()`/`navigatePrev()` in this story. Creating the stub now means:
1. Navigation guard works correctly from day one
2. Story 2.2 extends the file (adds `updateScore()`, `saveScores()`, stepper logic) rather than creating it fresh
3. No risk of Story 2.2 introducing regressions in nav guard because the contract is established

### Session Persistence Strategy

**Browser `sessionStorage`** (not `UserProperties`) for selected student:
- `sessionStorage` persists across sidebar close/reopen within the same browser session
- Auto-clears when browser tab closes — no stale state across days
- Synchronous access — no async overhead during `loadRoster()`
- Does NOT persist across browser sessions (by design — teacher starts fresh each day)

**Key:** `ielts_selected_student`

**Restore logic in `loadRoster()`:**
```typescript
// After fetching roster from GAS:
const stored = sessionStorage.getItem('ielts_selected_student')
if (stored && roster.includes(stored)) {
  selectedStudent.value = stored
} else if (roster.length > 0) {
  selectedStudent.value = roster[0]
  sessionStorage.setItem('ielts_selected_student', roster[0])
}
```

**Cross-document behavior (AC #7):** Already works. `UserProperties` stores the linked Sheet ID/name (server-side, persists across documents). `sessionStorage` stores the selected student (client-side, persists within browser session). When the teacher opens a new Doc, the sidebar re-initializes: `initializeSheet()` reads from `UserProperties` (same Sheet), `loadRoster()` reads from `sessionStorage` (same student).

### Confirm Dialog Component Design

Reusable `<ConfirmDialog>` — not specific to unsaved changes. Will be reused for:
- Re-grade confirmation (Story 3.4)
- Clear comments confirmation (Story 3.4)
- Unlink Sheet confirmation (future)

```
┌─────────────────────────────────────┐
│                                     │
│  You have unsaved changes for       │
│  Minh. Save before continuing?      │
│                                     │
│  [Save]  [Discard]  [Cancel]        │
│                                     │
└─────────────────────────────────────┘
```

- Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100`
- Dialog: `background: white; padding: 16px; border-radius: 4px; max-width: 280px; margin: auto`
- Buttons: bottom-left aligned per Google Add-on UI rules. Primary (blue `.action`) on left, secondary (gray `.create`) to right
- Max one primary button per dialog
- Focus trap: first button gets focus on open, Tab cycles through buttons only
- Escape calls Cancel action
- Custom CSS inlined in `styles.css` (confirm dialog is not covered by Google Add-ons CSS)
- **300px sidebar constraint:** Dialog `max-width: 280px` + padding fits within the sidebar. Test at 300px width to ensure no overflow or horizontal scroll

### Student Nav Component Layout

Compact horizontal layout for 300px sidebar:

```
[< Prev]  Student 3 of 15  [Next >]
```

- Buttons: use `<button>` elements with text labels, not icon-only (accessibility)
- Disabled state: `disabled` attribute + `aria-disabled="true"` + reduced opacity via `.secondary` class
- Position text: `.gray` class, centered
- Keyboard: listen for `ArrowLeft` (prev) and `ArrowRight` (next) on the nav container with `tabindex="0"`
- Container: `display: flex; justify-content: space-between; align-items: center; padding: 4px 0`
- Renders nothing if roster has 0 or 1 students (no navigation needed)

### Google Add-ons CSS Classes

| Element | CSS Class | Notes |
|---------|-----------|-------|
| Nav container | `.block` | Standard block spacing |
| Prev/Next buttons | `<button>` unstyled or `.secondary` | Gray text buttons, compact |
| Position text | `.gray` | "Student 3 of 15" |
| Disabled buttons | `.secondary` + `disabled` | Visually dimmed |
| Confirm dialog overlay | Custom CSS | Not covered by add-ons CSS |
| Confirm dialog box | Custom CSS | White card with padding |
| Save button (dialog) | `.action` (blue) | Primary action |
| Discard button (dialog) | `.create` (gray) | Secondary |
| Cancel button (dialog) | `.create` (gray) | Secondary |

### Custom CSS Additions (styles.css)

```css
/* Confirm dialog overlay */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Confirm dialog card */
.confirm-dialog {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  max-width: 280px;
  width: calc(100% - 32px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.confirm-dialog p {
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.confirm-dialog .confirm-actions {
  display: flex;
  gap: 8px;
}

/* Student nav */
.student-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.student-nav button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #444;
  font-size: 13px;
}

.student-nav button:disabled {
  opacity: 0.4;
  cursor: default;
}

.student-nav .nav-position {
  font-size: 12px;
}
```

### Project Structure Notes

Files created/modified in this story:

```
apps/addon/
├── src/
│   └── sidebar/
│       ├── components/
│       │   ├── app.tsx                      # MODIFIED: add StudentNav + UnsavedPrompt
│       │   ├── app.test.tsx                 # MODIFIED: test new components render
│       │   ├── student-picker.tsx           # MODIFIED: remove "Student X of Y" (moved to student-nav)
│       │   ├── student-picker.test.tsx      # MODIFIED: remove position text test
│       │   ├── student-nav.tsx              # NEW: prev/next + position indicator
│       │   ├── student-nav.test.tsx         # NEW
│       │   ├── confirm-dialog.tsx           # NEW (reusable)
│       │   ├── confirm-dialog.test.tsx      # NEW
│       │   ├── unsaved-prompt.tsx           # NEW
│       │   └── unsaved-prompt.test.tsx      # NEW
│       ├── state/
│       │   ├── students.ts                  # MODIFIED: nav actions, session persistence, resetScores import
│       │   ├── students.test.ts             # MODIFIED: nav + persistence tests
│       │   ├── scores.ts                    # NEW (stub — keys match @ielts-toolkit/shared BandScores)
│       │   └── scores.test.ts              # NEW
│       └── styles.css                       # MODIFIED: confirm dialog + nav styles
```

### Previous Story Intelligence (Story 1.4)

**Key learnings to apply:**
- `module: "none"` in `tsconfig.server.json` — but this story adds NO server code, so not relevant
- Signal pattern: typed defaults, action functions exported, no signal mutation in components — follow for all new signals
- `computed()` for derived values — use for `canNavigateNext`, `canNavigatePrev`, `hasUnsavedChanges`
- Test pattern: `vi.mock('../lib/gas')` in component tests — follow for new component tests
- Google Add-ons CSS: one primary blue button per view — confirm dialog gets one blue "Save" button
- Boolean for simple busy guard is OK (`addingStudent`), but typed status for multi-state async flows — `saveStatus` uses typed union per pattern
- Test file count at end of Story 1.4: 128 tests, 0 failures — baseline for regression check

**Files from previous stories NOT modified by this story:**
- `server/sheets.ts` — no changes (navigation is client-side)
- `gas-types.d.ts` — no changes (no new GAS functions)
- `lib/gas.ts` — no changes
- `__mocks__/gas-mock.ts` — no changes

### Regression Risk

**Low risk.** This story:
- Adds new files (no conflict with existing code)
- Modifies `students.ts` (adds new exports, doesn't change existing function signatures)
- Modifies `app.tsx` (adds new components to render tree, doesn't change existing rendering logic)
- Creates `scores.ts` stub (new file, no existing consumers)

**Potential risk areas:**
- `studentIndex` computed already exists — the new `canNavigateNext`/`canNavigatePrev` computeds depend on it. Verify `studentIndex` returns `-1` when no student selected and handle gracefully
- `selectStudent()` modification to add `sessionStorage` write — ensure it doesn't break the case where `sessionStorage` is unavailable (Apps Script iframe may restrict it). Add try/catch around `sessionStorage` access
- `loadRoster()` modification to read `sessionStorage` — same iframe concern. Graceful fallback to default behavior if `sessionStorage` throws

**sessionStorage in Apps Script iframe:** Google Apps Script sidebar runs in a sandboxed iframe. `sessionStorage` availability depends on the sandbox mode. The current `appsscript.json` uses `IFRAME` sandbox mode which allows `sessionStorage`. However, wrap all `sessionStorage` access in try/catch for defensive coding:

```typescript
function persistStudent(name: string): void {
  try { sessionStorage.setItem('ielts_selected_student', name) } catch {}
}

function restoreStudent(): string | null {
  try { return sessionStorage.getItem('ielts_selected_student') } catch { return null }
}
```

### Boundary Behavior Decision (AC #4)

**Disabled at boundaries** (not wrapping). Rationale:
- During batch grading, teachers need to know when they've reached the end of the roster
- Wrapping silently puts them back at the start, which is confusing during a 24-essay session
- Disabled buttons provide clear visual signal: "you're at the end"
- Consistent with standard Google Workspace UX patterns

### What This Story Does NOT Implement

- **Score editing UI** — Story 2.2 adds the score editor with stepper controls
- **Save to Sheet** — Story 2.2 implements Sheet write-back
- **AI grading panel** — Epic 3 scope
- **Recent grading activity** — Requires grading history (Epic 3). For now, the empty state message serves as the activity area
- **Assignment context display** — Requires task type selection (Epic 3). For now, student name + position is the visible context

### Anti-Patterns (NEVER do these)

- Score keys like `ta`, `cc`, `lr`, `gra` — MUST use full names from `@ielts-toolkit/shared`: `taskAchievement`, `coherenceAndCohesion`, `lexicalResource`, `grammaticalRangeAndAccuracy`
- Navigating to a new student without calling `resetScores()` first — stale scores from the previous student trigger false dirty-check prompts
- `isNavigating: boolean` instead of typed navigation state — use `pendingNavigation: 'next' | 'prev' | null`
- Global `isLoading` for navigation — navigation is synchronous (signal update), no loading state needed
- Direct signal mutation in components — use `navigateNext()`, `navigatePrev()`, etc. action functions
- `localStorage` instead of `sessionStorage` — localStorage persists forever, creating stale student selections across days
- Wrapping navigation at boundaries — disabled buttons, not wrap-around
- Inline CSS in components — add to `styles.css` (custom CSS file already exists per project structure)
- Creating a router library — step-based navigation with signals is the established pattern
- Adding GAS server functions for session persistence — `sessionStorage` is simpler and appropriate for ephemeral session state

### References

- [Source: epics.md#Story 2.1] — Full acceptance criteria
- [Source: architecture.md#Frontend Architecture (Sidebar)] — Preact + signals + Google Add-ons CSS
- [Source: architecture.md#Communication Patterns] — Signal patterns, one file per domain
- [Source: architecture.md#Process Patterns] — Loading state patterns, typed status signals
- [Source: prd.md#Journey 2] — Linh's Sunday Batch: student navigation flow, batch grading rhythm
- [Source: prd.md#FR9-FR13] — Sidebar experience requirements
- [Source: project-context.md#Preact Sidebar Patterns] — Signal patterns, computed for derived values, action functions
- [Source: project-context.md#Google Workspace Add-on UI Rules] — Max one primary button per view, button placement
- [Source: project-context.md#Grading Session UX Constraints] — Unsaved score edits trigger confirmation, "Student 8 of 23" context
- [Source: 1-4-link-existing-sheet-and-roster-management.md#Dev Notes] — Previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No blockers or halts encountered.

### Completion Notes List

- Task 1: Added `navigateNext`, `navigatePrev`, `confirmNavigation`, `cancelNavigation` actions and `canNavigateNext`, `canNavigatePrev`, `pendingNavigation` signals to `students.ts`. 17 new test cases added.
- Task 2: Created `scores.ts` stub with `currentScores`, `savedScores`, `hasUnsavedChanges`, `saveStatus`, `resetScores`, `discardChanges`. Keys match `BandScores` from `@ielts-toolkit/shared`. 6 tests.
- Task 3: Created `student-nav.tsx` with prev/next buttons, position indicator, keyboard nav. Removed position text from `student-picker.tsx`. 9 new tests, 1 test removed from picker.
- Task 4: Created reusable `confirm-dialog.tsx` with focus trap, escape key, a11y attributes. 8 tests.
- Task 5: Created `unsaved-prompt.tsx` wiring confirm dialog to navigation guard. Save is placeholder for Story 2.2. 5 tests.
- Task 6: Updated `app.tsx` layout to include `StudentNav` and `UnsavedPrompt` in grading-ready state. 1 new test.
- Task 7: Added `sessionStorage` persistence for selected student with try/catch for GAS iframe safety. 4 new tests.
- Task 8: Verified no GAS mock or type changes needed — navigation is purely client-side.
- Task 9: `turbo build` passes (36.69KB bundle), `turbo test` passes (162 addon tests, 0 regressions from 128 baseline).

### Change Log

- 2026-04-23: Implemented Story 2.1 — sidebar navigation, student context, unsaved changes guard, session persistence. 34 new tests added (128 → 162 total).

### Review Findings

- [x] [Review][Decision] F1: "Save" button placeholder destroys data — **Resolved: Option A** — remove Save button until Story 2.2 wires real save. Two buttons only (Discard + Cancel).
- [x] [Review][Decision] F2: StudentPicker dropdown bypasses unsaved-changes guard — **Resolved: Option C** — defer prompt to Story 2.2. F4 patch (resetScores on dropdown) prevents score carry-over in the meantime.
- [x] [Review][Patch] F3: Escape key triggers Discard instead of Cancel — fixed: `[...actions].reverse().find()` finds last non-primary (Cancel) [confirm-dialog.tsx:28]
- [x] [Review][Patch] F4: StudentPicker doesn't call `resetScores()` on student change — fixed: moved `resetScores()` into `selectStudent()` [students.ts:93]
- [x] [Review][Patch] F5: StudentNav shows "Student 0 of N" when `studentIndex` is -1 — fixed: added `studentIndex < 0` guard [student-nav.tsx:9]
- [x] [Review][Patch] F6: `confirmNavigation()` lacks bounds check — fixed: added bounds validation before array access [students.ts:50-58]
- [x] [Review][Patch] F7: `actions` array recreated every render causes `useEffect` to re-run — fixed: removed `actions` from deps [confirm-dialog.tsx:47]
- [x] [Review][Patch] F8: Nav buttons lack `:focus-visible` style — fixed: added `:focus-visible` outline [styles.css:96-100]
- [x] [Review][Defer] F9: No focus restoration when ConfirmDialog closes — standard a11y improvement, not caused by this change — deferred, pre-existing

### File List

- apps/addon/src/sidebar/state/students.ts (MODIFIED)
- apps/addon/src/sidebar/state/students.test.ts (MODIFIED)
- apps/addon/src/sidebar/state/scores.ts (NEW)
- apps/addon/src/sidebar/state/scores.test.ts (NEW)
- apps/addon/src/sidebar/components/student-nav.tsx (NEW)
- apps/addon/src/sidebar/components/student-nav.test.tsx (NEW)
- apps/addon/src/sidebar/components/student-picker.tsx (MODIFIED)
- apps/addon/src/sidebar/components/student-picker.test.tsx (MODIFIED)
- apps/addon/src/sidebar/components/confirm-dialog.tsx (NEW)
- apps/addon/src/sidebar/components/confirm-dialog.test.tsx (NEW)
- apps/addon/src/sidebar/components/unsaved-prompt.tsx (NEW)
- apps/addon/src/sidebar/components/unsaved-prompt.test.tsx (NEW)
- apps/addon/src/sidebar/components/app.tsx (MODIFIED)
- apps/addon/src/sidebar/components/app.test.tsx (MODIFIED)
- apps/addon/src/sidebar/styles.css (MODIFIED)
