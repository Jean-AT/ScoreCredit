import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { env } from '../../config/env.js'
import { createApiRouter } from './routes/api.routes.js'
import { HealthController } from './controllers/health.controller.js'
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js'
import { createRateLimiters, type RateLimitConfig } from './middlewares/rate-limit.js'
import {
  evaluateCreditApplicationUseCase,
  getCreditApplicationUseCase,
  getMyMerchantUseCase,
  listCreditApplicationsUseCase,
  loginUseCase,
  merchantRepository,
  registerMerchantUseCase,
  registerUserUseCase,
  tokenService,
  updateMerchantUseCase,
} from '../container.js'

export interface CreateAppOptions {
  rateLimit?: Partial<RateLimitConfig>
  corsOrigin?: string
}

function resolveCorsOrigins(value: string): string | string[] {
  if (value === '*') {
    return '*'
  }
  return value.split(',').map((origin) => origin.trim()).filter(Boolean)
}

export function createApp(options?: CreateAppOptions): express.Express {
  const app = express()
  const rateLimiters = createRateLimiters(options?.rateLimit)
  const healthController = new HealthController()
  const corsOrigin = resolveCorsOrigins(options?.corsOrigin ?? env.CORS_ORIGIN)

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: corsOrigin }))
  app.use(express.json({ limit: '100kb' }))
  app.use(rateLimiters.global)

  app.get('/healthz', healthController.check)

  app.use(
    '/api/v1',
    createApiRouter({
      tokenService,
      loginUseCase,
      registerUserUseCase,
      registerMerchantUseCase,
      getMyMerchantUseCase,
      updateMerchantUseCase,
      merchantRepository,
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
