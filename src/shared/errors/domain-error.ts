import { AppError } from './app-error.js'

export class DomainError extends AppError {
  constructor(message: string) {
    super(message, 400, 'DOMAIN_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}
