import { CreditApplication } from '../../domain/entities/credit-application.js'
import type { MerchantRepository } from '../../domain/repositories/merchant-repository.js'
import type { CreditApplicationRepository } from '../../domain/repositories/credit-application-repository.js'
import type { CreditApplicationRecord } from '../../domain/repositories/credit-application-repository.js'
import type { IAIScoringService } from '../services/i-ai-scoring.service.js'
import { NotFoundError } from '../../shared/errors/domain-error.js'

export interface EvaluateCreditApplicationInput {
  merchantId: string
  requestedAmount: number
}

export interface EvaluateCreditApplicationUseCase {
  execute(input: EvaluateCreditApplicationInput): Promise<CreditApplicationRecord>
}

export class EvaluateCreditApplicationUseCaseImpl implements EvaluateCreditApplicationUseCase {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly creditApplicationRepository: CreditApplicationRepository,
    private readonly aiScoringService: IAIScoringService,
  ) {}

  async execute(input: EvaluateCreditApplicationInput): Promise<CreditApplicationRecord> {
    const merchant = await this.merchantRepository.findById(input.merchantId)
    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    const application = CreditApplication.create({
      merchant,
      requestedAmount: input.requestedAmount,
    })
    const pending = await this.creditApplicationRepository.create(
      application.merchantId,
      application.requestedAmount,
    )

    const evaluation = await this.aiScoringService.evaluate(merchant)
    const evaluated = application.applyEvaluation(evaluation)

    return this.creditApplicationRepository.applyEvaluation(pending.id, {
      score: evaluated.score as number,
      status: evaluated.status,
      approvedAmount: evaluated.approvedAmount,
      reasoning: evaluated.reasoning as string,
    })
  }
}
