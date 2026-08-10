import type { CreateMerchantInput, MerchantSnapshot } from '../entities/merchant.js'

export interface MerchantRepository {
  findById(id: string): Promise<MerchantSnapshot | null>
  findByPhone(phone: string): Promise<MerchantSnapshot | null>
  create(input: CreateMerchantInput): Promise<MerchantSnapshot>
}
