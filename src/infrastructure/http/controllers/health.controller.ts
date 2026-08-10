import type { Request, Response } from 'express'
import { prisma } from '../../persistence/prisma/prisma-client.js'
import { asyncHandler } from '../middlewares/validate.js'

export class HealthController {
  check = asyncHandler(async (_req: Request, res: Response) => {
    await prisma.$queryRawUnsafe('SELECT 1')
    res.status(200).json({ status: 'ok' })
  })
}
