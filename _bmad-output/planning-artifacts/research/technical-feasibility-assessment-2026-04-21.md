# Technical Feasibility Assessment: IELTS Teacher Toolkit

**Date:** 2026-04-21
**Scope:** Google Apps Script capabilities, Workspace Marketplace distribution, architecture viability, Sheet-as-database pattern
**Reference:** [Product Spec v2](../ielts-teacher-toolkit-product-spec-v2.md)

---

## Overall Verdict: FEASIBLE

The Google Apps Script + Fastify backend + Sheet-as-database architecture is well-established. The product's data scale is trivially within platform limits. Three sharp edges require deliberate design.

---

## 1. Google Apps Script Capabilities — FEASIBLE with caveats

### What works great

- **Sidebar UI**: 300px wide, full HTML5/CSS3/JS in a sandboxed iframe. Can use Svelte or Preact with a bundler (Vite/Rollup) outputting a single HTML file. Deploy via `clasp` CLI.
- **Document reading**: `DocumentApp.getBody().getText()` returns full document text. `body.findText(pattern)` supports regex for locating text ranges. `doc.getSelection()` returns current user selection.
- **Sheet operations**: `getRange().getValues()` for batch reads, `setValues()` for batch writes. Named ranges, Developer Metadata, and Properties Service all available.
- **Backend HTTP calls**: `UrlFetchApp.fetch()` — synchronous server-side HTTP client, 20,000 calls/day (consumer), 100,000/day (Workspace). 50 MB max response.
- **Authentication**: `ScriptApp.getIdentityToken()` returns an OpenID Connect ID token for the current user. Backend verifies via Google's auth libraries.
- **Client-server communication**: `google.script.run` is async on client side with `.withSuccessHandler()` / `.withFailureHandler()`. Enables responsive sidebar UX with spinners/loading states.

### Key limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No native Doc comment insertion via DocumentApp** | Core to Phase 1 "Publish" flow | Use Drive API Advanced Service (`Drive.Comments.insert`) with anchored comments, OR fall back to text highlighting + appended feedback section |
| **6-minute script execution timeout** | Long AI grading could timeout | Backend responds immediately with jobId; sidebar polls for completion |
| **No server-to-sidebar push** | Can't notify sidebar of new events | `setInterval()` polling via `google.script.run` every 3-5s during active operations |
| **Single-file HTML bundling** | All JS/CSS must be inlined | Vite/Rollup build step + `clasp` for deployment |
| **Slow `google.script.run` round trips** | 0.5-2s per call | Batch data, minimize round trips, show loading states |
| **300px sidebar width** | Narrow UI | Design for vertical stacking, accordions, compact layouts |
| **`AuthMode.LIMITED` on first load** | Restricted services until user interacts | Handle gracefully in onOpen trigger |

### Critical validation needed

**Doc comment insertion via Drive API**: The anchor format for positioning comments at specific text ranges is poorly documented. Prototype this mechanism early in Phase 1. If brittle, alternatives:

1. **Text highlighting** (`Text.setBackgroundColor(start, end, color)`) + summary panel in sidebar
2. **Appended feedback section** at end of document with formatted comments
3. **Hybrid**: highlights in-document + feedback section

### Framework recommendation

Svelte or Preact (small bundle size) with Vite, outputting a single HTML file. Use `clasp` for local development and deployment.

### Reference URLs

- HTML Service: https://developers.google.com/apps-script/guides/html
- Client-Server Communication: https://developers.google.com/apps-script/guides/html/communication
- DocumentApp: https://developers.google.com/apps-script/reference/document
- Advanced Drive Service: https://developers.google.com/apps-script/advanced/drive
- Quotas: https://developers.google.com/apps-script/guides/services/quotas
- clasp CLI: https://github.com/google/clasp

---

## 2. Workspace Marketplace Distribution — FEASIBLE, smooth path

### Add-on type

**Editor Add-on** (Apps Script-based with HTML sidebars) is the correct choice. A single add-on can serve both Docs and Sheets via a multi-editor manifest:

```json
{
  "addOns": {
    "common": { "name": "IELTS Toolkit" },
    "docs": { "onFileScopeGrantedTrigger": { "runFunction": "onDocOpen" } },
    "sheets": { "onFileScopeGrantedTrigger": { "runFunction": "onSheetOpen" } }
  }
}
```

One Marketplace listing, one install for teachers.

### OAuth scopes needed

| Scope | Classification | Purpose |
|-------|---------------|---------|
| `documents.currentonly` | Non-sensitive | Read/write active Doc |
| `spreadsheets.currentonly` | Non-sensitive | Read/write active Sheet |
| `script.container.ui.currentonly` | Non-sensitive | Render sidebars |
| `script.external_request` | Non-sensitive | Call backend API |

All non-sensitive = faster review, no expensive security assessment, higher user trust.

### Publishing requirements

- Google Cloud Project with billing enabled
- Verified domain for developer account
- Privacy policy URL (mandatory)
- Terms of service URL (recommended)
- Accessible homepage URL
- Working, functional add-on (Google tests during review)

### Review timeline

Expect **2-6 weeks** for initial review. Common rejection reasons:
- Overly broad OAuth scopes (mitigated by using `.currentonly`)
- Missing/inadequate privacy policy
- UI/UX issues in sidebar

### Monetization

Google removed built-in Marketplace billing (2020-2021). Standard approach: **Stripe via your backend**. Teacher clicks "Upgrade" in sidebar, opens payment page, license activated server-side.

### Education considerations

- Google Workspace for Education domains: admin-controlled add-on installation (allowlist/blocklist)
- If targeting schools later: may need COPPA/FERPA/GDPR compliance and data processing agreements
- Not required for initial Marketplace listing

### Competition

Very few IELTS-specific add-ons on the Marketplace — open opportunity. Related education add-ons (Kami, Flubaroo, CoGrader, Orange Slice) validate the pattern.

### Reference URLs

- Publishing guide: https://developers.google.com/workspace/marketplace/how-to-publish
- Add-on types: https://developers.google.com/workspace/add-ons/overview
- OAuth scopes: https://developers.google.com/apps-script/concepts/scopes
- Marketplace: https://workspace.google.com/marketplace

---

## 3. Architecture Viability — SOUND

### Dual-surface pattern

```
Teacher: Apps Script sidebar → UrlFetchApp → Fastify backend (Google ID token auth)
Student: React web app → fetch() → Same Fastify backend (session/JWT auth)
```

This is well-established. Products like Kami, Pear Deck, Nearpod, Supermetrics use this exact pattern.

### Authentication flow

**Apps Script → Backend:**
```javascript
// Apps Script
const token = ScriptApp.getIdentityToken();
UrlFetchApp.fetch(backendUrl, {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Fastify backend
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
const { email, sub } = ticket.getPayload();
```

**Student web app → Backend:** Standard session/JWT auth (email/password, magic link, or class join code).

### AI grading latency — async pattern required

Gemini essay grading may take 10-30+ seconds. **Do NOT make the sidebar wait synchronously.**

```
1. Sidebar → backend: POST /grade { essay, taskType }
   ← Response: { jobId: "abc123" }  (immediate)

2. Backend: queues Gemini call, processes async

3. Sidebar polls every 3-5s: GET /grade/abc123/status
   ← Response: { status: "processing" } or { status: "complete", result: {...} }
```

### CORS

- **Not an issue for Apps Script**: `UrlFetchApp` is server-side, no CORS
- **Required for student web app**: Use `@fastify/cors` with allowed origins

### Hosting recommendation

| Component | Recommended | Rationale |
|-----------|-------------|-----------|
| Fastify backend | **Google Cloud Run** | Same GCP project as Apps Script, scales to zero, Cloud SQL connector |
| Student React app | **Vercel** or **Cloud Run** | Static SPA, CDN delivery |
| Database | **Cloud SQL (PostgreSQL)** | VPC connector to Cloud Run, proper transactions for assignments/submissions |

### Cold start mitigation

Cloud Run scales to zero by default. Combined with Apps Script overhead, first request can take 5-10s. Set **minimum instances to 1** (~$5-15/month) for responsive UX.

### Server-authoritative timers (student tests)

Standard implementation:
- `POST /test/start` → creates session with `startedAt`, `durationSeconds`, `endsAt`
- `GET /test/:sessionId/time-remaining` → returns `remainingSeconds` + `serverTime`
- `POST /test/:sessionId/submit` → validates `now() < endsAt + gracePeriod`
- Background job auto-closes expired sessions

No interference with add-on requests — Fastify handles concurrent connections.

### Reference URLs

- UrlFetchApp: https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
- ScriptApp.getIdentityToken(): https://developers.google.com/apps-script/reference/script/script-app#getIdentityToken()
- Verify Google ID tokens: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- @fastify/cors: https://github.com/fastify/fastify-cors

---

## 4. Sheet-as-Database — CORRECT choice

### Scale assessment

| Metric | Your use case | Google Sheets limit | Utilization |
|--------|--------------|---------------------|-------------|
| Cells per class | 100 students × 200 cols = 20,000 | 10,000,000 | 0.2% |
| Tabs per workbook | ~10 classes | 200 | 5% |
| Apps Script batch read (100×200) | ~2 seconds | 6-min timeout | Trivial |

**Performance is not a concern at this scale.**

### Structure detection strategy

**Auto-detect on activation:**
```javascript
function detectScoreSheet(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    hasStudentColumn: headers.some(h => /student|name|learner/i.test(String(h))),
    hasScoreColumns: headers.filter(h =>
      /band|writing|speaking|reading|listening|overall|TA|CC|LR|GRA/i.test(String(h))
    ).length >= 2
  };
}
```

**Two-phase approach:**
1. Auto-detect → show teacher: "We detected 12 students and 6 test columns. Correct?"
2. Cache confirmed mapping in `PropertiesService.getDocumentProperties()`
3. Re-validate on each sidebar open; prompt if structure diverged

### Data integrity rules

1. **Always lookup by name, never by cell address** — columns can move, rows can be added/deleted
2. **Use `LockService.getScriptLock()`** when writing scores — prevents race conditions between concurrent script executions
3. **Validate before write**: read current headers, confirm target column/row still exists, then write
4. **Fail gracefully**: "Column 'W2' is missing — restore it or re-map?"
5. **Use Developer Metadata API** for invisible add-on state (preferred over hidden sheets)

### Metadata storage

| Mechanism | Use for | Limits |
|-----------|---------|--------|
| Named Ranges | Structural anchors (student names column, score header row) | Auto-adjusts when rows/cols shift |
| Document Properties | Column mapping cache, structure version, settings | 500 KB total, 9 KB per value |
| Developer Metadata | Invisible add-on state attached to sheets/ranges | Not visible to users |
| Hidden Sheet tab | Complex config (rubrics, templates) | User can unhide, but fine for non-sensitive data |

### Multi-class support

- One tab per class within a workbook, OR separate Sheet files
- `ss.getSheets()` to iterate all tabs; batch read each
- Reading 10 tabs of 100×200: approximately 2-5 seconds total
- Aggregation for cross-class analytics computed in Apps Script or on backend

### When this pattern breaks (not applicable at your scale)

- 30 students submitting simultaneously → handled by web app + backend DB, not the Sheet
- Complex cross-teacher analytics → add read-only aggregation layer later
- Need for ACID transactions → Sheet has no transaction support (LockService is best effort)

### Why Sheet-as-database is the right call

| Factor | Sheet as DB | External DB + Sync |
|--------|-------------|-------------------|
| Setup complexity | Zero | Significant |
| Teacher visibility | Full — their spreadsheet | Opaque — data elsewhere |
| Teacher trust | "It's MY spreadsheet" | "Where is my data?" |
| Existing data | Instant value on install | Need import/migration |
| Offline editing | Google Sheets offline mode | Two-way sync is hard |
| Cost | Free | DB hosting costs |
| Add-on review | Simpler scopes | More scrutiny |

---

## Risk Matrix Summary

| Area | Verdict | Key Risk | Severity | Mitigation |
|------|---------|----------|----------|------------|
| Apps Script UI/API | **GO** | Doc comment insertion not natively supported | **Medium** | Prototype Drive API anchored comments early; fallback to highlighting |
| Marketplace | **GO** | 2-6 week review cycle | **Low** | Prepare privacy policy, ToS, homepage upfront |
| Architecture | **GO** | AI grading latency blocks sidebar | **Medium** | Async job + polling pattern (fire-and-forget) |
| Sheet-as-DB | **GO** | Teacher breaks sheet structure | **Low** | Lookup by name, validate on open, graceful recovery prompts |

---

## Phase 1 Technical Validation Priorities

Before building the full Phase 1, validate these two unknowns:

1. **Doc comment insertion**: Build a minimal Apps Script that inserts an anchored comment at a specific text range via the Drive API Advanced Service. Confirm the anchor format works reliably.
2. **Gemini grading quality**: Send sample IELTS essays to Gemini, confirm it returns structured band scores + suggestions in a usable format. (Out of scope for this assessment but critical for product.)

Everything else in the architecture uses proven, well-documented patterns.
