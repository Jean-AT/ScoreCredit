import { z } from 'zod'
import { CREDIT_APPLICATION_STATUSES } from '../../../domain/entities/credit-application.js'

export const createCreditApplicationSchema = z.object({
  merchantId: z.string().min(1),
  requestedAmount: z.number().positive(),
})

export const creditApplicationParamsSchema = z.object({
  id: z.string().min(1),
})

export const listCreditApplicationsSchema = z.object({
  status: z.enum(CREDIT_APPLICATION_STATUSES).optional(),
})

export type CreateCreditApplicationBody = z.infer<typeof createCreditApplicationSchema>
export type CreditApplicationParams = z.infer<typeof creditApplicationParamsSchema>
export type ListCreditApplicationsQuery = z.infer<typeof listCreditApplicationsSchema>
