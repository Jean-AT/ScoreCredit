import type { MerchantSnapshot } from '../../domain/entities/merchant.js'
import type { MerchantRepository } from '../../domain/repositories/merchant-repository.js'
import { NotFoundError } from '../../shared/errors/domain-error.js'

export interface GetMyMerchantUseCase {
  execute(ownerId: string): Promise<MerchantSnapshot>
}

export class GetMyMerchantUseCaseImpl implements GetMyMerchantUseCase {
  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(ownerId: string): Promise<MerchantSnapshot> {
    const merchant = await this.merchantRepository.findByOwner(ownerId)
    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }
    return merchant
  }
}
