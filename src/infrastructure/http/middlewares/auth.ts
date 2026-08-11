import type { NextFunction, Request, Response } from 'express'
import type { ITokenService } from '../../../application/services/i-token.service.js'
import type { AuthTokenPayload } from '../../../application/services/i-token.service.js'
import type { UserRole } from '../../../domain/repositories/user-repository.js'
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/http-error.js'

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length)
}

export function authenticate(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req)
    if (!token) {
      next(new UnauthorizedError('Missing Bearer token'))
      return
    }
    req.user = tokenService.verify(token)
    next()
  }
}

export function authenticateOptional(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req)
    if (!token) {
      next()
      return
    }
    try {
      req.user = tokenService.verify(token)
    } catch {
      req.user = undefined
    }
    next()
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as AuthTokenPayload | undefined
    if (!user || !roles.includes(user.role)) {
      next(new ForbiddenError('Insufficient permissions'))
      return
    }
    next()
  }
}
