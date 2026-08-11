export type UserRole = 'ADMIN' | 'MERCHANT'

export interface UserRecord {
  id: string
  email: string
  passwordHash: string
  role: UserRole
}

export interface CreateUserInput {
  email: string
  passwordHash: string
  role: UserRole
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  create(input: CreateUserInput): Promise<UserRecord>
}
