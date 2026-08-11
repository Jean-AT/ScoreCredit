import { Router } from 'express'
import type { ITokenService } from '../../../application/services/i-token.service.js'
import type { EvaluateCreditApplicationUseCase } from '../../../application/use-cases/evaluate-credit-application.use-case.js'
import type { RegisterMerchantUseCase } from '../../../application/use-cases/register-merchant.use-case.js'
import type { GetMyMerchantUseCase } from '../../../application/use-cases/get-my-merchant.use-case.js'
import type { UpdateMerchantUseCase } from '../../../application/use-cases/update-merchant.use-case.js'
import type { LoginUseCase, RegisterUserUseCase } from '../../../application/use-cases/login.use-case.js'
import type {
  GetCreditApplicationUseCase,
  ListCreditApplicationsUseCase,
} from '../../../application/use-cases/query-credit-applications.use-case.js'
import type { MerchantRepository } from '../../../domain/repositories/merchant-repository.js'
import { AuthController } from '../controllers/auth.controller.js'
import { MerchantController } from '../controllers/merchant.controller.js'
import { CreditApplicationController } from '../controllers/credit-application.controller.js'
import { authenticate, authenticateOptional, requireRole } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema, registerSchema } from '../validators/auth.validator.js'
import {
  createMerchantSchema,
  updateMerchantSchema,
} from '../validators/merchant.validator.js'
import {
  createCreditApplicationSchema,
  creditApplicationParamsSchema,
  listCreditApplicationsSchema,
} from '../validators/credit-application.validator.js'
import type { RateLimiters } from './router.types.js'

export interface ApiRouterDeps {
  tokenService: ITokenService
  loginUseCase: LoginUseCase
  registerUserUseCase: RegisterUserUseCase
  registerMerchantUseCase: RegisterMerchantUseCase
  getMyMerchantUseCase: GetMyMerchantUseCase
  updateMerchantUseCase: UpdateMerchantUseCase
  merchantRepository: MerchantRepository
  evaluateCreditApplicationUseCase: EvaluateCreditApplicationUseCase
  getCreditApplicationUseCase: GetCreditApplicationUseCase
  listCreditApplicationsUseCase: ListCreditApplicationsUseCase
  rateLimiters: RateLimiters
}

export function createApiRouter(deps: ApiRouterDeps): Router {
  const router = Router()
  const authController = new AuthController(deps.loginUseCase, deps.registerUserUseCase)
  const merchantController = new MerchantController(
    deps.registerMerchantUseCase,
    deps.getMyMerchantUseCase,
    deps.updateMerchantUseCase,
    deps.merchantRepository,
  )
  const creditApplicationController = new CreditApplicationController(
    deps.evaluateCreditApplicationUseCase,
    deps.getCreditApplicationUseCase,
    deps.listCreditApplicationsUseCase,
  )

  router.post(
    '/auth/login',
    deps.rateLimiters.auth,
    validate({ body: loginSchema }),
    authController.login,
  )

  router.post(
    '/auth/register',
    deps.rateLimiters.auth,
    validate({ body: registerSchema }),
    authController.register,
  )

  router.post(
    '/merchants',
    authenticateOptional(deps.tokenService),
    validate({ body: createMerchantSchema }),
    merchantController.register,
  )

  router.get(
    '/merchants/me',
    authenticate(deps.tokenService),
    requireRole('MERCHANT'),
    merchantController.getMe,
  )

  router.put(
    '/merchants/me',
    authenticate(deps.tokenService),
    requireRole('MERCHANT'),
    validate({ body: updateMerchantSchema }),
    merchantController.updateMe,
  )

  router.get(
    '/merchants',
    authenticate(deps.tokenService),
    requireRole('ADMIN'),
    merchantController.listAll,
  )

  const applicationRoutes = [
    authenticate(deps.tokenService),
    requireRole('ADMIN', 'MERCHANT'),
  ]

  router.post(
    '/credit-applications',
    applicationRoutes,
    validate({ body: createCreditApplicationSchema }),
    creditApplicationController.create,
  )

  router.get(
    '/credit-applications/:id',
    applicationRoutes,
    validate({ params: creditApplicationParamsSchema }),
    creditApplicationController.getById,
  )

  router.get(
    '/credit-applications',
    applicationRoutes,
    validate({ query: listCreditApplicationsSchema }),
    creditApplicationController.list,
  )

  return router
}
