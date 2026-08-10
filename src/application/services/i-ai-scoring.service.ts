import type { MerchantSnapshot } from '../../domain/entities/merchant.js'
import type { CreditApplicationEvaluation } from '../../domain/entities/credit-application.js'

export interface IAIScoringService {
  evaluate(merchant: MerchantSnapshot): Promise<CreditApplicationEvaluation>
}
