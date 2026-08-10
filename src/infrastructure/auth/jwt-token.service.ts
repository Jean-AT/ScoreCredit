import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import type { AuthTokenPayload, ITokenService } from '../../application/services/i-token.service.js'
import { UnauthorizedError } from '../../shared/errors/http-error.js'

export class JwtTokenService implements ITokenService {
  sign(payload: AuthTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })
  }

  verify(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET)
      if (typeof decoded === 'string' || !('sub' in decoded)) {
        throw new UnauthorizedError('Invalid token')
      }
      return decoded as unknown as AuthTokenPayload
    } catch {
      throw new UnauthorizedError('Invalid or expired token')
    }
  }
}
