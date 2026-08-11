import type { CreditApplicationRepository } from '../../domain/repositories/credit-application-repository.js'
import type { CreditApplicationRecord } from '../../domain/repositories/credit-application-repository.js'
import type { CreditApplicationStatus } from '../../domain/entities/credit-application.js'
import { NotFoundError } from '../../shared/errors/domain-error.js'
import { ForbiddenError } from '../../shared/errors/http-error.js'

export interface GetCreditApplicationUseCase {
  execute(id: string, ownerId?: string): Promise<CreditApplicationRecord>
}

export interface ListCreditApplicationsUseCase {
  execute(query: { status?: CreditApplicationStatus; ownerId?: string }): Promise<CreditApplicationRecord[]>
}

export class GetCreditApplicationUseCaseImpl implements GetCreditApplicationUseCase {
  constructor(private readonly repository: CreditApplicationRepository) {}

  async execute(id: string, ownerId?: string): Promise<CreditApplicationRecord> {
    const application = await this.repository.findById(id)
    if (!application) {
      throw new NotFoundError('Credit application not found')
    }
    if (ownerId && application.merchantOwnerId !== ownerId) {
      throw new ForbiddenError('You can only view your own applications')
    }
    return application
  }
}

export class ListCreditApplicationsUseCaseImpl implements ListCreditApplicationsUseCase {
  constructor(private readonly repository: CreditApplicationRepository) {}

  async execute(query: {
    status?: CreditApplicationStatus
    ownerId?: string
  }): Promise<CreditApplicationRecord[]> {
    return this.repository.list(query)
  }
}
