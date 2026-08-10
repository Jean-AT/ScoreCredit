import type { NextFunction, Request, Response } from 'express'
import type { ITokenService } from '../../../application/services/i-token.service.js'
import type { AuthTokenPayload } from '../../../application/services/i-token.service.js'
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/http-error.js'

export function authenticate(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      next(new UnauthorizedError('Missing Bearer token'))
      return
    }
    const token = header.slice('Bearer '.length)
    const payload = tokenService.verify(token)
    req.user = payload
    next()
  }
}

export function requireRole(role: 'ADMIN') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AuthTokenPayload | undefined
    if (user?.role !== role) {
      next(new ForbiddenError('Insufficient permissions'))
      return
    }
    next()
  }
}
