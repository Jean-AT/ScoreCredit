export interface UserRecord {
  id: string
  email: string
  passwordHash: string
  role: 'ADMIN'
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
}
