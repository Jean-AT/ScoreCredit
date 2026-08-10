import { env } from '../config/env.js'
import type { IAIScoringService } from '../application/services/i-ai-scoring.service.js'
import type { MerchantRepository } from '../domain/repositories/merchant-repository.js'
import type { CreditApplicationRepository } from '../domain/repositories/credit-application-repository.js'
import { EvaluateCreditApplicationUseCaseImpl } from '../application/use-cases/evaluate-credit-application.use-case.js'
import type { EvaluateCreditApplicationUseCase } from '../application/use-cases/evaluate-credit-application.use-case.js'
import { RegisterMerchantUseCaseImpl } from '../application/use-cases/register-merchant.use-case.js'
import type { RegisterMerchantUseCase } from '../application/use-cases/register-merchant.use-case.js'
import { PrismaMerchantRepository } from './persistence/prisma/prisma-merchant.repository.js'
import { PrismaCreditApplicationRepository } from './persistence/prisma/prisma-credit-application.repository.js'
import { OpenAIScoringService } from './ai/openai-scoring.service.js'
import { MockScoringService } from './ai/mock-scoring.service.js'

const merchantRepository: MerchantRepository = new PrismaMerchantRepository()
const creditApplicationRepository: CreditApplicationRepository =
  new PrismaCreditApplicationRepository()

export function createAIScoringService(): IAIScoringService {
  return env.OPENAI_API_KEY ? new OpenAIScoringService() : new MockScoringService()
}

const aiScoringService = createAIScoringService()

export const evaluateCreditApplicationUseCase: EvaluateCreditApplicationUseCase =
  new EvaluateCreditApplicationUseCaseImpl(
    merchantRepository,
    creditApplicationRepository,
    aiScoringService,
  )

export const registerMerchantUseCase: RegisterMerchantUseCase = new RegisterMerchantUseCaseImpl(
  merchantRepository,
)
