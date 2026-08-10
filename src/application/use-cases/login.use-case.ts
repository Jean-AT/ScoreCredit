import type { UserRepository } from '../../domain/repositories/user-repository.js'
import type { IPasswordService } from '../services/i-password.service.js'
import type { ITokenService } from '../services/i-token.service.js'
import { UnauthorizedError } from '../../shared/errors/http-error.js'

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: { id: string; email: string; role: 'ADMIN' }
}

export interface LoginUseCase {
  execute(input: LoginInput): Promise<LoginResult>
}

export class LoginUseCaseImpl implements LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email.toLowerCase())
    if (!user) {
      throw new UnauthorizedError('Invalid credentials')
    }
    const passwordMatches = await this.passwordService.compare(input.password, user.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid credentials')
    }
    const token = this.tokenService.sign({ sub: user.id, email: user.email, role: user.role })
    return { token, user: { id: user.id, email: user.email, role: user.role } }
  }
}
