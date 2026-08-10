import type { IAIScoringService } from '../../application/services/i-ai-scoring.service.js'
import type { MerchantSnapshot } from '../../domain/entities/merchant.js'
import type { CreditApplicationEvaluation } from '../../domain/entities/credit-application.js'
import {
  APPROVAL_SCORE_THRESHOLD,
  SCORE_MAX,
  SCORE_MIN,
} from '../../domain/entities/credit-application.js'

export class MockScoringService implements IAIScoringService {
  evaluate(merchant: MerchantSnapshot): Promise<CreditApplicationEvaluation> {
    const score = this.calculateScore(merchant)
    const status = score >= APPROVAL_SCORE_THRESHOLD ? 'APPROVED' : 'REJECTED'
    const approvedAmount = status === 'APPROVED' ? Math.round(merchant.monthlyRevenue * 0.5) : 0
    const riskFlags = this.riskFlags(merchant, score)
    const reasoning =
      status === 'APPROVED'
        ? `Bodega con ${merchant.yearsInBusiness} años de operación e ingresos mensuales de $${merchant.monthlyRevenue.toFixed(2)}. Score ${score}/100, aprueba hasta $${approvedAmount}.`
        : `Perfil de riesgo elevado (score ${score}/100) por ${riskFlags.length > 0 ? 'los factores: ' + riskFlags.join(', ') : 'antigüedad e ingresos insuficientes'}.`

    return Promise.resolve({ score, status, approvedAmount, reasoning })
  }

  private calculateScore(merchant: MerchantSnapshot): number {
    let score = 40
    if (merchant.yearsInBusiness >= 3) score += 10
    if (merchant.yearsInBusiness >= 5) score += 5
    if (merchant.monthlyRevenue >= 15_000) score += 10
    else if (merchant.monthlyRevenue >= 5_000) score += 5
    if (['ABARROTES', 'MINIMARKET'].includes(merchant.businessType)) score += 5
    return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score))
  }

  private riskFlags(merchant: MerchantSnapshot, score: number): string[] {
    const flags: string[] = []
    if (merchant.yearsInBusiness < 2) flags.push('SHORT_HISTORY')
    if (merchant.monthlyRevenue < 5_000) flags.push('LOW_REVENUE')
    if (score < APPROVAL_SCORE_THRESHOLD) flags.push('HIGH_RISK')
    return flags
  }
}
