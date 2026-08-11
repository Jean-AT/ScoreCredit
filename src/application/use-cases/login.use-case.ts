import type { UserRepository } from '../../domain/repositories/user-repository.js'
import type { IPasswordService } from '../services/i-password.service.js'
import type { ITokenService } from '../services/i-token.service.js'
import { UnauthorizedError } from '../../shared/errors/http-error.js'
import { DomainError } from '../../shared/errors/domain-error.js'
import type { UserRole } from '../../domain/repositories/user-repository.js'

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: { id: string; email: string; role: UserRole }
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

export interface RegisterUserInput {
  email: string
  password: string
}

export interface RegisterUserUseCase {
  execute(input: RegisterUserInput): Promise<LoginResult>
}

export class RegisterUserUseCaseImpl implements RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RegisterUserInput): Promise<LoginResult> {
    const email = input.email.toLowerCase()
    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new DomainError('A user with this email already exists')
    }
    const passwordHash = await this.passwordService.hash(input.password)
    const user = await this.userRepository.create({ email, passwordHash, role: 'MERCHANT' })
    const token = this.tokenService.sign({ sub: user.id, email: user.email, role: user.role })
    return { token, user: { id: user.id, email: user.email, role: user.role } }
  }
}
