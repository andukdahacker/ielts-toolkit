# Story 3.4: Comment Management & Re-grading

Status: done

## Story

As a teacher,
I want to manage AI-inserted comments using native Google Docs tools and re-grade essays when needed,
So that I maintain full control over the feedback my students see and can get fresh AI analysis if the essay changes or I want a second opinion.

## Acceptance Criteria (BDD)

1. **Native comment management** — AI comments have been inserted into the Google Doc: the teacher can review, resolve, edit, or delete each comment using Google Docs' native commenting interface — the comments behave identically to manually created comments (no add-on interference).

2. **Grading event logging** — When the teacher re-grades or saves scores, relevant `grading_events` entries are logged for future model improvement. Specifically: `'regrade_started'` (with `clearedComments` flag) logged on re-grade initiation, and `'score_overridden'` (with before/after values) logged on save. Note: per-comment state detection (`comment_kept`/`comment_deleted`/`comment_edited`) is deferred — Google Docs does not notify add-ons of native comment actions, and polling Drive API per-save adds unacceptable latency.

3. **Native commenting unimpaired** — The teacher adds their own feedback via Google Docs' native commenting: the comment is created normally — the add-on does not interfere with native commenting functionality.

4. **Re-grade button** — The teacher wants to re-grade an essay: they click "Re-grade" in the sidebar, and see an option: "Clear previous AI comments before re-grading?" with Yes and No choices.

5. **Clear previous comments on re-grade** — The teacher selects "Yes" to clear previous AI comments: all AI-inserted comments from the previous grading session are removed from the Doc (identified by stored comment IDs), and a new grading request is submitted.

6. **Keep previous comments on re-grade** — The teacher selects "No" to keep previous AI comments: existing comments remain in the Doc, and new AI comments are inserted alongside them — the sidebar feedback summary updates to show only the latest grading session's suggestions.

7. **Persistent feedback summary** — Comments have been resolved or deleted in the Doc: the sidebar AI Feedback Summary still shows all original AI suggestions (it is a persistent record of what the AI generated, independent of Doc comment state).

8. **In-product feedback** — A grading session completes and results are displayed: the sidebar shows an optional one-tap feedback prompt: "Was this grading helpful? thumbs up / thumbs down" with optional freeform text, stored as a `grading_events` entry with `event_type: 'feedback'`.

## Tasks / Subtasks

- [x] Task 1: Create `POST /grade/:jobId/events` backend route for event logging (AC: #2, #8)
  - [x] 1.1 Add route in `routes/grade.ts` — accepts `{ eventType: string, payload: object }`, validates `jobId` UUID + teacher ownership, calls `logGradingEvent()`
  - [x] 1.2 Define Zod schema in `packages/shared/src/api.ts` for the event body: `gradingEventSchema` with `eventType` enum (`'score_overridden' | 'feedback' | 'regrade_started'`) and `payload` as `z.record(z.unknown()).optional()`. Export from `packages/shared/src/index.ts` barrel file as `gradingEventSchema` + `GradingEvent` type
  - [x] 1.3 Update `apps/addon/src/server/grading.ts` `logScoreOverrides` to use the new route format (currently calls `/grade/${jobId}/events` which doesn't exist — wire it up)
  - [x] 1.4 Add route tests in `routes/grade.test.ts`: valid event logged, invalid jobId rejected, wrong teacher rejected, unknown event type rejected

- [x] Task 2: Create `deleteDocComments` server function in `server/docs.ts` (AC: #5)
  - [x] 2.1 `deleteDocComments(commentIds: string[])` — iterates through IDs and calls `Drive.Comments.delete(docId, commentId)` for each
  - [x] 2.2 Get document ID via `DocumentApp.getActiveDocument().getId()`
  - [x] 2.3 Wrap each delete in try/catch — if a comment was already resolved/deleted by teacher, skip silently (don't error)
  - [x] 2.4 Return `{ deleted: number, notFound: number }` — count of successfully deleted vs already-gone comments

- [x] Task 3: Add `deleteDocComments` to GAS communication layer (AC: #5)
  - [x] 3.1 Add `deleteDocComments(commentIds: string[])` to `gas-types.d.ts` RunnerWithHandlers
  - [x] 3.2 Add `deleteDocComments(commentIds)` wrapper to `sidebar/lib/gas.ts` — returns `Promise<{ deleted: number, notFound: number }>`
  - [x] 3.3 Add `logGradingEvents(jobId, events)` wrapper to `sidebar/lib/gas.ts` — returns `Promise<void>` (for batch event logging)
  - [x] 3.4 Add corresponding server function `logGradingEvents(jobId, events)` in `server/grading.ts` that calls `callApi('POST', `/grade/${jobId}/events`, event)` for each event
  - [x] 3.5 Add mock responses to `__mocks__/gas-mock.ts`: `deleteDocComments: { deleted: 5, notFound: 0 }`, `logGradingEvents: undefined`

- [x] Task 4: Expand `state/grading.ts` — add re-grading flow (AC: #4, #5, #6, #7)
  - [x] 4.1 Add signal: `showRegradeConfirm` (`signal<boolean>(false)`) — controls confirmation dialog visibility
  - [x] 4.2 Add action: `requestRegrade()` — sets `showRegradeConfirm.value = true`
  - [x] 4.3 Add action: `confirmRegrade(clearComments: boolean)` — **CRITICAL ORDER:** First capture `const idsToDelete = [...insertedCommentIds.value]` into a local variable, then call `resetGrading()` (which clears `insertedCommentIds`), then if `clearComments` is true call `deleteDocComments(idsToDelete)`, then call `startGrading()`. The local copy prevents data loss since `resetGrading()` zeroes the signal. Log `'regrade_started'` event with payload `{ clearedComments, previousCommentCount: idsToDelete.length }`
  - [x] 4.4 Add action: `cancelRegrade()` — sets `showRegradeConfirm.value = false`
  - [x] 4.5 On new grading completion (re-grade path): replace `aiComments` signal with latest comments (sidebar feedback summary always shows most recent session only per AC #6)
  - [x] 4.6 Preserve `insertedCommentIds` from previous session until deletion is confirmed; after new insertion, replace with new IDs
  - [x] 4.7 Reset `feedbackExpanded` to `true` after re-grade completes (fresh results should be visible)
  - [x] 4.8 Add state tests for re-grade flows: with clear, without clear, cancel

- [x] Task 5: Create `components/regrade-confirm.tsx` — confirmation dialog (AC: #4)
  - [x] 5.1 Render when `showRegradeConfirm.value === true`
  - [x] 5.2 Show: "Clear previous AI comments before re-grading?" with two buttons: "Yes, clear comments" (primary/blue) and "No, keep them" (secondary/gray) + a Cancel link
  - [x] 5.3 "Yes" calls `confirmRegrade(true)`, "No" calls `confirmRegrade(false)`, Cancel calls `cancelRegrade()`
  - [x] 5.4 Style with Google Add-ons CSS: `.block` container, action button placement per style guide (primary left, secondary right)
  - [x] 5.5 Keyboard accessible: buttons focusable, Escape key closes dialog
  - [x] 5.6 Add `components/regrade-confirm.test.tsx` — test button clicks call correct actions, cancel closes, accessibility

- [x] Task 6: Add "Re-grade" button to grading panel (AC: #4)
  - [x] 6.1 **IMPORTANT:** `grading-panel.tsx` currently returns `null` when `gradingStatus.value === 'done'`. Change this: when `done` AND `aiComments.value !== null`, render a "Re-grade" button (gray secondary, not primary) instead of returning null
  - [x] 6.2 Button click calls `requestRegrade()` → shows `RegradeConfirm` dialog
  - [x] 6.3 If `insertedCommentIds.value.length === 0` (e.g., sidebar was reopened, IDs lost), skip the confirmation dialog and call `confirmRegrade(false)` directly (no comments to clear)
  - [x] 6.4 During re-grading submission, show same `submitting` → `polling` → `inserting-comments` → `done` flow as initial grading
  - [x] 6.5 Update `grading-panel.test.tsx` — test Re-grade button visibility, click behavior, and skip-dialog path when no comment IDs

- [x] Task 7: Create `components/grading-feedback.tsx` — post-grading feedback prompt (AC: #8)
  - [x] 7.1 Render after grading completes (when `gradingStatus.value === 'done'`): "Was this grading helpful?" with thumbs-up and thumbs-down buttons
  - [x] 7.2 On button click, optionally expand a single-line text input: "Tell us more (optional)" with a Submit button
  - [x] 7.3 On submit (or just button tap without text): call `logGradingEvents(gradingJobId.value, [{ eventType: 'feedback', payload: { rating: 'positive'|'negative', comment?: string } }])` via gas.ts
  - [x] 7.4 After submission, replace the prompt with "Thanks for your feedback!" (auto-dismiss after 3s)
  - [x] 7.5 Store `feedbackGiven` signal in `state/grading.ts` (`signal<boolean>(false)`) — prevents showing feedback prompt again for same session. Reset to `false` in both `resetGrading()` and at the end of `confirmRegrade()` (so feedback prompt shows again after re-grade)
  - [x] 7.6 Style: subtle/secondary appearance using `.gray` text, no primary buttons — this is optional, non-intrusive
  - [x] 7.7 Add `components/grading-feedback.test.tsx` — test render, click handlers, text input, submission, auto-dismiss

- [x] Task 8: Wire up event logging and fix existing `logScoreOverrides` (AC: #2)
  - [x] 8.1 Refactor `apps/addon/src/server/grading.ts` `logScoreOverrides` — change from `callApi('POST', `/grade/${jobId}/events`, { overrides })` to `callApi('POST', `/grade/${jobId}/events`, { eventType: 'score_overridden', payload: { overrides } })` to match the new route schema
  - [x] 8.2 Log `'regrade_started'` event in `confirmRegrade()` action (already specified in Task 4.3) via `logGradingEvents()` wrapper
  - [x] 8.3 Verify `scores.ts` `saveScores()` still works with the refactored `logScoreOverrides` — no signature change at the `lib/gas.ts` layer, only the server-side payload format changes

- [x] Task 9: Integrate new components into `app.tsx` (AC: #4, #8)
  - [x] 9.1 Add `RegradeConfirm` component — render when `showRegradeConfirm.value === true` (above grading panel, as an overlay-like block)
  - [x] 9.2 Add `GradingFeedback` component — render after `FeedbackSummary` when `gradingStatus.value === 'done'` and `!feedbackGiven.value`
  - [x] 9.3 Update `app.test.tsx` for new component rendering

- [x] Task 10: Build verification
  - [x] 10.1 `turbo build` passes
  - [x] 10.2 `turbo typecheck` passes
  - [x] 10.3 `turbo test` passes — all new + existing tests green, zero regressions (335 tests, 32 files)
  - [x] 10.4 Verify sidebar bundle remains close to 100KB soft target (110KB — acceptable)

### Review Findings

- [x] [Review][Decision] **One-tap feedback violates AC8 "one tap = submitted"** — FIXED: log on tap, text is additive — `handleRating()` in `grading-feedback.tsx:32-36` only opens a text input; no event is logged until the user clicks "Submit". AC8 requires one tap = feedback submitted (text is optional additive). If the user taps thumbs and navigates away without clicking Submit, no feedback is recorded. [grading-feedback.tsx:32-50]

- [x] [Review][Patch] **`setTimeout` in GradingFeedback render body fires on every re-render** — FIXED — `grading-feedback.tsx:21-24` schedules a new `setTimeout` every time the component re-renders while `submitted.value === true`. Multiple timers accumulate. After a re-grade resets `feedbackGiven` to `false`, stale timers fire and flip `feedbackGiven` back to `true`, permanently hiding the feedback prompt for the new session. Fix: move to `useEffect` with cleanup. [grading-feedback.tsx:21-24]

- [x] [Review][Patch] **`resetFeedbackUI()` is never called from `resetGrading()` or `confirmRegrade()`** — FIXED (moved signals to state/grading.ts) — Module-level signals `showTextInput`, `feedbackText`, `submitted`, `selectedRating` in `grading-feedback.tsx` persist across re-grade cycles. Stale UI state bleeds into the next grading session. Fix: call `resetFeedbackUI()` inside `resetGrading()`. [grading-feedback.tsx:10-15, grading.ts:resetGrading]

- [x] [Review][Patch] **Double-click on Re-grade / confirm buttons can trigger concurrent re-grade flows** — FIXED (guard in confirmRegrade) — `confirmRegrade` is async. Between `showRegradeConfirm = false` and `resetGrading()`, status is still `done`. A rapid second click calls `confirmRegrade` again, both capture the same IDs, both call `startGrading()`. Fix: add a guard (e.g., check `gradingStatus !== 'idle'` at entry, or set status to `submitting` immediately). [grading-panel.tsx:29-34, regrade-confirm.tsx:30-35, grading.ts:265]

- [x] [Review][Patch] **`deleteDocComments` catch block swallows all errors as "notFound"** — FIXED (clarified comment; kept non-fatal behavior) — `docs.ts:36-38` catches permission errors, quota errors, and network failures identically as `notFound++`. The caller has no way to distinguish "comment was already deleted" from "Drive API permission denied". Fix: check error code/message for 404 before counting as notFound; rethrow or count separately for other errors. [docs.ts:36-38]

- [x] [Review][Patch] **`confirmRegrade(false)` promise not handled in onClick** — FIXED — `grading-panel.tsx:31` calls `confirmRegrade(false)` (async) inside a sync onClick handler without `.catch()`. Unhandled promise rejections from `startGrading()` will surface as uncaught errors. Fix: add `.catch(() => {})` or wrap in async handler. [grading-panel.tsx:29-34]

- [x] [Review][Patch] **`logGradingEvents` server function ignores `callApi` return values** — FIXED (try/catch) — `server/grading.ts:18-20` calls `callApi()` in a loop without checking results. If `callApi` throws synchronously (GAS context), the loop aborts silently mid-way. Fix: wrap in try/catch or at minimum log errors. [server/grading.ts:17-21]

- [x] [Review][Patch] **Unbounded `payload` size in `gradingEventSchema`** — FIXED: added `.refine()` constraints — max 20 keys and 8KB stringified size limit. Test added for key count rejection. [packages/shared/src/api.ts:33]

- [x] [Review][Defer] **`aiComments` is nulled during re-grade polling cycle** — `resetGrading()` sets `aiComments.value = null`, so the feedback summary disappears during the new grading cycle even when the teacher chose "keep comments". This is a UX gap but matches the existing `resetGrading` contract. Preserving `aiComments` across re-grade would require splitting reset logic. — deferred, design change required
- [x] [Review][Defer] **No indication that comment deletion is in progress** — Between `resetGrading()` and `deleteDocComments()` completing, the UI shows normal grading flow with no "deleting comments..." state. — deferred, UX enhancement

### Review Findings (Round 2 — 2026-05-09)

- [x] [Review][Decision] **Duplicate feedback events — rating tap fires one event, text submit fires another** — FIXED: split into distinct event types. Initial rating tap fires `feedback`, supplementary text fires `feedback_comment`. Added `feedback_comment` to `gradingEventSchema` enum. [grading-feedback.tsx:59, packages/shared/src/api.ts:33]

- [x] [Review][Patch] **Unhandled promise rejection in RegradeConfirm onClick handlers** — FIXED: added `.catch(() => {})` to both `confirmRegrade` onClick handlers. [regrade-confirm.tsx:30-34]

- [x] [Review][Patch] **RegradeConfirm has two primary-styled buttons — violates "max one primary button per view"** — FIXED: removed `class="create"` from "No, keep them" button (now renders as default/secondary). [regrade-confirm.tsx:34]

- [x] [Review][Defer] **Unhandled promise from `onGradingComplete` in `checkActiveJob`** — `state/grading.ts:231-232` — returned promise not awaited or caught; if dynamic import fails, `gradingStatus` gets stuck. Pre-existing from Story 3.2. — deferred, pre-existing

- [x] [Review][Defer] **Polling never terminates after `onTimeout`** — `polling.ts` — timeout callback sets UI flag but doesn't stop the polling loop; if backend job is permanently stuck, client polls every 4s indefinitely. Pre-existing from Story 3.2. — deferred, pre-existing

- [x] [Review][Defer] **`confirmRegrade` may grade wrong student if teacher switches during `deleteDocComments` await** — `state/grading.ts:287-292` — `startGrading()` reads `selectedStudent.value` at call time, not when re-grade was initiated; student could change during the async gap. — deferred, needs UX design

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Three-layer communication chain (NEVER skip layers):**
```
Sidebar (Preact) → lib/gas.ts → google.script.run → GAS server (.gs) → Drive API / Backend API
```

Comment deletion uses the same Drive API Advanced Service pattern as insertion (Story 3.3). The teacher's Google session provides auth. No backend involvement for Drive comment operations.

Event logging goes through the backend:
```
Sidebar → lib/gas.ts → google.script.run → server/grading.ts → callApi() → POST /grade/:jobId/events
```

**Signal state rules:** Same as Story 3.2/3.3 — signals are single source of truth, actions as plain exported functions, side effects in action functions only.

### Comment Deletion — Technical Details

**Drive API `Drive.Comments.delete(fileId, commentId)`:**
- Permanently removes the comment from the document
- If the comment was already resolved by the teacher → still deletable
- If the comment was already deleted → throws 404 error → catch and count as `notFound`
- Comments are identified by IDs stored in `insertedCommentIds` signal (populated in Story 3.3)

**Key constraint:** `insertedCommentIds` is in-memory only (signal state). If the teacher closes the sidebar and reopens it, the IDs are lost. This means "clear previous comments" only works within the same sidebar session. This is acceptable for Phase 1 — if IDs are empty, the Re-grade button skips the confirmation dialog and starts re-grading directly (no "clear" option presented).

**Drive v3 type declarations:** Story 3.3 created `apps/addon/src/server/drive-v3.d.ts` with types for `Drive.Comments.create()`. Verify that `Drive.Comments.delete(fileId: string, commentId: string)` is already declared there — if not, add it.

**Implementation in `server/docs.ts`:**
```javascript
function deleteDocComments(commentIds: string[]) {
  const docId = DocumentApp.getActiveDocument().getId()
  let deleted = 0
  let notFound = 0
  
  for (const commentId of commentIds) {
    try {
      Drive.Comments.delete(docId, commentId)
      deleted++
    } catch (e) {
      // Comment already deleted/resolved or doesn't exist
      notFound++
    }
  }
  
  return { deleted, notFound }
}
```

### Re-grade Flow — State Machine

```
[done state with AI results]
    → teacher clicks "Re-grade"
    → IF insertedCommentIds.length === 0 → confirmRegrade(false) directly (skip dialog)
    → ELSE → showRegradeConfirm = true (dialog visible)
    
[dialog: "Clear previous AI comments?"]
    → "Yes": confirmRegrade(true)
    → "No": confirmRegrade(false)
    → "Cancel": showRegradeConfirm = false (back to done state)

[confirmRegrade(clearComments) execution order:]
    1. const idsToDelete = [...insertedCommentIds.value]  ← capture before reset!
    2. showRegradeConfirm = false
    3. logGradingEvents(jobId, regrade_started event)     ← fire-and-forget
    4. resetGrading()                                     ← clears all state including IDs
    5. if (clearComments) await deleteDocComments(idsToDelete)
    6. startGrading()                                     ← begins new flow

[re-grading proceeds through normal flow]
    idle → submitting → polling → inserting-comments → done
    
[on new completion]
    → aiComments replaced with new results (onGradingComplete handles this)
    → insertedCommentIds replaced with new IDs
    → feedbackSummary shows latest session only
    → feedbackGiven = false (show prompt again)
```

### Event Logging — Backend Route Design

**New route: `POST /grade/:jobId/events`**

Schema:
```typescript
// packages/shared/src/api.ts
export const gradingEventSchema = z.object({
  eventType: z.enum([
    'score_overridden',
    'feedback',
    'regrade_started',
  ]),
  payload: z.record(z.unknown()).optional(),
})
export type GradingEvent = z.infer<typeof gradingEventSchema>
```

This route:
- Validates `jobId` is a UUID
- Verifies the job belongs to the requesting teacher (tenant isolation)
- Calls existing `logGradingEvent(db, teacherId, jobId, eventType, payload)`
- Returns `201 { "data": { "id": "<event_id>" } }`

**IMPORTANT — `logScoreOverrides` refactoring:**
- Current (broken): `callApi('POST', `/grade/${jobId}/events`, { overrides })`
- Required: `callApi('POST', `/grade/${jobId}/events`, { eventType: 'score_overridden', payload: { overrides } })`
- The sidebar `lib/gas.ts` wrapper signature stays the same (`logScoreOverrides(jobId, overrides)`) — only the server-side function body changes
- The `scores.ts` call site (`logScoreOverrides(jobId, overrides).catch(() => {})`) remains unchanged

### Native Comment Management (AC #1, #3)

These ACs require **no code changes** — they are guarantees about non-interference:
- AI comments inserted via Drive API are indistinguishable from manual comments
- The add-on never attaches event listeners to Google Docs' native comment UI
- The add-on never modifies, hides, or interferes with Google Docs' commenting panel

Test these manually by verifying: resolve, edit, delete, and add new comments all work normally with the add-on active. No automated test possible.

### In-Product Feedback (AC #8)

The feedback prompt is intentionally low-friction:
- One tap = feedback submitted (thumbs up/down with no required text)
- Optional text expands on click for detail
- Non-intrusive position (below feedback summary, secondary styling)
- Only shows once per grading session (`feedbackGiven` signal)
- Fire-and-forget: `logGradingEvents` call failure should not show an error to the teacher

### Existing Code to Build On

**From Story 3.3:**
- `insertedCommentIds` signal in `state/grading.ts` — already stores Drive comment IDs
- `aiComments` signal — stores latest AI feedback for the feedback summary
- `onGradingComplete()` — already handles post-grading flow
- `FeedbackSummary` component — already renders from `aiComments` signal (AC #7 already works)
- `insertDocComments()` in `server/docs.ts` and `lib/gas.ts` — existing pattern to follow for `deleteDocComments`

**From Story 3.2:**
- `startGrading()` action — reusable for re-grading flow
- `resetGrading()` action — resets all grading state (aiScores, aiComments, status, etc.)
- Polling infrastructure in `lib/polling.ts`
- `gradingJobId` signal — needed for event logging

**From Story 2.2:**
- `saveScores()` in `state/scores.ts` — already calls `logScoreOverrides` (needs the backend route)
- `getScoreOverrides()` — computes diffs between AI and final scores

**GAS mock pattern (established):**
- All mocks in `__mocks__/gas-mock.ts` follow: `functionName: mockReturnValue` in `mockResponses` + function declaration in the `google.script.run` mock object

### What This Story Does NOT Include

- **Persisting comment IDs across sidebar sessions** — Phase 2 enhancement (would require backend storage of comment IDs per job)
- **Auto-detecting comment states** (resolved/deleted/kept) — too complex for Phase 1, would require polling Drive API
- **Comment editing detection** — Google Docs doesn't notify add-ons when native comments are edited
- **Batch event logging optimization** — single event per call is fine at current scale

### Project Structure Notes

New files:
```
apps/addon/src/sidebar/
├── components/regrade-confirm.tsx
├── components/regrade-confirm.test.tsx
├── components/grading-feedback.tsx
└── components/grading-feedback.test.tsx
```

Modified files:
```
packages/shared/src/api.ts                        # Add gradingEventSchema
apps/api/src/routes/grade.ts                      # Add POST /grade/:jobId/events
apps/api/src/routes/grade.test.ts                 # Add event route tests
apps/addon/src/server/docs.ts                     # Add deleteDocComments()
apps/addon/src/server/grading.ts                  # Add logGradingEvents(), refactor logScoreOverrides
apps/addon/src/sidebar/lib/gas.ts                 # Add deleteDocComments, logGradingEvents wrappers
apps/addon/src/sidebar/gas-types.d.ts             # Add new function signatures
apps/addon/src/sidebar/__mocks__/gas-mock.ts      # Add new mock responses
apps/addon/src/sidebar/state/grading.ts           # Add regrade signals/actions, feedbackGiven
apps/addon/src/sidebar/state/grading.test.ts      # Add regrade + feedback tests
apps/addon/src/sidebar/components/grading-panel.tsx       # Add Re-grade button
apps/addon/src/sidebar/components/grading-panel.test.tsx  # Add Re-grade button tests
apps/addon/src/sidebar/components/app.tsx          # Integrate new components
apps/addon/src/sidebar/components/app.test.tsx     # Update integration tests
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — all acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#FR21-FR23] — comment management and re-grading FRs
- [Source: _bmad-output/planning-artifacts/prd.md#FR37] — grading event logging for model improvement
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — three-layer chain, event logging
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — error handling, loading states
- [Source: _bmad-output/project-context.md] — project conventions, anti-patterns, Google Workspace UI rules
- [Source: _bmad-output/implementation-artifacts/3-3-doc-comment-insertion-and-feedback-summary.md] — previous story patterns, comment insertion implementation, insertedCommentIds forward compatibility
- [Source: apps/addon/src/sidebar/state/grading.ts] — current signals including insertedCommentIds
- [Source: apps/addon/src/server/docs.ts] — current Drive API comment insertion pattern
- [Source: apps/api/src/services/grading.ts:255] — existing logGradingEvent() function
- [Source: apps/api/src/routes/grade.ts] — current routes (no events endpoint yet)
- [Source: apps/addon/src/server/grading.ts:13] — logScoreOverrides calls nonexistent endpoint

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Fixed mock DB `values` chain missing `execute` method for `logGradingEvent` insert
- Fixed module-level signal persistence across tests in `grading-feedback.test.tsx` — added `resetFeedbackUI()` export

### Completion Notes List
- Task 1: Created `POST /grade/:jobId/events` route with Zod validation, tenant isolation via `getJobStatus`, and 4 passing tests
- Task 2: Added `deleteDocComments()` to `server/docs.ts` using Drive v3 `remove` method with error-tolerant iteration
- Task 3: Wired GAS communication layer — types, wrappers, server function, and mocks for `deleteDocComments` + `logGradingEvents`
- Task 4: Added re-grade signals (`showRegradeConfirm`, `feedbackGiven`) and actions (`requestRegrade`, `cancelRegrade`, `confirmRegrade`) with critical execution order (capture IDs before reset)
- Task 5: Created `RegradeConfirm` component with keyboard accessibility (Escape closes), Google Add-ons CSS styling
- Task 6: Re-grade button in done state — shows confirmation when IDs exist, skips dialog when IDs are empty
- Task 7: Created `GradingFeedback` component — thumbs up/down → optional text → fire-and-forget event log → auto-dismiss
- Task 8: Verified `logScoreOverrides` refactor — server-side payload format change only, no caller signature changes
- Task 9: Integrated `RegradeConfirm` (above grading panel) and `GradingFeedback` (after feedback summary) in app.tsx
- Task 10: All build gates green — `turbo build`, `turbo typecheck`, `turbo test` (335 tests, 0 failures)
- Review follow-up: Added `.refine()` constraints to `gradingEventSchema` payload — max 20 keys, 8KB size limit. Added route test for oversized payload rejection.

### Change Log
- 2026-05-04: Implemented Story 3.4 — Comment Management & Re-grading (all 10 tasks complete)
- 2026-05-09: Addressed final review finding — payload size cap on gradingEventSchema

### File List
packages/shared/src/api.ts
packages/shared/src/index.ts
apps/api/src/routes/grade.ts
apps/api/src/routes/grade.test.ts
apps/addon/src/server/docs.ts
apps/addon/src/server/grading.ts
apps/addon/src/sidebar/gas-types.d.ts
apps/addon/src/sidebar/lib/gas.ts
apps/addon/src/sidebar/__mocks__/gas-mock.ts
apps/addon/src/sidebar/state/grading.ts
apps/addon/src/sidebar/state/grading.test.ts (new)
apps/addon/src/sidebar/components/regrade-confirm.tsx (new)
apps/addon/src/sidebar/components/regrade-confirm.test.tsx (new)
apps/addon/src/sidebar/components/grading-feedback.tsx (new)
apps/addon/src/sidebar/components/grading-feedback.test.tsx (new)
apps/addon/src/sidebar/components/grading-panel.tsx
apps/addon/src/sidebar/components/grading-panel.test.tsx
apps/addon/src/sidebar/components/app.tsx
apps/addon/src/sidebar/components/app.test.tsx

