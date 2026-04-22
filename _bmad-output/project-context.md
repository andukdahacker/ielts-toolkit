---
project_name: 'ielts-toolkit'
user_name: 'Duc'
date: '2026-04-22'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style', 'development_workflow', 'critical_rules']
status: 'complete'
rule_count: 120
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Monorepo:** TurboRepo + pnpm workspaces. Three packages: `apps/api/`, `apps/addon/`, `packages/shared/`.

### Backend — `apps/api/` (Fastify → Railway)

- **Runtime:** Node.js >= 20 (required for native `fetch`)
- **Framework:** Fastify v5 + `@fastify/type-provider-zod` (scoped package — NOT the unscoped v4 `fastify-type-provider-zod`)
- **Database:** Kysely v0.28 + `CamelCasePlugin` + `pg` driver (NOT `postgres`/`postgres.js`)
- **Migrations:** `kysely-ctl` with timestamped up/down TypeScript files — do not use `db-migrate` or raw SQL
- **Validation:** Zod — schemas live in `packages/shared/`, imported by both API and sidebar
- **Plugins:** `@fastify/env` (Zod-validated config), `@fastify/rate-limit`, `@fastify/cors`, `@fastify/swagger` + `@fastify/swagger-ui`
- **Logging:** Pino (built into Fastify), structured JSON
- **AI:** Google Gemini via `@google/generative-ai` SDK (NOT `@google-cloud/vertexai`)
- Constraint: Railway PgBouncer runs in **transaction mode** — no prepared statements, no `SET LOCAL`, no advisory locks. Kysely plain SQL is compatible; do not use prepared statement patterns.

### Google Apps Script Add-on — `apps/addon/`

**Server-side** (`src/server/*.ts` → compiled to `.gs`):
- **Runtime:** Apps Script V8 — this is NOT Node.js. No `require()`, no npm, no file system, no native `fetch`
- **Types:** `@types/google-apps-script` required for `UrlFetchApp`, `SpreadsheetApp`, `DocumentApp`, etc.
- **tsconfig:** Target ES2019, exclude DOM libs
- Constraint: `import.meta` is unavailable at runtime. Vite replaces `import.meta.env` at build time — this is fine. Never reference `import.meta` in server-side code.

**Sidebar UI** (`src/sidebar/` → Vite → single HTML):
- **Framework:** Preact + `@preact/signals`
- **Styling:** Google Add-ons CSS package via `<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">` (CDN, loaded at runtime, not inlined). Key classes: `.action`/`.create`/`.share` (buttons), `.form-group`/`.inline` (forms), `.sidebar`/`.bottom`/`.block` (layout), `.error`/`.gray`/`.secondary` (text). Minimal custom CSS for components not covered (score stepper, progress indicators). Follow the [Editor Add-on Style Guide](https://developers.google.com/workspace/add-ons/guides/editor-style) and [CSS Package Reference](https://developers.google.com/workspace/add-ons/guides/css). No Tailwind CSS, no shadcn/ui.
- **Build:** Vite + `@preact/preset-vite` + `vite-plugin-singlefile` — pin both to exact versions, not ranges
- Constraint: Output is a **single self-contained HTML file**, target under 100KB uncompressed (Preact ~14KB + app code). Google Add-ons CSS loads from CDN at runtime — does not count against bundle ceiling.
- Constraint: 300px sidebar width — vertical-stack UI, compact layouts only
- No Tailwind CSS, no shadcn/ui, no Radix UI — use Google Add-ons CSS classes for native Workspace look-and-feel

### Shared Types — `packages/shared/`

- Zod schemas + TypeScript types for API contracts, IELTS types, error codes
- Only barrel file (`index.ts`) in the entire project — all other packages use direct imports
- Consumed by `apps/api/` via workspace dependency, by sidebar via Vite bundle
- Consumption by GAS server-side: **open question** — resolve in first implementation story (clasp bundle path vs. inline types)

### Build & Deploy

- **Build order:** `turbo build` → `packages/shared/` first, then `apps/api/` + `apps/addon/` in parallel
- **Addon build:** Vite first → clasp push second. **Never run concurrent watchers** — known race condition
- **API deploy:** Railway auto-deploys from GitHub on push to `main`
- **Addon deploy:** Manual `cd apps/addon && pnpm build && clasp push`
- **Quality gates:** GitHub Actions on PR → `turbo lint && turbo typecheck && turbo test`
- **Testing:** Vitest (unit + component via `@testing-library/preact`), `gas-local` for Apps Script server tests
- `gas-local` mock boundary: **open question** — define what crosses the mock boundary before writing integration tests

### Version Pinning Policy

Exact versions are pinned in `package.json` during the first implementation story, not in this document. This section documents minimum floors and library choices only. The committed lockfile (`pnpm-lock.yaml`) is the version source of truth.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

**Configuration:**
- Strict mode enabled throughout (`tsconfig.base.json` with `strict: true`)
- Three distinct tsconfig targets: Node.js (API), ES2019 without DOM libs (GAS server), Browser (sidebar)
- `packages/shared/` must compile cleanly for all three targets

**Import/Export Patterns:**
- No barrel files except `packages/shared/src/index.ts` — the only barrel in the project
- Direct imports everywhere else: `import { gradeRequestSchema } from '@ielts-toolkit/shared'`
- GAS server-side: no ES module imports at runtime (compiled to `.gs`)

**Naming Conventions:**
- Files: `kebab-case.ts` — `grading-panel.tsx`, `auth-middleware.ts`
- Functions/variables: `camelCase` — `submitGradingJob`, `bandScores`
- Constants: `UPPER_SNAKE_CASE` — `MAX_GRADING_TIMEOUT`, `CRITERIA_LIST`
- Types/interfaces: `PascalCase` — `GradeRequest`, `BandScores`
- Zod schemas: `camelCase` + `Schema` suffix — `gradeRequestSchema`, `bandScoresSchema`
- Preact components: `PascalCase` function in `kebab-case` file — `GradingPanel` in `grading-panel.tsx`
- Database tables: `snake_case`, plural — `grading_jobs`, `teachers`
- Database columns: `snake_case` — `teacher_id`, `created_at` (Kysely `CamelCasePlugin` maps to `camelCase` in TypeScript)
- API endpoints: lowercase, plural resources — `/grade`, `/grade/:jobId/status`
- Request/response body: `camelCase` JSON — `{ bandScores, taskType, overallBand }`

**Error Handling:**
- API: Fastify `setErrorHandler` catches all → standard error shape. Route handlers throw typed errors (`GradingError`, `AuthError`) — never return error objects manually
- Sidebar: every `google.script.run` call has `.withFailureHandler()` via the promise wrapper — no silent failures
- Never swallow errors. Log at `error` level, then surface to user

**Data Type Conventions:**
- Dates: ISO 8601 strings in JSON (`2026-04-22T14:30:00Z`), `TIMESTAMPTZ` in Postgres. Never Unix timestamps in API responses
- Nulls: `null` in JSON for absent values, never `undefined`. Kysely returns `null` for nullable columns — pass through as-is
- IDs: UUID v4 for all entity IDs. Never sequential integers in API responses (prevents enumeration)
- Band scores: numbers with 0.5 increments (0.0–9.0), stored as `DECIMAL(2,1)` in Postgres, `number` in TypeScript
- Shared package import alias: `@ielts-toolkit/shared` — this is the workspace package name used in all imports

### Framework-Specific Rules

#### Fastify API Patterns

**App Structure:**
- App factory pattern: `app.ts` creates the Fastify instance (testable without `listen`), `index.ts` bootstraps and listens on `host: '::'`
- Plugin registration order matters: `@fastify/env` → `@fastify/type-provider-zod` → auth middleware → rate limiting → routes. Type provider MUST register before routes.
- Global `setErrorHandler` lives in `app.ts` — single exit point for all errors. No route or service throws HTTP errors directly — they throw typed domain errors that the handler maps.

**Route Handler Rules:**
- Route handlers contain **no conditional business logic** — they call a service method and map the result to a response
- Route schemas defined as Zod objects from `packages/shared/` — validation, serialization, and types from a single definition
- Validation happens at route entry via `fastify-type-provider-zod`. Never re-validate inside service functions — trust the route layer
- Routes never import from `db/` — only `services/*.ts` access the database
- One file per endpoint group: `routes/grade.ts`, `routes/health.ts`, `routes/webhooks.ts`

**Service Layer Rules:**
- One file per domain concern: `services/grading.ts`, `services/entitlements.ts`, `services/teachers.ts`
- Services receive dependencies via constructor/factory injection — no service instantiates another directly
- Idempotency key resolution happens in the service layer, not the route handler
- Service-level guard clauses for domain invariants are allowed (e.g., checking entitlement limits) — these are NOT Zod re-validation, they are business logic assertions

**Tenant Isolation (CRITICAL):**
- **All Kysely queries MUST include a `teacher_id` WHERE clause.** This is the most critical invariant in the entire system — violation causes a data breach.
- Access DB through a tenant-scoped query pattern that requires `teacher_id` as a mandatory parameter. Direct table queries without tenant scoping are prohibited.

**API Response Contract — two shapes only, never mixed:**
```
Success: { "data": { ... } }
Error:   { "error": { "code": "GRADING_FAILED", "message": "...", "retryable": true } }
```
- Never `{ data, error }` in the same response
- Error codes defined in `packages/shared/src/errors.ts` with `retryable` flag
- `retryable: true` ONLY for transient infrastructure errors (5xx, timeout, rate limit) — never for validation or business rule failures
- HTTP status codes: 200 success, 201 created, 400 bad request, 401 unauthorized, 404 not found, 429 rate limited, 500 internal error

#### Preact Sidebar Patterns

**State Management (Signals):**
- Signals are the single source of truth — no local component state for shared data
- One signal file per domain: `state/grading.ts`, `state/students.ts`, `state/scores.ts`, `state/sheet.ts`
- Computed signals for ALL derived values (`canSave`, `hasUnsavedChanges`) — never compute inline in JSX from multiple signals
- Actions as plain exported functions that mutate signals: `startGrading()`, `updateScore(criterion, value)`, `saveScores()`
- Signal initialization: use typed defaults (`signal<GradingStatus>('idle')`, `signal<Student[]>([])`) — never `undefined`
- Components only import signals from their own domain file; cross-domain state is passed as props or exposed via a designated cross-cutting signals file
- Side effects (API calls, GAS calls) are initiated in signal action functions or dedicated effect modules — never inside component render bodies
- `effect()` calls live in signal domain files, not in components

**Async Operation Status — explicit typed signals, no boolean flags:**
- Grading: `'idle' | 'submitting' | 'polling' | 'inserting-comments' | 'done' | 'error'`
- Score save: `'idle' | 'saving' | 'saved' | 'error'`
- Each async operation has its own status signal — `isLoading`, `isSubmitting` booleans are prohibited
- Signals are synchronously reactive — no `act()` wrappers needed in component tests

**Component Organization:**
- Components organized by feature: `grading-panel.tsx`, `score-editor.tsx`, `student-nav.tsx`, `error-alert.tsx`, `confirm-dialog.tsx`
- Co-located tests: `grading-panel.test.tsx` next to `grading-panel.tsx`

**Grading Session UX Constraints:**
- During AI grading poll (10-30s), show incremental progress text (e.g., "Analyzing coherence..."), not a bare spinner. Include elapsed time or estimate.
- If polling exceeds 45s, surface a soft warning — don't silently fail
- Sidebar must remain scrollable during AI wait — never lock the UI
- Unsaved score edits trigger confirmation on student navigation (prev/next): "You have unsaved changes. Save before continuing?"
- Score editor: use stepper controls (+/- buttons, 0.5 increments) — not free-text inputs, not dropdowns
- Save confirmation: brief inline feedback ("Saved to Sheet") that auto-dismisses after 2-3s — not a modal, not a toast requiring dismissal
- Always display student progress context: "Student 8 of 23"
- Preserve scores in signals on any API error — teacher must never re-enter scores after a failed save
- Error messages must be teacher-readable and actionable: "Couldn't save scores to Sheet — click to retry" not "HTTP 503"

#### Apps Script Communication Chain

**Three-layer chain — never skip layers:**
```
Sidebar (Preact) → lib/gas.ts → google.script.run → GAS server (.gs) → callApi() → Fastify API
```

**`gas.ts` Promise Wrapper (`sidebar/lib/gas.ts`):**
- Wraps `google.script.run` in Promises — all calls return `Promise<T>`
- Rejects the promise on `withFailureHandler` — failed calls throw, never resolve with error objects
- Never call raw `google.script.run` from components or signal files — always go through `gas.ts`
- `google.script.run` function names use verb prefix: `getStudentRoster`, `submitGradeToSheet`, `fetchGradingStatus`

**`callApi()` Function (`server/api.ts`):**
- Exclusive HTTP client in GAS server code — direct `UrlFetchApp.fetch()` outside `callApi()` is prohibited
- Acquires fresh token per-call via `ScriptApp.getIdentityToken()` — sidebar never holds a token
- Token audience must match the API's expected audience for verification
- Base URL injected via `PropertiesService.getScriptProperties()` — never hardcoded
- No retry logic in `callApi()` — `UrlFetchApp` has its own timeout (30s), and idempotency keys handle accidental GAS-level retries

**Error Propagation Across the Chain:**
- Each layer catches errors from the layer below, transforms to domain error type, and re-throws upward
- Raw errors (HTTP status codes, GAS exceptions) never cross layer boundaries
- API returns `{ error: { code, message, retryable } }` → `callApi()` parses and throws typed error → `gas.ts` rejects promise → signal action function catches and sets error status signal → component renders `<ErrorAlert>`

### Testing Rules

**Test Organization:**
- Co-located tests: `grade.ts` → `grade.test.ts` in same directory
- Exception: Apps Script server-side tests in `__tests__/` directory (`gas-local` requires separate entry points)
- Test runner: Vitest for all unit and component tests
- Component tests: `@testing-library/preact`
- `sidebar/__mocks__/gas-mock.ts` provides `google.script.run` mock for local dev + tests

**API Tests:**
- Use the app factory (`app.ts`) to create a test Fastify instance — no network, no `listen()`
- Test route validation: Zod rejects bad input with correct error shape
- Test service business logic: auth middleware (valid/invalid/missing tokens), grading service, entitlement checks
- Test error handler: all thrown domain errors produce the standard `{ error: { code, message, retryable } }` shape
- Test tenant isolation: every query path must include `teacher_id` — test that Teacher A cannot access Teacher B's data

**Sidebar Tests:**
- Render components with `@testing-library/preact`, assert signal-driven state changes
- No `act()` wrappers needed — Preact signals are synchronously reactive
- Test each status signal state: idle, submitting, polling, done, error — verify correct UI for each
- Test signal action functions independently (unit tests on `state/*.ts` files)
- Mock `gas.ts` (the promise wrapper) in component tests — never mock `google.script.run` directly

**GAS Server Tests:**
- `gas-local` for testing `.gs` entry points with mocked Google APIs
- Test `callApi()`: token injection, error parsing, base URL resolution
- Test `sheets.ts`: write operations with LockService mocking

**Test Boundaries:**
- Unit tests mock the layer directly below only — route tests mock services, service tests mock DB/external APIs
- Never mock Zod schemas — use real validation in tests
- Never mock Kysely query building — mock the database connection/results instead

### Code Quality & Style Rules

**File & Folder Structure:**
- Config files at package root: `vite.config.ts`, `.clasp.json`, `tsconfig.json`
- Environment files: `.env` (gitignored), `.env.example` (committed, no secrets)
- No barrel files except `packages/shared/src/index.ts`
- Components organized by feature, not by type

**TypeScript Discipline:**
- Strict mode — no `any`, no `@ts-ignore` without explicit justification comment
- Prefer `async/await` over raw Promise chains
- Prefer named exports over default exports
- No JSDoc on every function — only add comments where logic is non-obvious
- Architecture decisions documented in `architecture.md`, not in code comments

**Dependency Rules:**
- All Zod schemas for API contracts live in `packages/shared/` — no inline schema definitions in route files
- No Radix UI, no headless UI libraries, no Tailwind CSS, no shadcn/ui — write Preact functional components styled with Google Add-ons CSS classes
- No ORM beyond Kysely — no Prisma, no TypeORM, no Drizzle
- No Express patterns — this is Fastify (plugins, decorators, hooks, not middleware chains)

**Sidebar Styling Decision:**
- Use Google Add-ons CSS package (CDN) as the primary styling approach — provides native Google Workspace look-and-feel
- CSS loads from CDN `<link>` tag at runtime — does NOT count against the 100KB inline bundle ceiling
- Minimal custom CSS (inlined) only for components the package doesn't cover (score stepper, progress indicators)
- Follow the [Editor Add-on Style Guide](https://developers.google.com/workspace/add-ons/guides/editor-style) for all UI patterns
- Do NOT use Tailwind CSS, shadcn/ui, or Radix UI

**Google Workspace Add-on UI Rules (mandatory regardless of CSS approach):**
- Max one primary (blue) action button per view — gray buttons may repeat
- Button placement: bottom-left of dialogs/action areas, blue primary on left, gray secondary to right
- Never open a dialog from another dialog
- Labels placed above text fields and text areas, not inline or beside
- Don't show sidebar automatically on document open — wait for user action (menu click)
- Text fields: width should suggest expected input length, use placeholder for examples (not labels)
- Use sentence case for buttons, labels, and menu items

**Accessibility (required on all sidebar components):**
- All UI controls must be keyboard-navigable
- Add `tabindex=0` to custom controls (any interactive `<div>` or non-native element)
- Include `alt` attributes on all images
- Apply ARIA attributes to custom controls (`role`, `aria-label`, `aria-expanded`, etc.)
- Never rely solely on color to communicate state — pair with icons and/or text
- Error messages, loading states, and confirmations must be screen-reader accessible

**Branding in Add-on UI:**
- Keep branding brief and light — few words max, styled subtly
- Do not use the word "Google" or Google product icons in the add-on UI
- Branding graphics: white background, max 200px x 60px
- Sidebar: branding at top or bottom only

### Development Workflow Rules

**Local Development:**
- `turbo dev` → starts Fastify API with hot reload (watches `apps/api/src/`)
- Sidebar local dev: open `apps/addon/src/sidebar/index.dev.html` in browser with `__mocks__/` for `google.script.run` — no Google account needed for UI iteration
- Preact DevTools don't load in Apps Script iframe — use Vitest for state debugging

**Build Pipeline:**
- `turbo build` → `packages/shared/` first, then `apps/api/` + `apps/addon/` in parallel
- Addon build is always sequential: `vite build` → `clasp push` — never run concurrent watchers (known race condition)
- `apps/addon/` build: `tsc` compiles `server/*.ts` → `dist/*.gs`, Vite builds `sidebar/` → `dist/sidebar.html`

**Deployment:**
- API: push to `main` → Railway auto-detects, builds, deploys. Fastify listens on `host: '::'`
- Migrations: `kysely-ctl migrate` as Railway release command — runs after build, before new version receives traffic
- Addon: manual `cd apps/addon && pnpm build && clasp push` (from `dist/`)
- Apps Script: install via direct script URL for Phase 1 — skip Marketplace
- Quality gates: GitHub Actions on PR → `turbo lint && turbo typecheck && turbo test`

**Environment Configuration:**
- `@fastify/env` with Zod-validated schema — catches missing config at startup, fails fast
- Railway injects `DATABASE_URL` and service variables automatically
- Local dev uses `.env` files (gitignored), `.env.example` committed with placeholder values (no secrets)
- GAS server: API base URL stored in `PropertiesService.getScriptProperties()` — never hardcoded
- Railway: always-on (min 1 instance) — no cold start concern

**Git Conventions:**
- Branching and commit message conventions to be established in first implementation story
- `.env` files always gitignored — secrets never committed

### Critical Don't-Miss Rules

**Anti-Patterns — NEVER do these:**
- `camelCase` in database columns (`bandScoreTa` → use `band_score_ta`)
- Sequential integer IDs in API responses (`/grade/123` → use UUID)
- Mixed response shapes (`{ data, error }` in same response)
- Global `isLoading` boolean for multiple async operations
- Inline Zod schemas in route files instead of importing from `packages/shared/`
- Direct `google.script.run.myFunction()` without the `gas.ts` promise wrapper
- Direct `UrlFetchApp.fetch()` without going through `callApi()`
- Swallowing errors in catch blocks without logging and surfacing to user
- Queries without `teacher_id` WHERE clause (data breach risk)
- Hardcoded API base URL in Apps Script server code
- Installing Tailwind CSS, shadcn/ui, or Radix as npm dependencies
- Using `any` or `@ts-ignore` without explicit justification
- Running `clasp push` and `vite build` concurrently
- Business logic in route handlers — routes call services and map results, nothing more
- Boolean flags (`isSubmitting`, `isLoading`) instead of typed status signals
- `effect()` or side effects inside component render bodies
- Mutating signals directly inside components — use action functions from signal files

**Runtime Constraints (Apps Script):**
- 6-minute execution timeout — all heavy processing must be backend-side; Apps Script is presentation only
- `UrlFetchApp` 30-second HTTP timeout — backend must respond within 30s or use async pattern (submit → poll)
- No streaming from backend to Apps Script — response must fit in memory
- No server-to-sidebar push — polling pattern only (3-5s intervals for grading status)
- `ScriptApp.getIdentityToken()` has 1hr TTL — mitigated by fresh token per-call in `callApi()`
- `.currentonly` OAuth scopes — add-on only accesses the open document/sheet, no broad Drive scanning

**Security Rules:**
- PII boundary: student names exist only in teacher's Sheet and backend roster. Names stripped before any AI API call
- Parent report URLs contain no PII (UUID v4 tokens only)
- Google ID token verified on every backend request — no session cookies, no JWTs
- Rate limiting keyed by `teacher_id` from verified token — not by IP (ineffective behind school NAT)
- Secrets in Railway variables only — never on disk, never in code

**Async Grading Edge Cases:**
- POST `/grade` requires client-generated idempotency key (UUID v4) in request header — prevents duplicate jobs from `UrlFetchApp` retries
- Stale jobs (started but never completed) must be garbage-collected on a schedule
- If teacher closes sidebar mid-grading, re-opening should detect in-flight or completed job and resume — not require re-grading
- Gemini API retry: once on 5xx/timeout, then surface error with manual entry fallback — no silent retries beyond one attempt

**Google Sheets Edge Cases:**
- No row locking in Sheets — use `LockService.getScriptLock()` before writes
- Validate target row/column still exists before write — fail with recovery prompt on conflict
- Score write-back fails → preserve scores in sidebar signals, show "Scores couldn't be saved. [Retry]"

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented — when in doubt, prefer the more restrictive option
- Refer to `architecture.md` for full architectural context and rationale
- Update this file if new patterns emerge during implementation

**For Humans:**
- Keep this file lean and focused on agent needs — avoid documenting what's obvious from code
- Update when technology stack changes or new conventions are established
- Review quarterly for outdated rules
- Remove rules that become obvious over time

**Open Questions (resolve in first implementation story):**
- `packages/shared/` consumption path for GAS server-side code
- `gas-local` mock boundary definition
- Exact version pins for all dependencies
- Linting and formatting tool configuration (ESLint, Prettier)
- Git branching and commit message conventions

Last Updated: 2026-04-22
