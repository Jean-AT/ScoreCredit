import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from '../../../domain/repositories/user-repository.js'
import { prisma } from './prisma-client.js'

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    return user ? this.map(user) : null
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await prisma.user.create({ data: input })
    return this.map(user)
  }

  private map(user: {
    id: string
    email: string
    passwordHash: string
    role: string
  }): UserRecord {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRecord['role'],
    }
  }
}
