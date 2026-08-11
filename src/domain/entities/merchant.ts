export const BUSINESS_TYPES = ['ABARROTES', 'MINIMARKET', 'BODEGA', 'BAZAR', 'OTRO'] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]

export interface MerchantSnapshot {
  id: string
  name: string
  phone: string
  businessType: string
  monthlyRevenue: number
  yearsInBusiness: number
  ownerId: string | null
}

export interface CreateMerchantInput {
  name: string
  phone: string
  businessType: string
  monthlyRevenue: number
  yearsInBusiness: number
}

export interface UpdateMerchantInput {
  name?: string
  businessType?: string
  monthlyRevenue?: number
  yearsInBusiness?: number
}
