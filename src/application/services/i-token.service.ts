import type { UserRole } from '../../domain/repositories/user-repository.js'

export interface AuthTokenPayload {
  sub: string
  email: string
  role: UserRole
}

export interface ITokenService {
  sign(payload: AuthTokenPayload): string
  verify(token: string): AuthTokenPayload
}
