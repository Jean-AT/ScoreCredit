import bcrypt from 'bcryptjs'
import type { IPasswordService } from '../../application/services/i-password.service.js'

export class PasswordService implements IPasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash)
  }
}
