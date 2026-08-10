import { Router } from 'express'
import type { ITokenService } from '../../../application/services/i-token.service.js'
import type { EvaluateCreditApplicationUseCase } from '../../../application/use-cases/evaluate-credit-application.use-case.js'
import type { RegisterMerchantUseCase } from '../../../application/use-cases/register-merchant.use-case.js'
import type { LoginUseCase } from '../../../application/use-cases/login.use-case.js'
import type {
  GetCreditApplicationUseCase,
  ListCreditApplicationsUseCase,
} from '../../../application/use-cases/query-credit-applications.use-case.js'
import { AuthController } from '../controllers/auth.controller.js'
import { MerchantController } from '../controllers/merchant.controller.js'
import { CreditApplicationController } from '../controllers/credit-application.controller.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema } from '../validators/auth.validator.js'
import { createMerchantSchema } from '../validators/merchant.validator.js'
import {
  createCreditApplicationSchema,
  creditApplicationParamsSchema,
  listCreditApplicationsSchema,
} from '../validators/credit-application.validator.js'
import type { RateLimiters } from './router.types.js'

export interface ApiRouterDeps {
  tokenService: ITokenService
  loginUseCase: LoginUseCase
  registerMerchantUseCase: RegisterMerchantUseCase
  evaluateCreditApplicationUseCase: EvaluateCreditApplicationUseCase
  getCreditApplicationUseCase: GetCreditApplicationUseCase
  listCreditApplicationsUseCase: ListCreditApplicationsUseCase
  rateLimiters: RateLimiters
}

export function createApiRouter(deps: ApiRouterDeps): Router {
  const router = Router()
  const authController = new AuthController(deps.loginUseCase)
  const merchantController = new MerchantController(deps.registerMerchantUseCase)
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

  router.post('/merchants', validate({ body: createMerchantSchema }), merchantController.register)

  const adminOnly = [authenticate(deps.tokenService), requireRole('ADMIN')]

  router.post(
    '/credit-applications',
    adminOnly,
    validate({ body: createCreditApplicationSchema }),
    creditApplicationController.create,
  )

  router.get(
    '/credit-applications/:id',
    adminOnly,
    validate({ params: creditApplicationParamsSchema }),
    creditApplicationController.getById,
  )

  router.get(
    '/credit-applications',
    adminOnly,
    validate({ query: listCreditApplicationsSchema }),
    creditApplicationController.list,
  )

  return router
}
