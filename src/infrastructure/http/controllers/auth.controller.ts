import type { Request, Response } from 'express'
import type { LoginUseCase } from '../../../application/use-cases/login.use-case.js'
import { asyncHandler } from '../middlewares/validate.js'

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string }
    const result = await this.loginUseCase.execute({ email, password })
    res.status(200).json(result)
  })
}
