# Market & Competitive Landscape: IELTS Teacher Toolkit

**Date:** 2026-04-21
**Reference:** [Product Spec v2](../ielts-teacher-toolkit-product-spec-v2.md)

---

## Overall Finding

**Pieces of this exist. Nobody has assembled them.**

Individual capabilities (IELTS AI grading, Google Docs essay feedback, teacher score tracking, institute dashboards) exist in separate products targeting different users. No product combines IELTS-specific AI grading + Google-native workflow + teacher-centric score tracking + analytics.

---

## Competitive Map

### Bucket 1: IELTS AI Grading Tools (Student-facing)

These grade essays using AI against IELTS band descriptors, but they target **students, not teachers**.

| Tool | Platform | Users | Accuracy Claim | Teacher Features | Pricing |
|------|----------|-------|----------------|-----------------|---------|
| [Cathoven](https://www.cathoven.com/) | Web app | 1.2M learners | 98% match to examiner scores | Basic: level adaptor, reading generator. No grading workflow | Free daily (2 Writing, 2 Speaking). Premium for unlimited |
| [LexiBot](https://www.lexibot.me/) | Web app | — | Trained on 10K+ essays, 4 criteria | No | Free |
| [IELTS-GPT](https://ielts-gpt.com/) | Web app | — | ~20 second grading | No | Free with limits |
| [UpScore.ai](https://upscore.ai/trainer) | Web app | — | Within 0.5 band 60% of cases | No | Freemium |
| [Engnovate](https://engnovate.com/ielts-writing-task-2-essay-checker/) | Web app | — | 75-95% accuracy | No | Free |
| [IELTS Writing Analytics](https://www.primeproductiv4.com/apps-tools/ielts-writing-analytics-review) | Web/mobile | — | Band 7+ focused | No | Freemium |
| [AI4IELTS](https://ai4ielts.com/) | Web app | — | — | No | Free |

**Gap:** All student self-service. None integrate into a teacher's grading workflow. None write scores to a tracking sheet. None produce comments in a student's Google Doc.

---

### Bucket 2: AI Essay Graders for Teachers (Not IELTS-specific)

Help teachers grade essays with AI, some in Google Docs, but **none speak IELTS band descriptors natively**.

| Tool | Platform | Integration | IELTS Support | Pricing |
|------|----------|-------------|---------------|---------|
| [VibeGrade](https://vibegrade.com) | Chrome extension | Google Docs, Canvas, LMS | Custom rubric only | Freemium |
| [CoGrader](https://cograder.com/) | Web app | Google Classroom | AP/CCSS rubrics only | Freemium |
| [Brisk Teaching](https://www.briskteaching.com/) | Chrome extension | Google Docs | General feedback, no scoring | Free |
| [EssayGrader.ai](https://www.essaygrader.ai/) | Web app | Google Classroom | Custom rubric possible | 25 free/mo, from $8/mo |

**VibeGrade is the closest competitor.** It grades essays directly in Google Docs with custom rubrics, smart annotations, and plagiarism check. However:
- Chrome extension, not Apps Script add-on
- No native IELTS band scoring
- No Sheet integration or score tracking
- No analytics or student progress tracking
- No speaking grading

**Gap:** None of these write band scores to a tracking Sheet or provide IELTS-specific analytics.

---

### Bucket 3: IELTS Institute Management Platforms

Manage students and mock tests for IELTS centers. **Separate platforms, not Google-native.**

| Tool | Target | Features | Google-native? | Pricing |
|------|--------|----------|---------------|---------|
| [Prep27](https://prep27.com/) | Centers (2,100+ institutes) | Mock tests, AI scoring, student tracking dashboard | No | Paid, no free tier |
| [AlfaIELTS](https://alfaielts.com/) | Centers | Mock tests, progress tracking, institute dashboard | No | Paid |
| [Gurully](https://www.gurully.com/) | Centers | Multi-exam platform, performance tracking | No | Paid |
| [eModule](https://emodule.in/) | Centers (India focus) | Mock tests, AI evaluation, institute dashboard | No | Paid |
| [Your Class Manager](https://yourclassmanager.com/) | Centers | Student management, coaching hours, scores | No | Paid |

**Gap:** All separate platforms requiring teachers to learn a new tool and migrate their workflow. Primarily targeting institutes, not independent tutors. None enhance existing Google Docs/Sheets workflows.

---

### Bucket 4: Google Workspace Education Add-ons

| Tool | What it does | IELTS relevance |
|------|-------------|-----------------|
| [Flubaroo](https://workspace.google.com/marketplace/app/flubaroo/817638980086) | Auto-grade quizzes in Sheets | Multiple choice only |
| Google Teaching & Learning add-on | Originality reports, NotebookLM | No IELTS features |

**Gap:** No IELTS-specific add-on exists on the Google Workspace Marketplace.

---

## White Space Analysis

| Feature | Student AI tools | Teacher AI graders | Institute platforms | **IELTS Toolkit** |
|---------|-----------------|-------------------|--------------------|----|
| IELTS band scoring (4 criteria) | Yes | No (custom rubric) | Some | **Yes, native** |
| Works inside Google Docs | No | VibeGrade (Chrome ext) | No | **Yes, sidebar** |
| Score tracking in Google Sheets | No | No | Separate dashboard | **Yes, Sheet IS DB** |
| Teacher reviews/edits AI suggestions | No | CoGrader, VibeGrade | No | **Yes** |
| Comments published to Doc | No | Brisk, VibeGrade | No | **Yes** |
| Analytics + at-risk flags | No | No | Basic dashboards | **Yes, Sheet sidebar** |
| Works with existing teacher data | No | No | No (import required) | **Yes, reads existing Sheet** |
| No new platform to learn | No | Chrome ext (close) | No | **Yes, pure Google** |
| Speaking grading (audio) | IELTS-GPT, Cathoven | No | Prep27 | **Yes** |

---

## Threats to Watch

1. **VibeGrade** — Closest UX overlap (AI grading in Google Docs). If they added IELTS rubrics + Sheet integration, significant overlap. Currently focused on US K-12 market.
2. **Cathoven** — Best IELTS AI accuracy claim (98%). If they built teacher tools + Google integration, strong threat. Currently student-only, 1.2M users.
3. **CoGrader / EssayGrader** — If they added IELTS rubrics. Currently focused on US standards (AP, CCSS).
4. **Large IELTS center chains** (IELTS Fighter, ZIM Academy) — Could build proprietary teacher tools. Likely too focused on their own platform to build a Workspace add-on.

---

## Target Market: Vietnam & Southeast Asia

### Market Size

- **Global IELTS test-takers:** ~3.5-4 million annually, growing 5-8% YoY
- **Global IELTS prep market:** Estimated USD 3-6 billion (tuition, materials, tools, online courses)
- **Vietnam specifically:** Estimated 200,000-400,000+ test-takers annually, one of the top markets in SEA

### Why Vietnam is the Ideal Launch Market

**Demand drivers:**
- MOET recognizes IELTS 6.0-6.5 for university admission and national English exam exemption
- Study-abroad pipeline to Australia, UK, Canada, New Zealand
- Urban middle-class growth — English proficiency seen as career-essential

**Market structure:**
- 500-1,000+ IELTS prep centers across major cities (Hanoi, HCMC, Da Nang)
- Major chains: IELTS Fighter, The IELTS Workshop, ZIM Academy, IELTS Vietop, DOL English
- Estimated 5,000-15,000+ IELTS teachers/tutors (center + independent)
- Large independent tutor segment operating via Facebook groups and Zalo

**Teacher tech stack (already Google-native):**
- Google Docs: essay submission and feedback (very common workflow)
- Google Sheets: score tracking
- Facebook/Zalo: marketing and student communication
- Zoom/Google Meet: online classes
- Canva: content creation

### Teacher Pain Points

1. **Grading is the #1 bottleneck.** 15-30 minutes per essay, 20-50+ essays per week = 10+ hours/week on grading alone
2. **Consistency** — maintaining band score standards across students and over time
3. **Repetitive feedback** — same corrections for common Vietnamese-English interference errors
4. **Score tracking** — manual spreadsheet entry, generating progress reports
5. **Scaling** — grading capacity is the bottleneck on revenue

### Pricing Sensitivity

| Segment | Monthly Revenue | Willingness to Pay | Notes |
|---------|----------------|--------------------| ------|
| Independent tutor (Vietnam) | USD 800-2,400 | USD 5-15/month | ~1-2 hours of tutoring revenue |
| Busy tutor (30+ essays/wk) | USD 1,500-2,400 | USD 20-50/month | Clear ROI: 5+ hours saved/week |
| Center (per seat) | Varies | USD 50-200/month | Needs institutional value prop |
| International markets | Higher | USD 15-30/month | Korea, Middle East, China |

**Key insight:** Frame value as "time saved = more students = more revenue." A tutor earning $15/hour who saves 10 hours/week can justify $30-50/month easily.

**Free tier is essential for Vietnam adoption.** 20 AI gradings/month is a good threshold — enough to experience value, not enough for a full teaching load.

### Go-to-Market

**Beachhead: Independent Vietnamese IELTS tutors**
- Most pain (no platform support), make their own tool decisions
- Reachable via Facebook IELTS teacher communities (hundreds of thousands of members)
- Already use Google Docs/Sheets — zero friction adoption
- Vietnamese language support in Phase 5 aligns with this market

**Expansion path:** Vietnam → Thailand, Indonesia, Philippines (growing IELTS markets, similar Google adoption) → higher-revenue markets (Korea, China, Middle East)

---

## Sources

- [Cathoven](https://www.cathoven.com/) — AI IELTS prep platform
- [LexiBot](https://www.lexibot.me/) — Free IELTS writing checker
- [IELTS-GPT](https://ielts-gpt.com/) — AI writing and speaking feedback
- [VibeGrade](https://vibegrade.com) — AI essay grader for Google Docs
- [CoGrader](https://cograder.com/) — AI essay grader with Google Classroom
- [Brisk Teaching](https://www.briskteaching.com/) — AI feedback Chrome extension
- [EssayGrader.ai](https://www.essaygrader.ai/) — AI essay grading platform
- [Prep27](https://prep27.com/) — Institute management software
- [AlfaIELTS](https://alfaielts.com/) — IELTS institute software
- [Gurully](https://www.gurully.com/) — Multi-exam institute platform
- [Your Class Manager](https://yourclassmanager.com/) — Institute management
- [Flubaroo](https://workspace.google.com/marketplace/app/flubaroo/817638980086) — Google Sheets quiz grader
- [UpScore.ai](https://upscore.ai/trainer) — IELTS essay checker
- [Engnovate](https://engnovate.com/ielts-writing-task-2-essay-checker/) — IELTS writing checker
- [AI4IELTS](https://ai4ielts.com/) — Free IELTS AI grading
- [Google Workspace Marketplace - Education](https://workspace.google.com/marketplace/category/education)
- [The 9 Best AI Essay Graders in 2026](https://www.kangaroos.ai/blog/best-ai-essay-graders/)
- [8 AI Essay Grader Tools That Actually Work](https://www.edcafe.ai/blog/ai-essay-grader-tools)
- [Vietnamese lecturers' perceptions of Google Docs for IELTS writing](https://i-jli.org/index.php/journal/article/view/226)
