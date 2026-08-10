import type { UserRecord, UserRepository } from '../../../domain/repositories/user-repository.js'
import { prisma } from './prisma-client.js'

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return null
    }
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
    }
  }
}
