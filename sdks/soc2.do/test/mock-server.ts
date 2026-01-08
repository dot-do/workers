/**
 * Mock SOC2 server for testing
 *
 * Provides in-memory implementations of vendor risk assessment functionality
 */

import type {
  Vendor,
  RiskScore,
  Soc2Report,
  ReportVerificationResult,
  ReportStatus,
  SecurityQuestionnaire,
  QuestionnaireResponse,
  QuestionnaireSubmission,
  QuestionnaireCompleteness,
  ReviewSchedule,
  UpcomingReview,
  MitigationPlan,
  MitigationProgress,
  RiskHistoryEntry,
  RiskTrend,
  RiskEvent,
  RiskAlert,
  RiskThresholdConfig,
  RiskNotification,
  HighRiskVendor,
  VendorRiskClient
} from '../index'

// In-memory storage
const vendors: Map<string, any> = new Map()
const reports: Map<string, any> = new Map()
const questionnaires: Map<string, any> = new Map()
const schedules: Map<string, ReviewSchedule> = new Map()
const mitigations: Map<string, MitigationPlan> = new Map()
const riskHistory: Map<string, RiskHistoryEntry[]> = new Map()
const thresholds: Map<string, RiskThresholdConfig> = new Map()
const notifications: Map<string, RiskNotification> = new Map()

let questionnaireCounter = 0
let scheduleCounter = 0
let mitigationCounter = 0
let eventCounter = 0
let reportCounter = 0

/**
 * Calculate risk score based on vendor attributes
 */
function calculateRiskScore(vendor: Vendor): RiskScore {
  let dataAccessScore = 0
  let complianceScore = 0
  let recencyScore = 0

  // Data access scoring (0-40 points)
  switch (vendor.dataAccess) {
    case 'none':
      dataAccessScore = 0
      break
    case 'limited':
      dataAccessScore = 10
      break
    case 'sensitive':
      dataAccessScore = 25
      break
    case 'critical':
      dataAccessScore = 40
      break
    default:
      dataAccessScore = 20
  }

  // Compliance scoring (0-40 points)
  if (vendor.hasSoc2 === false) {
    complianceScore = 40
  } else if (vendor.hasSoc2 === true) {
    complianceScore = 5
  } else {
    complianceScore = 25 // unknown
  }

  // Assessment recency scoring (0-20 points)
  if (vendor.lastAssessment) {
    const daysSinceAssessment =
      (Date.now() - vendor.lastAssessment.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceAssessment < 90) {
      recencyScore = 0
    } else if (daysSinceAssessment < 180) {
      recencyScore = 5
    } else if (daysSinceAssessment < 365) {
      recencyScore = 10
    } else {
      recencyScore = 20
    }
  } else {
    recencyScore = 15 // no assessment
  }

  const overall = dataAccessScore + complianceScore + recencyScore

  return {
    overall,
    factors: {
      dataAccess: dataAccessScore,
      compliance: complianceScore,
      assessmentRecency: recencyScore
    }
  }
}

/**
 * Check if a report is expired (>12 months old)
 */
function isReportExpired(reportDate: Date): boolean {
  const monthsSinceReport = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return monthsSinceReport > 12
}

/**
 * Mock vendor risk client implementation
 */
export const mockVendorRiskClient: VendorRiskClient = {
  async calculateRiskScore(vendor: Vendor): Promise<RiskScore> {
    return calculateRiskScore(vendor)
  },

  async verifyReport(report: Soc2Report): Promise<ReportVerificationResult> {
    const reportId = `report-${++reportCounter}`
    const expiresAt = new Date(report.reportDate)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    const result: ReportVerificationResult = {
      verified: true,
      reportId,
      expiresAt,
      isExpired: isReportExpired(report.reportDate)
    }

    reports.set(report.vendorId, { ...report, reportId, expiresAt })
    return result
  },

  async getReportStatus(vendorId: string): Promise<ReportStatus> {
    const report = reports.get(vendorId)

    if (!report) {
      return {
        hasReport: false,
        isExpired: false
      }
    }

    return {
      hasReport: true,
      isExpired: isReportExpired(report.reportDate),
      expiresAt: report.expiresAt,
      reportType: report.reportType,
      reportDate: report.reportDate
    }
  },

  async createQuestionnaire(options): Promise<SecurityQuestionnaire> {
    const id = `quest-${++questionnaireCounter}`
    const questionnaire: SecurityQuestionnaire = {
      id,
      vendorId: options.vendorId,
      template: options.template,
      questions: [
        {
          id: 'q1',
          question: 'Do you have ISO 27001 certification?',
          category: 'Compliance',
          required: true
        },
        {
          id: 'q2',
          question: 'Do you encrypt data at rest?',
          category: 'Encryption',
          required: true
        },
        {
          id: 'q3',
          question: 'Do you perform annual penetration testing?',
          category: 'Security Testing',
          required: true
        }
      ],
      status: 'pending',
      dueDate: options.dueDate,
      createdAt: new Date()
    }

    questionnaires.set(id, questionnaire)
    return questionnaire
  },

  async submitResponses(
    questionnaireId: string,
    responses: QuestionnaireResponse[]
  ): Promise<QuestionnaireSubmission> {
    const questionnaire = questionnaires.get(questionnaireId)
    if (!questionnaire) {
      throw new Error('Questionnaire not found')
    }

    questionnaire.responses = responses
    questionnaire.status = 'submitted'

    const completeness = (responses.length / questionnaire.questions.length) * 100

    return {
      status: 'submitted',
      completeness,
      submittedAt: new Date()
    }
  },

  async getQuestionnaireCompleteness(questionnaireId: string): Promise<QuestionnaireCompleteness> {
    const questionnaire = questionnaires.get(questionnaireId)
    if (!questionnaire) {
      throw new Error('Questionnaire not found')
    }

    const total = questionnaire.questions.length
    const answered = questionnaire.responses?.length || 0

    return {
      total,
      answered,
      percentage: (answered / total) * 100
    }
  },

  async scheduleReview(options): Promise<ReviewSchedule> {
    const id = `schedule-${++scheduleCounter}`
    const schedule: ReviewSchedule = {
      id,
      vendorId: options.vendorId,
      frequency: options.frequency,
      nextReview: options.nextReview,
      assignee: options.assignee,
      createdAt: new Date()
    }

    schedules.set(id, schedule)
    return schedule
  },

  async getUpcomingReviews(options): Promise<UpcomingReview[]> {
    const now = Date.now()
    const targetDate = now + options.daysAhead * 24 * 60 * 60 * 1000

    return Array.from(schedules.values())
      .filter(schedule => schedule.nextReview.getTime() <= targetDate)
      .map(schedule => ({
        vendorId: schedule.vendorId,
        vendorName: `Vendor ${schedule.vendorId}`,
        dueDate: schedule.nextReview,
        assignee: schedule.assignee,
        daysUntilDue: Math.floor(
          (schedule.nextReview.getTime() - now) / (1000 * 60 * 60 * 24)
        )
      }))
  },

  async createMitigationPlan(options): Promise<MitigationPlan> {
    const id = `plan-${++mitigationCounter}`
    const plan: MitigationPlan = {
      id,
      vendorId: options.vendorId,
      riskId: options.riskId,
      description: options.description,
      severity: options.severity,
      mitigationSteps: options.mitigationSteps,
      owner: options.owner,
      targetDate: options.targetDate,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mitigations.set(id, plan)
    return plan
  },

  async getMitigationProgress(planId: string): Promise<MitigationProgress> {
    const plan = mitigations.get(planId)
    if (!plan) {
      throw new Error('Mitigation plan not found')
    }

    const completedSteps = plan.completedSteps?.length || 0
    const totalSteps = plan.mitigationSteps.length

    return {
      totalSteps,
      completedSteps,
      percentage: (completedSteps / totalSteps) * 100,
      status: plan.status
    }
  },

  async updateMitigationStatus(planId: string, update): Promise<MitigationPlan> {
    const plan = mitigations.get(planId)
    if (!plan) {
      throw new Error('Mitigation plan not found')
    }

    if (update.status) {
      plan.status = update.status
    }
    if (update.completedSteps) {
      plan.completedSteps = update.completedSteps
    }
    if (update.notes) {
      plan.notes = update.notes
    }

    plan.updatedAt = new Date()
    return plan
  },

  async getRiskHistory(vendorId: string, options): Promise<RiskHistoryEntry[]> {
    const history = riskHistory.get(vendorId) || []
    return history.filter(
      entry =>
        entry.date >= options.startDate && entry.date <= options.endDate
    )
  },

  async getRiskTrend(vendorId: string): Promise<RiskTrend> {
    const history = riskHistory.get(vendorId) || []

    if (history.length < 2) {
      return {
        direction: 'stable',
        changePercent: 0,
        period: '30d'
      }
    }

    const latest = history[history.length - 1]
    const previous = history[history.length - 2]
    const change = latest.score - previous.score
    const changePercent = (change / previous.score) * 100

    return {
      direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      changePercent: Math.abs(changePercent),
      period: '30d'
    }
  },

  async logRiskEvent(event): Promise<RiskEvent> {
    const id = `event-${++eventCounter}`
    const riskEvent: RiskEvent = {
      id,
      vendorId: event.vendorId,
      eventType: event.eventType,
      score: event.score,
      notes: event.notes,
      assessedBy: event.assessedBy,
      timestamp: new Date()
    }

    // Add to history if score is provided
    if (event.score !== undefined) {
      const history = riskHistory.get(event.vendorId) || []
      history.push({
        date: new Date(),
        score: event.score,
        changeReason: event.eventType
      })
      riskHistory.set(event.vendorId, history)
    }

    return riskEvent
  },

  async checkRiskThreshold(options): Promise<RiskAlert> {
    const triggered = options.currentScore > options.threshold

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (options.currentScore >= 95) {
      severity = 'critical'
    } else if (options.currentScore >= 80) {
      severity = 'high'
    } else if (options.currentScore >= 60) {
      severity = 'medium'
    }

    return {
      triggered,
      severity,
      message: triggered
        ? `Vendor risk score (${options.currentScore}) exceeds threshold (${options.threshold})`
        : 'Risk score within acceptable range',
      currentScore: options.currentScore,
      threshold: options.threshold
    }
  },

  async setRiskThreshold(vendorId: string, thresholdValues): Promise<RiskThresholdConfig> {
    const config: RiskThresholdConfig = {
      vendorId,
      thresholds: thresholdValues
    }

    thresholds.set(vendorId, config)
    return config
  },

  async getLatestNotification(vendorId: string): Promise<RiskNotification> {
    const notification = notifications.get(vendorId) || {
      type: 'risk_threshold_exceeded',
      severity: 'high',
      sentAt: new Date(),
      recipients: ['security@example.com'],
      message: 'Vendor risk score has exceeded the configured threshold'
    }

    return notification
  },

  async getVendorsAboveThreshold(threshold: number): Promise<HighRiskVendor[]> {
    // Mock: return vendors with scores above threshold
    const highRiskVendors: HighRiskVendor[] = [
      {
        id: 'vendor-high-1',
        name: 'High Risk Vendor 1',
        riskScore: 85,
        lastAssessment: new Date('2025-06-01')
      },
      {
        id: 'vendor-high-2',
        name: 'High Risk Vendor 2',
        riskScore: 92,
        lastAssessment: new Date('2025-05-15')
      }
    ]

    return highRiskVendors.filter(v => v.riskScore > threshold)
  }
}
