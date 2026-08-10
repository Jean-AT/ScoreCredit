import type { Request, Response } from 'express'
import type { RegisterMerchantUseCase } from '../../../application/use-cases/register-merchant.use-case.js'
import type { CreateMerchantBody } from '../validators/merchant.validator.js'
import { asyncHandler } from '../middlewares/validate.js'

export class MerchantController {
  constructor(private readonly registerMerchantUseCase: RegisterMerchantUseCase) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const merchant = await this.registerMerchantUseCase.execute(req.body as CreateMerchantBody)
    res.status(201).json(merchant)
  })
}
