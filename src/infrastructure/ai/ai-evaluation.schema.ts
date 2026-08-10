import { z } from 'zod'

export const aiEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  status: z.enum(['APPROVED', 'REJECTED']),
  approvedAmount: z.number().min(0),
  reasoning: z.string().min(1),
  riskFlags: z.array(z.string()).optional().default([]),
})

export type AIEvaluationResult = z.infer<typeof aiEvaluationSchema>

export const aiEvaluationJsonSchema = {
  name: 'credit_evaluation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      status: { enum: ['APPROVED', 'REJECTED'] },
      approvedAmount: { type: 'number', minimum: 0 },
      reasoning: { type: 'string', minLength: 1 },
      riskFlags: { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'status', 'approvedAmount', 'reasoning', 'riskFlags'],
  },
} as const
