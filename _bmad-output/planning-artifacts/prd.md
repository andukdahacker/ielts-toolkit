---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - ielts-teacher-toolkit-product-spec-v2.md
  - research/technical-feasibility-assessment-2026-04-21.md
  - research/market-competitive-landscape-2026-04-21.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 2
  projectDocs: 0
  productSpec: 1
classification:
  projectType: 'SaaS Prosumer → B2SMB (Google Workspace add-on suite + web app + backend API)'
  domain: 'EdTech (IELTS test preparation)'
  complexity: 'medium'
  projectContext: 'greenfield'
  longTermVision: 'Google Workspace-native operating system for IELTS teaching businesses'
---

# Product Requirements Document - IELTS Teacher Toolkit

**Author:** Duc
**Date:** 2026-04-21

## Executive Summary

IELTS teachers spend 10-25 hours per week grading essays — 15-30 minutes each, manually scoring against four criteria, writing repetitive feedback, then hand-entering band scores into spreadsheets. This grading bottleneck caps how many students a teacher can serve and is the single biggest constraint on their income.

The IELTS Teacher Toolkit is a Google Workspace add-on suite that turns teachers' existing Google Docs and Sheets into an intelligent grading-to-insights pipeline. A teacher opens a student essay in Google Docs, clicks "Grade with AI" in the sidebar, reviews and adjusts AI-generated band scores and suggestions, and publishes — comments appear in the Doc, scores flow automatically to their Google Sheet. No new platform. No data entry. No custom spreadsheet formulas to maintain.

The near-term goal is to save IELTS teachers 10+ hours per week by collapsing grading, score tracking, and analytics into a single action. The long-term goal is to become the intelligence and workflow layer for IELTS teaching businesses — earning that position progressively through grading (Phase 1), analytics (Phase 2), assignments (Phase 3), parent communication (Phase 4), and monetization at scale (Phase 5).

The initial target market is independent Vietnamese IELTS tutors — an estimated 5,000-15,000 teachers already using Google Docs for essay feedback and Google Sheets for score tracking. Vietnam has 200,000-400,000+ IELTS test-takers annually, and IELTS scores are recognized for university admission, making prep demand structural, not cyclical.

### What Makes This Special

**Zero-friction data flow.** One grading action in a Doc cascades into organized scores, trend tracking, at-risk student flags, and parent-ready reports — all inside the teacher's existing Google Sheet. From graded essay to updated score sheet in under 60 seconds.

**Google-native, not Google-adjacent.** The teacher never opens a separate platform. The Doc sidebar is the grading interface. The Sheet sidebar is the analytics dashboard. The Sheet itself is the database — and the teacher trusts it because it's theirs.

**IELTS-specific intelligence.** Not a generic rubric tool. Native IELTS band descriptors (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy), task type awareness (Task 1 Academic/General, Task 2), and speaking criteria built in. Teachers see their domain language, not a generic "custom rubric" form.

**No competitive overlap.** Student-facing AI graders (Cathoven, LexiBot, IELTS-GPT) don't serve teachers. Teacher-facing AI graders (VibeGrade, CoGrader) don't speak IELTS. Institute platforms (Prep27, AlfaIELTS) aren't Google-native. No product combines all three.

**The real moat is data.** Google Workspace integration is replicable. Accumulated grading data across thousands of IELTS essays — and AI models refined on teacher corrections — is not.

## Project Classification

- **Type:** SaaS Prosumer → B2SMB (Google Workspace add-on suite + Fastify backend API + lightweight student web app)
- **Domain:** EdTech — IELTS test preparation
- **Complexity:** Medium (student privacy considerations, Google Marketplace compliance, AI grading accuracy validation; no heavy regulatory burden)
- **Context:** Greenfield

## Success Criteria

### User Success

| Metric | Target | Why this number |
|--------|--------|-----------------|
| Time per essay grading | Under 5 minutes (from 15-30) | 3-6x improvement is the threshold where teachers *feel* the difference |
| AI comment retention rate | 60-80% of auto-inserted comments kept (not deleted) | Below 60% = AI isn't useful enough. Above 80% = teachers aren't reviewing (trust problem). Sweet spot means the AI does heavy lifting, teacher adds judgment |
| Score manual entry eliminated | 100% — zero manual data entry after grading | This is the "zero-friction" promise. Any manual step breaks it |
| Time to first grading | Under 5 minutes from install | Install add-on → open Doc → link/create Sheet → grade first essay. If this takes longer than 5 minutes, cold start kills adoption |
| Repeat usage | Teacher grades again within 7 days of first use | The second session is where the "aha" lands — they open their Sheet and see scores already there |

### Business Success

| Timeframe | Metric | Target |
|-----------|--------|--------|
| Month 1 | Beta teachers actively grading | 20-30 teachers (hand-recruited from Vietnamese IELTS Facebook communities) |
| Month 3 | Weekly active teachers | 200+ (organic growth starting via word-of-mouth) |
| Month 3 | Retention (W4 after signup) | 40%+ still grading weekly |
| Month 6 | Free → Pro conversion | 8-12% of active free users hitting the ceiling and upgrading |
| Month 6 | Pro MRR | $500+ (validates willingness to pay before scaling) |
| Month 12 | Weekly active teachers | 2,000+ across Vietnam + early international |
| Month 12 | Pro MRR | $5,000+ |

The milestone that matters most: **Month 3 retention at 40%+**. If teachers who try it keep coming back weekly, everything else follows. If they don't, no amount of marketing fixes it.

### Technical Success

| Metric | Target | Non-negotiable? |
|--------|--------|-----------------|
| AI grading latency (end-to-end) | Under 30 seconds from click to results in sidebar | Yes — longer than 30s and the teacher alt-tabs, loses context |
| AI band score accuracy | Within 0.5 band of experienced IELTS examiner on 80%+ of essays | Yes — below this, teachers won't trust it |
| Doc comment insertion | Works reliably on 95%+ of documents | No — can fall back to text highlighting if Drive API anchoring is flaky |
| Score write-back to Sheet | 100% success rate, under 5 seconds | Yes — this is the core data flow |
| Backend uptime | Best effort Phase 1 (no unplanned downtime during peak evenings/weekends), 99.5%+ Phase 2+ | Teachers grade in bursts. Downtime during peak = lost trust |

### Measurable Outcomes

The single number that captures product-market fit: **essays graded per active teacher per week**. If a teacher with 30 students is grading 15+ essays per week through the tool (versus manually), the product has become part of their workflow, not a novelty.

## User Journeys

### Journey 1: Linh's First Grading — The Trigger Moment (Phase 1)

**Who:** Linh, 27, independent IELTS tutor in Hanoi. Teaches 35 students across 3 small group classes. Charges VND 5 million per student for a 2-month course. Grades 25-30 essays per week, mostly on Sunday evenings and late weeknights. Uses Google Docs for essay collection, Google Sheets for score tracking (a messy spreadsheet she built herself with inconsistent column names). Found the IELTS Toolkit via a Facebook group post from another tutor.

**Opening Scene:** It's 9:30pm on a Tuesday. Linh has 8 essays to grade before tomorrow's class. She's already tired from teaching 4 hours today. She opens Minh's Task 2 essay in Google Docs — "Some people believe that technology has made our lives more complex. To what extent do you agree or disagree?" — and sees 280 words of intermediate-level English. Normally, she'd spend the next 20 minutes reading, annotating, scoring, then switching to her Sheet to type in the band scores. Tonight, she decides to try the add-on she installed this morning.

**Rising Action:** She clicks "IELTS Grade" in the Doc toolbar. A sidebar opens. It asks her to set up score tracking — two options: "Create new Score Sheet" (recommended) or "Link existing Sheet." Her current tracking Sheet is a mess of merged cells and inconsistent columns, so she picks "Create new Score Sheet." The sidebar then asks how to add students: "Import names from a Google Sheet" or "Type names manually." She picks Import, selects her old messy Sheet, and the add-on shows her the columns. She picks the one with student names. "We found 35 names: Minh, Linh, Trang... Correct?" She confirms. A fresh Google Sheet is created — pre-formatted with proper columns, 35 student names already in column A. Her old Sheet stays untouched. Total setup: under a minute.

Back in the Doc sidebar, the new Sheet is linked. She selects "Minh" from the student dropdown, picks "Task 2 Essay," and clicks "Grade with AI." A spinner appears: "Analyzing essay... usually 10-15 seconds." She glances at her phone. 15 seconds later, the sidebar updates.

Two things happen simultaneously: the sidebar shows band scores — Overall 6.0, TA: 6.0, CC: 6.5, LR: 5.5, GRA: 6.0, each editable — and in the Doc itself, 5 comments appear in the margin, anchored to specific text. They look exactly like comments from a colleague — because they appear under Linh's own Google account. No "AI" label, no bot name. The sidebar also shows a collapsible section: "AI Feedback Summary (5 comments)" — a persistent reference list of everything the AI suggested, in case she accidentally deletes a comment.

She reads through the comments inline, the way she'd review any colleague's markup. The first flags an overcomplicated sentence in paragraph 2 — she agrees, resolves it. The second calls out overuse of "furthermore" — fair point, she leaves it. The third flags a vocabulary issue she disagrees with — she deletes it. She selects a weak conclusion sentence and adds her own comment using Google Docs' native commenting. She bumps LR from 5.5 to 6.0 in the sidebar based on her own judgment.

**Climax:** She clicks "Save scores to Sheet." The sidebar shows "3 comments still unresolved" — not a blocker, just awareness. Band scores write to her Sheet in 2 seconds. Total time: 4 minutes. Minh will open this Doc tomorrow and see thoughtful, specific feedback from his teacher. He won't know which comments Linh wrote and which the AI drafted — and that's the point.

**Resolution:** She clicks the next student in the sidebar. The grading panel resets — new student name, same task type. She clicks "Grade with AI" again. 15 seconds. Results. Review. Save. 3 minutes this time. By 10:15pm, all 8 essays are graded. She opens her Sheet and sees the scores already filled in. She screenshots the sidebar and posts it to her IELTS teacher Facebook group: "This just saved me 2 hours."

**What Could Go Wrong:**

**Unhappy path A — AI grading fails:** Linh clicks "Grade with AI." The spinner runs for 30 seconds, then: "Grading failed — please try again. If this keeps happening, grade manually and we'll save your scores." She can still enter band scores manually in the sidebar and save to Sheet. The tool is useful even when the AI is down.

**Unhappy path B — Comment anchoring partially fails:** AI grading succeeds, but 2 of 5 comments can't anchor to specific text. The sidebar reports: "3 comments anchored, 2 added as general feedback." The unanchored comments appear in the Doc's comment panel without linking to specific text. Minor friction, not a dealbreaker.

**Unhappy path C — Sheet linking picks wrong file:** Linh accidentally selects her personal budget Sheet. The add-on scans it: "We couldn't detect a student roster in this Sheet. Would you like to create a new Score Sheet instead?" She clicks yes, imports student names, back on track in 30 seconds.

**Requirements revealed:** Add-on installation and OAuth flow, Sheet creation with student name import from existing Sheet, AI grading with async job pattern and progress spinner, auto-inserted Doc comments under teacher's account (no AI branding), collapsible AI feedback summary in sidebar, editable band scores, non-blocking save to Sheet, student navigation in sidebar, manual score entry fallback, tiered comment fallback with status reporting, Sheet structure validation with recovery path.

---

### Journey 2: Linh's Sunday Batch — The Habit (Phase 1)

**Who:** Linh, 3 weeks in. She's graded 60+ essays through the tool. The novelty has worn off — now it's about whether it fits her routine.

**Opening Scene:** Sunday 7pm. Linh has 24 essays to grade across her 3 classes before Monday. Before the add-on, this was a 6-8 hour ordeal she dreaded all weekend. She makes coffee, opens her laptop, and starts.

**Rising Action:** She opens the first student's essay Doc. The sidebar opens automatically, showing the linked Sheet and the student context: "Minh — Task 2 Essay." She's developed a rhythm: hit Grade, scan the band scores in the sidebar while the AI comments populate the Doc (4-8 seconds for comments to insert after grading completes), read through the comments inline, resolve or delete as she goes, add one or two of her own where she sees something the AI missed, adjust a score if needed, click Save, click the next student arrow.

Each essay takes 3-5 minutes. She's not rubber-stamping — she's reviewing with a sharp eye, but the AI handles the heavy lifting on grammar issues and structural problems. The sidebar's "← Trang | **Minh** | Anh →" navigation keeps her in flow state without switching browser tabs.

On essay #7, the AI scores TA at 6.5 but Linh sees a subtle Task Achievement issue — the student went off-topic in the conclusion. She adjusts TA down to 6.0 in the sidebar and adds her own comment on the conclusion paragraph.

On essay #14, one AI comment appears without anchoring to specific text — it shows up in the Doc's comment panel but isn't linked to a passage. The sidebar notes: "4 comments anchored, 1 general." She reads the general comment, copies it as an inline comment where she thinks it belongs.

**What Could Go Wrong:**

**Unhappy path — AI returns questionable scores:** On essay #11, the AI scores Overall 7.5 for a student Linh knows is solidly Band 6. She reads the essay — well-structured but significant vocabulary issues the AI overlooked. She adjusts all four criteria down and adds her own comments. The system saves whatever the teacher decides. She notes the AI is less reliable on certain essay types — but it still saved her 15 minutes on this essay.

**Climax:** By 9:30pm — 2.5 hours — she's done. All 24 essays graded, commented, scores recorded. She opens her Sheet. Every row is populated. She notices Minh has improved from 5.5 to 6.0 to 6.5 over three essays — a pattern she never saw when entering scores manually.

**Resolution:** She texts Minh on Zalo: "Great improvement on your last 3 essays! Your CC went from 5.5 to 6.5." Minh replies with a heart emoji. Linh has her entire Sunday evening back.

**Requirements revealed:** Sidebar auto-open with student context, previous/next student navigation, comment insertion latency (~4-10s for 5-8 comments), teacher score override, tiered comment fallback with transparent status, batch performance across 20+ consecutive sessions, AI score disagreement handling.

---

### Journey 3: Linh Hits the Ceiling — The Upgrade Moment (Phase 2)

**Who:** Linh, 2 months in. She's graded 80+ essays through the tool. It's part of her routine. She's on the free tier — 20 AI gradings per month.

**Opening Scene:** Third Sunday of the month. Linh has 18 essays to grade. She's already used 17 of her 20 free AI gradings. She doesn't know the exact count.

**Rising Action:** She grades essay #1. Fine. Essay #2. Fine. Essay #3 — she clicks "Grade with AI" and the sidebar shows: "You've used 20 of 20 free AI gradings this month. Resets in 8 days." Two options: "[Upgrade to Pro — unlimited gradings]" and "[Enter scores manually]."

She has 15 essays left. It's 8pm on a Sunday. She does the math: 15 essays × 20 minutes manually = 5 hours. Or she can pay.

She taps "Upgrade to Pro." A page opens: unlimited AI gradings, unlimited students, priority support. $9/month. Payment options: MoMo, ZaloPay, bank transfer, or card. She picks MoMo — taps, confirms with her fingerprint, done in 15 seconds. Back in the Doc, the sidebar refreshes: "Pro — unlimited gradings." She clicks "Grade with AI." 15 seconds later, she's back in flow.

**Climax:** The paywall hit at the exact moment of maximum pain — mid-batch, Sunday evening, 15 essays staring at her. The free tier gave her enough to build the habit (20 gradings ≈ 1 week of light usage). The ceiling hit when going back to manual grading felt unbearable. The price ($9/month) is less than one hour of her tutoring rate. The payment method (MoMo) is what she uses for everything.

**Resolution:** Linh finishes all 18 essays by 10pm. She won't think about the subscription again until she sees the charge next month — and by then, she can't imagine grading without it.

**Requirements revealed:** Usage tracking and limit enforcement, clear paywall messaging with remaining count, upgrade flow within sidebar context, Vietnamese payment methods (MoMo, ZaloPay, bank transfer), instant activation after payment, manual score entry as always-available fallback, monthly reset cycle, Pro tier feature unlocking.

---

### Journey 4: Linh Discovers Analytics — The Second Aha

> **Phase 2 — Future context.** This journey informs Phase 1 data capture requirements but is not a Phase 1 deliverable.

**Who:** Linh, 6 weeks in. Phase 2 analytics sidebar has launched.

**Opening Scene:** Monday morning. Linh opens her class roster Sheet to prep for tonight's class. She clicks "Add-ons → IELTS Toolkit → Show Analytics."

**Rising Action:** The sidebar shows a class overview: Class average 6.2 (up 0.3). Weakest skill: Writing Lexical Resource. Two "At Risk" students: Trang (W average 5.0, target 6.5 by December) and Huy (no scores in 3 weeks). Three "Improving" students with green indicators.

She clicks Trang's name. Per-skill breakdown: Reading 5.5, Writing 5.0, Listening 5.5, Speaking — no data. Task Achievement is weakest at 4.5.

**Climax:** Linh didn't build this. She just graded essays — and the analytics emerged as a byproduct. She can walk into class tonight and say to Trang: "Let's work on your essay structure."

**Resolution:** She generates a parent report for Trang — a shareable link sent via Zalo.

**Phase 1 data capture implications:** From day one, the Sheet must store: student name, target band, per-skill scores with dates, task types. This structure enables analytics without migration later.

**Requirements revealed:** Analytics sidebar in Sheets, class overview with averages and trends, at-risk student detection, student detail drill-down, per-criterion breakdown, parent report generation.

---

### Journey 5: Minh Takes a Reading Test — The Student Side

> **Phase 3 — Future context.** Informs backend data model (assignments, submissions, sessions) but not actionable until student web app ships.

**Who:** Minh, 20, university student prepping for IELTS 7.0. One of Linh's students.

**Opening Scene:** Minh taps a link from Linh in their Zalo class group. A clean web page opens: "IELTS Reading Practice — Cambridge 16, Test 3." He picks his name from the roster dropdown, starts the timed test (40 questions, 60 minutes, server-authoritative timer).

**Key moments:** Auto-save every 30 seconds. Phone battery dies at 12% — he borrows a roommate's phone, opens the same link, session resumes exactly where he left off. Submits. Score shown immediately: 28/40, Band 6.5. Score writes automatically to Linh's Sheet.

**Requirements revealed:** Student web app, timed test UI, session persistence across devices, auto-scoring with band conversion, score write-back to teacher's Sheet.

---

### Journey 6: Minh's Mother Checks Progress — The Parent Side

> **Phase 4 — Future context.** Informs parent report data contract and Vietnamese language requirements.

**Who:** Mrs. Nguyen, 52, Minh's mother. Paying for Minh's IELTS course.

**Key moments:** Taps Zalo link from Linh. Vietnamese-language page shows: Overall projection 6.5, target 7.0, four skill boxes with trend arrows, plain-language summary. "This report updates automatically as new scores are added." Forwards to husband. Checks again 3 weeks later — scores updated.

**Zalo sharing note:** Report links must preview cleanly via Zalo (Open Graph meta tags, Vietnamese title/description, thumbnail).

**Requirements revealed:** Shareable report page with token-based URL, Vietnamese language, live data, trend visualization, Zalo-friendly link previews, mobile-friendly, no auth required.

---

### Journey Requirements Summary

| Journey | Phase | Key Capabilities |
|---------|-------|-----------------|
| **1. First Grading** | **1** | OAuth flow, Sheet creation + name import, AI grading (async), auto-inserted Doc comments, sidebar scores, save to Sheet, unhappy paths (AI failure, anchor degradation, wrong Sheet) |
| **2. Sunday Batch** | **1** | Student navigation, batch performance, teacher score override, tiered comment fallback, AI disagreement handling |
| **3. Upgrade Moment** | **2** | Usage tracking, paywall UI, Vietnamese payments (MoMo/ZaloPay), instant activation, manual fallback |
| **4. Analytics Discovery** | **2** | Analytics sidebar, at-risk flags, student drill-down. *Phase 1 implication: Sheet data structure* |
| **5. Student Test** | **3** | Student web app, timed tests, session persistence, auto-scoring, score write-back |
| **6. Parent Report** | **4** | Shareable report, Vietnamese language, Zalo link preview, live data |

## Domain-Specific Requirements

### Data Privacy

- Student PII stored: first name + band scores in teacher's Google Sheet (teacher-owned, teacher-controlled)
- Backend stores: submission content (essays, audio), assignment data, test session state
- No student email addresses or contact info collected — roster is name-only
- PII stripping: backend proxy strips student names from Gemini prompts. Only essay text + grading rubric sent to AI
- Parent report links use opaque tokens (UUID v4) — no PII in URLs
- Data residency: backend on Google Cloud (Singapore region for SEA latency)
- Teacher data deletion: soft-delete API endpoint for submission history. Teacher can also delete their Sheet + revoke add-on access
- CSV export from Sheet sidebar — teachers can download score data as backup at any time

### Google Marketplace Compliance

- OAuth scopes: `.currentonly` variants only (non-sensitive)
- Privacy policy URL required before Marketplace submission
- Terms of service URL recommended
- Data handling disclosure: add-on sends document content to external API (Google AI Studio) for AI processing — must be clearly stated
- No broad Drive access — only current document/spreadsheet

### AI Grading

- AI processing via Google AI Studio (Gemini API). Simpler setup, lower cost for validation phase
- Privacy policy must disclose AI Studio's data handling terms (input may be used for model improvement)
- Future consideration: migrate to Vertex AI for enterprise data guarantees if needed for compliance or center sales
- Band scores are always teacher-editable — AI suggests, teacher decides
- No claim of "examiner-equivalent" accuracy in marketing or in-product messaging
- AI comments appear under teacher's account — teacher is the curator

### Payment & Billing

- Payment processing via Polar.sh — Merchant of Record handling subscriptions, tax compliance, billing
- Polar handles: payment collection, retry logic, tax calculation, subscription management, feature entitlements per tier
- Backend maintains local entitlement cache (user_id, plan, status, valid_until) synced via Polar webhooks. Never check Polar API on hot path
- Webhook handlers must be idempotent with retry/dead-letter handling
- Card-only at launch. Vietnamese mobile wallets (MoMo/ZaloPay) evaluated when revenue signal justifies adding a local payment gateway alongside Polar
- Pricing displayed in VND for Vietnamese users
- Subscription management via Polar-hosted customer portal

### Operational Requirements

- **Rate limiting**: per-user limits on AI grading calls enforced at backend proxy (prevent cost exposure from compromised accounts or abuse)
- **Degradation behavior**: when backend is unavailable or AI grading fails, sidebar displays clear error state and allows manual score entry. The add-on is useful even without AI
- **Backend cold starts**: Cloud Run minimum 1 instance to avoid 5-10s first-request delay

### Risk Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini processes student essay content | Privacy concern | Strip PII at proxy layer. Disclose AI Studio data handling in privacy policy. Migrate to Vertex AI if compliance requires it |
| AI gives inaccurate band score | Reputational damage | Scores always editable. Never auto-save without teacher action. No accuracy claims in marketing |
| Teacher's Sheet deleted or corrupted | Score data lost | CSV export available as backup. Backend retains submission/grading session history for recovery. Sheet is teacher-owned — communicate this clearly |
| Google changes Apps Script APIs | Product breaks | Monitor Workspace updates blog. Keep scopes minimal. Maintain headroom in architecture for migration |
| Polar outage | Teachers can't upgrade or access is mis-checked | Local entitlement cache with TTL. Degrade gracefully — don't revoke access on webhook failure |
| Card-only blocks Vietnamese conversion | Revenue limited to ~5% with cards | Acceptable for validation. Add local payment gateway when revenue signal justifies it |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. AI-assisted teacher feedback.** AI drafts feedback as native Google Doc comments, and the teacher reviews, edits, and curates before saving. The teacher is the author — AI is the drafting tool, like Grammarly for grading. Comments appear under the teacher's account because the teacher approved them. This is distinct from competitor tools that brand AI output separately. Optional disclosure mode available: teachers can toggle "Feedback assisted by AI tools" on comments if they choose transparency with students.

**2. Sheet-as-database with emergent analytics.** The teacher's Google Sheet isn't a sync target — it *is* the database. Analytics emerge as a byproduct of grading, not as a separate workflow. This inverts the typical SaaS pattern and creates unusual trust: teachers trust the data because they can see and edit it directly. Competitors can copy the feature but struggle to copy the conviction to not own the data.

**3. Zero-friction entry.** Teachers create a new clean Sheet and import student names from their old messy Sheet. No data migration. No restructuring. This is a distribution innovation — the #1 reason teachers don't adopt new tools is switching cost. "Start today, no setup required" is a conversion unlock that compounds through habit formation.

**4. Cascading single-action workflow.** One click ("Grade with AI") triggers: essay analysis, comment insertion, band score display, and score write-back to Sheet. Four manual steps collapse into one action + one confirmation. The headline outcome: "Grade 30 students in the time it used to take to grade 3."

**5. Proprietary grading intelligence (the real moat).** Every time a teacher adjusts an AI band score or deletes an AI comment, that's a training signal. Over thousands of essays, teacher corrections accumulate into a proprietary dataset that refines IELTS grading accuracy. Google Workspace integration is replicable. A grading model calibrated by thousands of real IELTS teachers' corrections is not. This is the long-term defensible moat.

### Emergent Innovations (not yet designed for, but architecturally supported)

**Sheet as collaborative artifact.** Vietnamese tutors often work in small clusters. Multiple teachers sharing a class Sheet already works via Google Sheets' native sharing. Teacher A grades, Teacher B sees progress, center director has a view. No new feature needed — the architecture supports emergent collaboration.

**Band score calibration as professional development.** When a teacher sees the AI's score before confirming, they're comparing against their own implicit judgment. Over time, this feedback loop helps teachers calibrate their own scoring consistency. Professional development baked into the grading workflow.

### Validation Approach

| Innovation | How to validate | Success signal |
|-----------|----------------|----------------|
| AI-assisted feedback | Wizard of Oz test: manually write IELTS-style comments for 5 teachers over 2 weeks. Measure edit rate | Edit rate 20-60% = AI is useful but teachers add judgment. >60% = AI drafts aren't good enough |
| Sheet-as-database | Give 3 teachers a pre-built Sheet template (no app). Use for 2 weeks | Teachers don't abandon or restructure the schema |
| Zero-friction entry | Measure onboarding completion: install → first grading | >60% complete first grading within 5 minutes |
| Cascading workflow | Time one grading session: grade + comment + record for one student | 5x time reduction vs. manual baseline |
| Grading intelligence | Track AI score accuracy over time as corrections accumulate | Mean band score deviation from teacher decreases month over month |
| Price sensitivity | Van Westendorp survey or "would you pay $X" with first 20 pilot teachers | Identifies acceptable price range for Vietnamese market |

### Innovation Risk Mitigation

| Innovation Risk | Fallback |
|----------------|----------|
| Doc comment anchoring unreliable | Tiered fallback: anchored → general → appended |
| Teachers don't trust AI scores | Scores always editable. Manual entry always available |
| Sheet-as-database hits scale ceiling | Planned migration: backend Postgres as source of truth, Sheet as display layer |
| AI-assisted framing still concerns teachers | Optional disclosure toggle. Teacher controls transparency level |
| Teacher corrections don't improve AI | Corrections still inform product decisions (common error patterns, rubric gaps) even without model fine-tuning |

## SaaS-Specific Requirements

### Project-Type Overview

A Google Workspace add-on suite operating as a prosumer SaaS with three delivery surfaces: Doc sidebar (grading), Sheet sidebar (analytics), and lightweight web app (student tests, parent reports). The add-on is the primary product surface; the web app handles what must be a URL. Backend API on Cloud Run serves both surfaces.

### Tenant Model

**Phase 1: Teacher-as-tenant.** Each teacher is an independent tenant. Their Google Sheet is their data store. Backend stores submissions, grading sessions, and entitlement state keyed to teacher's Google account (email/sub from ID token). Every database table includes `teacher_id` (UUID) as a first-class column with index from day one — center model in Phase 2 requires it.

**Phase 2+: Center model.** Owner/admin role that manages multiple teachers under one billing account:
- Owner can view analytics across all teachers' classes
- Owner manages subscription (one Pro plan covers N teacher seats)
- Teachers within a center share nothing by default — each has their own Sheet. Cross-visibility is opt-in via Google Sheets' native sharing
- Owner dashboard: web app page (too complex for 300px sidebar)

**Data isolation:** Teacher A cannot see Teacher B's data through the add-on. Backend enforces tenant boundaries via authenticated Google ID token.

### Permission Model

| Role | Surface | Capabilities | Auth method |
|------|---------|-------------|-------------|
| **Teacher** | Doc sidebar + Sheet sidebar | Grade essays, review/edit AI comments, save scores, view analytics, create assignments, generate reports | Google OAuth (ID token from Apps Script) |
| **Owner/Admin** (Phase 2+) | Web app dashboard | Manage teachers, view cross-teacher analytics, manage billing, configure center settings | Google OAuth via web app |
| **Student** | Web app | Take assigned tests, submit essays/speaking, view own scores on submission | No auth — roster dropdown + assignment link (UUID) |
| **Parent** | Web app | View student progress report | No auth — token-based URL (UUID v4), teacher can revoke |

**Entitlement enforcement:** Backend checks teacher's Polar subscription status (cached locally with TTL) on every AI grading request. Free tier: 20 AI gradings/month. Pro: unlimited. Manual score entry always works regardless of tier.

### Subscription Tiers

| | Free | Pro | Center (Phase 2+) |
|---|---|---|---|
| AI essay gradings | 20/month | Unlimited | Unlimited |
| Students tracked | 30 | Unlimited | Unlimited |
| Assignment links | 5 active | Unlimited | Unlimited |
| Parent report links | 5 students | Unlimited | Unlimited |
| R/L test scoring | Unlimited | Unlimited | Unlimited |
| Analytics sidebar | Full | Full | Full + cross-teacher |
| Owner dashboard | — | — | Yes |
| **Price** | $0 | ~$9/month | ~$X/seat/month |

### Integration Surface

| Integration | Phase | Purpose | API/Method |
|-------------|-------|---------|------------|
| **Google Docs** | 1 | Read essay text, insert comments | DocumentApp + Drive API Advanced Service |
| **Google Sheets** | 1 | Read roster, write scores, analytics data | SpreadsheetApp + Developer Metadata |
| **Google AI Studio (Gemini)** | 1 | AI essay grading, speaking transcription | REST API via backend proxy |
| **Polar.sh** | 2 | Subscription billing, entitlements | Webhooks + REST API |
| **Google Calendar** | Future | Class scheduling, exam date tracking | Calendar API |
| **Gmail** | Future | Notification emails (grading complete, report shared) | Gmail API or SMTP via backend |

### Technical Architecture

**Apps Script as thin UI shell.** Sidebars are presentation layers only. All business logic, AI processing, and data management live in the Fastify backend.

**Score write-back: Apps Script relay pattern.** Backend returns score JSON. The add-on writes to Sheet using SpreadsheetApp. Backend never stores OAuth tokens. Clean credential boundary — no refresh token rotation, no revocation handling. Tradeoff: sidebar must be open for writes (fine for Phase 1).

**Authentication:**
- Teacher: `ScriptApp.getIdentityToken()` → backend verifies via Google Auth Library → identity from email/sub
- Student/Parent: no auth — access via UUID links

**Error contract (all endpoints):**
```json
{ "error": { "code": "GRADING_FAILED", "message": "...", "retryable": true } }
```

**Phase 1 backend — 4 endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Cloud Run health check |
| `/grade` | POST | Submit essay for AI grading → returns `{ jobId }` |
| `/grade/:jobId/status` | GET | Poll for completion → returns `{ status, result?, error? }` |
| `/webhooks/polar` | POST | Polar billing events (idempotent handler) |

Auth via Google ID token middleware on `/grade` routes. Job IDs as UUIDs (not sequential — prevents enumeration). Job state in `grading_jobs` table. No queue infrastructure — Cloud Run handles concurrency.

**Database: Cloud SQL PostgreSQL** (db-f1-micro, ~$7-10/month, Singapore region). PgBouncer enabled from day one for connection pooling as Cloud Run scales. Migrations via Prisma.

**Sidebar UI: Preact + Vite.** ~3KB bundle, `preact/signals` for polling state. Vite builds to single HTML file. Target 100KB inline bundle ceiling. Local dev via `index.dev.html` that mocks `google.script.run`.

**Deployment:**
- Apps Script: `clasp` CLI, direct link install (skip Marketplace review for Phase 1 — faster iteration)
- Backend: Fastify on Cloud Run, minimum 1 instance, Singapore region
- Database: Cloud SQL PostgreSQL with PgBouncer
- Student web app: React SPA on Vercel (Phase 3+)

**clasp + Vite workflow:** Never run both watchers simultaneously (race condition). Post-build script: Vite build → clasp push. Source maps useless in Apps Script editor — use local HTML preview harness.

### Build Order (Phase 1)

1. **Backend skeleton** — Fastify + `/health` + `/grade` + `/grade/:jobId/status` + auth middleware + DB schema. Deploy to Cloud Run immediately (discover latency issues early — `UrlFetchApp` has 30s hard timeout)
2. **Sheet integration** — Create Sheet, student name import, score write-back via relay pattern. This exercises the full end-to-end path with simpler UI than the Doc add-on
3. **Doc add-on** — Sidebar UI (Preact), grading flow, comment insertion via Drive API, band score display, save trigger
4. **Billing webhook** — Polar handler, local entitlement cache
5. **Integration testing** — End-to-end: grade → comment → score flow

### Testing Strategy

| Layer | Tool | Coverage | When |
|-------|------|----------|------|
| **Unit** | Vitest | Business logic in plain TS modules (`src/lib/`). Mock Apps Script APIs as interfaces | Every commit |
| **Integration** | `gas-local` | `.gs` files in Node with mock Apps Script environment. Covers `google.script.run` handler wiring | Every PR |
| **E2E** | `clasp run` | Against real test document in dedicated GCP project. Auth, quota, Drive API surface | PR merge only |

### Key Technical Risks (Resolve First)

1. **Drive API comment anchoring** — prototype in week 1. If unreliable, fall back to text highlighting
2. **Gemini grading quality** — prompt engineering + evaluation against human-scored essays in week 1-2
3. **Apps Script ↔ backend latency** — deploy backend early, measure round-trip with `UrlFetchApp`

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — validate that AI-assisted essay grading with automatic score tracking is valuable enough for teachers to use repeatedly.

**Core hypothesis:** Teachers will grade essays through the add-on (instead of manually) at least 15 times per week once they've used it for 2+ weeks.

**Resource requirements:** Solo developer. Fastify backend + Apps Script add-on + Gemini integration. No designer needed for Phase 1 — 300px sidebar UI is minimal enough to build with Preact components directly.

### MVP Feature Set (Phase 1)

**Core journeys supported:** Journey 1 (First Grading) and Journey 2 (Sunday Batch) only.

**Must-have capabilities:**

| Capability | Why it's must-have |
|-----------|-------------------|
| Doc add-on sidebar with "Grade with AI" | The trigger moment. Without it, no product |
| AI essay grading (Task 1 + Task 2) | The core value prop |
| Auto-inserted Doc comments via Drive API | The "wow" — feedback appears instantly in the Doc |
| Collapsible AI feedback summary in sidebar | Teacher's reference for what AI suggested |
| Editable band scores in sidebar (TA, CC, LR, GRA, Overall) | Teacher-as-curator. Must be able to override |
| Save scores to Sheet (relay pattern) | The cascade. Grading → data flow |
| Create new Score Sheet with student name import | First-run onboarding. Zero-migration entry |
| Link existing Sheet with structure detection + fallback | Alternative onboarding for organized teachers |
| Student picker dropdown (from Sheet roster) | Which student am I grading? |
| Previous/next student navigation | Batch grading flow state |
| Manual score entry (no AI) | Fallback when AI is down or quota is hit |
| Async grading with polling + spinner | UX requirement — grading takes 10-30s |
| Backend: 4 endpoints (health, grade, poll, webhook) | Minimum viable API |

**Explicitly NOT in Phase 1:**

| Feature | Why it waits |
|---------|-------------|
| Analytics sidebar in Sheet | Phase 2. But Phase 1 Sheet structure must support future analytics |
| Speaking grading (audio) | Phase 2. Adds Gemini multimodal complexity |
| Assignment system / student links | Phase 3. Requires student web app |
| Student web app | Phase 3 |
| Parent reports | Phase 4 |
| Monetization (Polar, paywall) | Phase 2. Phase 1 is free for beta teachers |
| Vietnamese language support | Phase 5 |
| Google Calendar / Gmail | Future |
| Marketplace publishing | Phase 5. Phase 1 deploys via clasp direct link |

### Post-MVP Features

**Phase 2 — Enrich:**
- Sheet analytics sidebar (class overview, at-risk flags, student drill-down)
- Speaking grading via audio upload
- Polar.sh billing + free/Pro tier enforcement
- Paywall UI in sidebar (Journey 6: Upgrade Moment)
- Sheet structure detection for existing Sheets
- CSV export for score backup

**Phase 3 — Assign:**
- Assignment system (Sheet-native answer keys + web app builder)
- Student web app (R/L test-taking, W/S submission)
- Submission → Doc grading queue
- Pre-loaded Cambridge IELTS 14-18 answer keys

**Phase 4 — Share:**
- Parent shareable report links (Vietnamese language)
- Zalo-optimized link previews

**Phase 5 — Scale:**
- Google Workspace Marketplace publishing
- Vietnamese language support across all surfaces
- Center owner/admin role + dashboard
- Cross-class analytics
- Google Calendar + Gmail integration
- Sheet → backend Postgres migration (Sheet remains display layer)
- Annual billing option

### Risk Mitigation Strategy

**Technical risks:**

| Risk | Mitigation | Decision point |
|------|-----------|----------------|
| Drive API comment anchoring unreliable | Prototype week 1. Fallback: text highlighting + appended section | If <80% anchor success rate, switch to fallback |
| Gemini grading quality insufficient | Prompt engineering + evaluation against 50 human-scored essays week 1-2 | If mean deviation >1.0 band, pause and rework prompts |
| Apps Script ↔ backend latency too high | Deploy backend early, measure. Cloud Run min 1 instance | If round-trip >5s consistently, investigate warm-up |

**Market risks:**

| Risk | Mitigation | Decision point |
|------|-----------|----------------|
| Teachers don't trust AI scores | Scores always editable. Watch override rate in beta | If >50% scores overridden, AI quality needs work |
| Teachers don't return after first use | Track W1 → W2 retention in 20-30 teacher beta | If <30% return week 2, investigate |
| Free tier doesn't convert to paid | Phase 1 is free. Conversion validated in Phase 2 | If retention strong but conversion <5%, revisit pricing |

**Resource risks:**

| Risk | Mitigation |
|------|-----------|
| Solo developer, limited time | Phase 1 scope is ruthlessly minimal: 4 endpoints, one sidebar, one Sheet integration |
| Can't build everything at once | Build Sheet integration first (proves backend contract), then Doc add-on |
| Burnout on side project | Phase 1 target: 4-6 weeks. If longer, scope is too big — cut further |

## Functional Requirements

### Onboarding & Setup

- FR1: Teacher can install the add-on from a direct link and authorize with Google OAuth
- FR2: Teacher can create a new pre-formatted Score Sheet from the Doc sidebar
- FR3: Teacher can import student names into a new Score Sheet from an existing Google Sheet (pick file, pick column, preview, confirm)
- FR4: Teacher can manually type student names into a new Score Sheet (comma-separated or one per line)
- FR5: Teacher can link an existing Google Sheet as their score tracker (file browser, structure detection with header preview, confirmation)
- FR6: Teacher can receive a clear fallback message when an existing Sheet's structure can't be detected, with option to create a new Sheet instead
- FR7: Teacher can add new students to their roster after initial setup
- FR8: System displays appropriate empty states when no students, scores, or grading history exist yet

### Sidebar Experience

- FR9: Teacher sees a contextual landing state when opening the sidebar (linked Sheet info, student picker, recent grading activity)
- FR10: Teacher can see the current student name and assignment context in the sidebar at all times during grading
- FR11: Teacher can navigate between students using previous/next controls in the sidebar
- FR12: Sidebar retains linked Sheet context across multiple essay documents in the same session
- FR13: Teacher sees a contextual landing state when reopening the sidebar after closing it (restores last session state or defaults to student picker)

### AI Essay Grading

- FR14: Teacher can initiate AI grading for an essay in the current Google Doc by selecting a student and task type (Task 1 Academic, Task 1 General, Task 2)
- FR15: Teacher can see a progress indicator with estimated time while AI grading is processing ("Analyzing essay... usually 10-15 seconds")
- FR16: Teacher can cancel a grading request while it is processing
- FR17: Teacher can view AI-generated band scores (Overall, TA, CC, LR, GRA) in the sidebar after grading completes
- FR18: Teacher can edit any AI-generated band score before saving
- FR19: System auto-inserts AI-generated feedback as native Google Doc comments anchored to specific text ranges under the teacher's account
- FR20: Teacher can view a collapsible AI feedback summary in the sidebar listing all AI-generated suggestions (persists even if Doc comments are deleted)
- FR21: Teacher can review, resolve, edit, or delete AI-inserted comments using native Google Docs commenting
- FR22: Teacher can add their own comments to the essay using native Google Docs commenting
- FR23: Teacher can re-grade an essay, with option to clear previous AI comments before new grading
- FR24: Teacher can see transparent status when comment anchoring partially fails (e.g., "4 anchored, 1 general")
- FR25: System degrades gracefully when comment anchoring fails (tiered: anchored → general comment → appended section)

### Manual Score Entry

- FR26: Teacher can enter band scores directly in the sidebar without initiating AI grading (same sidebar UI, skip the "Grade with AI" step)
- FR27: Teacher can save manually entered scores to their linked Sheet

### Score Tracking

- FR28: Teacher can save band scores from the sidebar to their linked Google Sheet with one click
- FR29: Teacher can save scores regardless of whether AI comments are resolved (non-blocking save)
- FR30: System writes scores to the correct student row and assignment column in the Sheet automatically
- FR31: Teacher can see confirmation after scores are successfully saved to Sheet

### Error Handling & Degradation

- FR32: Teacher can see a clear error message when AI grading fails, with option to retry or enter scores manually
- FR33: Teacher can see informative messaging when the backend is unavailable
- FR34: System displays clear recovery options for all error states (retry, manual entry, re-link Sheet)

### System & Security

- FR35: System validates teacher identity via Google ID token on all backend requests
- FR36: System enforces per-user rate limits on AI grading requests (prevent cost exposure and abuse)
- FR37: System logs grading events (AI scores, teacher adjustments, comment actions) for future analytics and model improvement from Phase 1
- FR38: System enforces a passthrough entitlement check stub on grading requests in Phase 1 (enables Phase 2 paywall without hot-path rework)

### Usage & Entitlements (Phase 2)

- FR39: System tracks teacher's AI grading usage count per billing period
- FR40: Teacher can see remaining free-tier gradings in the sidebar
- FR41: Teacher can see a clear upgrade prompt when free-tier limit is reached
- FR42: Teacher can initiate Pro upgrade from the sidebar (opens payment page)
- FR43: Teacher can continue using manual score entry when AI grading limit is reached
- FR44: System activates Pro entitlements immediately after successful payment

### Analytics (Phase 2)

- FR45: Teacher can view class-level analytics in the Sheet sidebar (average band, trend, weakest skill)
- FR46: Teacher can see at-risk students flagged automatically based on score trends and targets
- FR47: Teacher can see improving/plateaued/declining status per student
- FR48: Teacher can drill down into individual student performance (per-skill, per-criterion breakdown)
- FR49: Teacher can generate a shareable parent progress report link from the analytics sidebar

### Assignments (Phase 3)

- FR50: Teacher can create a Reading/Listening answer key directly in their Sheet (paste format)
- FR51: Teacher can select a pre-loaded Cambridge IELTS test from a built-in library
- FR52: Teacher can create complex assignments via a full-width web app (PDF import, section builder)
- FR53: Teacher can generate a shareable student assignment link from the Sheet sidebar
- FR54: Student can take a timed Reading/Listening test via a shared link with auto-save and server-authoritative timer
- FR55: Student can resume a test session on a different device
- FR56: System auto-scores Reading/Listening submissions and writes band scores to teacher's Sheet
- FR57: Student can submit Writing/Speaking responses via a shared link
- FR58: Teacher can see pending Writing/Speaking submissions in a grading queue

### Parent Reports (Phase 4)

- FR59: Parent can view student progress via a shareable token-based link (no login required)
- FR60: Parent report displays in Vietnamese with plain-language skill summaries and trend visualization
- FR61: Parent report updates automatically as new scores are added (live data)
- FR62: Teacher can revoke a parent report link

### Data Management

- FR63: Teacher can export scores as CSV from the Sheet sidebar
- FR64: Teacher can request deletion of their submission history from the backend

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| AI grading end-to-end | P95 < 20s, hard ceiling 30s | Gemini Flash typical: 8-15s. Spinner with estimated time mitigates perceived wait |
| Comment insertion | < 10s for ≤ 15 comments | Sequential Drive API calls ~1s each. Progressive insertion (teacher sees comments appear one by one) |
| Score write-back to Sheet | < 5s | Single SpreadsheetApp relay call |
| Sidebar load (warm instance) | < 3s | Preact bundle + google.script.run handshake |
| Sidebar load (cold start) | < 8s | Apps Script cold start adds 2-4s. Acceptable for first action of a session. Document this so teachers don't file bugs |
| Backend API (non-grading) | < 2s | Health, status polling, webhook processing |

### Security

| Requirement | Specification |
|------------|---------------|
| Transport encryption | TLS 1.2+ on all paths |
| Authentication | Google ID token verification on every backend request via Google Auth Library |
| Authorization | Tenant isolation enforced by `teacher_id` on every query |
| Student/parent links | UUID v4 (unguessable). Teacher can deactivate/revoke |
| API keys | Gemini key in Cloud Run Secret Manager, never in Apps Script |
| PII in AI prompts | Student names stripped at backend proxy. Only essay text + rubric sent to Gemini |
| Rate limiting | Per-user only: 30 grading requests/hr, 200 non-AI requests/hr. No IP-based limits (ineffective behind school NAT) |

### Reliability

| Requirement | Phase 1 | Phase 2+ |
|------------|---------|----------|
| Uptime target | Best effort with proactive communication (Zalo/email). Target: no unplanned downtime during peak hours (evenings/weekends) | 99.5%+ with Cloud Monitoring uptime checks + alerting |
| RTO | < 30 minutes (manual intervention acceptable) | < 5 minutes |
| RPO | < 24 hours (daily automated Cloud SQL backups) | < 24 hours |
| Graceful degradation | AI unavailable → manual score entry. Comment anchoring fails → tiered fallback. Backend down → clear error messaging | Same |
| Polar webhook reliability | Idempotent handlers with 72-hour deduplication window (processed_webhook_ids table). Never revoke access on missed webhook | Same |

### Scalability

| Phase | Teachers | Concurrent peak | Infrastructure |
|-------|----------|----------------|----------------|
| 1 (beta) | 20-30 | ~12 | Cloud Run min 1 instance, db-f1-micro |
| 2 (growth) | 200-500 | ~50 | Cloud Run auto-scaling (2-5), db-g1-small |
| 3+ (scale) | 2,000+ | ~200 | Auto-scaling, PgBouncer pooling, consider read replicas |

### Cost Model

| Cost item | Per teacher/month | Notes |
|-----------|------------------|-------|
| Gemini AI (Flash) | $0.05-0.20 | ~80 essays × 800 input + 600 output tokens. Flash pricing: $0.075/1M input, $0.30/1M output |
| Polar transaction fee | $0.76 (on $9 subscription) | 8.4% effective take rate. Fixed $0.40 component is punishing at low price points |
| Cloud Run + Postgres | $15-20/month fixed | Split across N teachers. At 10 paying teachers: $1.50-2.00/teacher |
| **Total cost at 10 teachers** | **~$2.50-3.00** | **Net margin: ~$6.00-6.50/teacher (67-72%)** |
| **Total cost at 100 teachers** | **~$1.00-1.20** | **Net margin: ~$7.80-8.00/teacher (87-89%)** |
| **Break-even** | **~2 paid teachers** | Covers fixed infra costs |

### Integration Reliability

| Integration | Requirement | Failure handling |
|------------|-------------|------------------|
| Google Docs (DocumentApp + Drive API) | 95%+ of standard documents | Tiered comment fallback. Non-standard docs (tables, images) may degrade |
| Google Sheets (SpreadsheetApp) | 100% of properly structured Sheets | Structure validation on link. Recovery prompts on mismatch |
| Google AI Studio (Gemini) | Best-effort — AI enhances, not a hard dependency | Timeout 30s. Manual entry fallback. Retry once on transient failure |
| Polar.sh | Webhook delivery with 72hr retry | Idempotent handlers. 24-hour grace period before entitlement changes |

### Data Retention

- Active data retained for 2 years (essays, grading sessions, scores)
- After 2 years: anonymize or delete per teacher preference
- Teacher can request immediate deletion via FR64
- Google Sheet data: teacher-owned, follows Google's retention policies

### Accessibility

Not a Phase 1 priority. Future considerations:
- WCAG 2.1 AA for student web app (Phase 3+) if targeting institutional markets
- Vietnamese language support across all surfaces (Phase 5)
- Baseline: adequate contrast ratios and keyboard navigation in Preact components
