import { MerchantValidation } from '../../domain/entities/credit-application.js'
import type {
  MerchantSnapshot,
  UpdateMerchantInput,
} from '../../domain/entities/merchant.js'
import type { MerchantRepository } from '../../domain/repositories/merchant-repository.js'
import { NotFoundError } from '../../shared/errors/domain-error.js'

export interface UpdateMerchantUseCase {
  execute(ownerId: string, input: UpdateMerchantInput): Promise<MerchantSnapshot>
}

export class UpdateMerchantUseCaseImpl implements UpdateMerchantUseCase {
  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(ownerId: string, input: UpdateMerchantInput): Promise<MerchantSnapshot> {
    MerchantValidation.validateUpdate(input)
    const merchant = await this.merchantRepository.findByOwner(ownerId)
    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }
    const updated = await this.merchantRepository.update(merchant.id, input)
    if (!updated) {
      throw new NotFoundError('Merchant not found')
    }
    return updated
  }
}
