import type { Merchant } from '@prisma/client'
import type {
  CreateMerchantInput,
  MerchantSnapshot,
  UpdateMerchantInput,
} from '../../../domain/entities/merchant.js'
import type { MerchantRepository } from '../../../domain/repositories/merchant-repository.js'
import { prisma } from './prisma-client.js'

export class PrismaMerchantRepository implements MerchantRepository {
  async findById(id: string): Promise<MerchantSnapshot | null> {
    const merchant = await prisma.merchant.findUnique({ where: { id } })
    return merchant ? this.map(merchant) : null
  }

  async findByPhone(phone: string): Promise<MerchantSnapshot | null> {
    const merchant = await prisma.merchant.findUnique({ where: { phone } })
    return merchant ? this.map(merchant) : null
  }

  async findByOwner(ownerId: string): Promise<MerchantSnapshot | null> {
    const merchant = await prisma.merchant.findFirst({ where: { ownerId } })
    return merchant ? this.map(merchant) : null
  }

  async create(input: CreateMerchantInput, ownerId?: string): Promise<MerchantSnapshot> {
    const merchant = await prisma.merchant.create({ data: { ...input, ownerId } })
    return this.map(merchant)
  }

  async update(id: string, input: UpdateMerchantInput): Promise<MerchantSnapshot | null> {
    const merchant = await prisma.merchant.update({ where: { id }, data: input })
    return this.map(merchant)
  }

  async list(): Promise<MerchantSnapshot[]> {
    const merchants = await prisma.merchant.findMany({ orderBy: { createdAt: 'asc' } })
    return merchants.map((m) => this.map(m))
  }

  private map(merchant: Merchant): MerchantSnapshot {
    return {
      id: merchant.id,
      name: merchant.name,
      phone: merchant.phone,
      businessType: merchant.businessType,
      monthlyRevenue: Number(merchant.monthlyRevenue),
      yearsInBusiness: merchant.yearsInBusiness,
      ownerId: merchant.ownerId,
    }
  }
}
