import type { TaskType } from '@ielts-toolkit/shared'

const TASK_CONTEXT: Record<TaskType, string> = {
  task1_academic: `This is an IELTS Writing Task 1 Academic response. The candidate was asked to describe, summarise, or explain information from a graph, table, chart, diagram, map, or process. Evaluate the candidate's ability to:
- Select and report the main features, and make comparisons where relevant (task achievement for academic Task 1)
- Organise information coherently with clear progression
- Use appropriate vocabulary for describing data, trends, and comparisons
- Use a range of grammatical structures accurately`,

  task1_general: `This is an IELTS Writing Task 1 General Training response. The candidate was asked to write a letter (formal, semi-formal, or informal). Evaluate the candidate's ability to:
- Address all bullet points with appropriate tone and purpose (task achievement for general Task 1)
- Organise the letter coherently with clear progression
- Use appropriate vocabulary for the letter type and context
- Use a range of grammatical structures accurately`,

  task2: `This is an IELTS Writing Task 2 response. The candidate was asked to write an argumentative or discursive essay. Evaluate the candidate's ability to:
- Present a clear position and develop ideas with relevant examples and evidence (task achievement for Task 2)
- Organise ideas logically with clear paragraphing and progression
- Use a wide range of vocabulary with precision and flexibility
- Use a wide range of grammatical structures with accuracy and flexibility`,
}

const BAND_DESCRIPTORS = `
## IELTS Band Descriptors (Scoring Criteria)

### Task Achievement (TA) — Band 5-9 key distinctions:
- Band 9: Fully addresses all parts of the task; presents a fully developed position with relevant, extended, well-supported ideas
- Band 7: Addresses all parts of the task; presents a clear position throughout with relevant, extended, and supported main ideas
- Band 5: Addresses the task only partially; expresses a position but development is limited or inadequate

### Coherence and Cohesion (CC) — Band 5-9 key distinctions:
- Band 9: Uses cohesion in such a way that it attracts no attention; skilfully manages paragraphing
- Band 7: Logically organises information and ideas; clear progression throughout; uses a range of cohesive devices appropriately
- Band 5: Presents information with some organisation but no overall progression; inadequate or overuse of cohesive devices

### Lexical Resource (LR) — Band 5-9 key distinctions:
- Band 9: Uses a wide range of vocabulary with very natural and sophisticated control; rare minor errors as slips
- Band 7: Uses a sufficient range of vocabulary to allow some flexibility and precision; uses less common items with some awareness of style
- Band 5: Uses a limited range of vocabulary; may make noticeable errors in spelling and word formation

### Grammatical Range and Accuracy (GRA) — Band 5-9 key distinctions:
- Band 9: Uses a wide range of structures with full flexibility and accuracy; rare minor errors as slips
- Band 7: Uses a variety of complex structures; produces frequent error-free sentences; has good control of grammar
- Band 5: Uses only a limited range of structures; attempts complex sentences but with frequent grammatical errors
`

const VIETNAMESE_LEARNER_NOTES = `
## Vietnamese Learner Patterns (L1 Interference Awareness)
When scoring, be aware of common Vietnamese L1 interference patterns but score strictly according to IELTS band descriptors:
- Article omission (Vietnamese has no articles): "I went to school" vs "I went to the school"
- Tense confusion (Vietnamese uses time markers, not verb inflections): inconsistent tense usage
- Word order issues (Vietnamese is SVO but modifiers follow nouns): "the house big" vs "the big house"
- Plural marking omission (Vietnamese does not inflect for number)
- Preposition errors (Vietnamese preposition system differs significantly)
These patterns should be scored as grammatical errors per the GRA criterion — do not give special allowance, but use awareness to provide constructive feedback.
`

const OUTPUT_FORMAT = `
## Required Output Format

You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code fences) in this exact structure:

{
  "bandScores": {
    "overall": <number, 0.0-9.0 in 0.5 increments>,
    "taskAchievement": <number, 0.0-9.0 in 0.5 increments>,
    "coherenceAndCohesion": <number, 0.0-9.0 in 0.5 increments>,
    "lexicalResource": <number, 0.0-9.0 in 0.5 increments>,
    "grammaticalRangeAndAccuracy": <number, 0.0-9.0 in 0.5 increments>
  },
  "comments": [
    {
      "text": "<feedback comment explaining the issue or strength>",
      "anchorText": "<exact quote from the essay this comment refers to>",
      "category": "<one of: taskAchievement, coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy>"
    }
  ]
}

Rules for scoring:
- Overall band is the arithmetic mean of the four criteria, rounded to the nearest 0.5
- Each criterion score must be in 0.5 increments (e.g., 5.0, 5.5, 6.0, 6.5, 7.0)
- Provide 4-8 comments covering strengths and weaknesses across all four criteria
- Each comment MUST include anchorText — an exact quote from the essay that the comment refers to
- Comments should be constructive and specific, suitable for a teacher to share with a student
`

export function buildPrompt(essayText: string, taskType: TaskType): string {
  return `You are an expert IELTS examiner. Score the following essay according to official IELTS Writing band descriptors.

${TASK_CONTEXT[taskType]}

${BAND_DESCRIPTORS}

${VIETNAMESE_LEARNER_NOTES}

${OUTPUT_FORMAT}

---

## Essay to Grade:

${essayText}
`
}
