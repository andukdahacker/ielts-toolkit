---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-04-22'
lastStep: 8
inputDocuments:
  - prd.md
  - ielts-teacher-toolkit-product-spec-v2.md
  - research/technical-feasibility-assessment-2026-04-21.md
  - research/market-competitive-landscape-2026-04-21.md
workflowType: 'architecture'
project_name: 'ielts-toolkit'
user_name: 'Duc'
date: '2026-04-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
64 FRs spanning 12 categories. Phase 1 delivers FR1-38 (onboarding, grading, score tracking, error handling, system/security). Phase 2 adds FR39-49 (entitlements, analytics). Phase 3-4 adds FR50-62 (assignments, parent reports). FR63-64 (data management) span all phases.

Architecturally, the FRs reveal three distinct interaction patterns:
1. **Teacher-in-Google** — sidebar-driven workflows mediated by Apps Script ↔ backend API calls (FR1-34). Manual score entry (FR26-27) is a first-class workflow, not a fallback — many teachers will use it as their primary mode while building trust in AI grading.
2. **System-to-system** — webhook processing, entitlement sync, async job management (FR35-44)
3. **Public web** — student test-taking and parent reports via lightweight web app (FR50-62)

Each pattern has different auth, latency, and reliability requirements.

**Non-Functional Requirements:**
- **Performance:** AI grading P95 < 20s (hard ceiling 30s), comment insertion < 10s for 15 comments (progressive insertion with sidebar count updates), score write-back < 5s, sidebar load < 3s warm / < 8s cold
- **Security:** Google ID token auth on all teacher requests, tenant isolation via `teacher_id`, PII stripping before AI calls, UUID v4 for student/parent links, API keys in Secret Manager
- **Reliability:** Phase 1 best-effort with manual RTO < 30min. Graceful degradation: AI down → manual entry, comment anchoring fails → tiered fallback, backend down → clear error messaging with recovery options
- **Scalability:** Phase 1: 20-30 teachers, ~12 concurrent. Phase 2: 200-500 teachers. Phase 3+: 2,000+ teachers
- **Cost:** Break-even at ~2 paid teachers. Net margin 67-72% at 10 teachers, 87-89% at 100

**Scale & Complexity:**
- Primary domain: Full-stack (Apps Script + Fastify + Postgres + React SPA)
- Complexity level: Medium
- Estimated architectural components: 6 (Doc add-on, Sheet add-on, Fastify API, Cloud SQL Postgres, Gemini AI proxy, student/parent web app)

### Market Context with Architectural Implications

The beachhead market is independent Vietnamese IELTS tutors. This creates specific architectural considerations:

- **Load concentration:** Vietnamese teachers grade primarily during evening hours (7-11pm ICT, UTC+7) and Sunday afternoons. Backend scaling and Gemini API quota must handle concentrated burst patterns, not uniform distribution. Cloud Run autoscaling thresholds should be tuned to this window.
- **Essay content:** Student essays are English-language IELTS responses, but may contain Vietnamese-language references, names, and mixed-script content. UTF-8 handling must be robust throughout the pipeline (essay extraction → backend → Gemini prompt → comment insertion).
- **AI prompt validation:** Gemini grading prompts must be validated against Vietnamese learner error patterns (L1 interference — article omission, tense confusion, word order) to ensure band score accuracy for this specific population. This is a prompt engineering requirement that affects AI grading quality metrics.
- **Payment context:** Card-only at launch (Polar.sh). Vietnamese mobile wallets (MoMo/ZaloPay) deferred until revenue signal justifies a local gateway. Pricing displayed in VND.

### Technical Constraints & Dependencies

| Constraint | Source | Architectural Impact | Rationale |
|-----------|--------|---------------------|-----------|
| Apps Script 6-min execution timeout | Google platform | All heavy processing must be backend-side; Apps Script is presentation only | Hard platform limit, no workaround |
| `UrlFetchApp` 30s HTTP timeout | Google platform | Backend must respond within 30s or use async pattern. No streaming — response must fit in memory. Explicit payload size ceiling needed for Gemini responses | Hard platform limit |
| `ScriptApp.getIdentityToken()` 1hr TTL | Google platform | Sidebar sessions outlive token. Requires token refresh strategy — re-call `getIdentityToken()` before each backend request or on 401 response | Silent auth failure if not handled |
| 300px sidebar width | Google platform | Vertical-stack UI, compact layouts, accordion patterns | Hard platform limit |
| `.currentonly` OAuth scopes | Marketplace compliance | Add-on only accesses the open document/sheet — no broad Drive scanning | Faster review, higher user trust |
| No server-to-sidebar push | Apps Script limitation | Polling pattern for async operations (3-5s intervals). During AI grading, progressive status updates ("Analyzing essay... Scoring criteria...") must be served from backend job status, not just a generic spinner | Trust-building during 10-30s wait |
| Single HTML file bundle | Apps Script deployment | Vite builds to inlined HTML; target 100KB bundle ceiling. `import.meta` unavailable in Apps Script iframe context — requires explicit Vite `define` config | Apps Script sandboxed iframe restrictions |
| `google.script.run` async model | Apps Script API | No native promise interface — requires `withSuccessHandler`/`withFailureHandler` wrapper pattern. Must be abstracted into a promise utility for Preact devs unfamiliar with Apps Script | Developer velocity risk if not handled upfront |
| `clasp` + Vite race condition | Build tooling | Sequential build: Vite first → clasp push. Never concurrent watchers | Known tooling conflict |
| Gemini AI Studio data terms | Privacy/legal | Input may be used for model improvement; disclose in privacy policy. Vertex AI migration path if needed | Legal/compliance |
| Cloud Run cold starts | Infrastructure | Min 1 instance. Must specify memory/CPU floor (e.g., 256MB/1 vCPU minimum) — cold start mitigation is incomplete without resource spec | Cost vs. latency tradeoff |
| Google Sheets no row locking | Platform | Concurrent writes during score callback can corrupt data. `LockService.getScriptLock()` is best-effort. Need documented write strategy: append-only with conflict detection, or optimistic locking via last-modified timestamp | Data integrity risk on concurrent sessions |

### Cross-Cutting Concerns Identified

1. **Dual authentication model** — Google ID tokens for teachers vs. no-auth UUID links for students/parents. Token refresh strategy required: sidebar must re-acquire identity token before each backend call or handle 401 with transparent re-auth, since token TTL (1hr) is shorter than typical grading sessions.

2. **Tenant isolation** — `teacher_id` on every DB table, every query. Threat model: Teacher A must never see Teacher B's student data, submissions, or grading history through any API endpoint. Free-tier and paid-tier share the same data model — entitlement enforcement is a separate concern from data isolation. Prepared from day one for Phase 2 center model (owner managing multiple teachers).

3. **Async job lifecycle** — Grading jobs follow submit → poll → complete/fail pattern. Job state in Postgres. **Idempotency key required** on POST `/grade` to prevent duplicate jobs from Apps Script network retries. **Job TTL/cleanup** strategy needed — stale jobs (started but never completed) must be garbage-collected on a schedule. **Recovery path:** if teacher closes sidebar mid-grading, re-opening should detect in-flight or completed job and resume from last state, not require re-grading.

4. **Graceful degradation with teacher-visible communication** — Every failure mode needs a human-readable state:
   - AI grading fails → "Grading couldn't complete. [Retry] or [Enter scores manually]"
   - Comment anchoring partially fails → "4 comments anchored to text, 1 added as general feedback" (explicit count, not silent degradation)
   - Score write-back fails → "Scores couldn't be saved to your Sheet. [Retry] — your scores are preserved here."
   - Backend unreachable → "Can't connect to grading service. Manual score entry is available."
   - Sheet not linked → Clear onboarding prompt, not an error state

5. **Dual data store boundary** — Google Sheet owns score data (teacher-visible, teacher-editable). Postgres owns submissions, grading sessions, jobs, entitlements. Clear contract: backend never writes to Sheet directly; Apps Script relays score JSON. **Write strategy for Sheet:** `LockService.getScriptLock()` before writes, with validation that target row/column still exists. Fail with recovery prompt on conflict.

6. **PII boundary** — Student names exist only in teacher's Sheet and backend roster. Names are stripped before any AI API call. Parent report URLs contain no PII (UUID tokens).

7. **Forward-compatible data model** — Phase 1 DB schema must accommodate Phase 2+ features (analytics aggregation, speaking submissions, assignment state, session persistence) without migration. Every table includes `teacher_id` (UUID) as indexed column from day one.

8. **Build/deploy pipeline** — Two distinct deployment targets (Apps Script via clasp, backend via Railway) with different lifecycles. Railway auto-deploys API from GitHub; Apps Script requires manual `clasp push`.

9. **Request idempotency** — POST `/grade` must accept a client-generated idempotency key. Apps Script's `UrlFetchApp` may retry on timeout, and without idempotency, duplicate grading jobs waste Gemini API budget and confuse the teacher with multiple results.

10. **Gemini API error budget** — Gemini calls will fail (rate limits, transient errors, model overload). Strategy: retry once on transient failure (5xx, timeout), then surface error to teacher with manual entry fallback. No silent retries beyond one attempt. Track failure rate for operational alerting.

11. **Unsaved work protection** — When teacher navigates between students (prev/next), any unsaved score edits must trigger a confirmation prompt: "You have unsaved changes for [Student]. Save before continuing?" Prevents data-loss anxiety during batch grading sessions.

## Starter Template Evaluation

### Primary Technology Domain

Multi-surface full-stack: Google Apps Script add-on (Preact + signals sidebar) + Fastify backend API + Railway-managed PostgreSQL. No single off-the-shelf starter covers this architecture.

### Starter Options Considered

| Option | What it covers | Gap |
|--------|---------------|-----|
| `fastify-starter-turbo-monorepo` | Fastify v5 + Kysely + Postgres + TurboRepo + pnpm | No Apps Script, no sidebar build pipeline |
| `React-Google-Apps-Script` | Apps Script + React sidebar + clasp + Vite | React (not Preact), no backend, no monorepo |
| Vite + Svelte Apps Script pattern | Vite → single HTML for Apps Script sidebar | Svelte (not Preact), no backend, no monorepo |
| Custom scaffold | Full control over structure | Must be built from scratch |

### Selected Approach: Custom TurboRepo Scaffold

**Rationale:** No existing starter covers the Apps Script + Fastify + Kysely combination. A custom scaffold is the pragmatic choice — the structure is simple enough that scaffolding overhead is minimal.

**Initialization:**

```bash
pnpm dlx create-turbo@latest ielts-toolkit --package-manager pnpm
# Then restructure into the project layout below
```

**Project Structure:**

```
ielts-toolkit/
├── apps/
│   ├── api/                        # Fastify v5 backend → Railway
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Kysely table type definitions
│   │   │   │   ├── client.ts       # Kysely instance factory
│   │   │   │   └── migrations/     # Timestamped up/down migration files
│   │   │   ├── routes/             # /health, /grade, /grade/:jobId/status, /webhooks/polar
│   │   │   ├── services/           # grading, gemini proxy, entitlements
│   │   │   ├── middleware/         # auth (ID token verify), rate limiting
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── addon/                      # Google Apps Script add-on → clasp
│       ├── src/
│       │   ├── server/             # .ts → compiled to .gs (Apps Script server-side)
│       │   │   ├── docs.ts         # Doc add-on triggers, comment insertion via Drive API
│       │   │   ├── sheets.ts       # Sheet operations, score write-back, LockService
│       │   │   ├── api.ts          # UrlFetchApp calls to backend, token refresh
│       │   │   └── __tests__/      # gas-local test entry points
│       │   └── sidebar/            # Preact + signals → Vite → single HTML
│       │       ├── components/     # Preact components (GradingPanel, ScoreEditor, etc.)
│       │       ├── state/          # Signals (grading status, scores, student context)
│       │       ├── lib/            # google.script.run promise wrapper, polling utility
│       │       ├── __mocks__/      # google.script.run mocks for local dev + tests
│       │       ├── index.tsx       # Sidebar entry point
│       │       └── index.dev.html  # Local dev harness (mocks Apps Script environment)
│       ├── vite.config.ts          # @preact/preset-vite + vite-plugin-singlefile
│       ├── .clasp.json
│       └── package.json
│
├── packages/
│   └── shared/                     # API contracts, IELTS types, error codes
│       ├── src/
│       │   ├── api.ts              # Request/response contracts (GradeRequest, GradeResult, JobStatus)
│       │   ├── errors.ts           # Error codes (GRADING_FAILED, SHEET_WRITE_FAILED, etc.)
│       │   └── ielts.ts            # BandScores, TaskType, Criteria enums, score write-back payload
│       └── package.json
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Architectural Decisions in This Scaffold:**

**Language & Runtime:**
- TypeScript throughout (strict mode)
- Node.js for backend (Railway)
- Apps Script V8 runtime for server-side add-on code — `tsconfig` must exclude DOM libs and target ES2019
- Browser runtime for sidebar (Preact, Vite-bundled)

**Query Builder & Migrations:**
- Kysely v0.28 — type-safe SQL query builder, PgBouncer-compatible (no prepared statement issues)
- `kysely-ctl` for migration CLI
- Migrations as timestamped TypeScript files with up/down functions
- DB code lives in `apps/api/src/db/` — single consumer, no separate package

**Sidebar UI:**
- Preact + `@preact/signals` (~14KB gzipped) — reactive state for 8+ UI states (polling, editable scores, unsaved work tracking, navigation confirmations)
- Vite + `@preact/preset-vite` + `vite-plugin-singlefile` → single inlined HTML file
- Target: < 100KB bundle
- `google.script.run` promise wrapper in `sidebar/lib/`

**Shared Types Boundary (`packages/shared/`):**
- `api.ts` — `GradeRequest`, `GradeResult`, `JobStatus`, `ScoreWritePayload` (consumed by both API and sidebar)
- `errors.ts` — error code enum with `retryable` flag
- `ielts.ts` — `BandScores`, `TaskType`, `Criteria`, scoring constants

**Build Tooling:**
- TurboRepo for workspace orchestration (`turbo build` respects dependency order: shared → api + addon)
- pnpm for package management
- Vite for sidebar bundle (Preact preset)
- `tsc` for API and shared packages
- clasp for Apps Script deployment
- Railway auto-deploys API from GitHub (Docker optional — Railway auto-detects Node.js)
- Sequential addon deploy: `vite build` → `clasp push` (never concurrent)

**Testing:**
- Vitest for unit tests (API business logic, shared types, Preact components via `@testing-library/preact`)
- `gas-local` for Apps Script integration tests (entry points in `server/__tests__/`)
- `clasp run` for E2E against real Google docs (PR merge only)
- Signals are synchronously reactive — no `act()` wrappers needed in component tests

**Development Experience:**
- `turbo dev` runs API dev server
- Sidebar local dev via `index.dev.html` with `__mocks__/` for `google.script.run` — no Google account needed for UI iteration
- Preact DevTools don't load in Apps Script iframe — use Vitest for state debugging

**Note:** Project initialization using this scaffold should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data validation: Zod shared schemas
- Database access: Kysely with Railway-managed Postgres + PgBouncer (transaction mode)
- Authentication: Google ID token, per-request refresh via Apps Script server-side
- API validation: fastify-type-provider-zod
- API documentation: @fastify/swagger + @fastify/swagger-ui from day one
- Hosting: Railway (API service + Postgres)

**Important Decisions (Shape Architecture):**
- Rate limiting: @fastify/rate-limit, in-memory, per teacher_id
- Sidebar styling: Google Add-ons CSS package (CDN) + minimal custom CSS for components not covered by the package
- Logging: Pino structured JSON
- Entitlement cache: in-memory Map with TTL
- CI/CD: Railway auto-deploy + GitHub Actions for quality gates

**Deferred Decisions (Post-MVP):**
- External monitoring/APM (Datadog, etc.) — Railway metrics sufficient for Phase 1
- Redis for caching — in-memory sufficient at 20-30 teacher scale

### Data Architecture

**Database:** Railway-managed PostgreSQL. One-click provisioning, `DATABASE_URL` auto-injected into linked services. Railway includes PgBouncer in **transaction mode** — connection pooling is managed, no self-hosted PgBouncer setup required.

**Query Builder:** Kysely v0.28. Type-safe SQL, PgBouncer-compatible (plain SQL, no prepared statement conflicts). Migrations via `kysely-ctl` with timestamped up/down TypeScript files. DB code lives in `apps/api/src/db/` (single consumer).

**Validation:** Zod schemas in `packages/shared/`. Single source of truth for request/response types consumed by both API (via `fastify-type-provider-zod`) and sidebar. Kysely provides DB-level type safety; Zod validates at system boundaries.

**Entitlement Cache:** In-memory `Map<string, EntitlementRecord>` with TTL. Postgres is source of truth, updated by Polar webhooks. Cache invalidated on webhook events. Railway keeps the service always-on, so cache persists across requests. At Phase 1 scale (20-30 teachers), no Redis needed. Acceptable that multiple Railway replicas (Phase 2+) each maintain independent caches — webhook updates Postgres, TTL ensures eventual consistency.

### Authentication & Security

**Teacher Authentication:** Google ID token verified on every backend request via Google Auth Library. Token acquired server-side in Apps Script via `ScriptApp.getIdentityToken()` — called fresh per-request through the `google.script.run` → `UrlFetchApp.fetch()` pipeline. The sidebar never holds a token. This eliminates token refresh logic entirely — every backend call carries a fresh token.

**Student/Parent Access:** No authentication. UUID v4 tokens in URLs. Teacher can revoke links.

**Rate Limiting:** `@fastify/rate-limit` with in-memory store, keyed by `teacher_id` extracted from verified ID token. Limits: 30 grading requests/hr, 200 non-AI requests/hr. No IP-based limits (ineffective behind school NAT).

**Secrets:** Railway variables injected at runtime (never on disk). Gemini API key, database credentials, Polar webhook secret stored as Railway service variables.

### API & Communication Patterns

**Framework:** Fastify v5 with `fastify-type-provider-zod`. Route schemas defined as Zod objects from `packages/shared/` — validation, serialization, and TypeScript types from a single definition.

**API Documentation:** `@fastify/swagger` + `@fastify/swagger-ui` from day one. OpenAPI spec auto-generated from Zod route schemas via `fastify-type-provider-zod`. Spec served at `/docs` (Swagger UI) and `/docs/json` (machine-readable). Phase 3 web app will consume the spec via `openapi-fetch` for type-safe API calls.

**Error Contract (all endpoints):**
```json
{ "error": { "code": "GRADING_FAILED", "message": "...", "retryable": true } }
```
Error codes defined in `packages/shared/src/errors.ts` with `retryable` flag. Sidebar uses this to decide whether to show [Retry] or [Enter scores manually].

**Logging:** Pino (built into Fastify), JSON structured output. Railway captures stdout automatically. Log levels: `info` in production, `debug` in development. Grading events, auth failures, and webhook processing logged at `info` level for operational visibility.

**Idempotency:** POST `/grade` accepts a client-generated idempotency key (UUID v4) in the request header. Backend checks `grading_jobs` table for existing job with same key before creating a new one. Prevents duplicate jobs from `UrlFetchApp` retries.

### Frontend Architecture (Sidebar)

**Framework:** Preact + `@preact/signals` (~14KB gzipped). Reactive state management for polling, editable scores, unsaved work tracking, and navigation confirmations.

**Styling:** Google Add-ons CSS package loaded from CDN:
```html
<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">
```
Provides native Google Workspace look-and-feel for buttons (`.action`, `.create`, `.share`), form controls (`.form-group`, `.inline`), layout (`.sidebar`, `.bottom`, `.block`), and text states (`.error`, `.gray`, `.secondary`). The CDN stylesheet loads at runtime and does NOT count against the 100KB inline bundle ceiling. Minimal custom CSS (inlined) only for components the package doesn't cover (e.g., score stepper, progress indicators). Follow the [Editor Add-on Style Guide](https://developers.google.com/workspace/add-ons/guides/editor-style) and [CSS Package Reference](https://developers.google.com/workspace/add-ons/guides/css) for all UI patterns.

**Component Design:** Write simple Preact functional components styled with Google Add-ons CSS classes (no Radix UI, no shadcn/ui, no Tailwind). ~10 components needed: button, select/dropdown, number input, accordion/collapsible, spinner/loading, alert, badge, confirmation dialog, nav controls, score card. Apply the style guide rules: one primary (blue) button per view, sentence case labels, labels above fields, bottom-left button placement in dialogs.

**State Management:** Preact signals for all sidebar state (grading status, band scores, student context, dirty tracking). Computed signals for derived state (canSave, hasUnsavedChanges). No external state library needed.

**Build:** Vite + `@preact/preset-vite` + `vite-plugin-singlefile` → single inlined HTML. Target < 100KB total bundle (Preact ~14KB + app code leaves ~86KB headroom). Google Add-ons CSS loads from CDN at runtime, not inlined.

### Infrastructure & Deployment

**Hosting:** Railway. API runs as a Railway service, Postgres as a linked Railway database. Always-on (no cold start concern). Fastify listens on `host: '::'` for Railway networking.

**Cost Model:**

| Item | Cost |
|------|------|
| Railway Hobby plan | $5/month |
| Postgres usage | ~$0.55/month |
| API service usage | ~$2-5/month (always-on, low traffic) |
| **Total infrastructure** | **~$8-11/month** |

Break-even at ~1 paid teacher ($9/month subscription).

**Deployment:**
- **API:** Railway auto-deploys from GitHub on push to `main`. Zero-config — Railway detects Node.js, builds, deploys.
- **Add-on:** Manual `clasp push` after `vite build`. Not in Railway pipeline (Apps Script is a Google-hosted runtime).
- **Quality gates:** GitHub Actions runs on PR: lint (`turbo lint`) + typecheck (`turbo typecheck`) + unit tests (`turbo test`). Deploy is Railway's job, not Actions'.

**Environment Configuration:** `@fastify/env` plugin with Zod-validated schema. Catches missing config at startup. Railway injects `DATABASE_URL` and service variables automatically. Local dev uses `.env` files (gitignored).

**Monitoring:** Railway built-in metrics (CPU, memory, request count) + log stream (Pino JSON). Add Railway uptime check on `/health` endpoint. Alert on error rate spikes. Sufficient for Phase 1.

### Decision Impact Analysis

**Implementation Sequence:**
1. Railway project setup (API service + Postgres) — validates hosting and DB connectivity
2. `packages/shared/` Zod schemas — defines API contract before either consumer is built
3. `apps/api/` Fastify skeleton with auth middleware, rate limiting, `/health`, `/docs` — validates Railway deploy pipeline and OpenAPI generation
4. `apps/addon/` sidebar build pipeline (Vite + Preact + Google Add-ons CSS → single HTML → clasp push) — validates Apps Script integration
5. Connect sidebar → API via Apps Script server-side relay — validates end-to-end auth and data flow

**Cross-Component Dependencies:**
- `packages/shared/` Zod schemas → consumed by both `apps/api/` (fastify-type-provider-zod + swagger) and `apps/addon/sidebar/` (request building, response parsing)
- Railway `DATABASE_URL` → consumed by Kysely client in `apps/api/src/db/client.ts`
- Google ID token flow → spans `apps/addon/src/server/api.ts` (token acquisition) → `apps/api/src/middleware/auth.ts` (token verification)
- Entitlement cache → spans `apps/api/src/middleware/` (check) ← `apps/api/src/routes/webhooks.ts` (invalidation)
- OpenAPI spec → generated by `apps/api/` via fastify-swagger, consumed by `apps/web/` (Phase 3) via `openapi-fetch`

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 categories — naming, structure, format, communication, and process patterns where AI agents could make incompatible choices.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural — `grading_jobs`, `teachers`, `processed_webhook_ids`
- Columns: `snake_case` — `teacher_id`, `created_at`, `result_scores`
- Foreign keys: `{referenced_table_singular}_id` — `teacher_id`, `job_id`
- Indexes: `idx_{table}_{columns}` — `idx_grading_jobs_teacher_id`
- Kysely schema types: `PascalCase` — `GradingJob`, `Teacher`

**API Naming Conventions:**
- Endpoints: `lowercase`, plural resources — `/grade`, `/grade/:jobId/status`
- Route params: `camelCase` — `:jobId`, `:studentToken`
- Query params: `camelCase` — `?taskType=task2`
- Request/response body: `camelCase` JSON — `{ bandScores, taskType, overallBand }`
- Headers: standard HTTP headers + `X-Idempotency-Key`

**Code Naming Conventions:**
- Files: `kebab-case.ts` — `grading-panel.tsx`, `auth-middleware.ts`, `band-scores.ts`
- Preact components: `PascalCase` function + `kebab-case` file — `GradingPanel` in `grading-panel.tsx`
- Functions/variables: `camelCase` — `submitGradingJob`, `bandScores`
- Constants: `UPPER_SNAKE_CASE` — `MAX_GRADING_TIMEOUT`, `CRITERIA_LIST`
- Types/interfaces: `PascalCase` — `GradeRequest`, `BandScores`
- Zod schemas: `camelCase` with `Schema` suffix — `gradeRequestSchema`, `bandScoresSchema`

### Structure Patterns

**Project Organization:**
- Tests co-located with source: `grade.ts` → `grade.test.ts` in same directory
- Exception: Apps Script server-side tests in `__tests__/` directory (gas-local requires separate entry points)
- Components organized by feature, not by type: `grading-panel.tsx`, `score-editor.tsx`, `student-nav.tsx`
- API routes: one file per endpoint group — `routes/grade.ts` (POST + GET status), `routes/health.ts`, `routes/webhooks.ts`
- Services: one file per domain concern — `services/grading.ts`, `services/entitlements.ts`, `services/teachers.ts`

**File Structure Patterns:**
- Config files at package root: `vite.config.ts`, `.clasp.json`, `tsconfig.json`
- Environment files: `.env` (gitignored), `.env.example` (committed, no secrets)
- No barrel files (`index.ts` re-exports) except `packages/shared/src/index.ts`

### Format Patterns

**API Response Formats — two shapes only:**

Success:
```json
{ "data": { ... } }
```

Error:
```json
{ "error": { "code": "GRADING_FAILED", "message": "Human-readable message", "retryable": true } }
```

No mixed shapes. Never `{ data, error }` in the same response. HTTP status codes: 200 success, 201 created, 400 bad request, 401 unauthorized, 404 not found, 429 rate limited, 500 internal error.

**Data Exchange Formats:**
- Dates: ISO 8601 strings in JSON (`2026-04-22T14:30:00Z`). Stored as `TIMESTAMPTZ` in Postgres. Never Unix timestamps in API responses.
- Nulls: Use `null` in JSON for absent values, never `undefined`. Kysely returns `null` for nullable columns — pass through as-is.
- IDs: UUID v4 for all entity IDs (`teacher_id`, `job_id`, `student_token`). Never sequential integers in API responses (prevents enumeration).
- Booleans: `true`/`false` only, never `1`/`0`.
- Band scores: numbers with 0.5 increments (0.0 to 9.0). Stored as `DECIMAL(2,1)` in Postgres, `number` in TypeScript.

### Communication Patterns

**Sidebar ↔ Apps Script Server:**
- `google.script.run` functions named with verb prefix: `getStudentRoster`, `submitGradeToSheet`, `fetchGradingStatus`
- All calls go through promise wrapper in `sidebar/lib/gas.ts` — never raw `google.script.run`

**Apps Script Server → Backend API:**
- All calls via a single `callApi(method, path, body?)` function in `server/api.ts`
- Token acquired fresh per-call inside this function via `ScriptApp.getIdentityToken()`
- Returns typed responses using `packages/shared/` types

**Sidebar State (Preact Signals):**
- One signal file per domain: `state/grading.ts`, `state/students.ts`, `state/scores.ts`
- Signals are the single source of truth — no local component state for shared data
- Computed signals for derived values (never manual recalculation)
- Actions as plain exported functions that mutate signals: `startGrading()`, `updateScore(criterion, value)`, `saveScores()`

### Process Patterns

**Error Handling Patterns:**
- API: Fastify `setErrorHandler` catches all unhandled errors → returns standard error shape. Route handlers throw typed errors (`GradingError`, `AuthError`) — never return error objects manually.
- Sidebar: every `google.script.run` call has `.withFailureHandler()` via the promise wrapper — no silent failures. Error signals displayed via a shared `<ErrorAlert>` component.
- Never swallow errors. Log at `error` level, then surface to user.

**Loading State Patterns:**
- Grading flow: explicit status signal `'idle' | 'submitting' | 'polling' | 'inserting-comments' | 'done' | 'error'`
- Score save: `'idle' | 'saving' | 'saved' | 'error'`
- Each async operation has its own status signal — no global "isLoading" boolean
- Status signals drive UI conditionals in components

**Retry Patterns:**
- Gemini API: retry once on 5xx/timeout, then surface error to teacher
- `UrlFetchApp` to backend: no retry (idempotency key handles accidental retries from Apps Script)
- Score write-back to Sheet: retry once with `LockService` re-acquisition, then surface error with "scores preserved in sidebar" messaging

**Validation Timing:**
- API: Zod validates at route entry (via fastify-type-provider-zod). Never validate inside service functions — trust the route layer.
- Sidebar: validate before calling `google.script.run` (band scores are 0-9 in 0.5 increments, student must be selected, task type must be chosen)

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly as specified — no "creative" alternatives
- Use the two standard API response shapes — no custom wrappers
- Route all sidebar-to-server calls through `gas.ts` promise wrapper — no raw `google.script.run`
- Route all server-to-backend calls through `callApi()` — no direct `UrlFetchApp.fetch()`
- Use Zod schemas from `packages/shared/` for all request/response types — no inline type definitions for API contracts
- Co-locate tests with source files (except Apps Script server tests)
- Use explicit status signals for async operations — no boolean flags

**Anti-Patterns (Never Do This):**
- `camelCase` in database columns (`resultScores` → use `result_scores`)
- Sequential integer IDs in API responses (`/grade/123` → use UUID)
- Mixed response shapes (`{ data, error }` in same response)
- Global `isLoading` boolean for multiple async operations
- Inline Zod schemas in route files instead of importing from `packages/shared/`
- Direct `google.script.run.myFunction()` without the promise wrapper
- Swallowing errors in catch blocks without logging and surfacing

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ielts-toolkit/
├── .github/
│   └── workflows/
│       └── ci.yml                          # PR quality gates: lint + typecheck + test
├── .gitignore
├── .env.example                            # Root env template (no secrets)
├── package.json                            # Root workspace config
├── pnpm-workspace.yaml                     # Workspace: apps/*, packages/*
├── turbo.json                              # Build pipeline: shared → api + addon
├── tsconfig.base.json                      # Shared TS config (strict mode)
│
├── apps/
│   ├── api/                                # Fastify v5 backend → Railway
│   │   ├── .env                            # Local dev env (gitignored)
│   │   ├── .env.example                    # DATABASE_URL, GEMINI_API_KEY, etc.
│   │   ├── package.json
│   │   ├── tsconfig.json                   # Extends ../../tsconfig.base.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                    # Fastify app bootstrap, plugin registration, listen on '::'
│   │       ├── app.ts                      # App factory (testable without listen)
│   │       ├── env.ts                      # @fastify/env Zod-validated config schema
│   │       ├── db/
│   │       │   ├── client.ts               # Kysely instance factory (reads DATABASE_URL)
│   │       │   ├── schema.ts               # Kysely table type definitions (Teachers, GradingJobs, etc.)
│   │       │   └── migrations/
│   │       │       └── 20260422-001-initial-schema.ts  # First migration: teachers, grading_jobs tables
│   │       ├── middleware/
│   │       │   ├── auth.ts                 # Google ID token verification → teacher_id extraction
│   │       │   ├── auth.test.ts
│   │       │   ├── rate-limit.ts           # @fastify/rate-limit config (per teacher_id)
│   │       │   └── rate-limit.test.ts
│   │       ├── routes/
│   │       │   ├── health.ts               # GET /health
│   │       │   ├── health.test.ts
│   │       │   ├── grade.ts                # POST /grade, GET /grade/:jobId/status
│   │       │   ├── grade.test.ts
│   │       │   ├── webhooks.ts             # POST /webhooks/polar
│   │       │   └── webhooks.test.ts
│   │       ├── services/
│   │       │   ├── grading.ts              # Gemini API proxy, prompt construction, response parsing
│   │       │   ├── grading.test.ts
│   │       │   ├── entitlements.ts         # In-memory cache + Polar webhook processing
│   │       │   ├── entitlements.test.ts
│   │       │   ├── teachers.ts             # Teacher upsert from ID token claims
│   │       │   └── teachers.test.ts
│   │       └── plugins/
│   │           ├── swagger.ts              # @fastify/swagger + @fastify/swagger-ui registration
│   │           └── cors.ts                 # @fastify/cors (for future web app)
│   │
│   └── addon/                              # Google Apps Script add-on → clasp
│       ├── .clasp.json                     # Script ID, root dir pointing to dist/
│       ├── .claspignore                    # Ignore src/, node_modules/, etc.
│       ├── package.json
│       ├── tsconfig.json                   # Extends ../../tsconfig.base.json
│       ├── tsconfig.server.json            # Server-specific: target ES2019, no DOM libs
│       ├── vite.config.ts                  # @preact/preset-vite + vite-plugin-singlefile
│       ├── appsscript.json                 # Apps Script manifest (scopes, triggers)
│       ├── src/
│       │   ├── server/                     # .ts → compiled to .gs for Apps Script runtime
│       │   │   ├── main.ts                 # onOpen trigger, menu registration, showSidebar
│       │   │   ├── docs.ts                 # Doc-specific: getText, Drive API comment insertion
│       │   │   ├── sheets.ts               # Sheet-specific: roster read, score write-back, LockService
│       │   │   ├── api.ts                  # callApi(method, path, body?) — token + UrlFetchApp
│       │   │   └── __tests__/
│       │   │       ├── docs.test.ts        # gas-local tests for Doc operations
│       │   │       ├── sheets.test.ts      # gas-local tests for Sheet operations
│       │   │       └── api.test.ts         # gas-local tests for backend calls
│       │   └── sidebar/                    # Preact + signals → Vite → single HTML
│       │       ├── index.tsx               # Preact render entry point
│       │       ├── index.html              # HTML shell (Vite entry)
│       │       ├── index.dev.html          # Local dev harness with google.script.run mocks
│       │       ├── styles.css              # Custom CSS for components not covered by Google Add-ons CSS
│       │       ├── components/
│       │       │   ├── grading-panel.tsx    # Main grading flow: grade button, spinner, results
│       │       │   ├── grading-panel.test.tsx
│       │       │   ├── score-editor.tsx     # Band score display + inline editing (5 criteria)
│       │       │   ├── score-editor.test.tsx
│       │       │   ├── student-nav.tsx      # Student picker dropdown + prev/next controls
│       │       │   ├── student-nav.test.tsx
│       │       │   ├── feedback-summary.tsx # Collapsible AI feedback list
│       │       │   ├── setup-sheet.tsx      # First-run: create/link Sheet, import student names
│       │       │   ├── error-alert.tsx      # Shared error display with retry/fallback actions
│       │       │   └── confirm-dialog.tsx   # Unsaved work confirmation, save confirmation
│       │       ├── state/
│       │       │   ├── grading.ts           # Grading status signal, AI results, comment status
│       │       │   ├── students.ts          # Student roster signal, current student, navigation
│       │       │   ├── scores.ts            # Band score signals, dirty tracking, save status
│       │       │   └── sheet.ts             # Linked Sheet state, setup status
│       │       ├── lib/
│       │       │   ├── gas.ts               # google.script.run promise wrapper
│       │       │   ├── gas.test.ts
│       │       │   ├── polling.ts           # Generic polling utility (used for grading status)
│       │       │   └── polling.test.ts
│       │       └── __mocks__/
│       │           └── gas-mock.ts          # Mock google.script.run for local dev + tests
│       └── dist/                            # Build output (gitignored) — clasp pushes from here
│           ├── sidebar.html                 # Vite singlefile output
│           ├── main.gs                      # Compiled server-side code
│           └── appsscript.json              # Copied manifest
│
├── packages/
│   └── shared/                             # API contracts, IELTS types, error codes
│       ├── package.json
│       ├── tsconfig.json                   # Extends ../../tsconfig.base.json
│       └── src/
│           ├── index.ts                    # Barrel export (only barrel file in project)
│           ├── api.ts                      # GradeRequest, GradeResult, JobStatus, ScoreWritePayload
│           ├── errors.ts                   # ErrorCode enum, AppError type, retryable flag
│           └── ielts.ts                    # BandScores, TaskType, Criteria, BAND_RANGE, CRITERIA_LIST
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Enforced by | Rule |
|----------|------------|------|
| External → API | Fastify route layer | All requests pass through auth middleware + Zod validation before reaching services |
| API → Database | Kysely in `src/db/` | Only `services/*.ts` import from `db/`. Routes never query DB directly |
| API → Gemini | `services/grading.ts` | Single point of contact for Gemini API. PII stripping happens here |
| API → External webhooks | `routes/webhooks.ts` | Idempotent handler, updates Postgres, invalidates entitlement cache |

**Component Boundaries (Sidebar):**

| Boundary | Rule |
|----------|------|
| Components → State | Components read signals and call action functions. Never mutate signals directly inside components |
| Components → Apps Script | All calls go through `lib/gas.ts` promise wrapper. Components never reference `google.script.run` |
| State → API | State action functions call `gas.ts` which calls Apps Script server, which calls `callApi()`. Three-layer chain, each with typed contracts |

**Data Boundaries:**

| Data Store | Owns | Accessed by |
|-----------|------|------------|
| Google Sheet | Student roster, band scores, score history | Apps Script server-side only (`sheets.ts`) |
| Railway Postgres | Teachers, grading jobs, entitlements, processed webhooks | API services only (via Kysely) |
| Gemini API | N/A (stateless) | `services/grading.ts` only |
| In-memory cache | Entitlement records (TTL) | `services/entitlements.ts` only |

### Requirements to Structure Mapping

**FR Category → Directory Mapping:**

| FR Category | FRs | Primary Location | Supporting |
|-------------|-----|-----------------|------------|
| Onboarding & Setup | FR1-8 | `addon/src/sidebar/components/setup-sheet.tsx` | `addon/src/server/sheets.ts`, `state/sheet.ts` |
| Sidebar Experience | FR9-13 | `addon/src/sidebar/components/student-nav.tsx` | `state/students.ts` |
| AI Essay Grading | FR14-25 | `addon/src/sidebar/components/grading-panel.tsx` | `api/src/routes/grade.ts`, `api/src/services/grading.ts`, `state/grading.ts`, `addon/src/server/docs.ts` |
| Manual Score Entry | FR26-27 | `addon/src/sidebar/components/score-editor.tsx` | `state/scores.ts` |
| Score Tracking | FR28-31 | `addon/src/server/sheets.ts` | `state/scores.ts`, `addon/src/sidebar/components/score-editor.tsx` |
| Error Handling | FR32-34 | `addon/src/sidebar/components/error-alert.tsx` | `packages/shared/src/errors.ts` |
| System & Security | FR35-38 | `api/src/middleware/auth.ts`, `api/src/middleware/rate-limit.ts` | `api/src/services/entitlements.ts` |

**Cross-Cutting Concerns → Location:**

| Concern | Files |
|---------|-------|
| Authentication | `addon/src/server/api.ts` (token acquisition) → `api/src/middleware/auth.ts` (verification) → `api/src/services/teachers.ts` (upsert) |
| Tenant isolation | `api/src/middleware/auth.ts` (extracts teacher_id) → every service query includes `teacher_id` WHERE clause |
| Async grading lifecycle | `sidebar/state/grading.ts` → `sidebar/lib/gas.ts` → `server/api.ts` → `api/routes/grade.ts` → `api/services/grading.ts` |
| Error propagation | `packages/shared/src/errors.ts` (codes) → `api/setErrorHandler` (formatting) → `server/api.ts` (relay) → `sidebar/components/error-alert.tsx` (display) |
| Score data flow | `sidebar/components/score-editor.tsx` → `sidebar/state/scores.ts` → `sidebar/lib/gas.ts` → `server/sheets.ts` → Google Sheet |

### Integration Points

**Internal Communication:**

```
Sidebar (Preact)
    ↕ google.script.run (via gas.ts wrapper)
Apps Script Server (.gs)
    ↕ UrlFetchApp (via callApi() with fresh ID token)
Fastify API
    ↕ Kysely queries
Railway Postgres
```

```
Fastify API
    → Gemini API (services/grading.ts, outbound only)
    ← Polar webhooks (routes/webhooks.ts, inbound only)
```

**External Integrations:**

| Integration | Direction | File | Auth |
|------------|-----------|------|------|
| Google Docs (DocumentApp + Drive API) | Read/write from Apps Script | `addon/src/server/docs.ts` | Current user's Google session |
| Google Sheets (SpreadsheetApp) | Read/write from Apps Script | `addon/src/server/sheets.ts` | Current user's Google session |
| Google AI Studio (Gemini) | Outbound from API | `api/src/services/grading.ts` | API key (Railway variable) |
| Polar.sh | Inbound webhooks to API | `api/src/routes/webhooks.ts` | Webhook signature verification |

**Data Flow — Grading (end-to-end):**

```
1. Teacher clicks "Grade with AI" in sidebar
2. grading-panel.tsx → startGrading() in state/grading.ts
3. state/grading.ts → gas.ts → google.script.run.submitGrade(params)
4. server/api.ts → callApi('POST', '/grade', { essay, taskType, idempotencyKey })
5. api/routes/grade.ts → validates via Zod → services/grading.ts
6. services/grading.ts → strips PII → calls Gemini → stores job in Postgres
7. Returns { data: { jobId } } → sidebar begins polling
8. sidebar polls via gas.ts → server/api.ts → GET /grade/:jobId/status
9. On completion: sidebar receives scores + comments
10. grading-panel.tsx displays results, score-editor.tsx enables editing
11. Teacher clicks "Save to Sheet"
12. state/scores.ts → gas.ts → google.script.run.submitGradeToSheet(scores)
13. server/sheets.ts → LockService → writes to correct row/column in Sheet
```

### Development Workflow Integration

**Local Development:**
- `turbo dev` → starts Fastify API with hot reload (watches `apps/api/src/`)
- `apps/addon/src/sidebar/index.dev.html` → open in browser for sidebar UI development (mocks `google.script.run`)
- `.env` files in each app (gitignored), `.env.example` committed

**Build Process:**
- `turbo build` → builds `packages/shared/` first, then `apps/api/` and `apps/addon/` in parallel
- `apps/addon/` build: `tsc` compiles `server/*.ts` → `dist/*.gs`, Vite builds `sidebar/` → `dist/sidebar.html`
- `apps/api/` build: `tsc` compiles to `dist/`

**Deployment:**
- API: push to `main` → Railway auto-detects, builds, deploys
- Add-on: `cd apps/addon && pnpm build && clasp push` (manual, from `dist/`)
- Quality gates: GitHub Actions on PR → `turbo lint && turbo typecheck && turbo test`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are compatible. Fastify v5 + Kysely + Zod + fastify-type-provider-zod form a cohesive TypeScript API stack. Preact + signals + Google Add-ons CSS + Vite singlefile is a proven combination for lightweight UIs that feel native in Google Workspace. Railway Postgres works with Kysely's `PostgresDialect` via standard `DATABASE_URL`.

**Pattern Consistency:** Naming conventions are consistent across layers. DB uses `snake_case`, API JSON uses `camelCase`, TypeScript code uses `camelCase` — standard convention with Kysely's `CamelCasePlugin` handling the mapping. Implementation patterns (error handling, loading states, validation timing) align with the chosen technologies.

**Structure Alignment:** Project structure directly supports all architectural decisions. Every FR maps to specific files. Boundaries between data stores (Sheet vs. Postgres), between runtimes (Apps Script vs. Node.js), and between surfaces (sidebar vs. API) are clearly defined.

**Resolution — Kysely column mapping:** Use Kysely `CamelCasePlugin` in `apps/api/src/db/client.ts` so TypeScript code works with `camelCase` properties (`teacherId`, `createdAt`) while the database retains `snake_case` columns (`teacher_id`, `created_at`). This eliminates manual mapping in every query. Wire this up before writing any query code.

### Requirements Coverage Validation ✅

**Phase 1 FR Coverage (FR1-38):** All 38 Phase 1 functional requirements are architecturally supported with specific file mappings. The async grading pipeline (FR14-25) has the most complex multi-component flow, documented end-to-end in the data flow diagram.

**Phase 2-5 FR Coverage (FR39-64):** Forward-compatible schema design, entitlement cache architecture, and reserved `apps/web/` slot ensure future phases are supported without architectural rework. OpenAPI spec from day one enables `openapi-fetch` for the Phase 3 web app.

**NFR Coverage:** All performance targets (AI grading < 30s, score write-back < 5s, sidebar load < 3s), security requirements (tenant isolation, PII stripping, rate limiting), and reliability targets (graceful degradation with teacher-visible messaging) are architecturally addressed.

**Learning Infrastructure:**

FR37 specifies: "System logs grading events (AI scores, teacher adjustments, comment actions) for future analytics and model improvement from Phase 1." The following additions ensure this is architecturally concrete:

**`grading_events` table** — added to Phase 1 schema in `apps/api/src/db/migrations/`. Captures:
- `teacher_id`, `job_id`, `event_type`, `payload`, `created_at`
- Event types: `ai_score_generated`, `score_overridden` (with before/after values), `comment_deleted`, `comment_edited`, `comment_kept`, `manual_entry`
- This is the correction feedback loop that powers the data moat. Every teacher adjustment is a training signal.

**Usage telemetry** — lightweight counters in the `teachers` table or a separate `teacher_activity` table:
- `last_grading_at`, `gradings_this_week`, `gradings_this_month`
- Enables retention diagnostics: return rate within 7 days, grading frequency trends, free tier ceiling proximity

**In-product feedback** — after grading, sidebar shows optional one-tap: "Was this grading helpful? 👍 / 👎" with optional freeform text. Stored as a `grading_events` entry with `event_type: 'feedback'`. Minimal UI footprint, maximum signal value from the 20-30 beta teachers.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions are documented with specific technology choices. No ambiguous "TBD" items remain for Phase 1.

**Structure Completeness:** Complete file-level project tree with every source file, test file, and config file specified. AI agents can create the exact directory structure without interpretation.

**Pattern Completeness:** Naming conventions, structure patterns, format patterns, communication patterns, and process patterns are all specified with concrete examples and anti-patterns.

**Day-1 Setup Requirements:**

**`.env.example` for `apps/api/`:**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/ielts_toolkit
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-gcp-oauth-client-id
POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
```

**Migration CLI on Railway:** Add `kysely-ctl migrate` as a Railway release command. Railway runs release commands after build, before the new version receives traffic. Add `kysely-ctl` to `apps/api/package.json` devDependencies and configure `.kyselyrc.ts` at `apps/api/` root.

**CamelCasePlugin setup** in `apps/api/src/db/client.ts`:
```typescript
import { Kysely, PostgresDialect, CamelCasePlugin } from 'kysely'
const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
  plugins: [new CamelCasePlugin()],
})
```

**clasp setup workflow** for Apps Script newcomers:
1. `npm install -g @google/clasp`
2. `clasp login` (opens browser for Google OAuth)
3. `clasp create --type standalone --rootDir apps/addon/dist` (or link existing script ID in `.clasp.json`)
4. After every build: `cd apps/addon && pnpm build && clasp push`
5. For testing in a real Doc: install the add-on via direct script URL (skip Marketplace for Phase 1)

### Gap Analysis Results

| Gap | Priority | Resolution |
|-----|----------|------------|
| Kysely `CamelCasePlugin` not specified | Minor → Resolved | Added to `db/client.ts` setup. Wire up before any query code |
| `.env.example` missing | Minor → Resolved | Added with all required Railway + Google + Polar variable names |
| Migration CLI on Railway | Minor → Resolved | `kysely-ctl migrate` as Railway release command |
| clasp setup workflow | Minor → Resolved | Step-by-step for Apps Script newcomers |
| Correction feedback loop | Important → Resolved | `grading_events` table captures score overrides, comment actions |
| Usage/retention telemetry | Important → Resolved | Activity counters for retention diagnostics |
| In-product feedback | Important → Resolved | Post-grading thumbs up/down + freeform, stored as grading event |
| FR63 (CSV export) file location | Minor | Lives in `addon/src/server/sheets.ts`. Phase 2 feature |
| CORS origins | Minor | Not needed Phase 1. Configure when `apps/web/` is added |
| Gemini prompt templates | Minor | Add `services/prompts.ts` for band descriptors and task type templates |

No critical or blocking gaps remain.

### TurboRepo Tradeoff Acknowledgment

TurboRepo adds setup overhead for a solo developer. The tradeoff:

**Cost:** Non-trivial setup (workspace config, package linking, build pipeline). More complex than a flat repo for 1 developer.

**Benefit:** `packages/shared/` Zod schemas consumed by both API and sidebar enforce a single source of truth for the API contract. Without the monorepo, these types would be duplicated or manually synced — a drift risk. Additionally, AI agent-assisted development benefits from clear workspace boundaries: agents can work on `apps/api/` and `apps/addon/` independently without stepping on each other.

**Decision stands:** TurboRepo stays. The shared types boundary justifies the overhead, and the architecture is designed for AI agent implementation where clear structure accelerates rather than slows work. If setup overhead proves problematic in practice, simplification is always available.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (64 FRs, 5 phases, 6 user journeys)
- [x] Scale and complexity assessed (medium, 20-30 teachers Phase 1)
- [x] Technical constraints identified (12 constraints with rationale)
- [x] Cross-cutting concerns mapped (11 concerns with implementation detail)
- [x] Market context with architectural implications captured

**✅ Architectural Decisions**
- [x] Critical decisions documented (Railway, Kysely, Preact, Zod, Fastify)
- [x] Technology stack fully specified with versions
- [x] Integration patterns defined (async grading, token auth, webhook processing)
- [x] Performance considerations addressed (latency targets, caching, always-on hosting)
- [x] OpenAPI documentation from day one

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, API, code)
- [x] Structure patterns defined (co-located tests, feature-based components)
- [x] Communication patterns specified (gas.ts wrapper, callApi, signals)
- [x] Process patterns documented (error handling, loading states, retry, validation)
- [x] Enforcement guidelines and anti-patterns listed

**✅ Project Structure**
- [x] Complete directory structure with all files defined
- [x] Component boundaries established (API, sidebar, Apps Script, data stores)
- [x] Integration points mapped (end-to-end data flows)
- [x] Requirements to structure mapping complete (every FR category → specific files)

**✅ Learning Infrastructure**
- [x] Correction feedback loop (grading_events table) from Phase 1
- [x] Usage/retention telemetry designed
- [x] In-product feedback mechanism specified

**✅ Day-1 Readiness**
- [x] `.env.example` with all required variables
- [x] Migration CLI + Railway release command
- [x] CamelCasePlugin setup code
- [x] clasp setup workflow for Apps Script newcomers

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all Phase 1 requirements have clear architectural support, all validation gaps resolved, learning infrastructure added, and day-1 developer setup documented.

**Key Strengths:**
- Three-surface architecture cleanly separated with single backend
- Sheet-as-database eliminates data migration friction for teachers
- Async grading pipeline with idempotency handles all failure modes
- Forward-compatible schema supports Phases 2-5 without rework
- Railway hosting at ~$8-11/month — break-even at 1 paid teacher
- Learning infrastructure (correction capture, telemetry, feedback) from day one builds the data moat from the earliest cohort

**Areas for Future Enhancement:**
- Redis for entitlement cache when Railway scales to multiple replicas (Phase 2+)
- Formal OpenAPI client generation via `openapi-fetch` (Phase 3 web app)
- CORS configuration when web app is added
- Gemini prompt management may warrant its own module as task types expand
- Consider simplifying monorepo if setup overhead proves problematic in practice

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt, check the anti-patterns list before making a choice

**First Implementation Priority:**
1. Initialize TurboRepo scaffold: `pnpm dlx create-turbo@latest ielts-toolkit --package-manager pnpm`
2. Restructure into documented project layout
3. Set up Railway project (API service + Postgres)
4. Create `.env.example` and `@fastify/env` schema
5. Wire up Kysely client with `CamelCasePlugin` + first migration (`teachers`, `grading_jobs`, `grading_events`)
6. Implement `packages/shared/` Zod schemas
7. Deploy Fastify skeleton with `/health` + `/docs` to Railway
8. Set up clasp + build pipeline for addon
9. Connect sidebar → API end-to-end
