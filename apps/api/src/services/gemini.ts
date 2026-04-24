import { GoogleGenerativeAI } from '@google/generative-ai'
import { gradeResultSchema } from '@ielts-toolkit/shared'
import type { GradeResult, TaskType } from '@ielts-toolkit/shared'
import { GradingError } from '@ielts-toolkit/shared'
import { buildPrompt } from './prompts.js'

const GEMINI_MODEL = 'gemini-2.0-flash'
const TIMEOUT_MS = 25_000
const MAX_RETRIES = 1

export interface GeminiClient {
  gradeEssay(essayText: string, taskType: TaskType): Promise<GradeResult>
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const status = (err as any).status ?? (err as any).statusCode
    if (typeof status === 'number' && status >= 500) return true
    if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) return true
  }
  return false
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  return text.trim()
}

export function createGeminiClient(apiKey: string): GeminiClient {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  return {
    async gradeEssay(essayText: string, taskType: TaskType): Promise<GradeResult> {
      const prompt = buildPrompt(essayText, taskType)

      let lastError: unknown
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await withTimeout(
            model.generateContent(prompt),
            TIMEOUT_MS,
          )

          const text = response.response.text()
          const jsonStr = extractJson(text)

          let parsed: unknown
          try {
            parsed = JSON.parse(jsonStr)
          } catch {
            throw new GradingError( `Gemini returned invalid JSON: ${jsonStr.slice(0, 200)}`, true)
          }

          const validation = gradeResultSchema.safeParse(parsed)
          if (!validation.success) {
            throw new GradingError(
              `Gemini response failed validation: ${validation.error.message}`,
              true,
            )
          }

          return validation.data
        } catch (err) {
          lastError = err
          if (attempt < MAX_RETRIES && isRetryableError(err)) {
            continue
          }
          break
        }
      }

      if (lastError instanceof GradingError) throw lastError
      throw new GradingError(
        lastError instanceof Error ? lastError.message : 'Gemini grading failed',
        true,
      )
    },
  }
}
