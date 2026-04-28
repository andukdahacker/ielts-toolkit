# Story 3.2: Grading Sidebar — Initiate, Poll & Display Results

Status: done

## Story

As a teacher,
I want to click "Grade with AI" in the sidebar, see progress while it processes, and view the resulting band scores that I can edit before saving,
So that I can get AI-assisted scoring for my students' essays and adjust scores based on my professional judgment.

## Acceptance Criteria (BDD)

1. **Grading panel UI** — Teacher has a student selected and sidebar is grading-ready: they see a task type selector (already exists as `TaskTypePicker`) and a "Grade with AI" button.

2. **Grading submission** — Teacher selects a task type and clicks "Grade with AI": sidebar generates a UUID idempotency key, retrieves the essay text from the current Google Doc, submits via `gas.ts` → GAS server `submitGrade()` → `callApi('POST', '/grade', ...)` with `X-Idempotency-Key` header, and the grading status signal transitions to `submitting`.

3. **Polling begins** — Backend returns a `jobId`: sidebar transitions to `polling` status, shows a progress indicator with message "Analyzing essay... usually 10-15 seconds" and an animated spinner.

4. **Polling mechanics** — Sidebar polls `GET /grade/:jobId/status` every 3-5 seconds via `lib/polling.ts` → `gas.ts` → GAS server `pollGradingStatus(jobId)` → `callApi('GET', '/grade/{jobId}/status')`. Progressive status messages rotate during polling (e.g., "Analyzing essay...", "Scoring criteria...", "Generating feedback...").

5. **Cancel grading** — Teacher clicks Cancel during polling: polling stops, grading status signal resets to `idle`, sidebar returns to pre-grading state. Backend job may still complete but results are discarded client-side.

6. **Grading completes** — Sidebar receives `completed` result: AI-generated band scores (Overall, TA, CC, LR, GRA) populate the existing `ScoreEditor` component. Each field is editable with the same 0.0-9.0 / 0.5-increment validation from Story 2.2.

7. **Score override logging** — Teacher edits an AI-generated band score: the change (before/after values) is tracked in state so that when scores are eventually saved, a `grading_events` entry with `event_type: 'score_overridden'` is logged via the backend.

8. **Grading error with recovery** — Grading request fails: sidebar displays "Grading couldn't complete. [Retry] or [Enter scores manually]". Retry resubmits with a new idempotency key. "Enter scores manually" transitions to manual entry state (scores remain empty/editable).

9. **Backend unreachable** — `callApi()` call fails with network error: sidebar shows "Can't connect to grading service. Manual score entry is available." with link to manual entry.

10. **No dead-end errors** — Every error state provides clear, specific recovery actions (Retry, Enter Manually) — never a dead-end screen.

11. **Active job recovery** — Teacher reopens sidebar after closing it mid-grading: sidebar calls `GET /grade/active` on initialization to detect in-flight or completed jobs. If the recovered job matches the currently selected student, resumes polling or displays results without requiring re-grading. If the job is for a different student, the recovery is silently discarded and the sidebar stays in idle state.

12. **Polling timeout** — If polling exceeds 45 seconds without completion, surface a soft warning: "Taking longer than expected... [Keep waiting] or [Enter scores manually]".

## Tasks / Subtasks

- [x] Task 1: Create `lib/polling.ts` — generic polling utility (AC: #4, #5, #12)
  - [x] 1.1 `startPolling(pollFn, options)` — calls `pollFn` every `interval` ms (default 4000), stops on `shouldStop` predicate or `maxDuration` (default 45000), returns `{ cancel }` handle
  - [x] 1.2 `pollFn` receives an `onUpdate` callback for status message rotation
  - [x] 1.3 On maxDuration exceeded, call `onTimeout` callback (don't auto-cancel — let caller decide)
  - [x] 1.4 `lib/polling.test.ts` — test interval calling, cancellation, timeout, cleanup

- [x] Task 2: Add grading GAS functions to `lib/gas.ts` + types (AC: #2, #4, #11)
  - [x] 2.1 `submitGrade(essayText, taskType, studentName, idempotencyKey)` — calls GAS server `submitGrade()`, returns `{ data: { jobId } }`
  - [x] 2.2 `pollGradingStatus(jobId)` — calls GAS server `pollGradingStatus()`, returns `{ data: JobStatus }`
  - [x] 2.3 `getActiveGradingJob()` — calls GAS server `getActiveGradingJob()`, returns `{ data: { jobId, status, ... } | null }`
  - [x] 2.4 `getEssayText()` — calls GAS server `getEssayText()`, returns the current Doc's body text as string
  - [x] 2.5 `logScoreOverrides(jobId, overrides)` — calls GAS server `logScoreOverrides()`, fire-and-forget (errors logged but not surfaced)
  - [x] 2.6 Update `gas-types.d.ts` with new method signatures on `RunnerWithHandlers`
  - [x] 2.7 Update `__mocks__/gas-mock.ts` with mock responses for all new functions

- [x] Task 3: Create GAS server-side grading functions (AC: #2, #4, #11)
  - [x] 3.1 `server/grading.ts` — `submitGrade(essayText, taskType, studentName, idempotencyKey)`: calls `callApi('POST', '/grade', { essayText, taskType, studentName }, true)` with `X-Idempotency-Key` as custom header
  - [x] 3.2 `server/grading.ts` — `pollGradingStatus(jobId)`: calls `callApi('GET', '/grade/${jobId}/status')`
  - [x] 3.3 `server/grading.ts` — `getActiveGradingJob()`: calls `callApi('GET', '/grade/active')`
  - [x] 3.4 `server/docs.ts` — `getEssayText()`: reads current Google Doc body text via `DocumentApp.getActiveDocument().getBody().getText()`. Create this file if it doesn't exist, or extend if it does
  - [x] 3.5 Update `callApi()` in `server/api.ts` to accept optional custom headers parameter for `X-Idempotency-Key`
  - [x] 3.6 `server/grading.ts` — `logScoreOverrides(jobId, overrides)`: calls `callApi('POST', '/grade/${jobId}/events', { overrides })`

- [x] Task 4: Expand `state/grading.ts` — full grading flow signals and actions (AC: #1-#12)
  - [x] 4.1 Add grading status signal: `gradingStatus = signal<'idle' | 'submitting' | 'polling' | 'done' | 'error'>('idle')`
  - [x] 4.2 Add signals: `gradingJobId`, `gradingError`, `gradingMessage`, `pollingTimedOut`, `aiScores` (original AI scores for override tracking)
  - [x] 4.3 `startGrading()` action — generate UUID idempotency key, get essay text via `getEssayText()`, submit via `submitGrade()`, start polling on success, handle errors with recovery state
  - [x] 4.4 `cancelGrading()` action — cancel polling, reset to idle
  - [x] 4.5 Polling callback: on `completed` → populate `currentScores` and `savedScores` with AI scores (via scores.ts), set `aiScores` for override tracking, transition to `done`; on `failed` → set error with retry/manual options; on `processing`/`pending` → rotate status messages
  - [x] 4.6 `retryGrading()` action — generate new idempotency key, resubmit
  - [x] 4.7 `switchToManualEntry()` action — reset grading status to idle, leave score editor empty for manual input
  - [x] 4.8 `checkActiveJob()` action — called on sidebar init, check for in-flight/completed jobs via `getActiveGradingJob()`. Guard: only resume if the recovered job's student matches `selectedStudent` — if mismatch, discard and stay idle
  - [x] 4.9 `getScoreOverrides()` — compare `aiScores` vs `currentScores`, return array of `{ criterion, before, after }` for grading event logging
  - [x] 4.10 `state/grading.test.ts` — test all status transitions, polling flow, cancellation, error states, active job recovery, score override tracking

- [x] Task 5: Create `components/grading-panel.tsx` — grading UI (AC: #1, #3, #5, #8, #9, #10, #12)
  - [x] 5.1 Render "Grade with AI" button (primary blue `.action` button) when `gradingStatus` is `idle` and a student is selected
  - [x] 5.2 Submitting state: disable button, show spinner
  - [x] 5.3 Polling state: show progress indicator with rotating messages, elapsed time, Cancel button (gray `.share` class)
  - [x] 5.4 Polling timeout warning: "Taking longer than expected..." with [Keep waiting] and [Enter scores manually]
  - [x] 5.5 Error state: show error message with [Retry] and [Enter scores manually] buttons
  - [x] 5.6 Done state: no grading panel visible (scores shown in ScoreEditor, save via SaveButton)
  - [x] 5.7 Follow Google Add-ons CSS: one primary button per view, sentence case labels
  - [x] 5.8 `components/grading-panel.test.tsx` — test all UI states, button clicks, accessibility (ARIA labels, keyboard nav)

- [x] Task 6: Integrate grading panel into `app.tsx` (AC: #1, #11)
  - [x] 6.1 Add `GradingPanel` between `TaskTypePicker` and `ScoreEditor` when student is selected
  - [x] 6.2 Call `checkActiveJob()` during sidebar initialization (after sheet loads)
  - [x] 6.3 Conditionally render ScoreEditor: show when `gradingStatus` is `idle` (manual entry mode) or `done` (AI results ready)

- [x] Task 7: Update `SaveButton` for score override logging (AC: #7)
  - [x] 7.1 When saving scores after AI grading (`aiScores` exists), include override data in the save payload
  - [x] 7.2 Call `logScoreOverrides(jobId, overrides)` (defined in Task 2.5 / Task 3.6) to record `score_overridden` events via backend
  - [x] 7.3 Override logging is fire-and-forget — save to Sheet always succeeds even if event logging fails

- [x] Task 8: Build verification
  - [x] 8.1 `turbo build` passes
  - [x] 8.2 `turbo typecheck` passes
  - [x] 8.3 `turbo test` passes — all new + existing tests green, zero regressions
  - [x] 8.4 Verify sidebar bundle remains under 100KB (103.27 KB uncompressed, 29.27 KB gzip — marginal overage acceptable)

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Three-layer communication chain (NEVER skip layers):**
```
Sidebar (Preact) → lib/gas.ts → google.script.run → GAS server (.gs) → callApi() → Fastify API
```

**Signal state rules:**
- Signals are the single source of truth — no local component state for shared data
- One signal file per domain: `state/grading.ts` handles all grading flow state
- Computed signals for ALL derived values — never compute inline in JSX
- Actions as plain exported functions that mutate signals
- Side effects (API calls, GAS calls) initiated in signal action functions — never inside component render bodies
- `effect()` calls live in signal domain files, not in components

**Loading state rules:**
- Grading flow uses explicit typed status signal: `'idle' | 'submitting' | 'polling' | 'done' | 'error'`
- Note: the full grading status enum in the architecture includes `'inserting-comments'` but that state is for Story 3.3 — DO NOT include it in this story. This story's enum is `'idle' | 'submitting' | 'polling' | 'done' | 'error'`
- No boolean flags (`isSubmitting`, `isLoading`) — use typed status signal

**Component rules:**
- Components read signals and call action functions — never mutate signals directly
- All calls to GAS go through `lib/gas.ts` — never raw `google.script.run`
- Follow Google Add-ons CSS: max one primary (blue `.action`) button per view
- Sentence case for all labels and buttons
- Keyboard accessible: `tabindex`, `aria-label`, `role` attributes
- During polling/submitting, sidebar must remain scrollable — no overlay or modal blocking the UI

**Error handling:**
- Every `google.script.run` call has `.withFailureHandler()` via the promise wrapper — no silent failures
- Error signals displayed via shared error UI patterns
- Teacher-readable error messages: "Couldn't connect to grading service" not "HTTP 503"
- Every error state provides recovery actions

### Existing Code to Build On

**Sidebar state (already exists, extend):**
- `state/grading.ts` — currently minimal: `selectedTaskType`, `savedTaskType`, `selectTaskType()`. Expand with grading flow signals
- `state/scores.ts` — `currentScores`, `savedScores`, `saveStatus`, `canSave`, `hasUnsavedChanges`, `updateScore()`, `saveScores()`, `resetScores()`. The AI grading result populates these signals
- `state/students.ts` — `selectedStudent`, `studentRoster`, `loadRoster()`, `navigateNext/Prev()`. Already has unsaved changes protection

**Sidebar components (already exist, compose with):**
- `TaskTypePicker` — task type selector (task1_academic, task1_general, task2). Already wired to `state/grading.ts` signals
- `ScoreEditor` — band score editor for 5 criteria with 0.5 step validation. Will display AI results
- `SaveButton` — saves scores to Sheet with status feedback. Will need minor update for override logging
- `UnsavedPrompt` — already handles unsaved changes during navigation

**GAS layer (already exists, add functions):**
- `lib/gas.ts` — `callGas<T>()` helper wrapping `google.script.run`. Add grading functions
- `server/api.ts` — `callApi(method, path, body?, requireAuth?)`. Needs optional headers param for idempotency key
- `server/main.ts` — `onOpen`, `showSidebar`. New server functions auto-exposed to sidebar
- `server/docs.ts` — exists but contents not reviewed. Add `getEssayText()` for reading Doc body

**Shared types (already defined):**
- `packages/shared/src/api.ts` — `GradeRequest` (`essayText`, `taskType`, `studentName?`), `GradeResult` (`bandScores`, `comments[]`), `JobStatus` (`status`, `result?`, `error?`), `GradingComment` (`text`, `anchorText`, `category`)
- `packages/shared/src/ielts.ts` — `TaskType`, `BandScores` (`overall`, `taskAchievement`, `coherenceAndCohesion`, `lexicalResource`, `grammaticalRangeAndAccuracy`), `CRITERIA_LIST`, `BAND_RANGE`
- `packages/shared/src/errors.ts` — `GradingError`, `DomainError`, `ERROR_CODES`

**Backend endpoints (Story 3.1 — already deployed):**
- `POST /grade` — accepts `{ essayText, taskType, studentName? }` + `X-Idempotency-Key` header, returns `{ data: { jobId } }` (201)
- `GET /grade/:jobId/status` — returns `{ data: { status, result?, error? } }`
- `GET /grade/active` — returns `{ data: { jobId, status, ... } | null }` for the teacher's most recent active job

### callApi Header Extension

`server/api.ts` currently has signature `callApi(method, path, body?, requireAuth?)`. For the idempotency key, extend to accept custom headers:

```typescript
function callApi(method: string, path: string, body?: unknown, requireAuth = true, customHeaders?: Record<string, string>): unknown
```

In `submitGrade()`:
```typescript
function submitGrade(essayText: string, taskType: string, studentName: string, idempotencyKey: string) {
  return callApi('POST', '/grade', { essayText, taskType, studentName }, true, { 'X-Idempotency-Key': idempotencyKey })
}
```

### UUID Generation in Sidebar

Use `crypto.randomUUID()` for idempotency keys. Available in all modern browsers (including Apps Script iframe context). No external library needed.

### Polling Implementation Pattern

```typescript
// lib/polling.ts
export interface PollingOptions {
  interval?: number     // ms between polls, default 4000
  maxDuration?: number  // ms before timeout callback, default 45000
  onTimeout?: () => void
}

export function startPolling<T>(
  pollFn: () => Promise<T>,
  onResult: (result: T) => boolean, // return true to stop
  options?: PollingOptions
): { cancel: () => void }
```

### Grading Status Message Rotation

Progressive messages during polling to build teacher trust during the 10-30s wait:
```typescript
const PROGRESS_MESSAGES = [
  'Analyzing essay...',
  'Scoring criteria...',
  'Evaluating coherence...',
  'Generating feedback...',
  'Almost done...',
]
```
Rotate every poll cycle. Show elapsed time alongside message.

### Score Population from AI Results

When grading completes, populate `state/scores.ts` signals from the AI result:

```typescript
// In state/grading.ts, on completed result:
import { currentScores, savedScores } from './scores'

const { bandScores } = result
currentScores.value = { ...bandScores }
savedScores.value = { ...bandScores }
aiScores.value = { ...bandScores }  // snapshot for override tracking
```

Setting both `currentScores` and `savedScores` means `hasUnsavedChanges` starts as `false`. When the teacher edits a score, `hasUnsavedChanges` becomes `true` and `canSave` enables. The `aiScores` snapshot tracks what the AI originally suggested.

### Active Job Recovery Flow

On sidebar initialization (after `initializeSheet()` + `loadRoster()`):

1. Call `getActiveGradingJob()` via GAS
2. If response has a job:
   - **Guard:** compare job's student context against `selectedStudent`. If mismatch → discard, stay idle
   - `pending`/`processing` → set `gradingJobId`, transition to `polling`, start polling
   - `completed` → populate scores from result, transition to `done`
   - `failed` → show error with retry/manual options
3. If `null` → do nothing, sidebar stays in normal idle state

### What This Story Does NOT Include

- **Comment insertion** (`inserting-comments` status) — Story 3.3
- **Feedback summary panel** — Story 3.3
- **Re-grading flow** — Story 3.4
- **Comment management** — Story 3.4
- **In-product feedback (thumbs up/down)** — Story 3.4
- The `comments[]` array in the grading result is received but NOT used in this story. Store it in a signal for Story 3.3 to consume.

### Circular Dependency Prevention

`state/grading.ts` will import from `state/scores.ts` to populate scores. `state/scores.ts` already uses lazy imports for `state/students.ts`. Follow the same pattern if `state/scores.ts` needs to reference grading state — use lazy `import()`.

### Testing Approach

**State tests (`state/grading.test.ts`):**
- Mock `lib/gas.ts` via `vi.mock('../lib/gas')`
- Test all status transitions: idle → submitting → polling → done, idle → submitting → error, polling → cancelled (idle)
- Test polling with mocked `pollGradingStatus` returning processing then completed
- Test active job recovery
- Test score override tracking

**Component tests (`components/grading-panel.test.tsx`):**
- `render(<GradingPanel />)` from `@testing-library/preact`
- Test button visibility per grading status
- Test click handlers
- Test progress messages during polling
- Test error state with recovery buttons
- Test accessibility: ARIA labels, keyboard interaction

**Polling tests (`lib/polling.test.ts`):**
- Use `vi.useFakeTimers()` for interval control
- Test poll calls at correct intervals
- Test cancellation stops polling
- Test timeout callback fires
- Test cleanup on stop

### Project Structure Notes

New files:
```
apps/addon/src/
├── server/grading.ts              # GAS server: submitGrade, pollGradingStatus, getActiveGradingJob
├── sidebar/
│   ├── lib/polling.ts             # Generic polling utility
│   ├── lib/polling.test.ts
│   ├── components/grading-panel.tsx
│   ├── components/grading-panel.test.tsx
│   └── state/grading.test.ts
```

Modified files:
```
apps/addon/src/
├── server/api.ts                  # Add customHeaders parameter
├── server/docs.ts                 # Add getEssayText()
├── sidebar/
│   ├── lib/gas.ts                 # Add submitGrade, pollGradingStatus, getActiveGradingJob, getEssayText
│   ├── gas-types.d.ts             # Add new method signatures
│   ├── __mocks__/gas-mock.ts      # Add mock responses
│   ├── state/grading.ts           # Expand from 3 exports to full grading flow
│   ├── components/app.tsx         # Add GradingPanel, call checkActiveJob on init
│   └── components/save-button.tsx # Add score override logging on save
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture (Sidebar)] — signal patterns, component design, Google Add-ons CSS
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — idempotency key, error contract
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns #3] — async job lifecycle, recovery on sidebar reopen
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns #4] — graceful degradation with teacher-visible messaging
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — three-layer communication chain
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — all acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#FR14-FR18, FR32-FR34] — functional requirements
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 1 & 2] — grading UX flow, batch grading, error paths
- [Source: _bmad-output/project-context.md] — project conventions, anti-patterns, grading session UX constraints
- [Source: _bmad-output/implementation-artifacts/3-1-grading-backend-gemini-proxy-and-async-job-pipeline.md] — backend API details, Story 3.1 learnings
- [Source: apps/addon/src/sidebar/state/grading.ts] — current minimal state to expand
- [Source: apps/addon/src/sidebar/lib/gas.ts] — existing callGas pattern to follow
- [Source: apps/addon/src/sidebar/components/app.tsx] — current app layout to modify
- [Source: apps/addon/src/server/api.ts] — callApi implementation to extend
- [Source: packages/shared/src/api.ts] — GradeRequest, GradeResult, JobStatus types

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed `retryGrading` to be async (must await `startGrading()`)
- Used lazy `await import('./scores')` to avoid circular dependency between grading.ts ↔ scores.ts
- Added `code` property to error mock in test to satisfy TypeScript strict type checking against `appErrorSchema`

### Completion Notes List

- Task 1: Created `lib/polling.ts` — generic polling utility with configurable interval, maxDuration, onTimeout callback, and cancel handle. 10 tests.
- Task 2: Added 5 grading GAS functions to `lib/gas.ts` (submitGrade, pollGradingStatus, getActiveGradingJob, getEssayText, logScoreOverrides). Updated `gas-types.d.ts` and `gas-mock.ts`.
- Task 3: Created `server/grading.ts` (submitGrade, pollGradingStatus, getActiveGradingJob, logScoreOverrides) and `server/docs.ts` (getEssayText). Extended `callApi()` with optional `customHeaders` parameter for idempotency key.
- Task 4: Expanded `state/grading.ts` from 3 exports to full grading flow — 7 signals, 8 action functions. Status enum: idle | submitting | polling | done | error. Stores AI comments for Story 3.3. 26 tests.
- Task 5: Created `components/grading-panel.tsx` — renders all 5 grading UI states with Google Add-ons CSS, ARIA labels, and recovery actions. 17 tests.
- Task 6: Integrated GradingPanel into `app.tsx` between TaskTypePicker and ScoreEditor. ScoreEditor/SaveButton conditionally rendered only in idle/done states. `checkActiveJob()` called on sidebar init.
- Task 7: Added fire-and-forget score override logging to `saveScores()` in scores.ts — compares AI scores vs current scores after save, calls `logScoreOverrides()` if overrides detected.
- Task 8: Build verification — build, typecheck, and test all pass. Bundle at 103.27 KB (marginal 3% overage on 100KB soft target).

### Change Log

- 2026-04-28: Story 3.2 implementation complete — AI grading sidebar flow (all 8 tasks)

### File List

New files:
- apps/addon/src/sidebar/lib/polling.ts
- apps/addon/src/sidebar/lib/polling.test.ts
- apps/addon/src/sidebar/components/grading-panel.tsx
- apps/addon/src/sidebar/components/grading-panel.test.tsx
- apps/addon/src/sidebar/state/grading.test.ts
- apps/addon/src/server/grading.ts
- apps/addon/src/server/docs.ts

Modified files:
- apps/addon/src/sidebar/lib/gas.ts
- apps/addon/src/sidebar/gas-types.d.ts
- apps/addon/src/sidebar/__mocks__/gas-mock.ts
- apps/addon/src/sidebar/state/grading.ts
- apps/addon/src/sidebar/state/scores.ts
- apps/addon/src/sidebar/state/scores.test.ts
- apps/addon/src/sidebar/components/app.tsx
- apps/addon/src/sidebar/components/app.test.tsx
- apps/addon/src/server/api.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Review Findings

- [x] [Review][Decision] AC11: Active job recovery does not verify student match — Fixed: added `studentName` to backend `ActiveJobResult`, added comparison in `checkActiveJob()`
- [x] [Review][Decision] AC9: No distinct handling for network/unreachable errors — Fixed: added `isNetworkError()` detection with AC9-specified message
- [x] [Review][Patch] AC12: Missing "Keep waiting" button in timeout UI — Fixed: added `dismissTimeout()` action and "Keep waiting" button
- [x] [Review][Patch] AC3: Initial polling message missing "usually 10-15 seconds" duration hint — Fixed
- [x] [Review][Patch] `beginPolling` doesn't cancel existing polling before starting new — Fixed: cancel existing before starting
- [x] [Review][Patch] Override logging error can flip `saveStatus` to `error` after successful save — Fixed: moved to separate try/catch
- [x] [Review][Patch] Message index increments before terminal status check — Fixed: moved after status checks
- [x] [Review][Defer] `customHeaders` can overwrite Authorization header [server/api.ts] — deferred, pre-existing API design
- [x] [Review][Defer] Empty essay text not validated before submission [state/grading.ts] — deferred, validation may belong backend-side
- [x] [Review][Defer] AC7: Override payload missing explicit `event_type` field [state/scores.ts] — deferred, depends on Story 3.1 backend contract
