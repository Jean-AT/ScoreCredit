import { describe, expect, it } from 'vitest'
import { aiEvaluationSchema } from '../../src/infrastructure/ai/ai-evaluation.schema.js'

const validEvaluation = {
  score: 75,
  status: 'APPROVED',
  approvedAmount: 1500,
  reasoning: 'Bodega con buen historial y crecimiento.',
  riskFlags: [],
}

describe('AI evaluation schema validation', () => {
  it('accepts a valid evaluation', () => {
    const result = aiEvaluationSchema.safeParse(validEvaluation)
    expect(result.success).toBe(true)
  })

  it('accepts a missing riskFlags and defaults to an empty array', () => {
    const withoutFlags: Record<string, unknown> = { ...validEvaluation }
    delete withoutFlags.riskFlags
    const result = aiEvaluationSchema.safeParse(withoutFlags)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.riskFlags).toEqual([])
    }
  })

  it('rejects a score out of range', () => {
    for (const score of [-1, 101, 75.5]) {
      const result = aiEvaluationSchema.safeParse({ ...validEvaluation, score })
      expect(result.success).toBe(false)
    }
  })

  it('rejects an invalid status', () => {
    const result = aiEvaluationSchema.safeParse({ ...validEvaluation, status: 'PENDING' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    for (const field of ['score', 'status', 'approvedAmount', 'reasoning'] as const) {
      const rest: Record<string, unknown> = { ...validEvaluation }
      delete rest[field]
      const result = aiEvaluationSchema.safeParse(rest)
      expect(result.success).toBe(false)
    }
  })

  it('rejects wrong value types', () => {
    const result = aiEvaluationSchema.safeParse({
      ...validEvaluation,
      score: 'high',
      approvedAmount: 'much',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty reasoning string', () => {
    const result = aiEvaluationSchema.safeParse({ ...validEvaluation, reasoning: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative approvedAmount', () => {
    const result = aiEvaluationSchema.safeParse({ ...validEvaluation, approvedAmount: -10 })
    expect(result.success).toBe(false)
  })
})
