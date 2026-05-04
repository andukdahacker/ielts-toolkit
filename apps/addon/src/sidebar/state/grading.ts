import { signal, computed } from '@preact/signals'
import type { TaskType, BandScores, GradeResult } from '@ielts-toolkit/shared'
import { submitGrade, pollGradingStatus, getActiveGradingJob, getEssayText, insertDocComments } from '../lib/gas'
import { startPolling } from '../lib/polling'

export type GradingStatus = 'idle' | 'submitting' | 'polling' | 'inserting-comments' | 'done' | 'error'

export const selectedTaskType = signal<TaskType>('task2')
export const savedTaskType = signal<TaskType>('task2')

export const gradingStatus = signal<GradingStatus>('idle')
export const gradingJobId = signal<string | null>(null)
export const gradingError = signal<string | null>(null)
export const gradingMessage = signal<string>('')
export const pollingTimedOut = signal<boolean>(false)
export const aiScores = signal<BandScores | null>(null)
export const aiComments = signal<GradeResult['comments'] | null>(null)

export const commentInsertionProgress = signal<string>('')
export const commentInsertionResult = signal<CommentInsertionResult | null>(null)
export const insertedCommentIds = signal<string[]>([])
export const feedbackExpanded = signal<boolean>(true)

export const commentStatusMessage = computed<string>(() => {
  const result = commentInsertionResult.value
  if (!result) return ''
  if (result.appended) return 'Comments added as a feedback section at the end of the document'
  const parts: string[] = []
  if (result.general > 0) parts.push(`${result.anchored} comments anchored to text, ${result.general} added as general feedback`)
  if (result.failed > 0) parts.push(`${result.failed} comment${result.failed === 1 ? '' : 's'} couldn't be inserted`)
  return parts.join('. ')
})

const PROGRESS_MESSAGES = [
  'Analyzing essay... usually 10-15 seconds',
  'Scoring criteria...',
  'Evaluating coherence...',
  'Generating feedback...',
  'Almost done...',
]

const NETWORK_ERROR_PATTERNS = [
  'address unavailable', 'dns', 'timed out', 'connection refused',
  'network', 'unreachable', 'econnrefused', 'enotfound',
]

function isNetworkError(message: string): boolean {
  const lower = message.toLowerCase()
  return NETWORK_ERROR_PATTERNS.some((p) => lower.includes(p))
}

let cancelPolling: (() => void) | null = null
let messageIndex = 0

export function selectTaskType(type: TaskType): void {
  selectedTaskType.value = type
}

export async function startGrading(): Promise<void> {
  if (gradingStatus.value === 'submitting' || gradingStatus.value === 'polling' || gradingStatus.value === 'inserting-comments') return

  const { selectedStudent } = await import('./students')
  const student = selectedStudent.value
  if (!student) return

  gradingStatus.value = 'submitting'
  gradingError.value = null
  pollingTimedOut.value = false
  gradingMessage.value = 'Submitting essay for grading...'

  try {
    const essayText = await getEssayText()
    const idempotencyKey = crypto.randomUUID()
    const taskType = selectedTaskType.value
    const response = await submitGrade(essayText, taskType, student, idempotencyKey)
    const jobId = response.data.jobId

    gradingJobId.value = jobId
    beginPolling(jobId)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    gradingError.value = isNetworkError(message)
      ? "Can't connect to grading service. Manual score entry is available."
      : (message || "Couldn't submit essay for grading")
    gradingStatus.value = 'error'
  }
}

function beginPolling(jobId: string): void {
  if (cancelPolling) {
    cancelPolling()
    cancelPolling = null
  }
  gradingStatus.value = 'polling'
  messageIndex = 0
  gradingMessage.value = PROGRESS_MESSAGES[0]

  const { cancel } = startPolling(
    () => pollGradingStatus(jobId),
    (response) => {
      const { status, result, error } = response.data

      if (status === 'completed' && result) {
        onGradingComplete(result)
        return true
      }
      if (status === 'failed') {
        gradingError.value = error?.message ?? 'Grading failed'
        gradingStatus.value = 'error'
        return true
      }

      messageIndex = (messageIndex + 1) % PROGRESS_MESSAGES.length
      gradingMessage.value = PROGRESS_MESSAGES[messageIndex]
      return false
    },
    {
      interval: 4000,
      maxDuration: 45000,
      onTimeout: () => {
        pollingTimedOut.value = true
      },
    },
  )

  cancelPolling = cancel
}

async function onGradingComplete(result: GradeResult, options?: { skipCommentInsertion?: boolean }): Promise<void> {
  const { currentScores, savedScores } = await import('./scores')
  const { bandScores, comments } = result

  currentScores.value = { ...bandScores }
  savedScores.value = { ...bandScores }
  aiScores.value = { ...bandScores }
  aiComments.value = comments

  if (!options?.skipCommentInsertion && comments.length > 0) {
    await insertComments(comments)
  } else {
    gradingStatus.value = 'done'
    gradingMessage.value = ''
  }
}

async function insertComments(comments: GradeResult['comments']): Promise<void> {
  gradingStatus.value = 'inserting-comments'
  commentInsertionProgress.value = 'Inserting feedback into document...'
  gradingMessage.value = ''

  try {
    const result = await insertDocComments(comments)
    if (gradingStatus.value !== 'inserting-comments') return
    commentInsertionResult.value = result
    insertedCommentIds.value = result.commentIds
    gradingStatus.value = 'done'
    commentInsertionProgress.value = ''
  } catch (err) {
    if (gradingStatus.value !== 'inserting-comments') return
    const message = err instanceof Error ? err.message : 'Failed to insert comments into document'
    gradingError.value = message
    gradingStatus.value = 'error'
    commentInsertionProgress.value = ''
  }
}

export function cancelGrading(): void {
  if (cancelPolling) {
    cancelPolling()
    cancelPolling = null
  }
  gradingStatus.value = 'idle'
  gradingJobId.value = null
  gradingError.value = null
  gradingMessage.value = ''
  pollingTimedOut.value = false
}

export async function retryGrading(): Promise<void> {
  gradingStatus.value = 'idle'
  gradingError.value = null
  pollingTimedOut.value = false
  await startGrading()
}

export async function retryCommentInsertion(): Promise<void> {
  const comments = aiComments.value
  if (!comments || comments.length === 0) return
  gradingError.value = null
  await insertComments(comments)
}

export function dismissTimeout(): void {
  pollingTimedOut.value = false
}

export function switchToManualEntry(): void {
  if (cancelPolling) {
    cancelPolling()
    cancelPolling = null
  }
  gradingStatus.value = 'idle'
  gradingJobId.value = null
  gradingError.value = null
  gradingMessage.value = ''
  pollingTimedOut.value = false
}

export async function checkActiveJob(): Promise<void> {
  try {
    const response = await getActiveGradingJob()
    if (!response.data) return

    const { selectedStudent } = await import('./students')
    const student = selectedStudent.value
    if (!student) return

    const job = response.data

    // AC11: only resume if the job's student matches the currently selected student
    if (job.studentName && job.studentName !== student) return

    gradingJobId.value = job.jobId

    if (job.status === 'completed' && job.result) {
      onGradingComplete(job.result, { skipCommentInsertion: true })
    } else if (job.status === 'failed') {
      gradingError.value = job.error?.message ?? 'Previous grading job failed'
      gradingStatus.value = 'error'
    } else if (job.status === 'pending' || job.status === 'processing') {
      beginPolling(job.jobId)
    }
  } catch {
    // Silent failure — active job recovery is best-effort
  }
}

export async function getScoreOverrides(): Promise<Array<{ criterion: string; before: number; after: number }>> {
  if (!aiScores.value) return []
  const { currentScores } = await import('./scores')
  const current = currentScores.value
  const ai = aiScores.value
  const overrides: Array<{ criterion: string; before: number; after: number }> = []

  for (const key of Object.keys(ai) as Array<keyof BandScores>) {
    const before = ai[key]
    const after = current[key]
    if (after !== null && before !== after) {
      overrides.push({ criterion: key, before, after })
    }
  }
  return overrides
}

export function resetGrading(): void {
  if (cancelPolling) {
    cancelPolling()
    cancelPolling = null
  }
  gradingStatus.value = 'idle'
  gradingJobId.value = null
  gradingError.value = null
  gradingMessage.value = ''
  pollingTimedOut.value = false
  aiScores.value = null
  aiComments.value = null
  commentInsertionProgress.value = ''
  commentInsertionResult.value = null
  insertedCommentIds.value = []
  feedbackExpanded.value = true
}
