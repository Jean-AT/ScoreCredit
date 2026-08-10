import type { CreditApplicationStatus } from '../entities/credit-application.js'
import type { CreditApplicationEvaluation } from '../entities/credit-application.js'

export interface CreditApplicationRecord {
  id: string
  merchantId: string
  requestedAmount: number
  score: number | null
  status: CreditApplicationStatus
  approvedAmount: number | null
  reasoning: string | null
  createdAt: Date
}

export interface CreditApplicationListQuery {
  status?: CreditApplicationStatus
}

export interface CreditApplicationRepository {
  create(merchantId: string, requestedAmount: number): Promise<CreditApplicationRecord>
  applyEvaluation(
    id: string,
    evaluation: CreditApplicationEvaluation,
  ): Promise<CreditApplicationRecord>
  findById(id: string): Promise<CreditApplicationRecord | null>
  list(query?: CreditApplicationListQuery): Promise<CreditApplicationRecord[]>
}
