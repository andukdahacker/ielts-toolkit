# Story 3.3: Doc Comment Insertion & Feedback Summary

Status: done

## Story

As a teacher,
I want AI feedback to appear as native comments in my Google Doc anchored to specific text, with a summary in the sidebar,
So that my students see professional inline feedback and I have a persistent reference of what the AI suggested.

## Acceptance Criteria (BDD)

1. **Auto-insert comments after grading** — AI grading has completed with feedback comments: the system inserts comments into the Google Doc via Drive API Advanced Service, anchored to the specific text ranges identified by the AI.

2. **Teacher as author** — Comments are being inserted: they appear under the teacher's own Google account (no AI branding, no bot name) — the teacher is the author.

3. **Comment insertion performance** — Comments are being inserted into the Doc: insertion completes within 10 seconds for up to 15 comments, with comments appearing progressively (teacher sees them appear one by one). NFR2.

4. **Inserting-comments status** — The grading status signal transitions to `inserting-comments` with a progress message in the sidebar (e.g., "Inserting feedback into document..." with spinner). Note: per-comment count updates are not possible since insertion runs as a single `google.script.run` call. The final result (anchored/general counts) is shown after completion in the Feedback Summary panel.

5. **Feedback summary panel** — AI grading has completed: a collapsible "AI Feedback Summary" section shows all AI-generated suggestions as a persistent list — even if Doc comments are later deleted, this list remains.

6. **Clean success — no noise** — All comments anchor to their target text successfully: no anchoring status is shown (don't show "5/5 anchored" noise).

7. **Partial anchor failure — tiered fallback** — Some comments fail to anchor to specific text: unanchored comments are inserted as general comments in the Doc's comment panel (not linked to specific text), and the sidebar shows transparent status: "4 comments anchored to text, 1 added as general feedback".

8. **Total anchor failure — append fallback** — All comments fail to anchor: feedback is appended as a formatted section at the end of the Doc, and the sidebar reports: "Comments added as a feedback section at the end of the document".

9. **Full status flow** — The grading status signal transitions through: `idle` → `submitting` → `polling` → `inserting-comments` → `done` (or `error` at any stage).

## Tasks / Subtasks

- [x] Task 1: Enable Drive API Advanced Service and add OAuth scope (AC: #1, #2)
  - [x] 1.1 Add `https://www.googleapis.com/auth/drive` to `appsscript.json` oauthScopes
  - [x] 1.2 Enable Drive Advanced Service in `appsscript.json` — the correct format is:
    ```json
    "dependencies": {
      "enabledAdvancedServices": [
        { "userSymbol": "Drive", "version": "v3", "serviceId": "drive" }
      ]
    }
    ```
  - [x] 1.3 Verify Drive API Advanced Service can create comments on the current doc

- [x] Task 2: Create comment insertion server function in `server/docs.ts` (AC: #1, #2, #3, #6, #7, #8)
  - [x] 2.1 `insertDocComments(comments: Array<{ text: string, anchorText: string, category: string }>)` — main entry point
  - [x] 2.2 Get document ID via `DocumentApp.getActiveDocument().getId()`
  - [x] 2.3 For each comment, attempt anchored insertion using `Drive.Comments.create()` with `quotedFileContent`:
    - Set `quotedFileContent: { mimeType: 'text/html', value: comment.anchorText }` — the API matches the quoted text in the doc and anchors automatically
    - Set `content: comment.text` as the comment body
    - After creation, check if anchoring succeeded by reading back the comment's `anchor` field (if empty/null → unanchored)
    - Collect the returned comment `id` for Story 3.4 forward compatibility
    - Track anchored vs unanchored count per comment
  - [x] 2.4 **Tier 1 success:** `quotedFileContent.value` matched text in the doc — comment is anchored automatically by the API
  - [x] 2.5 **Tier 2 result:** `quotedFileContent.value` didn't match (text not found verbatim) — the API creates the comment unanchored silently (no error thrown). Detect by checking the returned comment's `anchor` field. For unanchored comments, update the comment content to prefix with `[${category}]` for context
  - [x] 2.6 **Tier 3 fallback:** If all `Drive.Comments.create()` calls throw errors (not just unanchored — actual API failures), append feedback as a formatted section at the end of the Doc body using `DocumentApp.getActiveDocument().getBody().appendParagraph()`
  - [x] 2.7 Return a result object: `{ inserted: number, anchored: number, general: number, appended: boolean, commentIds: string[] }` so the sidebar can display transparent status and Story 3.4 can reference inserted comments
  - [x] 2.8 The server function executes all insertions in one `google.script.run` call and returns the final result. Progressive UI is simulated on the sidebar side (see Task 4 notes)

- [x] Task 3: Add `insertDocComments` to GAS communication layer (AC: #1, #4)
  - [x] 3.1 Add `insertDocComments(comments)` to `gas-types.d.ts` RunnerWithHandlers
  - [x] 3.2 Add `insertDocComments(comments)` wrapper to `sidebar/lib/gas.ts` — returns `Promise<CommentInsertionResult>`
  - [x] 3.3 Add mock response to `__mocks__/gas-mock.ts`: `insertDocComments: { inserted: 5, anchored: 4, general: 1, appended: false, commentIds: ['c1', 'c2', 'c3', 'c4', 'c5'] }`

- [x] Task 4: Expand `state/grading.ts` — add `inserting-comments` status and comment insertion flow (AC: #4, #6, #7, #8, #9)
  - [x] 4.1 Update `GradingStatus` type to include `'inserting-comments'`: `'idle' | 'submitting' | 'polling' | 'inserting-comments' | 'done' | 'error'`
  - [x] 4.2 Add signals: `commentInsertionProgress` (`signal<string>('')` — generic message like "Inserting feedback into document..."), `commentInsertionResult` (`signal<CommentInsertionResult | null>(null)`), `insertedCommentIds` (`signal<string[]>([])` — for Story 3.4 forward compatibility)
  - [x] 4.3 Define `CommentInsertionResult` type: `{ inserted: number, anchored: number, general: number, appended: boolean, commentIds: string[] }`
  - [x] 4.4 Modify `onGradingComplete()` — if `comments` array is non-empty, transition to `inserting-comments` and call `insertComments()` action. If `comments` is empty, skip directly to `done` (no comment insertion phase)
  - [x] 4.5 `insertComments()` action: set progress message to "Inserting feedback into document...", call `insertDocComments(aiComments.value)` via gas.ts, on success store result + populate `insertedCommentIds` from `result.commentIds` + transition to `done`, on error transition to `error` with comment-specific message. Note: since `google.script.run` is a single async call, real-time per-comment progress is not possible — use a generic message with spinner, not a live counter
  - [x] 4.6 Compute `commentStatusMessage` from `commentInsertionResult`: no message if all anchored (AC #6), "N anchored to text, M added as general feedback" if partial (AC #7), "Comments added as a feedback section at the end of the document" if appended (AC #8)
  - [x] 4.7 Update `state/grading.test.ts` — test new status transitions, comment insertion success/partial/failure flows, commentStatusMessage computation

- [x] Task 5: Create `components/feedback-summary.tsx` — collapsible feedback panel (AC: #5, #7)
  - [x] 5.1 Render a collapsible "AI Feedback Summary" section when `aiComments.value` is not null and has items
  - [x] 5.2 Each comment shows: category label (TA, CC, LR, GRA), the feedback text, and the anchor text quoted in context
  - [x] 5.3 Collapsible via a details/summary HTML pattern or a simple toggle — starts expanded after grading, collapses on subsequent views
  - [x] 5.4 If `commentInsertionResult` has partial anchoring or append fallback, show the `commentStatusMessage` at the top of the panel
  - [x] 5.5 Style with Google Add-ons CSS: `.block` for section container, `.secondary` for meta text, no primary button in this panel
  - [x] 5.6 Persistent: remains visible even if comments are deleted from Doc (it reads from `aiComments` signal, not from Doc state)
  - [x] 5.7 Keyboard accessible: collapsible control has `tabindex`, `aria-expanded`, appropriate `role`
  - [x] 5.8 `components/feedback-summary.test.tsx` — test rendering with comments, empty state, collapsible behavior, status message display, accessibility attributes

- [x] Task 6: Update `components/grading-panel.tsx` — add inserting-comments state (AC: #4)
  - [x] 6.1 Add `inserting-comments` state rendering: show progress message from `commentInsertionProgress` signal with animated spinner
  - [x] 6.2 During `inserting-comments`, sidebar must remain scrollable (no overlay)
  - [x] 6.3 Update `components/grading-panel.test.tsx` — test `inserting-comments` state renders correctly

- [x] Task 7: Integrate feedback summary into `app.tsx` (AC: #5, #9)
  - [x] 7.1 Add `FeedbackSummary` component after `ScoreEditor` / `SaveButton` when `gradingStatus.value === 'done'` and `aiComments.value !== null`
  - [x] 7.2 Update `app.test.tsx` if needed for new rendering

- [x] Task 8: Build verification
  - [x] 8.1 `turbo build` passes
  - [x] 8.2 `turbo typecheck` passes
  - [x] 8.3 `turbo test` passes — all new + existing tests green, zero regressions
  - [x] 8.4 Verify sidebar bundle remains close to 100KB soft target

### Review Findings

- [x] [Review][Patch] Silent loss of comments on partial Drive API failures — Added `failed` count to `CommentInsertionResult`. Track failed comments in the loop. Show "N comments couldn't be inserted" in sidebar via `commentStatusMessage`. [server/docs.ts] (blind+edge+auditor, HIGH → fixed)
- [x] [Review][Patch] Add `retryCommentInsertion()` action for comment insertion failures — Added `retryCommentInsertion()` that reuses populated `aiComments` signal. Error state shows "Retry inserting comments" button when grading succeeded but comments failed. [state/grading.ts, grading-panel.tsx] (edge, MEDIUM → fixed)
- [x] [Review][Patch] `checkActiveJob` re-triggers comment insertion → duplicate comments — `onGradingComplete` now accepts `{ skipCommentInsertion }` option; `checkActiveJob` passes `true` to skip re-insertion on resume. [state/grading.ts] (edge, HIGH → fixed)
- [x] [Review][Patch] `cancelGrading()` during inserting-comments corrupts state — `insertComments()` now checks `gradingStatus` is still `inserting-comments` before writing results on resolve/reject. [state/grading.ts] (edge, MEDIUM → fixed)
- [x] [Review][Patch] `created.id!` non-null assertion unsafe — Added null check on `created.id`; skips comment (increments `failed`) if `id` is missing. [server/docs.ts] (blind+edge, MEDIUM → fixed)
- [x] [Review][Patch] `expanded` signal lives in component, never resets between sessions — Moved to `feedbackExpanded` in `state/grading.ts`. `resetGrading()` resets it to `true`. [state/grading.ts, feedback-summary.tsx] (auditor, MEDIUM → fixed)
- [x] [Review][Patch] `inserted` count misleading in append-fallback path — Changed to `inserted: 0` in append fallback (paragraphs are not Drive comments). [server/docs.ts] (blind, MEDIUM → fixed)
- [x] [Review][Dismiss] `CommentInsertionResult` type duplication across GAS boundary — established boundary contract pattern (same as SheetInfo, LinkedSheetInfo)
- [x] [Review][Dismiss] No cancellation UX for `inserting-comments` state — `google.script.run` can't be cancelled; patch #4 guards state corruption
- [x] [Review][Defer] No performance timeout for comment insertion — deferred, spec says best-effort
- [x] [Review][Patch] Empty `anchorText` renders broken quotes in FeedbackSummary — Added conditional render guard to skip anchor text display when empty. [feedback-summary.tsx] (edge, LOW → fixed)

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Three-layer communication chain (NEVER skip layers):**
```
Sidebar (Preact) → lib/gas.ts → google.script.run → GAS server (.gs) → Drive API
```

Comment insertion does NOT call the Fastify backend — it uses the Google Drive API Advanced Service directly from Apps Script server-side code. The teacher's Google session provides auth to the Drive API.

**Signal state rules:** Same as Story 3.2 — signals are single source of truth, actions as plain exported functions, side effects in action functions only.

**Grading status flow change:**
```
Story 3.2: idle → submitting → polling → done
Story 3.3: idle → submitting → polling → inserting-comments → done
```

The `onGradingComplete()` function in `state/grading.ts` currently transitions directly to `done`. This story changes it to transition to `inserting-comments` first, then to `done` after comment insertion finishes.

### Drive API Comment Insertion — Technical Details

**Drive API Advanced Service** in Apps Script provides `Drive.Comments.create(resource, fileId)`. The `resource` parameter is a Google Drive API v3 Comment object.

**Comment anchoring approach — use `quotedFileContent` (NOT manual `anchor` construction):**

Drive API v3 uses `quotedFileContent` for anchoring comments to text. You provide the text to match, and the API anchors the comment automatically. Do NOT use the v2-style `anchor` field with `kix.*` segment IDs — that format is internal and undocumented in v3.

```javascript
// In server/docs.ts
function insertDocComments(comments) {
  const docId = DocumentApp.getActiveDocument().getId()
  const body = DocumentApp.getActiveDocument().getBody()
  
  const commentIds = []
  let anchored = 0
  let general = 0
  let inserted = 0
  let allFailed = true
  
  for (const comment of comments) {
    try {
      // Create comment with quotedFileContent — API anchors automatically
      const resource = {
        content: comment.text,
        quotedFileContent: {
          mimeType: 'text/html',
          value: comment.anchorText
        }
      }
      const created = Drive.Comments.create(resource, docId, { fields: 'id,anchor' })
      commentIds.push(created.id)
      inserted++
      allFailed = false
      
      // Check if anchoring succeeded — if quotedFileContent text wasn't found
      // in the doc, the comment is created but unanchored (no error thrown)
      if (created.anchor) {
        anchored++
      } else {
        general++
        // Optionally update the comment content to add category context
        // since it won't be visually linked to text
        Drive.Comments.update(
          { content: `[${comment.category}] ${comment.text}` },
          docId,
          created.id
        )
      }
    } catch (e) {
      // Drive API call itself failed for this comment
      // Continue to next comment — don't abort the whole batch
    }
  }
  
  // Tier 3: If ALL Drive API calls failed, append to document body
  if (allFailed && comments.length > 0) {
    body.appendParagraph('')
    const header = body.appendParagraph('--- AI Feedback ---')
    header.setHeading(DocumentApp.ParagraphHeading.HEADING3)
    for (const comment of comments) {
      body.appendParagraph('[' + comment.category + '] ' + comment.text)
    }
    return { inserted: comments.length, anchored: 0, general: 0, appended: true, commentIds: [] }
  }
  
  return { inserted, anchored, general, appended: false, commentIds }
}
```

**Key behaviors of `quotedFileContent`:**
- If `value` matches text in the doc → comment is anchored to the first occurrence
- If `value` matches multiple locations → anchored to the first occurrence only
- If `value` is not found verbatim → comment is created but unanchored (no error thrown)
- The `anchor` field in the response is populated only if anchoring succeeded — use this to detect Tier 1 vs Tier 2

**OAuth scope note:** `https://www.googleapis.com/auth/drive` is required (not `drive.file`). The `drive.file` scope only covers files the app itself created or the user explicitly opened with the app. Since the add-on needs to comment on arbitrary teacher Docs, the broader `drive` scope is needed. This is a common Marketplace review consideration — document the rationale in the OAuth scope justification.

### Existing Code to Build On

**Sidebar state (Story 3.2 established):**
- `state/grading.ts` — `gradingStatus`, `gradingJobId`, `gradingError`, `gradingMessage`, `pollingTimedOut`, `aiScores`, `aiComments` (already populated from grading result)
- `state/scores.ts` — `currentScores`, `savedScores`, `saveStatus`, `canSave`, `hasUnsavedChanges`
- `onGradingComplete()` — currently sets `aiComments.value = comments` and transitions to `done`. This is the hook point.

**GAS layer (Story 3.2 established):**
- `lib/gas.ts` — `callGas<T>()` generic wrapper. Add `insertDocComments()`.
- `server/docs.ts` — currently has only `getEssayText()`. Add `insertDocComments()`.
- `server/api.ts` — NOT needed for this story (comment insertion is GAS → Drive API, not GAS → backend).

**Shared types:**
- `packages/shared/src/api.ts` — `GradingComment` type: `{ text: string, anchorText: string, category: string }`. Already correct.

**Components (Story 3.2 established):**
- `components/grading-panel.tsx` — renders grading flow states. Add `inserting-comments` state.
- `components/app.tsx` — conditionally renders ScoreEditor/SaveButton on `idle`/`done`. Add FeedbackSummary.

### What This Story Does NOT Include

- **Re-grading flow** (clearing previous AI comments before re-grade) — Story 3.4
- **Comment management events** (logging comment_kept, comment_deleted, comment_edited) — Story 3.4
- **In-product feedback** (thumbs up/down after grading) — Story 3.4
- **Comment tracking metadata** (identifying which comments are AI-generated for later cleanup) — Story 3.4 will need this for "clear previous AI comments" feature. This story should store inserted comment IDs in a signal for Story 3.4 to consume.

### Forward Compatibility for Story 3.4

The `CommentInsertionResult.commentIds` array and `insertedCommentIds` signal store Drive API comment IDs so Story 3.4 can identify and delete AI-generated comments during re-grading. The server function collects IDs from each `Drive.Comments.create()` response. Story 3.4 will use `Drive.Comments.delete(fileId, commentId)` to clear them.

### Testing Approach

**State tests (`state/grading.test.ts` — extend existing):**
- Mock `lib/gas.ts` `insertDocComments`
- Test `onGradingComplete()` with non-empty comments → transitions to `inserting-comments` (not directly to `done`)
- Test `onGradingComplete()` with empty comments array → transitions directly to `done` (skips insertion)
- Test `insertComments()` action: all anchored → done with no status message, partial → done with "N anchored, M general" message, all failed → done with "appended" message, API error → `error` state
- Test `commentStatusMessage` computation for all 4 scenarios (clean, partial, appended, error)
- Test `insertedCommentIds` is populated from result.commentIds

**Component tests (`components/feedback-summary.test.tsx`):**
- Render with comments — verify all comments displayed with category, text, anchorText
- Render empty — verify nothing renders
- Test collapsible toggle
- Test comment status message display
- Test accessibility attributes

**Component tests (`components/grading-panel.test.tsx` — extend existing):**
- Test `inserting-comments` state renders progress message + spinner
- Verify sidebar remains scrollable (no overlay/modal)

**Integration note:** The actual Drive API calls cannot be tested in Vitest — they require the Apps Script runtime. GAS server tests via `gas-local` can mock `Drive.Comments.create()` if needed, but the primary test strategy is mocking `insertDocComments` at the `lib/gas.ts` layer.

### Performance Constraint

NFR2: Comment insertion < 10s for up to 15 comments. Each Drive API call is ~0.5-1s. Sequential insertion of 15 comments ≈ 8-15s. If this exceeds 10s:
- The sidebar shows "Inserting feedback into document..." with spinner to maintain trust
- Drive API does not support batch comment creation — sequential calls are required
- The 10s target is best-effort; the animated progress state makes the wait tolerable
- The total grading flow (AI processing + comment insertion) should still feel like one coherent operation to the teacher

### Project Structure Notes

New files:
```
apps/addon/src/
├── sidebar/
│   ├── components/feedback-summary.tsx
│   └── components/feedback-summary.test.tsx
```

Modified files:
```
apps/addon/
├── appsscript.json                           # Add Drive API scope + advanced service
├── src/
│   ├── server/docs.ts                        # Add insertDocComments()
│   └── sidebar/
│       ├── lib/gas.ts                        # Add insertDocComments wrapper
│       ├── gas-types.d.ts                    # Add insertDocComments signature
│       ├── __mocks__/gas-mock.ts             # Add insertDocComments mock
│       ├── state/grading.ts                  # Add inserting-comments status, comment insertion flow
│       ├── state/grading.test.ts             # Extend with comment insertion tests
│       ├── components/grading-panel.tsx       # Add inserting-comments state rendering
│       ├── components/grading-panel.test.tsx  # Extend with inserting-comments tests
│       └── components/app.tsx                # Add FeedbackSummary rendering
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — all acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture (Sidebar)] — signal patterns, Google Add-ons CSS
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — three-layer communication chain
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns #4] — graceful degradation with tiered fallback
- [Source: _bmad-output/planning-artifacts/prd.md#FR19-FR25] — comment insertion functional requirements
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 1] — Linh's first grading, comment review UX
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 2] — batch grading, partial anchor failure UX
- [Source: _bmad-output/planning-artifacts/prd.md#NFR2] — comment insertion < 10s for 15 comments
- [Source: _bmad-output/project-context.md] — project conventions, anti-patterns, grading session UX constraints
- [Source: _bmad-output/implementation-artifacts/3-2-grading-sidebar-initiate-poll-and-display-results.md] — previous story file list, review findings, established patterns
- [Source: apps/addon/src/sidebar/state/grading.ts] — current grading state with aiComments signal
- [Source: apps/addon/src/server/docs.ts] — current getEssayText(), extend with insertDocComments()
- [Source: packages/shared/src/api.ts] — GradingComment type definition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Drive API v3 types not included in `@types/google-apps-script` (only v2). Created `drive-v3.d.ts` with v3 interface types and cast `Drive.Comments` in server code.

### Completion Notes List

- Task 1: Added Drive v3 Advanced Service config and `drive` OAuth scope to `appsscript.json`
- Task 2: Implemented `insertDocComments()` in `server/docs.ts` with tiered fallback (anchored → general → append). Added `drive-v3.d.ts` for Drive API v3 type declarations since `@types/google-apps-script` only ships v2 types.
- Task 3: Added `insertDocComments` to `gas-types.d.ts`, `gas.ts` wrapper, and `gas-mock.ts` with `CommentInsertionResult` type
- Task 4: Extended grading state with `inserting-comments` status, `commentInsertionProgress`/`commentInsertionResult`/`insertedCommentIds` signals, `commentStatusMessage` computed signal, `insertComments()` action. Modified `onGradingComplete()` to route through comment insertion when comments exist. Updated existing test that broke (needed `insertDocComments` mock). Added 9 new tests (5 insertion flow + 4 status message).
- Task 5: Created `FeedbackSummary` component with collapsible toggle, category labels, anchor text quoting, status message display, keyboard accessibility. 14 tests all passing.
- Task 6: Added `inserting-comments` state rendering to `GradingPanel` with spinner and progress message. 3 new tests.
- Task 7: Integrated `FeedbackSummary` into `app.tsx` — renders when `done` with non-null comments. 2 new tests.
- Task 8: `turbo build` passes, `turbo typecheck` passes, `turbo test` passes (294 tests, 21 files, zero regressions). Bundle: 106.08 KB (30.08 KB gzipped).

### Change Log

- 2026-04-29: Story 3.3 implementation complete — all 8 tasks done

### File List

New files:
- `apps/addon/src/sidebar/components/feedback-summary.tsx`
- `apps/addon/src/sidebar/components/feedback-summary.test.tsx`
- `apps/addon/src/server/drive-v3.d.ts`

Modified files:
- `apps/addon/appsscript.json`
- `apps/addon/src/server/docs.ts`
- `apps/addon/src/sidebar/lib/gas.ts`
- `apps/addon/src/sidebar/gas-types.d.ts`
- `apps/addon/src/sidebar/__mocks__/gas-mock.ts`
- `apps/addon/src/sidebar/state/grading.ts`
- `apps/addon/src/sidebar/state/grading.test.ts`
- `apps/addon/src/sidebar/components/grading-panel.tsx`
- `apps/addon/src/sidebar/components/grading-panel.test.tsx`
- `apps/addon/src/sidebar/components/app.tsx`
- `apps/addon/src/sidebar/components/app.test.tsx`
