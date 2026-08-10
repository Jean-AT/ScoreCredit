import { z } from 'zod'
import { BUSINESS_TYPES } from '../../../domain/entities/merchant.js'

export const createMerchantSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{6,15}$/, 'phone must be a valid phone number'),
  businessType: z.enum(BUSINESS_TYPES),
  monthlyRevenue: z.number().positive(),
  yearsInBusiness: z.number().int().min(0),
})

export type CreateMerchantBody = z.infer<typeof createMerchantSchema>
