import { MerchantValidation } from '../../domain/entities/credit-application.js'
import type { CreateMerchantInput, MerchantSnapshot } from '../../domain/entities/merchant.js'
import type { MerchantRepository } from '../../domain/repositories/merchant-repository.js'
import { DomainError } from '../../shared/errors/domain-error.js'

export interface RegisterMerchantUseCase {
  execute(input: CreateMerchantInput, ownerId?: string): Promise<MerchantSnapshot>
}

export class RegisterMerchantUseCaseImpl implements RegisterMerchantUseCase {
  constructor(private readonly merchantRepository: MerchantRepository) {}

  async execute(input: CreateMerchantInput, ownerId?: string): Promise<MerchantSnapshot> {
    MerchantValidation.validateAll(input)
    const existing = await this.merchantRepository.findByPhone(input.phone)
    if (existing) {
      throw new DomainError('A merchant with this phone already exists')
    }
    if (ownerId) {
      const owned = await this.merchantRepository.findByOwner(ownerId)
      if (owned) {
        throw new DomainError('A user can only have one merchant')
      }
    }
    return this.merchantRepository.create(input, ownerId)
  }
}
