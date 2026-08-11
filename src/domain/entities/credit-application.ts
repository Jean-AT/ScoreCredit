import { DomainError } from '../../shared/errors/domain-error.js'
import type { MerchantSnapshot } from './merchant.js'

export const SCORE_MIN = 0
export const SCORE_MAX = 100
export const APPROVAL_SCORE_THRESHOLD = 60
export const REASONING_MAX_LENGTH = 2000
export const YEARS_IN_BUSINESS_MIN = 0

export const CREDIT_APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const

export type CreditApplicationStatus = (typeof CREDIT_APPLICATION_STATUSES)[number]

export interface CreateCreditApplicationInput {
  merchant: MerchantSnapshot
  requestedAmount: number
}

export interface CreditApplicationEvaluation {
  score: number
  status: CreditApplicationStatus
  approvedAmount: number | null
  reasoning: string
}

export class MerchantValidation {
  static validateName(name: string): string {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      throw new DomainError('name must be at least 2 characters')
    }
    return trimmed
  }

  static validatePhone(phone: string): string {
    const trimmed = phone.trim()
    if (!/^\+?[0-9]{6,15}$/.test(trimmed)) {
      throw new DomainError('phone must be a valid phone number')
    }
    return trimmed
  }

  static validateBusinessType(businessType: string): void {
    if (!businessType.trim()) {
      throw new DomainError('businessType is required')
    }
  }

  static validateMonthlyRevenue(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError('monthlyRevenue must be a positive number')
    }
  }

  static validateYearsInBusiness(value: number): void {
    if (!Number.isInteger(value) || value < YEARS_IN_BUSINESS_MIN) {
      throw new DomainError('yearsInBusiness must be a non-negative integer')
    }
  }

  static validateAll(merchant: {
    name: string
    phone: string
    businessType: string
    monthlyRevenue: number
    yearsInBusiness: number
  }): void {
    MerchantValidation.validateName(merchant.name)
    MerchantValidation.validatePhone(merchant.phone)
    MerchantValidation.validateBusinessType(merchant.businessType)
    MerchantValidation.validateMonthlyRevenue(merchant.monthlyRevenue)
    MerchantValidation.validateYearsInBusiness(merchant.yearsInBusiness)
  }

  static validateUpdate(input: {
    name?: string
    businessType?: string
    monthlyRevenue?: number
    yearsInBusiness?: number
  }): void {
    if (input.name !== undefined) {
      MerchantValidation.validateName(input.name)
    }
    if (input.businessType !== undefined) {
      MerchantValidation.validateBusinessType(input.businessType)
    }
    if (input.monthlyRevenue !== undefined) {
      MerchantValidation.validateMonthlyRevenue(input.monthlyRevenue)
    }
    if (input.yearsInBusiness !== undefined) {
      MerchantValidation.validateYearsInBusiness(input.yearsInBusiness)
    }
  }
}

export class CreditApplication {
  private constructor(
    readonly id: string,
    readonly merchantId: string,
    readonly requestedAmount: number,
    readonly score: number | null,
    readonly status: CreditApplicationStatus,
    readonly approvedAmount: number | null,
    readonly reasoning: string | null,
    readonly createdAt: Date,
  ) {}

  static create(input: CreateCreditApplicationInput): CreditApplication {
    if (!Number.isFinite(input.requestedAmount) || input.requestedAmount <= 0) {
      throw new DomainError('requestedAmount must be a positive number')
    }
    return new CreditApplication(
      '',
      input.merchant.id,
      input.requestedAmount,
      null,
      'PENDING',
      null,
      null,
      new Date(),
    )
  }

  applyEvaluation(evaluation: CreditApplicationEvaluation): CreditApplication {
    const score = CreditApplication.clampScore(evaluation.score)
    const status = score >= APPROVAL_SCORE_THRESHOLD ? 'APPROVED' : 'REJECTED'
    const approvedAmount = CreditApplication.resolveApprovedAmount(
      status,
      evaluation.approvedAmount,
      this.requestedAmount,
      score,
    )
    const reasoning = CreditApplication.sanitizeReasoning(evaluation.reasoning)
    return new CreditApplication(
      this.id,
      this.merchantId,
      this.requestedAmount,
      score,
      status,
      approvedAmount,
      reasoning,
      this.createdAt,
    )
  }

  private static clampScore(score: number): number {
    if (!Number.isFinite(score)) {
      throw new DomainError('AI evaluation score must be a finite number')
    }
    return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(score)))
  }

  private static resolveApprovedAmount(
    status: CreditApplicationStatus,
    approvedAmount: number | null,
    requestedAmount: number,
    score: number,
  ): number | null {
    if (status === 'REJECTED') {
      return null
    }
    if (!Number.isFinite(approvedAmount) || approvedAmount === null || approvedAmount <= 0) {
      return Math.round((requestedAmount * score) / 100)
    }
    return Math.max(1, Math.min(requestedAmount, Math.round(approvedAmount)))
  }

  private static sanitizeReasoning(reasoning: string): string {
    if (!reasoning || typeof reasoning !== 'string') {
      throw new DomainError('AI evaluation reasoning must be a string')
    }
    return reasoning.slice(0, REASONING_MAX_LENGTH)
  }
}
