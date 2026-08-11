import type { Request, Response } from 'express'
import type { EvaluateCreditApplicationUseCase } from '../../../application/use-cases/evaluate-credit-application.use-case.js'
import type {
  GetCreditApplicationUseCase,
  ListCreditApplicationsUseCase,
} from '../../../application/use-cases/query-credit-applications.use-case.js'
import type { CreditApplicationStatus } from '../../../domain/entities/credit-application.js'
import type { AuthTokenPayload } from '../../../application/services/i-token.service.js'
import { asyncHandler } from '../middlewares/validate.js'

function ownerScope(user?: AuthTokenPayload): string | undefined {
  return user?.role === 'MERCHANT' ? user.sub : undefined
}

export class CreditApplicationController {
  constructor(
    private readonly evaluateUseCase: EvaluateCreditApplicationUseCase,
    private readonly getUseCase: GetCreditApplicationUseCase,
    private readonly listUseCase: ListCreditApplicationsUseCase,
  ) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const { merchantId, requestedAmount } = req.body as {
      merchantId: string
      requestedAmount: number
    }
    const application = await this.evaluateUseCase.execute({
      merchantId,
      requestedAmount,
      ownerId: ownerScope(req.user as AuthTokenPayload | undefined),
    })
    res.status(201).json(application)
  })

  getById = asyncHandler(async (req: Request, res: Response) => {
    const application = await this.getUseCase.execute(
      req.params.id as string,
      ownerScope(req.user as AuthTokenPayload | undefined),
    )
    res.status(200).json(application)
  })

  list = asyncHandler(async (req: Request, res: Response) => {
    const applications = await this.listUseCase.execute({
      status: req.query.status as CreditApplicationStatus | undefined,
      ownerId: ownerScope(req.user as AuthTokenPayload | undefined),
    })
    res.status(200).json(applications)
  })
}
