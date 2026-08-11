import type {
  CreateMerchantInput,
  MerchantSnapshot,
  UpdateMerchantInput,
} from '../entities/merchant.js'

export interface MerchantRepository {
  findById(id: string): Promise<MerchantSnapshot | null>
  findByPhone(phone: string): Promise<MerchantSnapshot | null>
  findByOwner(ownerId: string): Promise<MerchantSnapshot | null>
  create(input: CreateMerchantInput, ownerId?: string): Promise<MerchantSnapshot>
  update(id: string, input: UpdateMerchantInput): Promise<MerchantSnapshot | null>
  list(): Promise<MerchantSnapshot[]>
}
