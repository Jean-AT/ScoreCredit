import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit'
import { env } from '../../../config/env.js'

export interface RateLimitConfig {
  windowMs: number
  globalLimit: number
  authLimit: number
}

export interface RateLimiters {
  global: RateLimitRequestHandler
  auth: RateLimitRequestHandler
}

export function createRateLimiters(config?: Partial<RateLimitConfig>): RateLimiters {
  const windowMs = config?.windowMs ?? env.RATE_LIMIT_WINDOW_MS
  const globalLimit = config?.globalLimit ?? env.RATE_LIMIT_MAX
  const authLimit = config?.authLimit ?? env.AUTH_RATE_LIMIT_MAX

  return {
    global: rateLimit({
      windowMs,
      limit: globalLimit,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
      },
    }),
    auth: rateLimit({
      windowMs,
      limit: authLimit,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many login attempts, please try again later',
        },
      },
    }),
  }
}
