import { z } from 'zod'
import { BUSINESS_TYPES } from '../../../domain/entities/merchant.js'

export const createMerchantSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{6,15}$/, 'phone must be a valid phone number'),
  businessType: z.enum(BUSINESS_TYPES),
  monthlyRevenue: z.number().positive(),
  yearsInBusiness: z.number().int().min(0),
})

export const updateMerchantSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    monthlyRevenue: z.number().positive().optional(),
    yearsInBusiness: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  })

export type CreateMerchantBody = z.infer<typeof createMerchantSchema>
export type UpdateMerchantBody = z.infer<typeof updateMerchantSchema>
