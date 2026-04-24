import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGeminiClient } from './gemini.js'
import { buildPrompt } from './prompts.js'

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  }
})

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('buildPrompt', () => {
  it('includes IELTS band descriptors for task2', () => {
    const prompt = buildPrompt('This is my essay about education.', 'task2')
    expect(prompt).toContain('Task Achievement')
    expect(prompt).toContain('Coherence and Cohesion')
    expect(prompt).toContain('Lexical Resource')
    expect(prompt).toContain('Grammatical Range')
    expect(prompt).toContain('JSON')
  })

  it('includes task1_academic context for academic task', () => {
    const prompt = buildPrompt('The chart shows data about water usage.', 'task1_academic')
    expect(prompt).toContain('data')
    expect(prompt).toContain('academic')
  })

  it('includes task1_general context for general task', () => {
    const prompt = buildPrompt('Dear Sir, I am writing to complain.', 'task1_general')
    expect(prompt).toContain('letter')
  })

  it('does not contain student names or PII placeholders in output', () => {
    const prompt = buildPrompt('Some essay text', 'task2')
    expect(prompt).not.toContain('[STUDENT]')
  })

  it('requests JSON output with bandScores and comments', () => {
    const prompt = buildPrompt('Essay text', 'task2')
    expect(prompt).toContain('bandScores')
    expect(prompt).toContain('comments')
    expect(prompt).toContain('anchorText')
  })
})

describe('createGeminiClient', () => {
  it('parses valid Gemini response', async () => {
    const validResult = {
      bandScores: {
        overall: 6.5,
        taskAchievement: 7.0,
        coherenceAndCohesion: 6.5,
        lexicalResource: 6.0,
        grammaticalRangeAndAccuracy: 6.5,
      },
      comments: [
        { text: 'Good structure', anchorText: 'In conclusion', category: 'coherenceAndCohesion' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResult) },
    })

    const client = createGeminiClient('fake-key')
    const result = await client.gradeEssay('My essay about education', 'task2')

    expect(result.bandScores.overall).toBe(6.5)
    expect(result.comments).toHaveLength(1)
  })

  it('handles JSON wrapped in markdown code fences', async () => {
    const validResult = {
      bandScores: {
        overall: 7.0,
        taskAchievement: 7.0,
        coherenceAndCohesion: 7.0,
        lexicalResource: 7.0,
        grammaticalRangeAndAccuracy: 7.0,
      },
      comments: [{ text: 'Excellent', anchorText: 'therefore', category: 'coherenceAndCohesion' }],
    }

    mockGenerateContent.mockResolvedValue({
      response: { text: () => '```json\n' + JSON.stringify(validResult) + '\n```' },
    })

    const client = createGeminiClient('fake-key')
    const result = await client.gradeEssay('My essay', 'task2')
    expect(result.bandScores.overall).toBe(7.0)
  })

  it('throws GradingError on malformed Gemini response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not valid json at all' },
    })

    const client = createGeminiClient('fake-key')
    await expect(client.gradeEssay('My essay', 'task2')).rejects.toThrow('invalid JSON')
  })

  it('throws on validation failure for wrong schema', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ bandScores: { overall: 'not a number' } }) },
    })

    const client = createGeminiClient('fake-key')
    await expect(client.gradeEssay('My essay', 'task2')).rejects.toThrow()
  })

  it('retries once on 5xx error then throws', async () => {
    const error = new Error('Internal Server Error')
    ;(error as any).status = 500
    mockGenerateContent.mockRejectedValue(error)

    const client = createGeminiClient('fake-key')
    await expect(client.gradeEssay('My essay', 'task2')).rejects.toThrow()

    // Should have been called twice (original + 1 retry)
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })

  it('does not retry on non-retryable errors', async () => {
    const error = new Error('Invalid API key')
    ;(error as any).status = 400
    mockGenerateContent.mockRejectedValue(error)

    const client = createGeminiClient('fake-key')
    await expect(client.gradeEssay('My essay', 'task2')).rejects.toThrow()

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
  })

  it('enforces timeout', async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 30000)),
    )

    const client = createGeminiClient('fake-key')
    await expect(client.gradeEssay('My essay', 'task2')).rejects.toThrow('timed out')
  }, 30000)
})
