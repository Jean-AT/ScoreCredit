import { env } from '../config/env.js'
import type { IAIScoringService } from '../application/services/i-ai-scoring.service.js'
import type { ITokenService } from '../application/services/i-token.service.js'
import type { IPasswordService } from '../application/services/i-password.service.js'
import type { MerchantRepository } from '../domain/repositories/merchant-repository.js'
import type { CreditApplicationRepository } from '../domain/repositories/credit-application-repository.js'
import type { UserRepository } from '../domain/repositories/user-repository.js'
import { EvaluateCreditApplicationUseCaseImpl } from '../application/use-cases/evaluate-credit-application.use-case.js'
import type { EvaluateCreditApplicationUseCase } from '../application/use-cases/evaluate-credit-application.use-case.js'
import { RegisterMerchantUseCaseImpl } from '../application/use-cases/register-merchant.use-case.js'
import type { RegisterMerchantUseCase } from '../application/use-cases/register-merchant.use-case.js'
import { GetMyMerchantUseCaseImpl } from '../application/use-cases/get-my-merchant.use-case.js'
import type { GetMyMerchantUseCase } from '../application/use-cases/get-my-merchant.use-case.js'
import { UpdateMerchantUseCaseImpl } from '../application/use-cases/update-merchant.use-case.js'
import type { UpdateMerchantUseCase } from '../application/use-cases/update-merchant.use-case.js'
import { LoginUseCaseImpl, RegisterUserUseCaseImpl } from '../application/use-cases/login.use-case.js'
import type { LoginUseCase, RegisterUserUseCase } from '../application/use-cases/login.use-case.js'
import {
  GetCreditApplicationUseCaseImpl,
  ListCreditApplicationsUseCaseImpl,
} from '../application/use-cases/query-credit-applications.use-case.js'
import type {
  GetCreditApplicationUseCase,
  ListCreditApplicationsUseCase,
} from '../application/use-cases/query-credit-applications.use-case.js'
import { PrismaMerchantRepository } from './persistence/prisma/prisma-merchant.repository.js'
import { PrismaCreditApplicationRepository } from './persistence/prisma/prisma-credit-application.repository.js'
import { PrismaUserRepository } from './persistence/prisma/prisma-user.repository.js'
import { OpenAIScoringService } from './ai/openai-scoring.service.js'
import { MockScoringService } from './ai/mock-scoring.service.js'
import { JwtTokenService } from './auth/jwt-token.service.js'
import { PasswordService } from './auth/password.service.js'

export const merchantRepository: MerchantRepository = new PrismaMerchantRepository()
const creditApplicationRepository: CreditApplicationRepository =
  new PrismaCreditApplicationRepository()
const userRepository: UserRepository = new PrismaUserRepository()

export function createAIScoringService(): IAIScoringService {
  return env.OPENAI_API_KEY ? new OpenAIScoringService() : new MockScoringService()
}

const aiScoringService = createAIScoringService()
export const tokenService: ITokenService = new JwtTokenService()
const passwordService: IPasswordService = new PasswordService()

export const evaluateCreditApplicationUseCase: EvaluateCreditApplicationUseCase =
  new EvaluateCreditApplicationUseCaseImpl(
    merchantRepository,
    creditApplicationRepository,
    aiScoringService,
  )

export const registerMerchantUseCase: RegisterMerchantUseCase = new RegisterMerchantUseCaseImpl(
  merchantRepository,
)

export const getMyMerchantUseCase: GetMyMerchantUseCase = new GetMyMerchantUseCaseImpl(
  merchantRepository,
)

export const updateMerchantUseCase: UpdateMerchantUseCase = new UpdateMerchantUseCaseImpl(
  merchantRepository,
)

export const loginUseCase: LoginUseCase = new LoginUseCaseImpl(
  userRepository,
  passwordService,
  tokenService,
)

export const registerUserUseCase: RegisterUserUseCase = new RegisterUserUseCaseImpl(
  userRepository,
  passwordService,
  tokenService,
)

export const getCreditApplicationUseCase: GetCreditApplicationUseCase =
  new GetCreditApplicationUseCaseImpl(creditApplicationRepository)

export const listCreditApplicationsUseCase: ListCreditApplicationsUseCase =
  new ListCreditApplicationsUseCaseImpl(creditApplicationRepository)
