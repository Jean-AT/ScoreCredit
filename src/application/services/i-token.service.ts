export interface AuthTokenPayload {
  sub: string
  email: string
  role: 'ADMIN'
}

export interface ITokenService {
  sign(payload: AuthTokenPayload): string
  verify(token: string): AuthTokenPayload
}
