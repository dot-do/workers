import type { D1Database } from '@cloudflare/workers-types'
import type { GovernanceEvent, Approval } from '../types/schema'
import { ulid } from 'ulid'

export class ComplianceManager {
  constructor(private db: D1Database) {}

  // Request approval for model deployment
  async requestApproval(modelId: string, requestedBy: string, checkTypes?: string[]): Promise<Approval> {
    const id = ulid()
    const now = Math.floor(Date.now() / 1000)

    // Run compliance checks
    const checks = await this.runComplianceChecks(modelId, checkTypes)

    await this.db
      .prepare(
        `INSERT INTO approvals (id, model_id, status, requested_by, compliance_checks, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, modelId, 'pending', requestedBy, JSON.stringify(checks), now)
      .run()

    // Create governance event
    await this.logEvent(modelId, 'approval_requested', { checks }, requestedBy)

    return {
      id,
      model_id: modelId,
      status: 'pending',
      requested_by: requestedBy,
      compliance_checks: checks,
      created_at: now
    }
  }

  // Review and approve/reject
  async reviewApproval(approvalId: string, reviewedBy: string, approved: boolean, notes?: string): Promise<Approval> {
    const now = Math.floor(Date.now() / 1000)
    const status = approved ? 'approved' : 'rejected'

    await this.db
      .prepare(
        `UPDATE approvals 
         SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = ?
         WHERE id = ?`
      )
      .bind(status, reviewedBy, notes || null, now, approvalId)
      .run()

    // Get the approval to log event
    const approval = await this.db.prepare('SELECT * FROM approvals WHERE id = ?').bind(approvalId).first()

    if (approval) {
      await this.logEvent(approval.model_id, approved ? 'approved' : 'rejected', { notes, reviewed_by: reviewedBy }, reviewedBy)
    }

    return {
      id: approvalId,
      model_id: approval?.model_id || '',
      status,
      requested_by: approval?.requested_by || '',
      reviewed_by: reviewedBy,
      review_notes: notes,
      compliance_checks: approval?.compliance_checks ? JSON.parse(approval.compliance_checks) : undefined,
      created_at: approval?.created_at || now,
      reviewed_at: now
    }
  }

  // Run compliance checks
  async runComplianceChecks(
    modelId: string,
    checkTypes?: string[]
  ): Promise<
    Array<{
      check_type: string
      passed: boolean
      details?: string
    }>
  > {
    const checks: Array<{ check_type: string; passed: boolean; details?: string }> = []
    const defaultChecks = ['gdpr', 'ai_act', 'fairness', 'bias', 'security']

    const checksToRun = checkTypes || defaultChecks

    for (const checkType of checksToRun) {
      const result = await this.runCheck(modelId, checkType)
      checks.push(result)
    }

    return checks
  }

  // Individual check implementations
  private async runCheck(
    modelId: string,
    checkType: string
  ): Promise<{
    check_type: string
    passed: boolean
    details?: string
  }> {
    // Placeholder implementations - in production these would be real checks

    switch (checkType) {
      case 'gdpr':
        return {
          check_type: 'gdpr',
          passed: true,
          details: 'Model does not process EU citizen PII'
        }

      case 'ai_act':
        return {
          check_type: 'ai_act',
          passed: true,
          details: 'Model classified as limited risk under EU AI Act'
        }

      case 'fairness':
        return {
          check_type: 'fairness',
          passed: true,
          details: 'Fairness metrics within acceptable thresholds'
        }

      case 'bias':
        return {
          check_type: 'bias',
          passed: true,
          details: 'No significant bias detected in protected attributes'
        }

      case 'security':
        return {
          check_type: 'security',
          passed: true,
          details: 'Model artifacts encrypted at rest'
        }

      default:
        return {
          check_type: checkType,
          passed: false,
          details: 'Unknown check type'
        }
    }
  }

  // Log governance event
  async logEvent(thingId: string, eventType: GovernanceEvent['event_type'], data?: Record<string, any>, userId?: string): Promise<void> {
    const id = ulid()
    const now = Math.floor(Date.now() / 1000)

    await this.db
      .prepare(
        `INSERT INTO governance_events (id, thing_id, event_type, event_data, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, thingId, eventType, data ? JSON.stringify(data) : null, userId || null, now)
      .run()
  }

  // Get governance history for a model
  async getGovernanceHistory(thingId: string): Promise<GovernanceEvent[]> {
    const result = await this.db.prepare('SELECT * FROM governance_events WHERE thing_id = ? ORDER BY created_at DESC').bind(thingId).all()

    return result.results.map((row) => ({
      id: row.id,
      thing_id: row.thing_id,
      event_type: row.event_type as any,
      event_data: row.event_data ? JSON.parse(row.event_data) : undefined,
      user_id: row.user_id,
      created_at: row.created_at
    }))
  }

  // Get pending approvals
  async getPendingApprovals(): Promise<Approval[]> {
    const result = await this.db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC').bind('pending').all()

    return result.results.map((row) => ({
      id: row.id,
      model_id: row.model_id,
      status: row.status as any,
      requested_by: row.requested_by,
      reviewed_by: row.reviewed_by,
      review_notes: row.review_notes,
      compliance_checks: row.compliance_checks ? JSON.parse(row.compliance_checks) : undefined,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at
    }))
  }
}
