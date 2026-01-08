/**
 * soc2.do - SOC 2 Compliance SDK
 *
 * Strongly-typed client for the soc2.do compliance platform.
 * Provides automated evidence collection, vendor risk assessment,
 * control framework management, and audit support.
 *
 * @example
 * ```typescript
 * import { soc2 } from 'soc2.do'
 *
 * // Assess vendor risk
 * const risk = await soc2.vendors.calculateRiskScore({
 *   id: 'vendor-1',
 *   name: 'AWS',
 *   dataAccess: 'sensitive',
 *   hasSoc2: true
 * })
 *
 * // Verify SOC 2 report
 * await soc2.vendors.verifyReport({
 *   vendorId: 'vendor-1',
 *   reportType: 'Type II',
 *   reportDate: new Date()
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// ============================================================================
// Vendor Risk Types
// ============================================================================

export interface Vendor {
  id: string
  name: string
  dataAccess?: 'none' | 'limited' | 'sensitive' | 'critical'
  hasSoc2?: boolean
  lastAssessment?: Date
  criticalityLevel?: 'low' | 'medium' | 'high' | 'critical'
}

export interface RiskScore {
  overall: number
  factors: {
    dataAccess: number
    compliance: number
    assessmentRecency: number
  }
}

export interface Soc2Report {
  vendorId: string
  reportType: 'Type I' | 'Type II'
  reportDate: Date
  auditPeriod?: {
    start: Date
    end: Date
  }
  auditor?: string
  opinionType?: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer'
  trustServiceCategories?: string[]
}

export interface ReportVerificationResult {
  verified: boolean
  reportId?: string
  expiresAt?: Date
  isExpired?: boolean
}

export interface ReportStatus {
  hasReport: boolean
  isExpired: boolean
  expiresAt?: Date
  reportType?: 'Type I' | 'Type II'
  reportDate?: Date
}

export interface SecurityQuestionnaire {
  id: string
  vendorId: string
  template: string
  questions: Array<{
    id: string
    question: string
    category: string
    required: boolean
  }>
  status: 'pending' | 'in-progress' | 'submitted' | 'reviewed'
  dueDate?: Date
  createdAt: Date
}

export interface QuestionnaireResponse {
  questionId: string
  answer: string
  evidence?: string
  explanation?: string
}

export interface QuestionnaireSubmission {
  status: 'submitted' | 'incomplete'
  completeness: number
  submittedAt: Date
}

export interface QuestionnaireCompleteness {
  total: number
  answered: number
  percentage: number
}

export interface ReviewSchedule {
  id: string
  vendorId: string
  frequency: 'quarterly' | 'biannual' | 'annual'
  nextReview: Date
  assignee?: string
  createdAt: Date
}

export interface UpcomingReview {
  vendorId: string
  vendorName: string
  dueDate: Date
  assignee?: string
  daysUntilDue: number
}

export interface MitigationPlan {
  id: string
  vendorId: string
  riskId: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  mitigationSteps: string[]
  owner: string
  targetDate: Date
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface MitigationProgress {
  totalSteps: number
  completedSteps: number
  percentage: number
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
}

export interface RiskHistoryEntry {
  date: Date
  score: number
  changeReason?: string
}

export interface RiskTrend {
  direction: 'increasing' | 'decreasing' | 'stable'
  changePercent: number
  period: string
}

export interface RiskEvent {
  id: string
  vendorId: string
  eventType: string
  score?: number
  notes?: string
  assessedBy?: string
  timestamp: Date
}

export interface RiskAlert {
  triggered: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  currentScore?: number
  threshold?: number
}

export interface RiskThresholdConfig {
  vendorId: string
  thresholds: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface RiskNotification {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sentAt: Date
  recipients: string[]
  message: string
}

export interface HighRiskVendor {
  id: string
  name: string
  riskScore: number
  lastAssessment?: Date
}

// ============================================================================
// Vendor Risk Client Interface
// ============================================================================

export interface VendorRiskClient {
  // Risk Scoring
  calculateRiskScore(vendor: Vendor): Promise<RiskScore>

  // SOC 2 Report Verification
  verifyReport(report: Soc2Report): Promise<ReportVerificationResult>
  getReportStatus(vendorId: string): Promise<ReportStatus>

  // Security Questionnaires
  createQuestionnaire(options: {
    vendorId: string
    template: string
    dueDate?: Date
  }): Promise<SecurityQuestionnaire>
  submitResponses(
    questionnaireId: string,
    responses: QuestionnaireResponse[]
  ): Promise<QuestionnaireSubmission>
  getQuestionnaireCompleteness(questionnaireId: string): Promise<QuestionnaireCompleteness>

  // Review Scheduling
  scheduleReview(options: {
    vendorId: string
    frequency: 'quarterly' | 'biannual' | 'annual'
    nextReview: Date
    assignee?: string
  }): Promise<ReviewSchedule>
  getUpcomingReviews(options: { daysAhead: number }): Promise<UpcomingReview[]>

  // Risk Mitigation
  createMitigationPlan(options: {
    vendorId: string
    riskId: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    mitigationSteps: string[]
    owner: string
    targetDate: Date
  }): Promise<MitigationPlan>
  getMitigationProgress(planId: string): Promise<MitigationProgress>
  updateMitigationStatus(
    planId: string,
    update: {
      status?: 'open' | 'in-progress' | 'completed' | 'cancelled'
      completedSteps?: string[]
      notes?: string
    }
  ): Promise<MitigationPlan>

  // Risk History
  getRiskHistory(
    vendorId: string,
    options: { startDate: Date; endDate: Date }
  ): Promise<RiskHistoryEntry[]>
  getRiskTrend(vendorId: string): Promise<RiskTrend>
  logRiskEvent(event: {
    vendorId: string
    eventType: string
    score?: number
    notes?: string
    assessedBy?: string
  }): Promise<RiskEvent>

  // Risk Alerts
  checkRiskThreshold(options: {
    vendorId: string
    currentScore: number
    threshold: number
  }): Promise<RiskAlert>
  setRiskThreshold(
    vendorId: string,
    thresholds: {
      low: number
      medium: number
      high: number
      critical: number
    }
  ): Promise<RiskThresholdConfig>
  getLatestNotification(vendorId: string): Promise<RiskNotification>
  getVendorsAboveThreshold(threshold: number): Promise<HighRiskVendor[]>
}

// ============================================================================
// SOC2 Client Interface
// ============================================================================

export interface SOC2Client {
  vendors: VendorRiskClient
  // Future: controls, evidence, reports, trustCenter, audit
}

/**
 * Create a configured SOC2 client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { SOC2 } from 'soc2.do'
 * const mySOC2 = SOC2({ apiKey: 'xxx' })
 * ```
 */
export function SOC2(options?: ClientOptions): SOC2Client {
  return createClient<SOC2Client>('https://soc2.do', options)
}

/**
 * Default SOC2 client instance (camelCase)
 * For Workers: import 'rpc.do/env' first to enable env-based API key resolution
 *
 * @example
 * ```typescript
 * import { soc2 } from 'soc2.do'
 * await soc2.vendors.calculateRiskScore({ ... })
 * ```
 */
export const soc2: SOC2Client = SOC2()

// Default export = camelCase instance
export default soc2

// Legacy alias
export const createSOC2 = SOC2

// Re-export types
export type { ClientOptions } from 'rpc.do'
