import type { CreditApplication as PrismaApplication } from '@prisma/client'
import type { CreditApplicationEvaluation } from '../../../domain/entities/credit-application.js'
import type {
  CreditApplicationListQuery,
  CreditApplicationRecord,
  CreditApplicationRepository,
} from '../../../domain/repositories/credit-application-repository.js'
import { prisma } from './prisma-client.js'

export class PrismaCreditApplicationRepository implements CreditApplicationRepository {
  async create(merchantId: string, requestedAmount: number): Promise<CreditApplicationRecord> {
    const application = await prisma.creditApplication.create({
      data: { merchantId, requestedAmount },
    })
    return this.map(application)
  }

  async applyEvaluation(
    id: string,
    evaluation: CreditApplicationEvaluation,
  ): Promise<CreditApplicationRecord> {
    const application = await prisma.creditApplication.update({
      where: { id },
      data: {
        score: evaluation.score,
        status: evaluation.status,
        approvedAmount: evaluation.approvedAmount,
        reasoning: evaluation.reasoning,
      },
    })
    return this.map(application)
  }

  async findById(id: string): Promise<CreditApplicationRecord | null> {
    const application = await prisma.creditApplication.findUnique({ where: { id } })
    return application ? this.map(application) : null
  }

  async list(query?: CreditApplicationListQuery): Promise<CreditApplicationRecord[]> {
    const applications = await prisma.creditApplication.findMany({
      where: query?.status ? { status: query.status } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return applications.map((a) => this.map(a))
  }

  private map(application: PrismaApplication): CreditApplicationRecord {
    return {
      id: application.id,
      merchantId: application.merchantId,
      requestedAmount: Number(application.requestedAmount),
      score: application.score,
      status: application.status,
      approvedAmount:
        application.approvedAmount === null ? null : Number(application.approvedAmount),
      reasoning: application.reasoning,
      createdAt: application.createdAt,
    }
  }
}
