# IELTS Teacher Toolkit — Product Spec

**One-liner:** Google Apps Script add-ons that give IELTS teachers AI grading + analytics without ever leaving Docs & Sheets.

**Last updated:** 2026-04-21

---

## Core principle

**Teachers stay in Google. We come to them.**

No new app to learn. No new tab to manage. The teacher's existing Google Docs and Sheets become intelligent IELTS tools — AI grading lives in the Doc toolbar, analytics live in the Sheet sidebar.

---

## Architecture: where things live

| Surface | Who uses it | What it does |
|---------|-------------|--------------|
| **Google Doc Add-on** | Teacher | AI grading, suggestion review, publish comments — all inside the Doc |
| **Google Sheet Add-on** | Teacher | Student roster, score tracking, analytics sidebar, assignment management |
| **Lightweight Web App** | Students + Parents | Test-taking links, writing/speaking submission, parent progress reports |

The teacher never opens a separate platform. Students get simple links when needed.

---

## The Google Doc Add-on

### What teacher sees

When a teacher opens any Google Doc containing a student essay, the add-on provides:

**Toolbar button: "IELTS Grade"** → opens a sidebar panel inside the Doc.

### Grading flow

```
Teacher opens student's essay in Google Docs
        │
        ▼
Clicks "IELTS Grade" in toolbar → sidebar opens
        │
        ▼
Sidebar shows:
  • Student picker (dropdown from their roster Sheet)
  • Task type: T1 Academic / T1 General / T2
  • [Grade with AI] button
        │
        ▼
AI analyzes the essay → results appear:
  • All AI suggestions auto-inserted as native Google Doc comments
    (anchored to specific text ranges via Drive API)
  • Sidebar shows: band scores (overall + 4 criteria) — each editable
        │
        ▼
Teacher reviews feedback naturally in the Doc:
  • Reads AI comments inline (same as reviewing a colleague's feedback)
  • Resolves, edits, or deletes comments they disagree with
  • Adds their own comments using native Google Docs commenting
  • Adjusts band scores in sidebar if needed
        │
        ▼
[Save scores] button in sidebar:
  • Band scores → written to the linked Google Sheet
  • Done. Teacher never left the Doc.
```

### Speaking — audio grading

**Option A: Audio file**
- Teacher clicks "Grade Speaking" in sidebar
- Upload audio or paste Google Drive link to audio file
- Gemini processes: transcription + grading + suggestions (single API call)
- Sidebar shows: timestamped transcript + band scores + suggestions
- Teacher reviews and accepts/rejects
- [Save] writes scores to Sheet + creates a feedback section in a new Doc (or appends to existing)

**Option B: Transcript in Doc**
- Same as writing flow but with speaking criteria (FC, LR, GRA, Pronunciation)
- Part selector (Part 1/2/3) in sidebar

**Option C: Manual score only**
- Teacher enters band scores directly in sidebar → saved to Sheet

### Sidebar states

**First time (no Sheet linked):**
```
┌─────────────────────────────┐
│  IELTS Grading              │
│                             │
│  To get started, set up     │
│  score tracking:            │
│                             │
│  [Create new Score Sheet]   │
│    (recommended)            │
│                             │
│  [Link existing Sheet]      │
│    We'll try to detect your │
│    student roster & scores  │
│                             │
└─────────────────────────────┘
```

**Create new Sheet flow:**
- Teacher clicks "Create new Score Sheet"
- Add-on creates a properly structured Sheet (Student, Target, W1, W2, R1, R2, L1, S1...)
- Add students:
  - [Import names from a Google Sheet] — pick any file, pick the column with names, preview ("We found 35 names: Minh, Linh, Trang... Correct?"), confirm → names populate column A
  - [Type names manually] — comma-separated or one per line in a text field
- Sheet is linked and ready

**Link existing Sheet flow:**
- Teacher picks a Sheet from file browser
- Add-on attempts structure detection (header row with recognizable names + numeric data)
- If detected: shows preview with header names and student count for confirmation
- If too messy: "We couldn't detect a score structure in this Sheet. Would you like us to create a new Score Sheet instead? Your existing Sheet stays untouched."
- Never silently guesses wrong — either confident detection with confirmation, or clean fallback

**Ready to grade:**
```
┌─────────────────────────────┐
│  IELTS Grading              │
│                             │
│  Student: [Minh ▼]          │
│  Task: [Task 2 Essay ▼]     │
│                             │
│  [Grade with AI]            │
│                             │
│  ─────────────────────────  │
│  Recent: Minh W:6.5, Linh   │
│  W:6.0 graded today         │
└─────────────────────────────┘
```

**After grading:**
```
┌─────────────────────────────┐
│  IELTS Grading — Results    │
│                             │
│  Overall: 6.5               │
│  TA: 7.0  CC: 6.5           │
│  LR: 6.0  GRA: 6.5          │
│  [Edit scores]              │
│                             │
│  ✓ 5 comments inserted      │
│  Review them in the Doc,    │
│  resolve or edit as needed. │
│  Add your own comments      │
│  using Google Docs normally. │
│                             │
│  [Save scores to Sheet]     │
│  [Re-grade]                 │
└─────────────────────────────┘
```

---

## The Google Sheet Add-on

### The Score Sheet IS the database

Teachers already track scores in Sheets. Instead of importing data into a separate app, we enhance the Sheet they already have (or create one with the right structure).

### Sheet structure (created or detected)

```
┌─────────────────────────────────────────────────────────────────┐
│ A         │ B      │ C    │ D    │ E    │ F    │ G    │ H       │
├───────────┼────────┼──────┼──────┼──────┼──────┼──────┼─────────┤
│ Student   │ Target │ R1   │ R2   │ W1   │ W2   │ L1   │ S1      │
├───────────┼────────┼──────┼──────┼──────┼──────┼──────┼─────────┤
│ Minh      │ 7.0    │ 6.0  │ 6.5  │ 5.5  │ 6.0  │ 5.5  │         │
│ Linh      │ 7.5    │ 7.0  │ 6.5  │ 6.0  │ 6.5  │ 6.0  │ 5.5     │
│ Trang     │ 6.5    │ 5.5  │ 5.5  │ 5.0  │      │ 5.0  │         │
└───────────┴────────┴──────┴──────┴──────┴──────┴──────┴─────────┘
```

**For existing Sheets:** Add-on detects columns that look like scores and offers to "activate" them. No migration needed.

**For new teachers:** [Create IELTS Score Sheet] generates a pre-formatted Sheet with proper structure.

### Analytics sidebar (inside Google Sheets)

Opened via menu: **Add-ons → IELTS Toolkit → Show Analytics**

```
┌─────────────────────────────┐
│  Class Analytics             │
│                             │
│  Class avg: 6.2 (↑0.3)     │
│  Weakest skill: Writing     │
│                             │
│  ⚠️ At risk (2):            │
│  • Trang — W avg 5.0,       │
│    target 6.5 by Dec        │
│  • Huy — no scores in 3 wks │
│                             │
│  📈 Improving (3):           │
│  • Minh — W: 5.5→6.0→6.5   │
│  • Linh — R: 6.5→7.0→7.0   │
│                             │
│  [View student detail ▼]    │
│  [Generate parent reports]  │
│  [Create assignment link]   │
└─────────────────────────────┘
```

### What the sidebar provides

- **Class overview:** Average band, trend, weakest skill, at-risk students
- **Student detail:** Click any student → see per-skill trend, projected band, strengths/weaknesses
- **Parent report generation:** Select student → generates a shareable link (hosted on lightweight web app)
- **Assignment links:** Create and manage test/writing/speaking assignment links for students
- **Quick entry:** Bulk score entry mode for paper tests (within the Sheet itself — just type in cells)

### Status logic (same as v1)

| Status | Rule |
|---|---|
| Improving | Upward trend over last 3+ scores |
| Plateaued | No change (+-0.5) over 4+ scores across 1+ month |
| Declining | Dropped 0.5+ over last 3 scores |
| At risk | Target set AND projected band < target by target date |
| Not enough data | Fewer than 3 scores |

---

## Cold-Start Strategy

**The magic: there IS no cold start for many teachers.**

Teachers who already have a score Sheet with student names and bands? They install the add-on, it reads their existing data, and the analytics sidebar is instantly populated. Day one value.

### First-time flows

**Path 1: "I have a Google Doc to grade" (fastest wow moment)**
```
Minute 0:  Install Doc add-on from Workspace Marketplace
Minute 1:  Open a student's essay Doc → click "IELTS Grade"
Minute 2:  "Link a Sheet to save scores" → [Create new] or [Link existing]
Minute 3:  Pick student name (or type new one) → [Grade with AI]
Minute 4:  AI grades → teacher reviews → [Publish]
Minute 5:  Comments appear in Doc. Score saved to Sheet. Done.
```

**Path 2: "I have an existing score Sheet" (fastest to analytics)**
```
Minute 0:  Install Sheet add-on
Minute 1:  Open existing score Sheet → Add-ons → IELTS Toolkit → Activate
Minute 2:  "We detected 12 students and 6 test columns. Correct?"
Minute 3:  Confirm → Analytics sidebar instantly shows trends, at-risk flags
```

**Path 3: "I'm starting fresh"**
```
Minute 0:  Install Sheet add-on
Minute 1:  Add-ons → IELTS Toolkit → Create Score Sheet
Minute 2:  Enter class name, paste/type student names
Minute 3:  Empty Sheet with proper structure → "Grade your first essay to start tracking"
```

---

## The Lightweight Web App (student + parent facing only)

Minimal web app that handles what can't live inside Google Workspace:

### Student test-taking: `/a/:assignmentId`

- Teacher creates assignment link from Sheet sidebar
- Student opens link, picks name from roster, takes test
- R/L: auto-scored, band written directly to teacher's Sheet
- W/S: submission stored, appears in teacher's Doc add-on grading queue

### Student experience

**Reading/Listening:**
- Split panel: passage/audio left, questions right
- Timer, question navigator, section tabs
- Auto-save every 30s, server-authoritative timer
- Score shown immediately on submit

**Writing:**
- Task prompt displayed
- Text editor, live word count, optional timer
- Submit → appears in teacher's grading queue

**Speaking:**
- Prompt/cue card displayed
- Browser audio recording (MediaRecorder API)
- Prep time countdown (Part 2)
- Recording time limit
- Submit → appears in teacher's grading queue

### Parent progress report: `/report/:studentToken`

- Generated from Sheet sidebar → creates a live shareable link
- Shows: student name, current bands, trend chart, strengths/weaknesses in plain language
- Always live (reads from teacher's Sheet data)
- Vietnamese or English

### Grading queue: `/queue` (optional, teacher-facing)

- Lightweight page showing pending W/S submissions
- Teacher can click → opens the student's submission in a Google Doc (auto-created) → grade there with the Doc add-on
- OR: teacher sees pending count in the Doc add-on sidebar and grades from there

---

## Assignment System

### Creating assignments (from Sheet sidebar)

Teacher clicks [Create assignment] in the Sheet add-on sidebar:

**For Reading / Listening (simple — Sheet-native):**
- Option A: Paste answer key directly in Sheet ("1:T, 2:F, 3:NG, 4:C...") — add-on provides a template row format and validates
- Option B: Select a pre-loaded Cambridge IELTS test from the built-in library
- Band conversion table: standard Academic (built-in) or custom

**For Reading / Listening (complex — web app):**
- Sidebar click opens full-width assignment builder in web app (new tab)
- Import from PDF → AI extracts questions + answers
- Build sections, questions, answer types with proper form UI
- Preview and publish → link generated, test data synced back

**For Writing (sidebar is sufficient — simple form):**
- Task type (T1 Academic / T1 General / T2)
- Task prompt text
- Optional stimulus image
- Word minimum, time limit

**For Speaking (sidebar is sufficient — simple form):**
- Part (1/2/3), prompt/cue card text
- Prep time, recording time limit

### Assigning to class

- Pick assignment → generates shareable link
- Configure: timed/untimed, replay settings (listening)
- Link displayed in sidebar + copied to clipboard
- Teacher pastes link in their class group chat / LMS / wherever they communicate

### Results flow

```
Student submits via link
        │
        ├── R/L: auto-scored → band written to Sheet immediately
        │         (teacher sees new score appear in their Sheet)
        │
        └── W/S: submission stored
                    │
                    ▼
              Teacher sees notification in Doc add-on sidebar:
              "3 new submissions to grade"
                    │
                    ▼
              Click → submission opens as Google Doc
              (or teacher grades in lightweight web view)
                    │
                    ▼
              Normal Doc add-on grading flow
                    │
                    ▼
              Score written to Sheet
```

### Pre-loaded test library

Same as v1 — Cambridge IELTS 14-18 answer keys available on first install. Teacher can assign immediately.

---

## What the add-ons need from a backend

The Apps Script add-ons aren't purely client-side. They call a backend API for:

| Function | Why not pure Apps Script |
|----------|------------------------|
| AI grading (Gemini API) | API keys shouldn't live in client-side script |
| Audio transcription | File processing + Gemini multimodal |
| Assignment link hosting | Students need a web URL to take tests |
| Parent report hosting | Parents need a web URL to view reports |
| Session management for tests | Server-authoritative timer, auto-save |
| Usage tracking / monetization | Free tier limits |

**Architecture:**
```
Google Doc/Sheet Add-on (Apps Script)
        │
        ▼ (HTTP calls)
Backend API (Fastify)
        │
        ├── Gemini API (AI grading + transcription)
        ├── Database (assignments, submissions, sessions)
        └── Static hosting (student test UI, parent reports)
```

The Sheet itself IS the score database for the teacher. The backend DB handles assignments, submissions, and session state.

---

## Monetization

| | Free | Pro |
|---|---|---|
| AI essay gradings | 20 / month | Unlimited |
| Students tracked | 30 | Unlimited |
| Assignment links | 5 active | Unlimited |
| Parent report links | 5 students | Unlimited |
| R/L test scoring | Unlimited | Unlimited |
| Analytics sidebar | Full | Full |
| **Price** | $0 | $X / month per teacher |

**Upgrade triggers:** Same as v1 — AI grading limit (daily pain) + parent report limit (parent pressure).

**Payment:** Handled via the backend web app (Stripe). Teacher clicks "Upgrade" in sidebar → opens payment page → license activated.

---

## Design Decisions & Edge Cases

### 1. Google Apps Script limitations

| Limitation | Mitigation |
|---|---|
| Sidebar is 300px wide max | Design for narrow panel — stack vertically, use accordions |
| No real-time updates in sidebar | Poll every 30s for new submissions, or manual refresh button |
| Apps Script execution timeout (6 min) | AI grading calls go to backend; Apps Script just displays results |
| Can't run background tasks | Backend handles async work; sidebar polls for completion |
| Limited UI framework (basic HTML/CSS/JS) | Keep UI simple — this is a feature, not a bug |

### 2. Sheet as database — what if teacher messes up the structure?

**Resolution:**
- Add-on uses named ranges or a hidden metadata sheet to track structure
- If teacher accidentally deletes a column, add-on detects and offers to repair: "Score column 'W2' is missing — restore it?"
- Teacher can freely add their own columns — add-on only reads/writes columns it knows about
- Formatting (colors, borders) is teacher's choice — add-on doesn't override it

### 3. Multiple classes

**Resolution:**
- Each class = one Sheet (tab) within a workbook, OR separate Sheet files
- Add-on lets teacher switch between classes via dropdown
- Analytics can show cross-class view (all tabs/sheets aggregated)

### 4. Student identity matching for online tests

Same as v1:
- Assignment link is class-scoped → dropdown from roster (read from Sheet)
- "I'm not on the list" → type name → teacher matches later

### 5. Re-grading

- Old AI comments stay in Doc (they're real Doc comments — teacher may have already resolved some)
- Re-grade auto-inserts a fresh set of AI comments (may duplicate with unresolved old ones)
- Teacher resolves old comments before re-grading, or the add-on offers to clear unresolved AI comments first
- Sheet keeps latest score (previous scores in earlier columns remain untouched)

### 6. Offline / connectivity

- The Sheet works offline (Google Sheets offline mode)
- AI grading requires internet (backend call)
- Scores entered manually in Sheet cells are always available — they're just cells

### 7. Security

- Backend API authenticates via Google OAuth token from Apps Script
- Student test links: UUID v4, unguessable, teacher can deactivate
- Parent report tokens: UUID v4, non-expiring, teacher can revoke
- No sensitive data in public endpoints (first name + scores only)
- Rate limiting on public endpoints

### 8. Installation & permissions

**Google Doc Add-on permissions:**
- Read/write current document (insert comments)
- Display sidebar
- Connect to external service (backend API)

**Google Sheet Add-on permissions:**
- Read/write current spreadsheet (read roster, write scores)
- Display sidebar
- Connect to external service (backend API)

Minimal permissions. No broad Drive access needed — the add-on only touches the doc/sheet it's installed in.

### 9. Distribution

- Published to Google Workspace Marketplace
- Free to install, Pro features gated by backend license check
- Teacher installs once → available in all their Docs and Sheets

---

## API Key Strategy

We use **our own Gemini API key**, managed server-side in the Fastify backend. Teachers never touch an API key.

- **Validation phase:** Our key, no usage limits, free for test teachers. We absorb the cost (~$2-5 for initial validation round).
- **Post-validation:** Introduce free tier (20 AI gradings/month) and Pro tier. Backend enforces limits via usage tracking.
- **Why not BYOK:** IELTS teachers are not technical enough to obtain and manage their own Gemini API keys. Onboarding friction kills adoption.

---

## Shipping Phases

Build order: Doc add-on first (validates the core value prop — AI grading), with minimal Sheet integration (roster read + score write-back). Backend API from day one to hold API keys and proxy Gemini calls. Foundation code carries forward into later phases.

| Phase | What ships | Details |
|---|---|---|
| **Phase 1: Validate** | **Doc add-on** + **minimal Sheet integration** + **backend API** | Doc add-on: AI writing grading with auto-inserted native Doc comments (via Drive API), sidebar shows band scores (editable) + save to Sheet button. Teacher reviews/edits/deletes AI comments using native Google Docs UI, adds own comments natively. Sheet integration: read student roster (dropdown picker), write band scores back to a column. Backend: Fastify API proxying Gemini with our key, async job pattern. No monetization — free for test teachers. |
| **Phase 2: Enrich** | **Sheet add-on analytics** + **speaking grading** | Analytics sidebar in Sheets (trends, at-risk flags, class overview). Create/detect/activate score sheets. Speaking grading via audio upload (Gemini transcription + grading) in Doc sidebar. |
| **Phase 3: Assign** | **Assignment system** + **student web app** | Create R/L answer keys in Sheet sidebar, generate student test links, auto-score R/L and write to Sheet. Online R/L test-taking web UI. Online W/S submission forms, submission → Doc grading queue. |
| **Phase 4: Share** | **Parent reports** + **pre-loaded content** | Parent shareable report links, pre-loaded Cambridge IELTS 14-18 answer keys, PDF test import. |
| **Phase 5: Scale** | **Monetization** + **distribution** | Stripe payment integration, free/Pro tier enforcement, Workspace Marketplace publishing, Vietnamese language support, cross-class analytics, photo scan for paper answer sheets. |

---

## Why Google-native

| Standalone app approach | This approach (Apps Script add-ons) |
|---|---|
| Teacher learns a new platform | Teacher stays in Docs & Sheets |
| Empty app on first visit | Existing Sheet data = instant value |
| Scores stored in app DB, synced to Sheet | Sheet IS the data — no sync needed |
| Dashboard in app | Analytics sidebar in their Sheet |
| Grading screen in app | Grading sidebar in their Doc |
| Teacher has two tabs open | Teacher has zero new tabs |
| "Yet another ed-tech tool" | "My Google Docs got superpowers" |
| Competes with every IELTS app | Unique positioning — enhances, doesn't replace |

The web app exists only for things that MUST be a URL (student tests, parent reports in later phases). The teacher's entire experience is Google-native.
