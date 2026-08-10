import { describe, expect, it, vi } from 'vitest'
import { EvaluateCreditApplicationUseCaseImpl } from '../../src/application/use-cases/evaluate-credit-application.use-case.js'
import type {
  CreditApplicationRecord,
  CreditApplicationRepository,
} from '../../src/domain/repositories/credit-application-repository.js'
import type { MerchantRepository } from '../../src/domain/repositories/merchant-repository.js'
import type { IAIScoringService } from '../../src/application/services/i-ai-scoring.service.js'
import type { CreateMerchantInput, MerchantSnapshot } from '../../src/domain/entities/merchant.js'
import { NotFoundError } from '../../src/shared/errors/domain-error.js'
import type { CreditApplicationEvaluation } from '../../src/domain/entities/credit-application.js'

const merchant: MerchantSnapshot = {
  id: 'merch_1',
  name: 'Bodega Don José',
  phone: '+51999000111',
  businessType: 'ABARROTES',
  monthlyRevenue: 25000,
  yearsInBusiness: 6,
}

function createApplicationRecord(
  overrides: Partial<CreditApplicationRecord> = {},
): CreditApplicationRecord {
  return {
    id: 'app_1',
    merchantId: 'merch_1',
    requestedAmount: 1000,
    score: null,
    status: 'PENDING',
    approvedAmount: null,
    reasoning: null,
    createdAt: new Date('2026-08-10T00:00:00Z'),
    ...overrides,
  }
}

function createFakeRepositories(overrides?: {
  merchant?: MerchantSnapshot | null
  pending?: CreditApplicationRecord
  evaluated?: CreditApplicationRecord
}) {
  const merchantRepository: MerchantRepository = {
    findById: vi.fn(async (id: string) =>
      id === merchant.id
        ? overrides?.merchant === undefined
          ? merchant
          : overrides.merchant
        : null,
    ),
    findByPhone: vi.fn(async () => null),
    create: vi.fn(async (input: CreateMerchantInput) => ({ id: 'merch_1', ...input })),
  }

  const creditApplicationRepository: CreditApplicationRepository = {
    create: vi.fn(
      async (merchantId: string, requestedAmount: number) =>
        overrides?.pending ?? createApplicationRecord({ merchantId, requestedAmount }),
    ),
    applyEvaluation: vi.fn(
      async (id: string, evaluation: CreditApplicationEvaluation) =>
        overrides?.evaluated ??
        createApplicationRecord({
          id,
          score: evaluation.score,
          status: evaluation.status,
          approvedAmount: evaluation.approvedAmount,
          reasoning: evaluation.reasoning,
        }),
    ),
    findById: vi.fn(async () => null),
    list: vi.fn(async () => []),
  }

  return { merchantRepository, creditApplicationRepository }
}

describe('EvaluateCreditApplicationUseCase', () => {
  it('creates a PENDING application, evaluates with AI and persists the result', async () => {
    const { merchantRepository, creditApplicationRepository } = createFakeRepositories()
    const aiScoringService: IAIScoringService = {
      evaluate: vi.fn(async () => ({
        score: 88,
        status: 'APPROVED',
        approvedAmount: 1000,
        reasoning: 'Excelente historial.',
        riskFlags: [],
      })),
    }

    const useCase = new EvaluateCreditApplicationUseCaseImpl(
      merchantRepository,
      creditApplicationRepository,
      aiScoringService,
    )

    const result = await useCase.execute({ merchantId: merchant.id, requestedAmount: 1000 })

    expect(creditApplicationRepository.create).toHaveBeenCalledWith('merch_1', 1000)
    expect(aiScoringService.evaluate).toHaveBeenCalledWith(merchant)
    expect(creditApplicationRepository.applyEvaluation).toHaveBeenCalledWith('app_1', {
      score: 88,
      status: 'APPROVED',
      approvedAmount: 1000,
      reasoning: 'Excelente historial.',
    })
    expect(result.status).toBe('APPROVED')
  })

  it('persists a rejection when the AI score is below the threshold', async () => {
    const { merchantRepository, creditApplicationRepository } = createFakeRepositories()
    const aiScoringService: IAIScoringService = {
      evaluate: vi.fn(async () => ({
        score: 30,
        status: 'REJECTED',
        approvedAmount: 0,
        reasoning: 'Alto riesgo.',
        riskFlags: ['HIGH_RISK'],
      })),
    }

    const useCase = new EvaluateCreditApplicationUseCaseImpl(
      merchantRepository,
      creditApplicationRepository,
      aiScoringService,
    )

    const result = await useCase.execute({ merchantId: merchant.id, requestedAmount: 500 })

    expect(creditApplicationRepository.applyEvaluation).toHaveBeenCalledWith('app_1', {
      score: 30,
      status: 'REJECTED',
      approvedAmount: null,
      reasoning: 'Alto riesgo.',
    })
    expect(result.status).toBe('REJECTED')
    expect(result.approvedAmount).toBeNull()
  })

  it('throws NotFoundError when the merchant does not exist', async () => {
    const { merchantRepository, creditApplicationRepository } = createFakeRepositories({
      merchant: null,
    })
    const aiScoringService: IAIScoringService = {
      evaluate: vi.fn(async () => {
        throw new Error('should not be called')
      }),
    }

    const useCase = new EvaluateCreditApplicationUseCaseImpl(
      merchantRepository,
      creditApplicationRepository,
      aiScoringService,
    )

    await expect(useCase.execute({ merchantId: 'unknown', requestedAmount: 1000 })).rejects.toThrow(
      NotFoundError,
    )
    expect(creditApplicationRepository.create).not.toHaveBeenCalled()
    expect(aiScoringService.evaluate).not.toHaveBeenCalled()
  })

  it('applies domain sanitization over a hostile AI evaluation', async () => {
    const { merchantRepository, creditApplicationRepository } = createFakeRepositories()
    const aiScoringService: IAIScoringService = {
      evaluate: vi.fn(async () => ({
        score: 999,
        status: 'REJECTED',
        approvedAmount: -50,
        reasoning: 'y'.repeat(5000),
        riskFlags: [],
      })),
    }

    const useCase = new EvaluateCreditApplicationUseCaseImpl(
      merchantRepository,
      creditApplicationRepository,
      aiScoringService,
    )

    const result = await useCase.execute({ merchantId: merchant.id, requestedAmount: 1000 })

    expect(result.score).toBe(100)
    expect(result.status).toBe('APPROVED')
    expect(result.approvedAmount).toBe(1000)
    expect(result.reasoning?.length).toBe(2000)
  })
})
