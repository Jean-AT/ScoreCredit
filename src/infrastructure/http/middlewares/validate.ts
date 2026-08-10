import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ParsedQs } from 'qs'
import type { ZodType, ZodIssue } from 'zod'
import { ValidationError } from '../../../shared/errors/http-error.js'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}

interface ValidateOptions {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export function validate(options: ValidateOptions): RequestHandler {
  return (req, _res, next) => {
    const issues: ZodIssue[] = []

    const parse = (schema: ZodType, value: unknown): unknown => {
      const result = schema.safeParse(value)
      if (!result.success) {
        issues.push(...result.error.issues)
      }
      return result.success ? result.data : value
    }

    if (options.params) {
      req.params = parse(options.params, req.params) as Request['params']
    }
    if (options.query) {
      req.query = parse(options.query, req.query) as ParsedQs
    }
    if (options.body) {
      req.body = parse(options.body, req.body)
    }

    if (issues.length > 0) {
      next(
        new ValidationError(
          'Invalid request data',
          issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        ),
      )
      return
    }
    next()
  }
}
