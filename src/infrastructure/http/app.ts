import express from 'express'
import helmet from 'helmet'
import { createApiRouter } from './routes/api.routes.js'
import { HealthController } from './controllers/health.controller.js'
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js'
import { createRateLimiters, type RateLimitConfig } from './middlewares/rate-limit.js'
import {
  evaluateCreditApplicationUseCase,
  getCreditApplicationUseCase,
  listCreditApplicationsUseCase,
  loginUseCase,
  registerMerchantUseCase,
  tokenService,
} from '../container.js'

export interface CreateAppOptions {
  rateLimit?: Partial<RateLimitConfig>
}

export function createApp(options?: CreateAppOptions): express.Express {
  const app = express()
  const rateLimiters = createRateLimiters(options?.rateLimit)
  const healthController = new HealthController()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(express.json({ limit: '100kb' }))
  app.use(rateLimiters.global)

  app.get('/healthz', healthController.check)

  app.use(
    '/api/v1',
    createApiRouter({
      tokenService,
      loginUseCase,
      registerMerchantUseCase,
      evaluateCreditApplicationUseCase,
      getCreditApplicationUseCase,
      listCreditApplicationsUseCase,
      rateLimiters,
    }),
  )

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
