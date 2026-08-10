import { AppError } from './app-error.js'

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Invalid request data',
    readonly details?: unknown,
  ) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}
