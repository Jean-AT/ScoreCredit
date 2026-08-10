import { describe, expect, it } from 'vitest'
import {
  CreditApplication,
  MerchantValidation,
} from '../../src/domain/entities/credit-application.js'
import { DomainError } from '../../src/shared/errors/domain-error.js'
import type { MerchantSnapshot } from '../../src/domain/entities/merchant.js'

const merchant: MerchantSnapshot = {
  id: 'merch_1',
  name: 'Bodega Test',
  phone: '+51999000111',
  businessType: 'ABARROTES',
  monthlyRevenue: 20000,
  yearsInBusiness: 5,
}

describe('CreditApplication domain', () => {
  it('creates an application in PENDING state', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    expect(app.status).toBe('PENDING')
    expect(app.score).toBeNull()
    expect(app.approvedAmount).toBeNull()
    expect(app.requestedAmount).toBe(1000)
  })

  it('rejects a non-positive requestedAmount', () => {
    expect(() => CreditApplication.create({ merchant, requestedAmount: 0 })).toThrow(DomainError)
    expect(() => CreditApplication.create({ merchant, requestedAmount: -5 })).toThrow(DomainError)
  })

  it('approves when score meets the threshold and clamps approvedAmount to requestedAmount', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const evaluated = app.applyEvaluation({
      score: 85,
      status: 'APPROVED',
      approvedAmount: 5000,
      reasoning: 'Buen perfil.',
    })
    expect(evaluated.status).toBe('APPROVED')
    expect(evaluated.score).toBe(85)
    expect(evaluated.approvedAmount).toBe(1000)
  })

  it('rejects when score is below threshold and clears approvedAmount', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const evaluated = app.applyEvaluation({
      score: 40,
      status: 'REJECTED',
      approvedAmount: 0,
      reasoning: 'Alto riesgo.',
    })
    expect(evaluated.status).toBe('REJECTED')
    expect(evaluated.approvedAmount).toBeNull()
  })

  it('derives the final status from the score threshold, ignoring an inconsistent AI status', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const evaluated = app.applyEvaluation({
      score: 75,
      status: 'REJECTED',
      approvedAmount: 0,
      reasoning: 'Intento inconsistente.',
    })
    expect(evaluated.status).toBe('APPROVED')
  })

  it('clamps out-of-range scores to [0, 100]', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const high = app.applyEvaluation({
      score: 250,
      status: 'APPROVED',
      approvedAmount: 100,
      reasoning: 'x',
    })
    const low = app.applyEvaluation({
      score: -10,
      status: 'REJECTED',
      approvedAmount: 0,
      reasoning: 'x',
    })
    expect(high.score).toBe(100)
    expect(low.score).toBe(0)
    expect(low.status).toBe('REJECTED')
  })

  it('throws on a non-finite score', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    expect(() =>
      app.applyEvaluation({
        score: Number.NaN,
        status: 'REJECTED',
        approvedAmount: 0,
        reasoning: 'x',
      }),
    ).toThrow(DomainError)
  })

  it('falls back to a score-based default approvedAmount when AI sends zero', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const evaluated = app.applyEvaluation({
      score: 80,
      status: 'APPROVED',
      approvedAmount: 0,
      reasoning: 'Buen perfil.',
    })
    expect(evaluated.approvedAmount).toBe(800)
  })

  it('truncates reasoning to the maximum allowed length', () => {
    const app = CreditApplication.create({ merchant, requestedAmount: 1000 })
    const evaluated = app.applyEvaluation({
      score: 70,
      status: 'APPROVED',
      approvedAmount: 500,
      reasoning: 'x'.repeat(3000),
    })
    expect(evaluated.reasoning?.length).toBe(2000)
  })

  it('validates merchant fields', () => {
    expect(() => MerchantValidation.validateName('A')).toThrow(DomainError)
    expect(() => MerchantValidation.validatePhone('abc')).toThrow(DomainError)
    expect(() => MerchantValidation.validateMonthlyRevenue(0)).toThrow(DomainError)
    expect(() => MerchantValidation.validateYearsInBusiness(-1)).toThrow(DomainError)
  })
})
