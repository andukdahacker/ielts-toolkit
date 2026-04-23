# Story 1.2: Apps Script Add-on Shell & Sidebar Pipeline

Status: done

## Story

As a teacher,
I want to install the IELTS Toolkit add-on from a direct link and see a sidebar open in Google Docs,
So that I can begin setting up my grading workflow.

## Acceptance Criteria

1. **Given** the `apps/addon/` workspace **When** I run `pnpm build` **Then** Vite compiles the Preact sidebar (with Google Add-ons CSS linked from CDN) into a single inlined HTML file (`dist/sidebar.html`) under 100KB, `tsc` compiles server-side `.ts` to `.js` in `dist/` (clasp accepts `.js` files — no rename to `.gs` needed), and `appsscript.json` is copied to `dist/`

2. **Given** the built addon in `dist/` **When** I run `clasp push` **Then** the add-on deploys to Google Apps Script without errors

3. **Given** a teacher opens a Google Doc **When** they click "Add-ons → IELTS Toolkit → Open Sidebar" **Then** the sidebar loads with the Preact UI shell within 8 seconds (cold start) or 3 seconds (warm)

4. **Given** the sidebar loads **When** it initializes **Then** it calls the backend `/health` endpoint via `google.script.run` → `callApi()` with a fresh Google ID token from `ScriptApp.getIdentityToken()`, and displays a connection status indicator

5. **Given** the `apps/addon/src/sidebar/lib/gas.ts` module **When** any sidebar component needs to call Apps Script server-side functions **Then** all calls go through the promise wrapper (never raw `google.script.run`) with `.withSuccessHandler()` and `.withFailureHandler()`

6. **Given** the `apps/addon/src/server/api.ts` module **When** any server-side function needs to call the backend API **Then** all calls go through the `callApi(method, path, body?)` function which acquires a fresh ID token via `ScriptApp.getIdentityToken()` per-call

7. **Given** a developer opens `apps/addon/src/sidebar/index.dev.html` in a browser **When** the page loads **Then** the sidebar renders with mocked `google.script.run` responses from `__mocks__/gas-mock.ts`, enabling local UI development without a Google account

8. **Given** the sidebar successfully connects to the backend **When** the teacher has no linked Score Sheet **Then** the sidebar displays the Sheet setup flow (Story 1.3) as the landing state

## Tasks / Subtasks

- [x] Task 1: Set up `apps/addon/` build pipeline (AC: #1)
  - [x] 1.1 Update `apps/addon/package.json` — add dependencies: `preact`, `@preact/signals`, `@ielts-toolkit/shared` (workspace dependency — `"workspace:*"`), `vite`, `@preact/preset-vite`, `vite-plugin-singlefile`, `typescript`. Add devDependencies: `@types/google-apps-script`, `vitest`, `jsdom`, `@testing-library/preact`. Add scripts: `build` (sequential: clean + tsc for server + vite for sidebar), `build:server` (`tsc -p tsconfig.server.json`), `build:sidebar` (`vite build`), `clean` (`rm -rf dist`), `typecheck`, `test`
  - [x] 1.2 Create `apps/addon/tsconfig.server.json` — target ES2019, **`module: "none"`** (CRITICAL: base config uses ES2022 modules — `"commonjs"` wraps output with `exports` which doesn't exist in Apps Script V8 and would throw. `"none"` keeps functions at top-level global scope as Apps Script requires for `google.script.run` and triggers. Consequence: no `import`/`export` statements in server code — only `import type` is allowed, which is erased at compile time. Functions in any server file are visible to all other files at runtime because Apps Script concatenates everything), no DOM libs, `lib: ["es2019"]`, `outDir: "dist"`, `declaration: false`, `sourceMap: false`, compiles `src/server/*.ts` → `dist/*.js`. Exclude sidebar code
  - [x] 1.3 Update `apps/addon/tsconfig.json` — for sidebar: target ESNext, include DOM libs, JSX with `preact-jsx` pragma
  - [x] 1.4 Create `apps/addon/vite.config.ts` — `@preact/preset-vite` + `vite-plugin-singlefile`. Input: `src/sidebar/index.html`. Output: `dist/sidebar.html`. Define `import.meta.env` replacements
  - [x] 1.5 Create `apps/addon/appsscript.json` — manifest with `.currentonly` OAuth scopes, V8 runtime, document triggers
  - [x] 1.6 Create `apps/addon/.clasp.json` — `rootDir: "dist/"`, placeholder scriptId (human fills in)
  - [x] 1.7 Create `apps/addon/.claspignore` — ignore `src/`, `node_modules/`, etc.
  - [x] 1.8 Update build script to copy `appsscript.json` to `dist/` after build
  - [x] 1.9 Create `apps/addon/vitest.config.ts` — configure with `@preact/preset-vite` plugin for JSX transform (Preact, NOT React). Without this, `.tsx` component tests will fail because Vitest defaults to React JSX. Set `test.environment: 'jsdom'` for DOM APIs
  - [x] 1.10 Verify `turbo build` succeeds across all workspaces including addon

- [x] Task 2: Create Apps Script server-side entry points (AC: #3, #6)
  - [x] 2.1 Create `src/server/main.ts` — `onOpen(e)` trigger that creates menu: "IELTS Toolkit → Open Sidebar". `showSidebar()` function that opens sidebar HTML from `sidebar.html`
  - [x] 2.2 Create `src/server/api.ts` — `callApi(method, path, body?)` function. Acquires fresh token via `ScriptApp.getIdentityToken()` per-call. Uses `UrlFetchApp.fetch()` for HTTP. Base URL from `PropertiesService.getScriptProperties().getProperty('API_BASE_URL')`. Parses response JSON, throws typed errors on non-200
  - [x] 2.3 Create `src/server/health.ts` — `checkBackendHealth()` function that calls `callApi('GET', '/health')`. Exposed to sidebar via `google.script.run`

- [x] Task 3: Create sidebar Preact shell (AC: #3, #4, #8)
  - [x] 3.1 Create `src/sidebar/index.html` — HTML shell with `<link>` to Google Add-ons CSS CDN, `<script type="module" src="./index.tsx">` entry point
  - [x] 3.2 Create `src/sidebar/index.tsx` — Preact render entry point, mounts `<App />` to `#app`
  - [x] 3.3 Create `src/sidebar/components/app.tsx` — root component. On mount: calls `checkBackendHealth()` via `gas.ts`. Displays connection status. Shows setup-sheet placeholder when no linked Sheet
  - [x] 3.4 Create `src/sidebar/components/connection-status.tsx` — shows "Connected" (green) / "Connecting..." (spinner) / "Can't connect" (error with retry)
  - [x] 3.5 Create `src/sidebar/components/setup-sheet-placeholder.tsx` — placeholder for Story 1.3 Sheet setup flow. Shows "Set up your Score Sheet to get started" with disabled button
  - [x] 3.6 Create `src/sidebar/styles.css` — minimal custom CSS for components not covered by Google Add-ons CSS (connection indicator, spacing). Keep lean

- [x] Task 4: Create `gas.ts` promise wrapper (AC: #5)
  - [x] 4.1 Create `src/sidebar/lib/gas.ts` — generic promise wrapper around `google.script.run`. Every call returns `Promise<T>`. Uses `.withSuccessHandler(resolve)` and `.withFailureHandler(reject)`. Typed function signatures for each exposed server function
  - [x] 4.2 Create `src/sidebar/lib/gas.test.ts` — test promise wrapper: success resolves, failure rejects, correct handler wiring

- [x] Task 5: Create local dev harness with mocks (AC: #7)
  - [x] 5.1 Create `src/sidebar/__mocks__/gas-mock.ts` — mock `google.script.run` with fake responses for `checkBackendHealth` (returns `{ data: { status: 'ok' } }`). Attach to `window.google.script.run` with `withSuccessHandler`/`withFailureHandler` pattern
  - [x] 5.2 Create `src/sidebar/index.dev.html` — local dev harness. **CRITICAL LOAD ORDER:** the mock script must execute and attach `window.google.script.run` BEFORE the Vite app module evaluates, otherwise `gas.ts` will reference `undefined`. Use a synchronous `<script>` tag for the mock (not `type="module"`) placed before the Vite `<script type="module">` entry point. Includes Google Add-ons CSS CDN link. Add a banner: "LOCAL DEV MODE — mocked google.script.run"

- [x] Task 6: Create sidebar state signals (AC: #4, #8)
  - [x] 6.1 Create `src/sidebar/state/sheet.ts` — `linkedSheet` signal (null = no sheet linked), `sheetSetupStatus` signal (`'idle' | 'loading' | 'done' | 'error'`)
  - [x] 6.2 Create `src/sidebar/state/connection.ts` — `connectionStatus` signal (`'idle' | 'connecting' | 'connected' | 'error'`), `checkConnection()` action function that calls `gas.checkBackendHealth()` and updates signal

- [x] Task 7: Component tests (AC: #3, #4)
  - [x] 7.1 Create `src/sidebar/components/app.test.tsx` — test that app renders, calls health check on mount, shows connection status, shows setup placeholder when no sheet linked
  - [x] 7.2 Create `src/sidebar/components/connection-status.test.tsx` — test each connection state renders correctly
  - [x] 7.3 Create `src/sidebar/state/connection.test.ts` — test `checkConnection()` action updates signal correctly on success/failure

- [x] Task 8: Verify end-to-end build (AC: #1, #2)
  - [x] 8.1 Run `turbo build` — verify all workspaces build successfully
  - [x] 8.2 Verify `dist/sidebar.html` is a single self-contained HTML file under 100KB
  - [x] 8.3 Verify `dist/` contains compiled `.js` files (server code) + `appsscript.json`
  - [x] 8.4 Verify `.clasp.json` points to `dist/` for clasp push

- [ ] Task 9: clasp setup and deploy (AC: #2, #3) **[MANUAL — requires human interaction]**
  - [ ] 9.1 **[HUMAN]** Run `clasp login` if not already logged in
  - [ ] 9.2 **[HUMAN]** Create or link Apps Script project: `clasp create --type standalone` or update `.clasp.json` with existing script ID
  - [ ] 9.3 **[HUMAN]** Set `API_BASE_URL` in Script Properties via Apps Script editor (Settings → Script Properties). **CRITICAL:** Also find the Apps Script project's OAuth client ID (Apps Script editor → Project Settings → GCP project number, then GCP Console → APIs & Services → Credentials → the auto-created OAuth client). Set this as `GOOGLE_CLIENT_ID` on Railway. If `GOOGLE_CLIENT_ID` on Railway doesn't match the Apps Script project's client ID, all API calls will fail with 401 audience mismatch
  - [ ] 9.4 **[HUMAN]** Run `cd apps/addon && pnpm build && clasp push`
  - [ ] 9.5 **[HUMAN]** Install add-on via direct script URL, open in Google Doc, verify sidebar opens

## Dev Notes

### Critical Architecture Constraints

- **Three-layer communication chain — never skip layers:**
  ```
  Sidebar (Preact) → lib/gas.ts → google.script.run → GAS server (.js) → callApi() → Fastify API
  ```
- **Never call raw `google.script.run` from components or state files** — always go through `gas.ts`
- **Never call `UrlFetchApp.fetch()` directly** — always go through `callApi()` in `server/api.ts`
- **Sequential build only:** `tsc` (server) → `vite build` (sidebar). Never run concurrent watchers
- **`import.meta` is unavailable at Apps Script runtime.** Vite replaces `import.meta.env` at build time — this is fine. Never reference `import.meta` in `src/server/` code
- **Apps Script V8 runtime targets ES2019** — no top-level await, no `import.meta`, no ES modules at runtime. Server `.ts` compiles to `.js` via `tsc` (clasp pushes `.js` files to Apps Script where they're concatenated into one global scope)
- **Sidebar bundle target < 100KB** (Preact ~14KB + app code). Google Add-ons CSS loads from CDN at runtime — does NOT count against bundle ceiling
- **`ScriptApp.getIdentityToken()` has 1hr TTL** — mitigated by acquiring fresh token per-call inside `callApi()`
- **CRITICAL: Token audience matching.** `ScriptApp.getIdentityToken()` returns an ID token whose `audience` claim is the **Apps Script project's own OAuth client ID** (found in Apps Script editor → Project Settings → GCP project number). The backend `GOOGLE_CLIENT_ID` env var on Railway **must be set to this Apps Script project client ID**, NOT a separate GCP OAuth client. Mismatch → every API call fails with 401 ("audience mismatch"). Task 9.3 must document this

### Apps Script Server-Side Constraints

- **NO `require()`, NO npm, NO file system, NO native `fetch`** — Apps Script V8 is not Node.js
- All server-side functions exposed to sidebar must be top-level named functions (not methods on objects, not arrow functions assigned to `const`)
- `@types/google-apps-script` provides types for `UrlFetchApp`, `SpreadsheetApp`, `DocumentApp`, `ScriptApp`, `PropertiesService`, etc.
- Server `.ts` files compile to `.js` — at runtime they're all concatenated into one global scope. **Name collision strategy:** with `module: "none"`, every function and variable in every server file shares the same global scope. Public functions for `google.script.run` or triggers (`onOpen`, `showSidebar`, `checkBackendHealth`, `callApi`) are top-level named functions. Internal helpers must use unique prefixed names (e.g., `_apiParseResponse`, `_healthFormatResult`) to avoid colliding across files. Do NOT use `import`/`export` in server code — only `import type` (erased at compile time). Cross-file calls (e.g., `health.ts` calling `callApi()` from `api.ts`) work because all functions are global at runtime

### Google Add-ons CSS

Load from CDN in sidebar HTML:
```html
<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">
```
Key classes:
- Buttons: `.action` (primary blue), `.create`, `.share`
- Forms: `.form-group`, `.inline`
- Layout: `.sidebar`, `.bottom`, `.block`
- Text: `.error`, `.gray`, `.secondary`
- Rules: max one primary (blue) button per view, sentence case labels, labels above fields

### appsscript.json Manifest

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/documents.currentonly",
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```
- `.currentonly` scopes — add-on only accesses the open document/sheet
- `script.external_request` — required for `UrlFetchApp` calls to backend
- `script.container.ui` — required for sidebar

### callApi() Pattern

```typescript
// src/server/api.ts
function callApi(method: string, path: string, body?: unknown): unknown {
  const baseUrl = PropertiesService.getScriptProperties().getProperty('API_BASE_URL')
  if (!baseUrl) throw new Error('API_BASE_URL not configured in Script Properties')
  
  const token = ScriptApp.getIdentityToken()
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: method.toLowerCase() as GoogleAppsScript.URL_Fetch.HttpMethod,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  }
  if (body) options.payload = JSON.stringify(body)
  
  const response = UrlFetchApp.fetch(`${baseUrl}${path}`, options)
  const code = response.getResponseCode()
  const rawText = response.getContentText()
  
  // Guard against non-JSON responses (Railway 502, Cloudflare HTML errors, etc.)
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(`API returned non-JSON response (HTTP ${code}): ${rawText.substring(0, 200)}`)
  }
  
  if (code >= 400) {
    const errorBody = parsed as { error?: { message?: string } }
    throw new Error(errorBody?.error?.message || `API error: ${code}`)
  }
  return parsed
}
```
Key: `muteHttpExceptions: true` prevents `UrlFetchApp` from throwing on non-200 — allows parsing error response body. The try/catch around `JSON.parse` handles proxy error pages (Railway 502, Cloudflare challenges) that return HTML instead of JSON.

### gas.ts Promise Wrapper Pattern

```typescript
// src/sidebar/lib/gas.ts
type GasRunner = typeof google.script.run

// NOTE: The generic T is a developer-asserted type, NOT compiler-verified.
// google.script.run functions are typed as returning void by @types/google-apps-script.
// The success handler receives `unknown` at the type level — T is a trust assertion
// about what the server function actually returns. If the server function shape changes,
// TypeScript will NOT catch the mismatch. Keep these signatures in sync with server code manually.
function callGas<T>(fn: (runner: GasRunner) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler((result: T) => resolve(result))
      .withFailureHandler((error: Error) => reject(error))
    fn(runner)
  })
}

// Typed exports for each server function — keep return types in sync with src/server/*.ts
export function checkBackendHealth() {
  return callGas<{ data: { status: string } }>((r) => r.checkBackendHealth())
}
```

### Vite Config for Apps Script Sidebar

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/sidebar/index.html',
      output: { entryFileNames: 'sidebar.js' },
    },
    emptyOutDir: false, // Don't wipe server .js files compiled by tsc
  },
})
```
`emptyOutDir: false` — critical! Server `.js` files are compiled first by `tsc`, Vite runs second. Vite must not delete the server files.

### Build Script Sequence

```bash
# In apps/addon/package.json scripts:
# "clean": "rm -rf dist"
# "build:server": "tsc -p tsconfig.server.json && cp appsscript.json dist/"
# "build:sidebar": "vite build"
# "build": "pnpm clean && pnpm build:server && pnpm build:sidebar"
```
Order matters:
1. `clean` wipes `dist/` to remove stale `.js` files from deleted server `.ts` files (prevents ghost files from accumulating and being pushed to Apps Script via `clasp push`)
2. `build:server` runs `tsc` which creates `dist/` and outputs `.js` files, then copies manifest
3. `build:sidebar` runs Vite which adds `sidebar.html` to the existing `dist/` (`emptyOutDir: false` in vite config — Vite must NOT wipe the server files)

The `clean` step before build replaces the need for Vite's `emptyOutDir: true` and eliminates the stale file problem.

### Preact Signal Patterns (from Architecture)

- Typed defaults: `signal<ConnectionStatus>('idle')` — never `undefined`
- Actions as plain exported functions: `checkConnection()`, not methods
- `effect()` calls live in signal files, not components
- Components only read signals and call action functions — never mutate signals directly

### Testing Approach

- **Vitest** for unit + component tests
- **`@testing-library/preact`** for component rendering
- **No `act()` wrappers needed** — Preact signals are synchronously reactive
- **Mock `gas.ts`** in component tests — never mock `google.script.run` directly in component tests
- **Co-locate tests:** `app.tsx` → `app.test.tsx` in same directory

### File Structure (this story creates)

```
apps/addon/
├── .clasp.json                    # Script ID + rootDir: "dist/"
├── .claspignore                   # Ignore src/, node_modules/
├── appsscript.json                # Apps Script manifest
├── package.json                   # Updated with real dependencies
├── tsconfig.json                  # Sidebar TS config (DOM, JSX)
├── tsconfig.server.json           # Server TS config (ES2019, no DOM)
├── vite.config.ts                 # Preact + singlefile
├── vitest.config.ts               # Preact JSX + jsdom environment
└── src/
    ├── server/
    │   ├── main.ts                # onOpen, showSidebar
    │   ├── api.ts                 # callApi() — UrlFetchApp + token
    │   └── health.ts              # checkBackendHealth()
    └── sidebar/
        ├── index.html             # HTML shell + CDN CSS link
        ├── index.tsx              # Preact render entry
        ├── index.dev.html         # Local dev harness with mocks
        ├── styles.css             # Minimal custom CSS
        ├── components/
        │   ├── app.tsx
        │   ├── app.test.tsx
        │   ├── connection-status.tsx
        │   ├── connection-status.test.tsx
        │   └── setup-sheet-placeholder.tsx
        ├── state/
        │   ├── connection.ts
        │   ├── connection.test.ts
        │   └── sheet.ts
        ├── lib/
        │   ├── gas.ts             # google.script.run promise wrapper
        │   └── gas.test.ts
        └── __mocks__/
            └── gas-mock.ts        # Mock for local dev + tests
```

### Previous Story Intelligence (Story 1.1)

**Learnings applied:**
- `packages/shared/` exports are stable — import from `@ielts-toolkit/shared` for any shared types
- CamelCasePlugin runtime mapping: DB column `teacher_id` → TypeScript `teacherId`. The interface keys use snake_case but runtime queries use camelCase
- Auth middleware decorates request with `teacherId` and `teacherEmail` — `callApi()` just passes the token; backend handles the rest
- Global error handler returns standard `{ error: { code, message, retryable } }` shape — `callApi()` should parse this on error responses
- DB plugin (`plugins/db.ts`) established the pattern: plugins wrap setup + teardown, registered in `app.ts`
- Review found that health route needed `config: { rateLimit: false }` — the `/health` endpoint this story calls is already configured correctly

**Files from Story 1.1 this story interacts with:**
- `apps/api/src/routes/health.ts` — the endpoint the sidebar calls to verify connectivity
- `packages/shared/src/errors.ts` — `AppError` type for parsing backend error responses
- `apps/addon/package.json` — exists as empty shell, will be fully populated
- `apps/addon/tsconfig.json` — exists, will be split into sidebar + server configs

### Naming Conventions (MUST follow)

| Layer | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case.ts` | `connection-status.tsx`, `gas-mock.ts` |
| Preact components | `PascalCase` function in `kebab-case` file | `ConnectionStatus` in `connection-status.tsx` |
| Signal files | `kebab-case` in `state/` | `state/connection.ts`, `state/sheet.ts` |
| Server functions | `camelCase`, verb prefix | `checkBackendHealth`, `callApi` |
| CSS classes | Google Add-ons CSS classes where possible | `.action`, `.sidebar`, `.block` |

### Anti-Patterns (NEVER do these)

- Direct `google.script.run.myFunction()` without the `gas.ts` wrapper
- Direct `UrlFetchApp.fetch()` without going through `callApi()`
- `import.meta` references in `src/server/` code (breaks at runtime)
- Running `vite build` and `tsc` concurrently (race condition on `dist/`)
- `emptyOutDir: true` in vite config (deletes server `.js` files compiled by tsc)
- Boolean flags (`isLoading`, `isConnected`) instead of typed status signals
- Installing Tailwind CSS, shadcn/ui, or Radix as dependencies
- Barrel files anywhere except `packages/shared/src/index.ts`
- `effect()` or side effects inside component render bodies
- Mutating signals directly inside components — use action functions from state files
- Business logic in components — delegate to state action functions

### References

- [Source: architecture.md#Frontend Architecture (Sidebar)] — Preact + signals + Google Add-ons CSS
- [Source: architecture.md#Communication Patterns] — Three-layer chain, gas.ts wrapper, callApi()
- [Source: architecture.md#Complete Project Directory Structure] — Addon file tree
- [Source: architecture.md#Technical Constraints & Dependencies] — Apps Script limitations
- [Source: epics.md#Story 1.2] — Full acceptance criteria
- [Source: prd.md#Technical Architecture] — Sidebar build, auth flow
- [Source: project-context.md#Apps Script Communication Chain] — Three-layer chain rules
- [Source: project-context.md#Preact Sidebar Patterns] — Signal patterns, component rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed `GoogleAppsScript.Document.DocumentEditEvent` → `GoogleAppsScript.Events.DocsOnOpen` (type doesn't exist in @types/google-apps-script)
- Fixed vite output path: set `root: 'src/sidebar'` in vite config + `mv dist/index.html dist/sidebar.html` in build script to get correct output filename for Apps Script `HtmlService.createHtmlOutputFromFile('sidebar')`
- Upgraded `vite-plugin-singlefile` from 2.0.3 → 2.3.3 to support vite 6.x peer dependency
- Upgraded `vitest` from 2.1.8 → ^3.0.0 to resolve vite 5/6 type conflicts
- Added `@testing-library/jest-dom` for DOM matchers (`toHaveAttribute`)
- Created `gas-types.d.ts` for sidebar-side `google.script.run` typings (separate from `@types/google-apps-script` which is server-only)

### Completion Notes List

- All 8 dev tasks completed (Tasks 1-8). Task 9 is MANUAL (human-only clasp setup)
- Build pipeline: `pnpm clean → tsc (server) → vite build (sidebar) → mv sidebar.html`
- Output: `dist/` contains 3 server `.js` files + `appsscript.json` + `sidebar.html` (22KB, well under 100KB limit)
- 15 tests across 4 test files, all passing. 11 API tests still passing (no regressions)
- Three-layer communication chain implemented: Sidebar → gas.ts → google.script.run → GAS server → callApi() → API
- Typed signals for connection status and sheet state (no boolean flags)
- Local dev harness with mock google.script.run for UI development without Google account

### File List

**New files:**
- `apps/addon/package.json` (updated)
- `apps/addon/tsconfig.json` (updated for sidebar)
- `apps/addon/tsconfig.server.json`
- `apps/addon/vite.config.ts`
- `apps/addon/vitest.config.ts`
- `apps/addon/appsscript.json`
- `apps/addon/.clasp.json`
- `apps/addon/.claspignore`
- `apps/addon/src/server/main.ts`
- `apps/addon/src/server/api.ts`
- `apps/addon/src/server/health.ts`
- `apps/addon/src/sidebar/index.html`
- `apps/addon/src/sidebar/index.tsx`
- `apps/addon/src/sidebar/index.dev.html`
- `apps/addon/src/sidebar/styles.css`
- `apps/addon/src/sidebar/gas-types.d.ts`
- `apps/addon/src/sidebar/test-setup.ts`
- `apps/addon/src/sidebar/components/app.tsx`
- `apps/addon/src/sidebar/components/app.test.tsx`
- `apps/addon/src/sidebar/components/connection-status.tsx`
- `apps/addon/src/sidebar/components/connection-status.test.tsx`
- `apps/addon/src/sidebar/components/setup-sheet-placeholder.tsx`
- `apps/addon/src/sidebar/state/connection.ts`
- `apps/addon/src/sidebar/state/connection.test.ts`
- `apps/addon/src/sidebar/state/sheet.ts`
- `apps/addon/src/sidebar/lib/gas.ts`
- `apps/addon/src/sidebar/lib/gas.test.ts`
- `apps/addon/src/sidebar/__mocks__/gas-mock.ts`

**Deleted files:**
- `apps/addon/src/index.ts` (placeholder from Story 1.1)

### Review Findings

- [x] [Review][Patch] Add null guard for `ScriptApp.getIdentityToken()` return value [`api.ts:5`]
- [x] [Review][Patch] Normalize `baseUrl` trailing slash to prevent double-slash in URL [`api.ts:16`]
- [x] [Review][Patch] Only set `Content-Type: application/json` header when request has a body [`api.ts:8-11`]
- [x] [Review][Patch] Guard against empty response body on 2xx — `JSON.parse('')` throws [`api.ts:22`]
- [x] [Review][Patch] Replace non-null assertion `getElementById('app')!` with explicit guard [`index.tsx:4`]
- [x] [Review][Patch] Fix `index.dev.html` loading `.ts` mock via non-module `<script>` tag — browser cannot execute TypeScript natively outside Vite module transform [`index.dev.html:23`]
- [x] [Review][Patch] Add `onInstall(e)` function that calls `onOpen(e)` — required for first-install menu appearance [`main.ts`]
- [x] [Review][Patch] Add error path to `gas-mock.ts` — failure handler is captured but never invoked, preventing local error UI testing [`gas-mock.ts`]
- [x] [Review][Patch] Log caught error in `checkConnection()` — silent catch hides connection failure details [`connection.ts:13`]
- [x] [Review][Defer] Race condition if `checkConnection()` called while already connecting (rapid retry clicks) [`connection.ts:8`] — deferred, low risk (single button click timing)
- [x] [Review][Defer] `.clasp.json` contains placeholder scriptId and is not in `.gitignore` — could leak project config when real ID is added [`addon/.clasp.json`] — deferred, design decision for later

### Change Log

- 2026-04-22: Implemented Story 1-2 — Apps Script add-on shell with Preact sidebar, build pipeline, server-side entry points, gas.ts promise wrapper, local dev harness, state signals, and 15 tests
