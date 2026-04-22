---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - prd.md
  - architecture.md
---

# IELTS Teacher Toolkit - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for IELTS Teacher Toolkit, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Teacher can install the add-on from a direct link and authorize with Google OAuth
FR2: Teacher can create a new pre-formatted Score Sheet from the Doc sidebar
FR3: Teacher can import student names into a new Score Sheet from an existing Google Sheet (pick file, pick column, preview, confirm)
FR4: Teacher can manually type student names into a new Score Sheet (comma-separated or one per line)
FR5: Teacher can link an existing Google Sheet as their score tracker (file browser, structure detection with header preview, confirmation)
FR6: Teacher can receive a clear fallback message when an existing Sheet's structure can't be detected, with option to create a new Sheet instead
FR7: Teacher can add new students to their roster after initial setup
FR8: System displays appropriate empty states when no students, scores, or grading history exist yet
FR9: Teacher sees a contextual landing state when opening the sidebar (linked Sheet info, student picker, recent grading activity)
FR10: Teacher can see the current student name and assignment context in the sidebar at all times during grading
FR11: Teacher can navigate between students using previous/next controls in the sidebar
FR12: Sidebar retains linked Sheet context across multiple essay documents in the same session
FR13: Teacher sees a contextual landing state when reopening the sidebar after closing it (restores last session state or defaults to student picker)
FR14: Teacher can initiate AI grading for an essay in the current Google Doc by selecting a student and task type (Task 1 Academic, Task 1 General, Task 2)
FR15: Teacher can see a progress indicator with estimated time while AI grading is processing
FR16: Teacher can cancel a grading request while it is processing
FR17: Teacher can view AI-generated band scores (Overall, TA, CC, LR, GRA) in the sidebar after grading completes
FR18: Teacher can edit any AI-generated band score before saving
FR19: System auto-inserts AI-generated feedback as native Google Doc comments anchored to specific text ranges under the teacher's account
FR20: Teacher can view a collapsible AI feedback summary in the sidebar listing all AI-generated suggestions
FR21: Teacher can review, resolve, edit, or delete AI-inserted comments using native Google Docs commenting
FR22: Teacher can add their own comments to the essay using native Google Docs commenting
FR23: Teacher can re-grade an essay, with option to clear previous AI comments before new grading
FR24: Teacher can see transparent status when comment anchoring partially fails (e.g., "4 anchored, 1 general")
FR25: System degrades gracefully when comment anchoring fails (tiered: anchored → general comment → appended section)
FR26: Teacher can enter band scores directly in the sidebar without initiating AI grading
FR27: Teacher can save manually entered scores to their linked Sheet
FR28: Teacher can save band scores from the sidebar to their linked Google Sheet with one click
FR29: Teacher can save scores regardless of whether AI comments are resolved (non-blocking save)
FR30: System writes scores to the correct student row and assignment column in the Sheet automatically
FR31: Teacher can see confirmation after scores are successfully saved to Sheet
FR32: Teacher can see a clear error message when AI grading fails, with option to retry or enter scores manually
FR33: Teacher can see informative messaging when the backend is unavailable
FR34: System displays clear recovery options for all error states (retry, manual entry, re-link Sheet)
FR35: System validates teacher identity via Google ID token on all backend requests
FR36: System enforces per-user rate limits on AI grading requests
FR37: System logs grading events (AI scores, teacher adjustments, comment actions) for future analytics and model improvement from Phase 1
FR38: System enforces a passthrough entitlement check stub on grading requests in Phase 1
FR39: System tracks teacher's AI grading usage count per billing period
FR40: Teacher can see remaining free-tier gradings in the sidebar
FR41: Teacher can see a clear upgrade prompt when free-tier limit is reached
FR42: Teacher can initiate Pro upgrade from the sidebar (opens payment page)
FR43: Teacher can continue using manual score entry when AI grading limit is reached
FR44: System activates Pro entitlements immediately after successful payment
FR45: Teacher can view class-level analytics in the Sheet sidebar (average band, trend, weakest skill)
FR46: Teacher can see at-risk students flagged automatically based on score trends and targets
FR47: Teacher can see improving/plateaued/declining status per student
FR48: Teacher can drill down into individual student performance (per-skill, per-criterion breakdown)
FR49: Teacher can generate a shareable parent progress report link from the analytics sidebar
FR50: Teacher can create a Reading/Listening answer key directly in their Sheet (paste format)
FR51: Teacher can select a pre-loaded Cambridge IELTS test from a built-in library
FR52: Teacher can create complex assignments via a full-width web app (PDF import, section builder)
FR53: Teacher can generate a shareable student assignment link from the Sheet sidebar
FR54: Student can take a timed Reading/Listening test via a shared link with auto-save and server-authoritative timer
FR55: Student can resume a test session on a different device
FR56: System auto-scores Reading/Listening submissions and writes band scores to teacher's Sheet
FR57: Student can submit Writing/Speaking responses via a shared link
FR58: Teacher can see pending Writing/Speaking submissions in a grading queue
FR59: Parent can view student progress via a shareable token-based link (no login required)
FR60: Parent report displays in Vietnamese with plain-language skill summaries and trend visualization
FR61: Parent report updates automatically as new scores are added (live data)
FR62: Teacher can revoke a parent report link
FR63: Teacher can export scores as CSV from the Sheet sidebar
FR64: Teacher can request deletion of their submission history from the backend

### Non-Functional Requirements

NFR1: AI grading end-to-end P95 < 20s, hard ceiling 30s
NFR2: Comment insertion < 10s for up to 15 comments (progressive insertion)
NFR3: Score write-back to Sheet < 5s
NFR4: Sidebar load (warm instance) < 3s
NFR5: Sidebar load (cold start) < 8s
NFR6: Backend API non-grading responses < 2s
NFR7: TLS 1.2+ on all communication paths
NFR8: Google ID token verification on every backend request via Google Auth Library
NFR9: Tenant isolation enforced by teacher_id on every query
NFR10: Student/parent links use UUID v4, teacher can deactivate/revoke
NFR11: API keys stored in Railway variables (Secret Manager equivalent), never in Apps Script
NFR12: PII stripped at backend proxy before AI calls — only essay text + rubric sent to Gemini
NFR13: Per-user rate limiting: 30 grading requests/hr, 200 non-AI requests/hr
NFR14: Phase 1 uptime best-effort, no unplanned downtime during peak hours (evenings/weekends)
NFR15: RTO < 30 minutes (Phase 1), < 5 minutes (Phase 2+)
NFR16: RPO < 24 hours (daily automated Postgres backups)
NFR17: Graceful degradation: AI down → manual entry, comment anchoring fails → tiered fallback, backend down → clear error messaging
NFR18: Polar webhook handlers idempotent with 72-hour deduplication window
NFR19: Phase 1: 20-30 teachers, ~12 concurrent peak
NFR20: Phase 2: 200-500 teachers, ~50 concurrent peak
NFR21: Phase 3+: 2,000+ teachers, ~200 concurrent peak
NFR22: Break-even at ~2 paid teachers (~$8-11/month infrastructure)
NFR23: Gemini Flash cost ~$0.05-0.20 per teacher/month at 80 essays
NFR24: Net margin 67-72% at 10 teachers, 87-89% at 100 teachers
NFR25: Google Docs integration works reliably on 95%+ of standard documents
NFR26: Google Sheets integration 100% success on properly structured Sheets
NFR27: Gemini integration best-effort with 30s timeout, retry once on transient failure
NFR28: Polar webhook delivery with 72hr retry, 24-hour grace period before entitlement changes
NFR29: Active data retained for 2 years (essays, grading sessions, scores)
NFR30: After 2 years: anonymize or delete per teacher preference
NFR31: Teacher can request immediate deletion via FR64
NFR32: Adequate contrast ratios and keyboard navigation in Preact components (baseline accessibility)

### Additional Requirements

- **Starter Template:** Custom TurboRepo scaffold (pnpm + TurboRepo + Fastify v5 + Kysely v0.28 + Preact + clasp). Architecture specifies this as Epic 1 Story 1
- Railway hosting: API service + managed PostgreSQL with PgBouncer in transaction mode
- Kysely v0.28 with CamelCasePlugin for snake_case DB ↔ camelCase TypeScript mapping
- Zod shared schemas in `packages/shared/` as single source of truth for API contracts
- `fastify-type-provider-zod` for route validation + `@fastify/swagger` + `@fastify/swagger-ui` from day one
- Sequential addon build pipeline: Vite build → clasp push (never concurrent watchers)
- Apps Script V8 runtime, ES2019 target for server-side code, no DOM libs
- Preact + `@preact/signals` + Google Add-ons CSS (CDN) + `vite-plugin-singlefile` → target < 100KB inline bundle (CSS loads from CDN, not inlined)
- `google.script.run` promise wrapper (`sidebar/lib/gas.ts`) required before any sidebar development
- `grading_events` table from Phase 1 for correction feedback loop (AI scores, teacher overrides, comment actions)
- Usage telemetry counters: `last_grading_at`, `gradings_this_week`, `gradings_this_month`
- In-product feedback mechanism: post-grading thumbs up/down with optional freeform text
- GitHub Actions CI: lint + typecheck + test on PRs. Railway auto-deploys API from GitHub on push to main
- `.env.example` files with all required variables (DATABASE_URL, GEMINI_API_KEY, GOOGLE_CLIENT_ID, POLAR_WEBHOOK_SECRET, etc.)
- clasp setup workflow documented for Apps Script newcomers
- `@fastify/env` with Zod-validated config schema for environment variable validation at startup
- Pino structured JSON logging (built into Fastify), Railway captures stdout
- POST `/grade` requires client-generated idempotency key (UUID v4) to prevent duplicate jobs
- `LockService.getScriptLock()` for Sheet write operations to prevent concurrent write corruption
- Unsaved work protection: confirmation prompt when navigating between students with unsaved score edits
- Token refresh strategy: fresh `ScriptApp.getIdentityToken()` per-request via Apps Script server-side (sidebar never holds a token)
- Job TTL/cleanup: stale grading jobs garbage-collected on schedule
- Recovery path: re-opening sidebar detects in-flight or completed job and resumes from last state

### UX Design Requirements

N/A — No UX Design specification exists for this project. The PRD user journeys provide sufficient UX context for story creation.

### FR Coverage Map

FR1: Epic 1 - Add-on installation and Google OAuth authorization
FR2: Epic 1 - Create new pre-formatted Score Sheet
FR3: Epic 1 - Import student names from existing Google Sheet
FR4: Epic 1 - Manually type student names
FR5: Epic 1 - Link existing Google Sheet with structure detection
FR6: Epic 1 - Fallback messaging when Sheet structure can't be detected
FR7: Epic 1 - Add new students to roster after setup
FR8: Epic 1 - Empty states for no students/scores/history
FR9: Epic 2 - Contextual sidebar landing state
FR10: Epic 2 - Current student name and context visible during grading
FR11: Epic 2 - Previous/next student navigation
FR12: Epic 2 - Sidebar retains Sheet context across documents
FR13: Epic 2 - Sidebar restores state on reopen
FR14: Epic 3 - Initiate AI grading with student and task type selection
FR15: Epic 3 - Progress indicator with estimated time
FR16: Epic 3 - Cancel grading request
FR17: Epic 3 - View AI-generated band scores in sidebar
FR18: Epic 3 - Edit AI-generated band scores before saving
FR19: Epic 3 - Auto-insert AI feedback as native Doc comments
FR20: Epic 3 - Collapsible AI feedback summary in sidebar
FR21: Epic 3 - Review/resolve/edit/delete AI-inserted comments
FR22: Epic 3 - Add own comments using native Google Docs commenting
FR23: Epic 3 - Re-grade essay with option to clear previous AI comments
FR24: Epic 3 - Transparent status when comment anchoring partially fails
FR25: Epic 3 - Graceful degradation for comment anchoring (tiered fallback)
FR26: Epic 2 - Enter band scores directly without AI grading
FR27: Epic 2 - Save manually entered scores to Sheet
FR28: Epic 2 - Save band scores to Sheet with one click
FR29: Epic 2 - Save scores regardless of comment resolution status (non-blocking)
FR30: Epic 2 - System writes scores to correct student row and column
FR31: Epic 2 - Confirmation after scores saved to Sheet
FR32: Epic 3 - Clear error message when AI grading fails with retry/manual fallback
FR33: Epic 3 - Informative messaging when backend is unavailable
FR34: Epic 3 - Clear recovery options for all error states
FR35: Epic 1 - Validate teacher identity via Google ID token on all backend requests
FR36: Epic 3 - Per-user rate limits on AI grading requests
FR37: Epic 3 - Log grading events for future analytics and model improvement
FR38: Epic 3 - Passthrough entitlement check stub on grading requests
FR39: Epic 4 - Track AI grading usage count per billing period
FR40: Epic 4 - Show remaining free-tier gradings in sidebar
FR41: Epic 4 - Clear upgrade prompt when free-tier limit reached
FR42: Epic 4 - Initiate Pro upgrade from sidebar
FR43: Epic 4 - Manual score entry available when AI limit reached
FR44: Epic 4 - Activate Pro entitlements immediately after payment
FR45: Epic 5 - Class-level analytics in Sheet sidebar
FR46: Epic 5 - At-risk student flags based on score trends
FR47: Epic 5 - Improving/plateaued/declining status per student
FR48: Epic 5 - Drill down into individual student performance
FR49: Epic 5 - Generate shareable parent progress report link
FR50: Epic 6 - Create Reading/Listening answer key in Sheet
FR51: Epic 6 - Select pre-loaded Cambridge IELTS test
FR52: Epic 6 - Create complex assignments via web app
FR53: Epic 6 - Generate shareable student assignment link
FR54: Epic 6 - Student timed R/L test with auto-save and server timer
FR55: Epic 6 - Student resume test session on different device
FR56: Epic 6 - Auto-score R/L submissions and write to teacher's Sheet
FR57: Epic 6 - Student submit Writing/Speaking via shared link
FR58: Epic 6 - Teacher sees pending W/S submissions in grading queue
FR59: Epic 7 - Parent views progress via token-based link (no login)
FR60: Epic 7 - Vietnamese language report with skill summaries and trends
FR61: Epic 7 - Parent report updates automatically with live data
FR62: Epic 7 - Teacher can revoke parent report link
FR63: Epic 5 - Export scores as CSV from Sheet sidebar
FR64: Epic 5 - Request deletion of submission history from backend

## Epic List

### Epic 1: Project Foundation & Teacher Onboarding
Teacher can install the add-on, authorize with Google, set up a Score Sheet with student names, and see their roster ready for grading. Includes TurboRepo scaffold, Railway deployment, backend skeleton with auth middleware, and database schema.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR35

### Epic 2: Score Entry & Sheet Tracking
Teacher can select students, enter band scores manually, navigate between students, and save scores to their Google Sheet — the complete score tracking loop without AI.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR26, FR27, FR28, FR29, FR30, FR31

### Epic 3: AI Essay Grading & Feedback
Teacher can click "Grade with AI" to get intelligent band scores and auto-inserted Doc comments, review and edit them, handle errors gracefully, and save — the core value proposition. Includes Gemini proxy, async job pipeline, Drive API comment insertion, grading event logging, rate limiting, and entitlement stub.
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR32, FR33, FR34, FR36, FR37, FR38

### Epic 4: Billing & Monetization (Phase 2)
Teacher can see usage limits, hit the paywall at the moment of maximum pain, upgrade to Pro via Polar.sh, and continue grading without interruption.
**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR44

### Epic 5: Analytics & Data Management (Phase 2)
Teacher can view class-level analytics, spot at-risk students, track improvement trends, generate parent report links, and export or manage their data.
**FRs covered:** FR45, FR46, FR47, FR48, FR49, FR63, FR64

### Epic 6: Assignments & Student Testing (Phase 3)
Teacher can create assignments and share links; students can take timed Reading/Listening tests with session persistence, auto-scoring, and Writing/Speaking submission.
**FRs covered:** FR50, FR51, FR52, FR53, FR54, FR55, FR56, FR57, FR58

### Epic 7: Parent Reports & Communication (Phase 4)
Parents can view student progress via shareable Vietnamese-language reports with live data, trend visualization, and Zalo-friendly link previews.
**FRs covered:** FR59, FR60, FR61, FR62

---

## Epic 1: Project Foundation & Teacher Onboarding

Teacher can install the add-on, authorize with Google, set up a Score Sheet with student names, and see their roster ready for grading.

### Story 1.1: Initialize Monorepo & Deploy Backend Skeleton

As a developer,
I want a fully scaffolded TurboRepo monorepo with a deployed Fastify backend, shared type packages, and database schema,
So that all subsequent stories have a working foundation to build on.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `pnpm install && turbo build`
**Then** the project builds successfully with zero errors across all workspaces (`packages/shared`, `apps/api`, `apps/addon`)

**Given** the `packages/shared/` workspace
**When** I inspect the source files
**Then** I find Zod schemas for `GradeRequest`, `GradeResult`, `JobStatus`, `ScoreWritePayload`, `BandScores`, `TaskType`, `Criteria`, and `ErrorCode` with `retryable` flag — all exported from `src/index.ts`

**Given** the `apps/api/` workspace
**When** I run the Fastify server locally with a valid `.env` file
**Then** the server starts, validates environment variables via `@fastify/env` with Zod schema, and logs startup via Pino

**Given** a running API server
**When** I send `GET /health`
**Then** I receive `200 { "data": { "status": "ok" } }`

**Given** a running API server
**When** I navigate to `/docs`
**Then** I see Swagger UI with the OpenAPI spec auto-generated from Zod route schemas via `@fastify/swagger` and `fastify-type-provider-zod`

**Given** the `apps/api/src/middleware/auth.ts` module
**When** a request hits any protected route without a valid Google ID token
**Then** it returns `401 { "error": { "code": "UNAUTHORIZED", "message": "...", "retryable": false } }`

**Given** a valid Google ID token in the Authorization header
**When** the auth middleware processes the request
**Then** it extracts the teacher's email and sub, upserts into the `teachers` table, and attaches `teacher_id` (UUID) to the request context

**Given** the `apps/api/src/db/` directory
**When** I run `kysely-ctl migrate`
**Then** the initial migration creates `teachers`, `grading_jobs`, `grading_events`, and `processed_webhook_ids` tables with `teacher_id` (UUID) indexed on all relevant tables, timestamps as `TIMESTAMPTZ`, and band scores as `DECIMAL(2,1)`

**Given** the Kysely client configuration
**When** queries are executed
**Then** `CamelCasePlugin` maps `snake_case` DB columns to `camelCase` TypeScript properties transparently

**Given** the `apps/api/src/middleware/rate-limit.ts` module
**When** configured via `@fastify/rate-limit`
**Then** rate limiting is keyed by `teacher_id` (not IP) with 30 grading requests/hr and 200 non-AI requests/hr

**Given** the API is deployed to Railway
**When** I hit the production `/health` endpoint
**Then** I receive a `200` response, confirming Railway auto-deploy from GitHub works with Postgres connected

**Given** the project root
**When** I inspect configuration files
**Then** I find `.env.example` with all required variables (`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `POLAR_WEBHOOK_SECRET`, `NODE_ENV`, `LOG_LEVEL`, `PORT`), `turbo.json` with correct build pipeline (shared → api + addon), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict mode), and `.github/workflows/ci.yml` (lint + typecheck + test)

---

### Story 1.2: Apps Script Add-on Shell & Sidebar Pipeline

As a teacher,
I want to install the IELTS Toolkit add-on from a direct link and see a sidebar open in Google Docs,
So that I can begin setting up my grading workflow.

**Acceptance Criteria:**

**Given** the `apps/addon/` workspace
**When** I run `pnpm build`
**Then** Vite compiles the Preact sidebar (with Google Add-ons CSS linked from CDN) into a single inlined HTML file (`dist/sidebar.html`) under 100KB, `tsc` compiles server-side `.ts` to `.gs` in `dist/`, and `appsscript.json` is copied to `dist/`

**Given** the built addon in `dist/`
**When** I run `clasp push`
**Then** the add-on deploys to Google Apps Script without errors

**Given** a teacher opens a Google Doc
**When** they click "Add-ons → IELTS Toolkit → Open Sidebar"
**Then** the sidebar loads with the Preact UI shell within 8 seconds (cold start) or 3 seconds (warm)

**Given** the sidebar loads
**When** it initializes
**Then** it calls the backend `/health` endpoint via `google.script.run` → `callApi()` with a fresh Google ID token from `ScriptApp.getIdentityToken()`, and displays a connection status indicator

**Given** the `apps/addon/src/sidebar/lib/gas.ts` module
**When** any sidebar component needs to call Apps Script server-side functions
**Then** all calls go through the promise wrapper (never raw `google.script.run`) with `.withSuccessHandler()` and `.withFailureHandler()`

**Given** the `apps/addon/src/server/api.ts` module
**When** any server-side function needs to call the backend API
**Then** all calls go through the `callApi(method, path, body?)` function which acquires a fresh ID token via `ScriptApp.getIdentityToken()` per-call

**Given** a developer opens `apps/addon/src/sidebar/index.dev.html` in a browser
**When** the page loads
**Then** the sidebar renders with mocked `google.script.run` responses from `__mocks__/gas-mock.ts`, enabling local UI development without a Google account

**Given** the sidebar successfully connects to the backend
**When** the teacher has no linked Score Sheet
**Then** the sidebar displays the Sheet setup flow (Story 1.3) as the landing state

---

### Story 1.3: Create New Score Sheet with Student Import

As a teacher,
I want to create a new Score Sheet and import my student names from an existing spreadsheet or type them manually,
So that I have a clean, properly formatted roster ready for score tracking without rebuilding my student list from scratch.

**Acceptance Criteria:**

**Given** a teacher with no linked Score Sheet opens the sidebar
**When** the setup flow presents options
**Then** the teacher sees two choices: "Create new Score Sheet" (recommended) and "Link existing Sheet"

**Given** the teacher selects "Create new Score Sheet"
**When** the setup flow asks how to add students
**Then** the teacher sees two options: "Import names from a Google Sheet" and "Type names manually"

**Given** the teacher selects "Import names from a Google Sheet"
**When** they pick a file and the add-on reads its contents
**Then** the sidebar shows the available columns and lets the teacher pick the one containing student names

**Given** the teacher picks a column from their existing Sheet
**When** the add-on extracts the names
**Then** a preview shows: "We found N names: Name1, Name2, Name3... Correct?" with Confirm and Cancel actions

**Given** the teacher confirms the imported names
**When** the system creates the Score Sheet
**Then** a new Google Sheet is created with pre-formatted columns (Student Name, plus columns for IELTS band scores with dates), all student names in column A, and proper structure for future score entries. The original Sheet is not modified

**Given** the teacher selects "Type names manually"
**When** they enter names (comma-separated or one per line) and confirm
**Then** a new Score Sheet is created with the same pre-formatted structure and the manually entered names in column A

**Given** the new Score Sheet is created
**When** the sidebar updates
**Then** the linked Sheet info is displayed, the student picker dropdown is populated with the imported/typed names, and the sidebar transitions to the grading-ready state

**Given** a newly created Score Sheet with students but no scores
**When** the teacher views the sidebar
**Then** appropriate empty states are shown: "No scores yet — grade your first essay to get started" (not error states)

**Given** the teacher's import Sheet has no recognizable student name column
**When** the add-on scans the Sheet
**Then** it shows all columns with previews of their content so the teacher can manually identify the correct column

---

### Story 1.4: Link Existing Sheet & Roster Management

As a teacher,
I want to link my existing Score Sheet and add new students over time,
So that I can use my current tracking spreadsheet and keep my roster up to date as I take on new students.

**Acceptance Criteria:**

**Given** the teacher selects "Link existing Sheet" from the setup flow
**When** the file browser opens
**Then** the teacher can browse and select any Google Sheet from their Drive

**Given** the teacher selects a Sheet
**When** the add-on analyzes its structure
**Then** it detects headers and shows a preview: column names, first few rows, and asks the teacher to confirm which column contains student names

**Given** the Sheet structure is detected successfully
**When** the teacher confirms the column mapping
**Then** the Sheet is linked, the student picker dropdown populates with the detected names, and the sidebar transitions to grading-ready state

**Given** the teacher selects a Sheet whose structure can't be detected (no recognizable headers, merged cells, or incompatible format)
**When** the add-on fails to identify a student roster
**Then** the sidebar shows: "We couldn't detect a student roster in this Sheet. Would you like to create a new Score Sheet instead?" with options to retry with a different Sheet or create a new one

**Given** the teacher accidentally selects a non-roster Sheet (e.g., personal budget)
**When** the add-on scans it
**Then** the same clear fallback message appears with recovery options (not a cryptic error)

**Given** a teacher with a linked Score Sheet and existing roster
**When** they want to add a new student
**Then** they can access a "Add Student" option in the sidebar, enter the student name, and the name is appended to the roster in the linked Sheet and immediately available in the student picker dropdown

**Given** a teacher adds a new student
**When** the student is added to the Sheet
**Then** the new row follows the same pre-formatted structure as existing rows, and the student picker refreshes to include the new name

---

## Epic 2: Score Entry & Sheet Tracking

Teacher can select students, enter band scores manually, navigate between students, and save scores to their Google Sheet — the complete score tracking loop without AI.

### Story 2.1: Sidebar Navigation & Student Context

As a teacher,
I want to see my linked Sheet and student context when I open the sidebar, and navigate between students with previous/next controls,
So that I can quickly orient myself and move through my roster efficiently during grading sessions.

**Acceptance Criteria:**

**Given** a teacher with a linked Score Sheet opens the sidebar
**When** the sidebar loads
**Then** it displays: linked Sheet name, student picker dropdown populated from the roster, and recent grading activity summary (or empty state if no history)

**Given** the sidebar is open and a student is selected
**When** the teacher views the sidebar
**Then** the current student name and assignment context are visible at all times during the session

**Given** a roster with multiple students
**When** the teacher clicks the next/previous navigation controls
**Then** the sidebar advances to the next/previous student in roster order, updating the student context display

**Given** the teacher is on the first student in the roster
**When** they click the previous control
**Then** the control is disabled or wraps to the last student (consistent behavior)

**Given** the teacher has unsaved score edits for the current student
**When** they click next/previous to navigate away
**Then** a confirmation prompt appears: "You have unsaved changes for [Student Name]. Save before continuing?" with Save, Discard, and Cancel options

**Given** the teacher opens the sidebar, closes it, and reopens it in the same session
**When** the sidebar reinitializes
**Then** it restores the last session state (selected student, linked Sheet) or defaults to the student picker if no prior state exists

**Given** the teacher has a linked Sheet and opens a different Google Doc
**When** the sidebar opens in the new document
**Then** the same linked Sheet context is retained — student picker, roster, and Sheet reference persist across documents in the same session

---

### Story 2.2: Manual Score Entry & Save to Sheet

As a teacher,
I want to enter band scores directly in the sidebar and save them to my Google Sheet with one click,
So that I can track student scores without using AI grading — for quick manual entry or when AI is unavailable.

**Acceptance Criteria:**

**Given** a teacher has a student selected in the sidebar
**When** they view the scoring section
**Then** they see editable fields for all five IELTS criteria: Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), and Overall — each accepting values from 0.0 to 9.0 in 0.5 increments

**Given** the teacher enters band scores in the sidebar
**When** they input a value outside the valid range (negative, above 9.0, or not a 0.5 increment)
**Then** the field shows a validation error and the Save button remains disabled

**Given** the teacher has entered valid band scores
**When** they click "Save to Sheet"
**Then** the scores are written to the correct student row and the appropriate assignment column in the linked Google Sheet, using `LockService.getScriptLock()` to prevent concurrent write corruption

**Given** scores are being saved
**When** the save completes successfully
**Then** the sidebar shows a confirmation message (e.g., "Scores saved for [Student Name]") and the save status signal transitions from `saving` to `saved`

**Given** scores are being saved
**When** the Sheet write fails (e.g., Sheet deleted, permission revoked, lock acquisition fails)
**Then** the sidebar shows a clear error: "Scores couldn't be saved to your Sheet. [Retry] — your scores are preserved here" and the entered scores remain in the sidebar

**Given** the teacher has entered scores but not saved
**When** they view the sidebar
**Then** a dirty indicator shows that unsaved changes exist (via the `hasUnsavedChanges` computed signal)

**Given** the teacher clicks "Save to Sheet"
**When** AI comments exist on the document (from a future Epic 3 grading session)
**Then** scores save regardless of whether comments are resolved — save is non-blocking with respect to comment state

**Given** the score write-back completes
**When** measured end-to-end
**Then** the save operation completes in under 5 seconds (NFR3)

---

## Epic 3: AI Essay Grading & Feedback

Teacher can click "Grade with AI" to get intelligent band scores and auto-inserted Doc comments, review and edit them, handle errors gracefully, and save — the core value proposition.

### Story 3.1: Grading Backend — Gemini Proxy & Async Job Pipeline

As a developer,
I want POST `/grade` and GET `/grade/:jobId/status` endpoints with Gemini AI integration, async job management, and grading event logging,
So that the sidebar can submit essays for AI grading and poll for results reliably.

**Acceptance Criteria:**

**Given** a teacher sends `POST /grade` with a valid ID token, essay text, task type (Task 1 Academic, Task 1 General, or Task 2), student context, and an `X-Idempotency-Key` header
**When** the request is validated via Zod schemas from `packages/shared/`
**Then** a new grading job is created in the `grading_jobs` table with status `pending`, a UUID `job_id` is returned as `{ "data": { "jobId": "..." } }`, and the AI grading process begins asynchronously

**Given** a `POST /grade` request with an `X-Idempotency-Key` that matches an existing job
**When** the backend checks the `grading_jobs` table
**Then** it returns the existing job's `jobId` instead of creating a duplicate — preventing wasted Gemini API calls from `UrlFetchApp` retries

**Given** a grading job is processing
**When** the backend calls Gemini via `services/grading.ts`
**Then** student names and PII are stripped from the prompt — only essay text + IELTS band descriptors + task type context are sent to the AI

**Given** a grading job is processing
**When** Gemini returns results
**Then** the job status updates to `completed` with band scores (Overall, TA, CC, LR, GRA as `DECIMAL(2,1)`), feedback comments with text anchoring positions, and a `grading_events` entry with `event_type: 'ai_score_generated'` is logged

**Given** a teacher sends `GET /grade/:jobId/status`
**When** the job is still processing
**Then** the response is `{ "data": { "status": "processing" } }`

**Given** a teacher sends `GET /grade/:jobId/status`
**When** the job has completed
**Then** the response includes `{ "data": { "status": "completed", "result": { "bandScores": {...}, "comments": [...] } } }`

**Given** a teacher sends `GET /grade/:jobId/status`
**When** the job has failed
**Then** the response includes `{ "data": { "status": "failed", "error": { "code": "GRADING_FAILED", "message": "...", "retryable": true } } }`

**Given** Gemini returns a 5xx error or times out
**When** the backend handles the failure
**Then** it retries once, and if the retry fails, marks the job as `failed` with `retryable: true`

**Given** a teacher has exceeded the rate limit (30 grading requests/hr)
**When** they send `POST /grade`
**Then** the response is `429 { "error": { "code": "RATE_LIMITED", "message": "...", "retryable": true } }`

**Given** the entitlement check stub in Phase 1
**When** any `POST /grade` request arrives
**Then** the stub passes all requests through (always returns `entitled: true`) but the middleware hook exists so Phase 2 can enforce limits without hot-path rework

**Given** Gemini grading completes end-to-end
**When** measured from `POST /grade` submission to `completed` status available
**Then** the total processing time is under 30 seconds (P95 < 20s) per NFR1

**Given** grading jobs exist in the database
**When** a job has been in `pending` or `processing` status for longer than 5 minutes
**Then** a cleanup mechanism marks it as `failed` with `retryable: true` to prevent stale jobs from accumulating

**Given** the Gemini prompt templates in `services/grading.ts`
**When** grading Task 1 Academic, Task 1 General, or Task 2 essays
**Then** the prompt includes the correct IELTS band descriptors for each task type and requests scores for all four criteria (TA, CC, LR, GRA) plus Overall, with feedback comments identifying specific text passages

---

### Story 3.2: Grading Sidebar — Initiate, Poll & Display Results

As a teacher,
I want to click "Grade with AI" in the sidebar, see progress while it processes, and view the resulting band scores that I can edit before saving,
So that I can get AI-assisted scoring for my students' essays and adjust scores based on my professional judgment.

**Acceptance Criteria:**

**Given** a teacher has a student selected and the sidebar is in grading-ready state
**When** they view the grading panel
**Then** they see a task type selector (Task 1 Academic, Task 1 General, Task 2) and a "Grade with AI" button

**Given** the teacher selects a task type and clicks "Grade with AI"
**When** the grading request is submitted
**Then** the sidebar generates a UUID idempotency key, submits via `gas.ts` → `callApi('POST', '/grade', ...)`, and the grading status signal transitions to `submitting`

**Given** the grading request is submitted successfully
**When** the backend returns a `jobId`
**Then** the sidebar transitions to `polling` status and shows a progress indicator: "Analyzing essay... usually 10-15 seconds" with an animated spinner

**Given** the sidebar is polling for grading status
**When** it checks `GET /grade/:jobId/status` every 3-5 seconds via `lib/polling.ts`
**Then** progressive status updates display in the sidebar (e.g., "Analyzing essay...", "Scoring criteria...")

**Given** the teacher wants to cancel a grading request
**When** they click a Cancel button during the polling phase
**Then** polling stops, the grading status signal resets to `idle`, and the sidebar returns to the pre-grading state. The backend job may still complete but results are discarded on the client side

**Given** grading completes successfully
**When** the sidebar receives the completed result
**Then** it displays AI-generated band scores (Overall, TA, CC, LR, GRA) in the score editor component, each field editable with the same 0.0-9.0 / 0.5-increment validation from Story 2.2

**Given** the teacher edits an AI-generated band score
**When** they change a value
**Then** a `grading_events` entry with `event_type: 'score_overridden'` including before/after values is logged via the backend when scores are eventually saved

**Given** the grading request fails
**When** the sidebar receives an error response
**Then** it displays: "Grading couldn't complete. [Retry] or [Enter scores manually]" — the retry button resubmits with a new idempotency key, and "Enter scores manually" transitions to the manual entry state from Story 2.2

**Given** the backend is unreachable
**When** the `callApi()` call fails with a network error
**Then** the sidebar shows: "Can't connect to grading service. Manual score entry is available." with a link to manual entry

**Given** any error state in the grading flow
**When** the teacher views recovery options
**Then** clear, specific actions are available (Retry, Enter Manually, Re-link Sheet) — never a dead-end error screen

---

### Story 3.3: Doc Comment Insertion & Feedback Summary

As a teacher,
I want AI feedback to appear as native comments in my Google Doc anchored to specific text, with a summary in the sidebar,
So that my students see professional inline feedback and I have a persistent reference of what the AI suggested.

**Acceptance Criteria:**

**Given** AI grading has completed with feedback comments
**When** the sidebar receives the grading result
**Then** the system inserts comments into the Google Doc via Drive API Advanced Service, anchored to the specific text ranges identified by the AI

**Given** comments are being inserted
**When** the insertion process runs
**Then** comments appear under the teacher's own Google account (no AI branding, no bot name) — the teacher is the author

**Given** comments are being inserted into the Doc
**When** measured end-to-end for up to 15 comments
**Then** the insertion completes within 10 seconds, with comments appearing progressively (teacher sees them appear one by one)

**Given** the grading status signal
**When** comments are being inserted after scoring completes
**Then** the status transitions to `inserting-comments` with a count update in the sidebar (e.g., "Inserting comments... 3/5")

**Given** AI grading has completed
**When** the sidebar displays results
**Then** a collapsible "AI Feedback Summary" section shows all AI-generated suggestions as a persistent list — even if Doc comments are later deleted, this list remains

**Given** all comments anchor to their target text successfully
**When** the sidebar reports comment status
**Then** no anchoring status is shown (clean success — don't show "5/5 anchored" noise)

**Given** some comments fail to anchor to specific text
**When** the insertion process encounters anchoring failures
**Then** unanchored comments are inserted as general comments in the Doc's comment panel (not linked to specific text), and the sidebar shows transparent status: "4 comments anchored to text, 1 added as general feedback"

**Given** all comments fail to anchor
**When** the tiered fallback reaches the last level
**Then** feedback is appended as a formatted section at the end of the Doc, and the sidebar reports: "Comments added as a feedback section at the end of the document"

**Given** the comment insertion process
**When** the grading status signal transitions through states
**Then** the full state flow is: `idle` → `submitting` → `polling` → `inserting-comments` → `done` (or `error` at any stage)

---

### Story 3.4: Comment Management & Re-grading

As a teacher,
I want to manage AI-inserted comments using native Google Docs tools and re-grade essays when needed,
So that I maintain full control over the feedback my students see and can get fresh AI analysis if the essay changes or I want a second opinion.

**Acceptance Criteria:**

**Given** AI comments have been inserted into the Google Doc
**When** the teacher interacts with them
**Then** they can review, resolve, edit, or delete each comment using Google Docs' native commenting interface — the comments behave identically to manually created comments

**Given** the teacher resolves or deletes an AI comment
**When** the action is performed
**Then** a `grading_events` entry is logged (`event_type: 'comment_kept'`, `'comment_deleted'`, or `'comment_edited'`) for future model improvement when the teacher saves scores

**Given** the teacher wants to add their own feedback
**When** they select text and add a comment via Google Docs' native commenting
**Then** the comment is created normally — the add-on does not interfere with native commenting functionality

**Given** the teacher wants to re-grade an essay
**When** they click "Re-grade" in the sidebar
**Then** they see an option: "Clear previous AI comments before re-grading?" with Yes and No choices

**Given** the teacher selects "Yes" to clear previous AI comments before re-grading
**When** the re-grade process begins
**Then** all AI-inserted comments from the previous grading session are removed from the Doc (identified by metadata or tracking), and a new grading request is submitted

**Given** the teacher selects "No" to keep previous AI comments
**When** the re-grade process begins
**Then** existing comments remain in the Doc, and new AI comments are inserted alongside them — the sidebar feedback summary updates to show only the latest grading session's suggestions

**Given** the AI Feedback Summary in the sidebar
**When** comments have been resolved or deleted in the Doc
**Then** the feedback summary still shows all original AI suggestions (it is a persistent record of what the AI generated, independent of Doc comment state)

**Given** the in-product feedback mechanism
**When** a grading session completes and results are displayed
**Then** the sidebar shows an optional one-tap feedback prompt: "Was this grading helpful? 👍 / 👎" with optional freeform text, stored as a `grading_events` entry with `event_type: 'feedback'`

---

## Epic 4: Billing & Monetization (Phase 2)

Teacher can see usage limits, hit the paywall at the moment of maximum pain, upgrade to Pro via Polar.sh, and continue grading without interruption.

### Story 4.1: Usage Tracking & Entitlement Enforcement

As a developer,
I want the backend to track AI grading usage per teacher, enforce free-tier limits, and process Polar subscription webhooks,
So that the billing system accurately gates AI grading access and activates Pro entitlements immediately after payment.

**Acceptance Criteria:**

**Given** a teacher on the free tier sends `POST /grade`
**When** the entitlement middleware checks their usage
**Then** it queries the in-memory entitlement cache (backed by Postgres) for the teacher's plan status and grading count in the current billing period

**Given** a free-tier teacher has used fewer than 20 AI gradings this month
**When** they submit a grading request
**Then** the request proceeds normally, and the usage counter increments by 1

**Given** a free-tier teacher has used 20 AI gradings this month
**When** they submit a grading request
**Then** the response is `403 { "error": { "code": "USAGE_LIMIT_REACHED", "message": "Free tier limit reached. Upgrade to Pro for unlimited gradings.", "retryable": false } }` with additional data: `{ "usage": { "used": 20, "limit": 20, "resetsAt": "2026-05-01T00:00:00Z" } }`

**Given** a teacher on the Pro tier
**When** they submit any number of grading requests
**Then** all requests proceed without usage limit enforcement

**Given** Polar sends a `subscription.created` or `subscription.updated` webhook
**When** the backend receives it at `POST /webhooks/polar`
**Then** the handler verifies the webhook signature, checks `processed_webhook_ids` for deduplication (72-hour window), updates the teacher's entitlement record in Postgres (`plan`, `status`, `valid_until`), and invalidates the in-memory cache for that teacher

**Given** Polar sends a `subscription.canceled` or `subscription.expired` webhook
**When** the backend processes it
**Then** the teacher's plan reverts to free tier with a 24-hour grace period before enforcement — access is never revoked immediately on webhook receipt

**Given** a Polar webhook with an ID already in `processed_webhook_ids`
**When** the handler receives it
**Then** it returns `200 OK` without reprocessing — full idempotency

**Given** the in-memory entitlement cache
**When** a cache entry's TTL expires
**Then** the next request for that teacher fetches fresh data from Postgres and repopulates the cache

**Given** Polar is experiencing an outage
**When** webhook delivery fails
**Then** the local entitlement cache continues serving from its last known state — teachers are never locked out due to a Polar outage

**Given** the usage counter
**When** a new billing period begins (monthly reset)
**Then** the usage count resets to 0 for all teachers

---

### Story 4.2: Paywall UI & Upgrade Flow

As a teacher,
I want to see how many free gradings I have left and upgrade to Pro seamlessly when I hit the limit,
So that I'm never surprised by the limit and can continue grading without losing my workflow momentum.

**Acceptance Criteria:**

**Given** a free-tier teacher opens the sidebar
**When** the sidebar loads or after each grading completes
**Then** a subtle usage indicator shows remaining free-tier gradings: "X of 20 free gradings remaining this month"

**Given** the teacher has 3 or fewer free gradings remaining
**When** the usage indicator displays
**Then** it highlights with a warning style (e.g., amber text) to signal the approaching limit

**Given** the teacher has used all 20 free gradings
**When** they click "Grade with AI"
**Then** the sidebar shows: "You've used 20 of 20 free AI gradings this month. Resets in N days." with two clear options: "[Upgrade to Pro — unlimited gradings]" and "[Enter scores manually]"

**Given** the teacher clicks "Upgrade to Pro"
**When** the upgrade flow initiates
**Then** a new browser tab opens to the Polar-hosted customer portal / checkout page with the Pro plan ($9/month) pre-selected, displaying price in VND for Vietnamese users

**Given** the teacher completes payment on Polar
**When** the Polar webhook fires and the backend processes it (Story 4.1)
**Then** the sidebar detects the entitlement change on its next backend call (or via a manual "Refresh" button) and updates to show: "Pro — unlimited gradings"

**Given** the teacher's Pro status is activated
**When** they click "Grade with AI"
**Then** grading proceeds normally with no usage counter displayed (clean Pro experience)

**Given** the teacher clicks "Enter scores manually" at the paywall
**When** they choose manual entry
**Then** the sidebar transitions to the manual score entry state (Story 2.2) — manual entry always works regardless of tier or AI availability

**Given** the teacher is on the Pro tier
**When** they want to manage their subscription
**Then** a "Manage Subscription" link in the sidebar opens the Polar-hosted customer portal for billing management, cancellation, and payment method updates

---

## Epic 5: Analytics & Data Management (Phase 2)

Teacher can view class-level analytics, spot at-risk students, track improvement trends, generate parent report links, and export or manage their data.

### Story 5.1: Class-Level Analytics Sidebar

As a teacher,
I want to see an analytics overview of my class in the Google Sheets sidebar,
So that I can quickly identify trends, weakest skills, and students who need attention without manually analyzing my score data.

**Acceptance Criteria:**

**Given** a teacher opens the analytics sidebar in their linked Google Sheet
**When** the analytics view loads
**Then** it displays a class overview: overall class average band score, trend direction (improving/stable/declining) compared to previous period, and the weakest skill across the class (e.g., "Weakest: Lexical Resource — class avg 5.5")

**Given** the analytics sidebar is showing class data
**When** the teacher views the student list
**Then** each student shows a status indicator: "Improving" (green), "Plateaued" (amber), or "Declining" (red) based on their band score trend over the last 3+ grading sessions

**Given** the analytics sidebar is showing class data
**When** the teacher views the student list
**Then** students flagged as "At Risk" are highlighted — defined as: current average is 1.0+ bands below their target, or declining trend over 3+ sessions, or no scores recorded in 3+ weeks

**Given** a class with fewer than 3 grading sessions
**When** the analytics view loads
**Then** trend data shows "Not enough data yet" instead of misleading partial trends

**Given** the analytics data
**When** computed from the teacher's Google Sheet scores
**Then** all calculations use the scores already in the Sheet (Sheet-as-database pattern) — no separate backend analytics query required for basic class stats

---

### Story 5.2: Student Performance Drill-Down & Parent Report Link

As a teacher,
I want to drill into an individual student's performance and generate a shareable progress report link,
So that I can understand each student's strengths and weaknesses in detail and share progress with parents.

**Acceptance Criteria:**

**Given** the teacher clicks a student name in the analytics sidebar
**When** the drill-down view loads
**Then** it shows per-skill breakdown (TA, CC, LR, GRA) with individual averages, per-criterion trend over time (improving/stable/declining for each skill), and the student's overall trajectory toward their target band

**Given** the student drill-down view
**When** the teacher views score history
**Then** scores are displayed chronologically with task type labels, showing progression across grading sessions

**Given** the teacher wants to share a student's progress with a parent
**When** they click "Generate Parent Report Link"
**Then** the system creates a token-based URL (UUID v4, no PII in the URL) that opens a read-only progress report page — no login required for the parent

**Given** a parent report link is generated
**When** the backend creates the link
**Then** the link record is stored with the teacher's `teacher_id`, the student reference, and an active/revoked status flag

**Given** a parent report link exists
**When** the teacher views the student drill-down
**Then** they see the existing link with options to copy it or revoke it

---

### Story 5.3: Data Export & Deletion

As a teacher,
I want to export my scores as CSV and request deletion of my data from the backend,
So that I always have a backup of my data and can exercise control over my information.

**Acceptance Criteria:**

**Given** a teacher opens the Sheet sidebar
**When** they click "Export Scores as CSV"
**Then** the system generates a CSV file containing all student names, band scores, dates, and task types from their linked Sheet, and triggers a browser download

**Given** the CSV export
**When** the file is generated
**Then** it includes headers matching the Sheet column structure, all score data formatted consistently (dates as ISO 8601, band scores as decimal), and is encoded as UTF-8 (supporting Vietnamese student names)

**Given** a teacher wants to delete their backend data
**When** they access the "Delete My Data" option in the sidebar settings
**Then** they see a confirmation dialog explaining what will be deleted: "This will delete all your grading sessions, AI feedback history, and submission data from our servers. Your Google Sheet scores will NOT be affected."

**Given** the teacher confirms data deletion
**When** the backend processes the request
**Then** it soft-deletes the teacher's submission history, grading sessions, and grading events from Postgres, returns confirmation to the sidebar, and the teacher's Sheet data remains untouched (teacher-owned)

**Given** the teacher confirms data deletion
**When** the backend completes the operation
**Then** the teacher can continue using the add-on normally — their Sheet, roster, and manual score entry still work. Only AI grading history and event logs are removed

---

## Epic 6: Assignments & Student Testing (Phase 3)

Teacher can create assignments and share links; students can take timed Reading/Listening tests with session persistence, auto-scoring, and Writing/Speaking submission.

### Story 6.1: Answer Key Creation & Test Library

As a teacher,
I want to create Reading/Listening answer keys in my Sheet and select from pre-loaded Cambridge IELTS tests,
So that I can quickly set up assignments and share them with students via a link.

**Acceptance Criteria:**

**Given** a teacher opens the assignment creation flow in the Sheet sidebar
**When** they select "Create Answer Key"
**Then** they can paste answers directly into a structured format in their Sheet (one answer per row, with question number, correct answer, and optional section grouping)

**Given** a teacher has pasted answer key data
**When** the add-on validates the format
**Then** it confirms the number of questions detected, shows a preview of the answer key, and flags any formatting issues (missing answers, duplicate question numbers)

**Given** a teacher wants to use a pre-loaded test
**When** they select "Cambridge IELTS Library"
**Then** they see a list of available tests (Cambridge IELTS 14-18) with test number, type (Academic/General), and section breakdown

**Given** the teacher selects a Cambridge IELTS test
**When** they confirm the selection
**Then** the answer key is populated in their Sheet in the standard format, ready for assignment creation

**Given** a teacher has a valid answer key in their Sheet
**When** they click "Generate Assignment Link"
**Then** the system creates a shareable URL (UUID v4 token) that students can open to take the test, and the link is displayed with copy-to-clipboard functionality

**Given** an assignment link is generated
**When** the backend stores the assignment
**Then** it records: `teacher_id`, answer key reference, test metadata (task type, number of questions, time limit), active/inactive status, and the UUID token

---

### Story 6.2: Student Test-Taking Web App

As a student,
I want to take a timed Reading/Listening test via a shared link with auto-save and the ability to resume on a different device,
So that I can complete practice tests conveniently and have my scores automatically sent to my teacher.

**Acceptance Criteria:**

**Given** a student opens an assignment link in their browser
**When** the student web app loads (React SPA on Vercel)
**Then** they see the assignment title, test type, time limit, and a roster dropdown to select their name

**Given** the student selects their name and starts the test
**When** the test begins
**Then** a server-authoritative timer starts counting down (e.g., 60 minutes for Reading), displayed prominently in the UI — the timer is not client-side-only and cannot be manipulated

**Given** the student is taking the test
**When** they answer questions
**Then** their responses auto-save to the backend every 30 seconds, with a visible "Saved" indicator and timestamp

**Given** the student's device loses power or connectivity
**When** they open the same assignment link on a different device
**Then** the session resumes exactly where they left off — same answers, same timer position, same progress — identified by the assignment token + student name combination

**Given** the student completes all answers or the timer expires
**When** they submit (or auto-submit on timer expiry)
**Then** the system auto-scores the Reading/Listening submission against the answer key, converts the raw score to an IELTS band score, and displays the result: "28/40 — Band 6.5"

**Given** a submission is scored
**When** the score is calculated
**Then** the band score is written automatically to the teacher's Google Sheet in the correct student row and assignment column via the backend → Apps Script relay pattern

**Given** the student web app
**When** it makes API calls
**Then** it uses `openapi-fetch` consuming the OpenAPI spec generated by `@fastify/swagger` for type-safe API calls

---

### Story 6.3: Writing/Speaking Submission & Advanced Assignment Creation

As a teacher,
I want students to submit Writing and Speaking responses via shared links, and I want to create complex assignments with a full-featured builder,
So that I can collect all types of IELTS practice work digitally and manage my grading queue efficiently.

**Acceptance Criteria:**

**Given** an assignment link for a Writing task
**When** a student opens it
**Then** they see a text editor for writing their essay response, with word count display, the essay prompt/question, and a submit button

**Given** an assignment link for a Speaking task
**When** a student opens it
**Then** they see an audio recording interface with record/stop/replay controls, the speaking prompt displayed, and a submit button

**Given** a student submits a Writing or Speaking response
**When** the submission is processed
**Then** it is stored in the backend (essay text or audio file) linked to the teacher, student, and assignment, with status `pending_review`

**Given** Writing/Speaking submissions exist
**When** the teacher opens their grading queue in the sidebar
**Then** they see a list of pending submissions sorted by date, showing student name, task type, and submission time — with the ability to open the student's response for grading

**Given** the teacher wants to create a complex assignment
**When** they access the full-width assignment builder via the web app
**Then** they can import a PDF, build sections (Reading passages, Listening prompts, Writing tasks, Speaking prompts), set per-section time limits, and configure which sections are auto-scored vs. teacher-graded

**Given** a complex assignment is created via the web app
**When** the teacher publishes it
**Then** a shareable student link is generated, and the assignment appears in the teacher's Sheet sidebar alongside Sheet-native answer key assignments

---

## Epic 7: Parent Reports & Communication (Phase 4)

Parents can view student progress via shareable Vietnamese-language reports with live data, trend visualization, and Zalo-friendly link previews.

### Story 7.1: Parent Progress Report

As a parent,
I want to view my child's IELTS progress via a shared link in Vietnamese,
So that I can understand how they are improving and stay informed without needing to contact the teacher directly.

**Acceptance Criteria:**

**Given** a teacher has generated a parent report link (from Story 5.2)
**When** a parent opens the token-based URL in their browser
**Then** the report page loads without requiring any login or authentication — access is granted by the UUID v4 token in the URL

**Given** the parent report page loads
**When** the parent views the content
**Then** the entire report displays in Vietnamese, including: student name, overall band score projection, target band score, four skill boxes (Reading, Writing, Listening, Speaking) with current scores and trend arrows (improving/stable/declining), and a plain-language summary explaining the student's progress in non-technical terms

**Given** the parent report page
**When** new scores are added by the teacher (via grading or manual entry)
**Then** the report updates automatically with live data — no need for the teacher to regenerate the link or the parent to refresh manually

**Given** the parent report page
**When** it renders trend visualization
**Then** each skill shows a visual trend indicator (arrows or simple chart) covering the student's score history over time, making improvement or decline immediately visible

**Given** a parent shares the report link via Zalo
**When** the link preview renders in the Zalo chat
**Then** Open Graph meta tags produce a clean preview: Vietnamese title (e.g., "Báo cáo tiến bộ IELTS — [Student Name]"), a brief Vietnamese description, and a thumbnail image — optimized for Zalo's link preview renderer

**Given** the parent report page
**When** viewed on a mobile device
**Then** the layout is fully responsive and mobile-friendly — Vietnamese parents will primarily access via phone through Zalo links

**Given** a teacher wants to revoke a parent report link
**When** they click "Revoke" in the student drill-down view (Story 5.2)
**Then** the link is immediately deactivated, and any subsequent access to the URL shows a "This report is no longer available" message in Vietnamese

**Given** the parent report URL
**When** inspected
**Then** it contains no PII — only the UUID v4 token. The student name is resolved server-side from the token, never exposed in the URL itself
