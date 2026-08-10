import type { NextFunction, Request, Response } from 'express'
import { env } from '../../../config/env.js'
import { AppError } from '../../../shared/errors/app-error.js'

interface ErrorResponseBody {
  error: {
    code: string
    message: string
    details?: unknown
    stack?: string
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    const body: ErrorResponseBody = { error: { code: error.code, message: error.message } }
    if ('details' in error && (error as { details?: unknown }).details !== undefined) {
      body.error.details = (error as { details?: unknown }).details
    }
    res.status(error.statusCode).json(body)
    return
  }

  const message = error instanceof Error ? error.message : 'Unexpected error'
  const body: ErrorResponseBody = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  }
  if (env.NODE_ENV !== 'production') {
    body.error.message = message
    if (error instanceof Error) {
      body.error.stack = error.stack
    }
  }
  console.error(error)
  res.status(500).json(body)
}
