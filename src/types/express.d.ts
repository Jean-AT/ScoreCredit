import type { AuthTokenPayload } from '../../application/services/i-token.service.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export {}
