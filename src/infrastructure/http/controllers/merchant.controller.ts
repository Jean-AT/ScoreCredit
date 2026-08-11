import type { Request, Response } from 'express'
import type { RegisterMerchantUseCase } from '../../../application/use-cases/register-merchant.use-case.js'
import type { GetMyMerchantUseCase } from '../../../application/use-cases/get-my-merchant.use-case.js'
import type { UpdateMerchantUseCase } from '../../../application/use-cases/update-merchant.use-case.js'
import type { MerchantRepository } from '../../../domain/repositories/merchant-repository.js'
import type { AuthTokenPayload } from '../../../application/services/i-token.service.js'
import type { CreateMerchantBody, UpdateMerchantBody } from '../validators/merchant.validator.js'
import { asyncHandler } from '../middlewares/validate.js'

function authenticatedUser(req: Request): AuthTokenPayload {
  return req.user as AuthTokenPayload
}

export class MerchantController {
  constructor(
    private readonly registerMerchantUseCase: RegisterMerchantUseCase,
    private readonly getMyMerchantUseCase: GetMyMerchantUseCase,
    private readonly updateMerchantUseCase: UpdateMerchantUseCase,
    private readonly merchantRepository: MerchantRepository,
  ) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as AuthTokenPayload | undefined
    const merchant = await this.registerMerchantUseCase.execute(
      req.body as CreateMerchantBody,
      user?.role === 'MERCHANT' ? user.sub : undefined,
    )
    res.status(201).json(merchant)
  })

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const merchant = await this.getMyMerchantUseCase.execute(authenticatedUser(req).sub)
    res.status(200).json(merchant)
  })

  updateMe = asyncHandler(async (req: Request, res: Response) => {
    const merchant = await this.updateMerchantUseCase.execute(
      authenticatedUser(req).sub,
      req.body as UpdateMerchantBody,
    )
    res.status(200).json(merchant)
  })

  listAll = asyncHandler(async (_req: Request, res: Response) => {
    const merchants = await this.merchantRepository.list()
    res.status(200).json(merchants)
  })
}
