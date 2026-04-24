# Deferred Work

## Deferred from: code review of 1-1-initialize-monorepo-and-deploy-backend-skeleton (2026-04-22)

- **W1:** Migration not idempotent — `createTable` without `ifNotExists`. kysely-ctl tracks migration state so this is safe for now, but consider adding guards for resilience.
- **W2:** DATABASE_URL validated only as `z.string()` — a malformed URL passes env validation but fails at first pool connection. Low impact (fails fast at startup).
- **W3:** DECIMAL(2,1) not used for individual band score columns — JSONB stores full BandScores object. If per-criteria columns are added later, use DECIMAL(2,1).
- **W4:** No separate 30/hr grading rate limit — only global 200/hr configured. Per-route 30/hr grading tier deferred to Story 3.1 when POST /grade is implemented.

## Deferred from: code review of 1-2-apps-script-add-on-shell-and-sidebar-pipeline (2026-04-22)

- **W5:** Race condition if `checkConnection()` called while already connecting (rapid retry clicks) — low risk, single button click timing. Add `if (connectionStatus.value === 'connecting') return;` guard if retry behavior becomes an issue.
- **W6:** `.clasp.json` contains placeholder scriptId and is not in `.gitignore` — could leak project config when real script ID is added. Consider `.gitignore` + `.clasp.json.example` pattern.

## Deferred from: code review of 1-3-create-new-score-sheet-with-student-import (2026-04-23)

- **W7:** `goBack()` callable during `creating` step via external code — currently UI-guarded (Creating component has no Back button) but no programmatic guard in the action function. If a future keyboard shortcut or test calls `goBack()` mid-creation, state becomes inconsistent. Low risk while UI is the only caller.

## Deferred from: code review of 2-1-sidebar-navigation-and-student-context (2026-04-23)

- F9: No focus restoration when ConfirmDialog closes — when modal closes, focus should return to the element that triggered it (standard WAI-ARIA dialog pattern). Low priority, pre-existing pattern.

## Deferred from: code review of 2-2-manual-score-entry-and-save-to-sheet (2026-04-24)

- **W8:** No server-side `taskType` validation in `writeScoresToSheet` — accepts any string, falls back to raw value as column header. Pre-existing gap in the GAS → Sheet boundary.
- **W9:** Arrow key support for stepper controls in `score-editor.tsx` — accessibility enhancement (Up/Down keys for increment/decrement). Beyond current AC scope.

## Deferred from: code review of 3-1-grading-backend-gemini-proxy-and-async-job-pipeline (2026-04-24)

- **W10:** `withTimeout` in `gemini.ts` leaks the underlying Gemini promise — no AbortController/AbortSignal used; timed-out requests continue consuming resources in the background. Depends on Google Generative AI SDK supporting AbortSignal.
