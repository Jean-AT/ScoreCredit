import type { Request, Response } from 'express'
import type { LoginUseCase, RegisterUserUseCase } from '../../../application/use-cases/login.use-case.js'
import { asyncHandler } from '../middlewares/validate.js'

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string }
    const result = await this.loginUseCase.execute({ email, password })
    res.status(200).json(result)
  })

  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string }
    const result = await this.registerUserUseCase.execute({ email, password })
    res.status(201).json(result)
  })
}
