import type { CreditApplicationRepository } from '../../domain/repositories/credit-application-repository.js'
import type { CreditApplicationRecord } from '../../domain/repositories/credit-application-repository.js'
import type { CreditApplicationStatus } from '../../domain/entities/credit-application.js'
import { NotFoundError } from '../../shared/errors/domain-error.js'

export interface GetCreditApplicationUseCase {
  execute(id: string): Promise<CreditApplicationRecord>
}

export interface ListCreditApplicationsUseCase {
  execute(query: { status?: CreditApplicationStatus }): Promise<CreditApplicationRecord[]>
}

export class GetCreditApplicationUseCaseImpl implements GetCreditApplicationUseCase {
  constructor(private readonly repository: CreditApplicationRepository) {}

  async execute(id: string): Promise<CreditApplicationRecord> {
    const application = await this.repository.findById(id)
    if (!application) {
      throw new NotFoundError('Credit application not found')
    }
    return application
  }
}

export class ListCreditApplicationsUseCaseImpl implements ListCreditApplicationsUseCase {
  constructor(private readonly repository: CreditApplicationRepository) {}

  async execute(query: { status?: CreditApplicationStatus }): Promise<CreditApplicationRecord[]> {
    return this.repository.list(query)
  }
}
