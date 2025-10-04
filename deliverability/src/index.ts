/**
 * Deliverability Monitoring Service
 *
 * Monitors email deliverability metrics and domain reputation
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type {
  Env,
  DeliverabilityMetrics,
  DomainReputation,
  DeliverabilityStatus,
  GetMetricsRequest,
  GetReputationRequest,
  AnalyzeDomainRequest,
  AnalyzeDomainResponse,
} from './types'
import { getMetricsRequestSchema, getReputationRequestSchema, analyzeDomainRequestSchema } from './schema'

/**
 * Deliverability Service RPC Interface
 */
export class DeliverabilityService extends WorkerEntrypoint<Env> {
  /**
   * Get deliverability metrics for a domain
   */
  async getMetrics(request: GetMetricsRequest): Promise<DeliverabilityMetrics> {
    const validated = getMetricsRequestSchema.parse(request)

    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    // Build date range
    const endDate = validated.endDate || new Date().toISOString()
    let startDate = validated.startDate

    if (!startDate) {
      const end = new Date(endDate)
      switch (validated.period) {
        case 'hour':
          end.setHours(end.getHours() - 1)
          break
        case 'day':
          end.setDate(end.getDate() - 1)
          break
        case 'week':
          end.setDate(end.getDate() - 7)
          break
        case 'month':
          end.setMonth(end.getMonth() - 1)
          break
      }
      startDate = end.toISOString()
    }

    // Query email statistics
    const stats = await this.env.DB.execute(
      `SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status = 'complained' THEN 1 ELSE 0 END) as complained,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied,
        SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) as unsubscribed
      FROM email_sends
      WHERE domain_id = ?
        AND created_at BETWEEN ? AND ?`,
      [validated.domainId, startDate, endDate]
    )

    const row = stats.rows[0] as any

    const sent = row.sent || 0
    const delivered = row.delivered || 0
    const bounced = row.bounced || 0
    const complained = row.complained || 0
    const failed = row.failed || 0
    const opened = row.opened || 0
    const clicked = row.clicked || 0
    const replied = row.replied || 0
    const unsubscribed = row.unsubscribed || 0

    // Calculate rates
    const deliveryRate = sent > 0 ? delivered / sent : 0
    const bounceRate = sent > 0 ? bounced / sent : 0
    const complaintRate = delivered > 0 ? complained / delivered : 0
    const openRate = delivered > 0 ? opened / delivered : 0
    const clickRate = delivered > 0 ? clicked / delivered : 0
    const replyRate = delivered > 0 ? replied / delivered : 0
    const unsubscribeRate = delivered > 0 ? unsubscribed / delivered : 0

    // Determine status and issues
    const status = this.calculateStatus(bounceRate, complaintRate, deliveryRate)
    const issues: string[] = []
    const recommendations: string[] = []

    if (bounceRate > 0.05) {
      issues.push(`High bounce rate: ${(bounceRate * 100).toFixed(2)}%`)
      recommendations.push('Clean your email list - remove invalid addresses')
    }

    if (complaintRate > 0.001) {
      issues.push(`High complaint rate: ${(complaintRate * 100).toFixed(4)}%`)
      recommendations.push('Review email content - may be too aggressive or misleading')
    }

    if (deliveryRate < 0.95) {
      issues.push(`Low delivery rate: ${(deliveryRate * 100).toFixed(2)}%`)
      recommendations.push('Check DNS records (SPF, DKIM, DMARC) and sender reputation')
    }

    if (openRate < 0.15 && delivered > 100) {
      issues.push(`Low open rate: ${(openRate * 100).toFixed(2)}%`)
      recommendations.push('Improve subject lines and sender name recognition')
    }

    if (unsubscribeRate > 0.02) {
      issues.push(`High unsubscribe rate: ${(unsubscribeRate * 100).toFixed(2)}%`)
      recommendations.push('Review targeting and email frequency')
    }

    return {
      domainId: validated.domainId,
      period: validated.period,
      sent,
      delivered,
      bounced,
      complained,
      failed,
      opened,
      clicked,
      replied,
      unsubscribed,
      deliveryRate,
      bounceRate,
      complaintRate,
      openRate,
      clickRate,
      replyRate,
      unsubscribeRate,
      status,
      issues,
      recommendations,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get domain reputation
   */
  async getReputation(request: GetReputationRequest): Promise<DomainReputation> {
    const validated = getReputationRequestSchema.parse(request)

    // Try cache first unless refresh requested
    if (!validated.refresh && this.env.KV) {
      const cached = await this.env.KV.get(`reputation:${validated.domainId}`, 'json')
      if (cached) {
        return cached as DomainReputation
      }
    }

    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    // Get domain data
    const domainResult = await this.env.DB.execute(`SELECT * FROM email_domains WHERE id = ?`, [validated.domainId])

    if (!domainResult.rows.length) {
      throw new Error(`Domain ${validated.domainId} not found`)
    }

    const domain = domainResult.rows[0] as any

    // Calculate reputation scores (0-100)
    // In real implementation, these would come from external APIs or calculated metrics
    const senderScore = this.calculateSenderScore(domain)
    const ipReputation = 85 // Placeholder - would query reputation service
    const domainReputation = 90 // Placeholder - would query reputation service

    // Check blacklists (would query actual blacklist services)
    const blacklists: string[] = []
    const blacklistCount = blacklists.length

    // Check DNS authentication
    const spfStatus = domain.spf_verified ? 'pass' : 'fail'
    const dkimStatus = domain.dkim_verified ? 'pass' : 'fail'
    const dmarcStatus = domain.dmarc_verified ? 'pass' : 'none'

    const reputation: DomainReputation = {
      domainId: validated.domainId,
      senderScore,
      ipReputation,
      domainReputation,
      blacklistCount,
      blacklists,
      spfStatus,
      dkimStatus,
      dmarcStatus,
      lastChecked: new Date().toISOString(),
    }

    // Cache for 1 hour
    if (this.env.KV) {
      await this.env.KV.put(`reputation:${validated.domainId}`, JSON.stringify(reputation), {
        expirationTtl: 3600,
      })
    }

    return reputation
  }

  /**
   * Analyze domain health
   */
  async analyzeDomain(request: AnalyzeDomainRequest): Promise<AnalyzeDomainResponse> {
    const validated = analyzeDomainRequestSchema.parse(request)

    // Get metrics and reputation in parallel
    const [metrics, reputation] = await Promise.all([this.getMetrics({ domainId: validated.domainId, period: 'week' }), this.getReputation({ domainId: validated.domainId, refresh: validated.depth === 'full' })])

    // Calculate overall deliverability score (0-100)
    const score = this.calculateDeliverabilityScore(metrics, reputation)

    // Determine overall status
    const status = this.calculateStatus(metrics.bounceRate, metrics.complaintRate, metrics.deliveryRate)

    // Collect all issues
    const issues: Array<{
      severity: 'critical' | 'warning' | 'info'
      category: string
      message: string
      recommendation: string
    }> = []

    // Critical issues
    if (metrics.bounceRate > 0.1) {
      issues.push({
        severity: 'critical',
        category: 'bounce_rate',
        message: `Bounce rate critically high at ${(metrics.bounceRate * 100).toFixed(2)}%`,
        recommendation: 'Immediately pause sending and clean your list. Remove all hard bounces.',
      })
    }

    if (metrics.complaintRate > 0.005) {
      issues.push({
        severity: 'critical',
        category: 'complaint_rate',
        message: `Spam complaint rate critically high at ${(metrics.complaintRate * 100).toFixed(3)}%`,
        recommendation: 'Review email content and targeting. Consider stopping this campaign.',
      })
    }

    if (reputation.blacklistCount > 0) {
      issues.push({
        severity: 'critical',
        category: 'blacklist',
        message: `Domain found on ${reputation.blacklistCount} blacklist(s): ${reputation.blacklists.join(', ')}`,
        recommendation: 'Request delisting immediately. Review sending practices.',
      })
    }

    // Warning issues
    if (metrics.bounceRate > 0.05) {
      issues.push({
        severity: 'warning',
        category: 'bounce_rate',
        message: `Bounce rate high at ${(metrics.bounceRate * 100).toFixed(2)}%`,
        recommendation: 'Clean your email list. Validate addresses before sending.',
      })
    }

    if (reputation.spfStatus !== 'pass') {
      issues.push({
        severity: 'warning',
        category: 'dns_auth',
        message: 'SPF record not passing',
        recommendation: 'Verify SPF record is correctly configured in DNS.',
      })
    }

    if (reputation.dkimStatus !== 'pass') {
      issues.push({
        severity: 'warning',
        category: 'dns_auth',
        message: 'DKIM not passing',
        recommendation: 'Verify DKIM keys are correctly configured in DNS.',
      })
    }

    if (reputation.dmarcStatus !== 'pass') {
      issues.push({
        severity: 'warning',
        category: 'dns_auth',
        message: 'DMARC not configured or not passing',
        recommendation: 'Add DMARC record with policy=quarantine or policy=reject.',
      })
    }

    // Info issues
    if (metrics.openRate < 0.15 && metrics.delivered > 100) {
      issues.push({
        severity: 'info',
        category: 'engagement',
        message: `Open rate low at ${(metrics.openRate * 100).toFixed(2)}%`,
        recommendation: 'Test different subject lines and improve sender name recognition.',
      })
    }

    if (metrics.clickRate < 0.03 && metrics.opened > 50) {
      issues.push({
        severity: 'info',
        category: 'engagement',
        message: `Click rate low at ${(metrics.clickRate * 100).toFixed(2)}%`,
        recommendation: 'Review email content and CTA placement.',
      })
    }

    return {
      domainId: validated.domainId,
      metrics,
      reputation,
      status,
      score,
      issues,
    }
  }

  /**
   * Calculate deliverability status
   */
  private calculateStatus(bounceRate: number, complaintRate: number, deliveryRate: number): DeliverabilityStatus {
    if (bounceRate > 0.1 || complaintRate > 0.005 || deliveryRate < 0.85) {
      return 'critical'
    }

    if (bounceRate > 0.05 || complaintRate > 0.001 || deliveryRate < 0.95) {
      return 'warning'
    }

    if (bounceRate < 0.02 && complaintRate < 0.0005 && deliveryRate > 0.98) {
      return 'excellent'
    }

    return 'good'
  }

  /**
   * Calculate sender score
   */
  private calculateSenderScore(domain: any): number {
    let score = 100

    // Deduct points for issues
    if (!domain.spf_verified) score -= 10
    if (!domain.dkim_verified) score -= 10
    if (!domain.dmarc_verified) score -= 5
    if (domain.warmup_status !== 'completed') score -= 10

    // Add points for good practices
    if (domain.warmup_status === 'completed') score = Math.min(100, score + 10)

    return Math.max(0, score)
  }

  /**
   * Calculate overall deliverability score
   */
  private calculateDeliverabilityScore(metrics: DeliverabilityMetrics, reputation: DomainReputation): number {
    // Weighted scoring
    const deliveryScore = metrics.deliveryRate * 30 // 30% weight
    const bounceScore = (1 - metrics.bounceRate) * 20 // 20% weight
    const complaintScore = (1 - metrics.complaintRate * 100) * 20 // 20% weight (scaled)
    const reputationScore = (reputation.senderScore / 100) * 20 // 20% weight
    const engagementScore = (metrics.openRate * 0.5 + metrics.clickRate * 0.3 + metrics.replyRate * 0.2) * 10 // 10% weight

    const total = deliveryScore + bounceScore + complaintScore + reputationScore + engagementScore

    return Math.round(Math.max(0, Math.min(100, total * 100)))
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Helper functions
const success = <T>(data: T) => ({ success: true, data })
const error = (message: string, details?: unknown) => ({ success: false, error: message, details })

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'deliverability', version: '1.0.0' }))

// Get metrics
app.get('/domains/:domainId/metrics', async (c) => {
  try {
    const service = new DeliverabilityService(c.env.ctx, c.env)
    const query = c.req.query()
    const result = await service.getMetrics({
      domainId: c.req.param('domainId'),
      period: query.period as any,
      startDate: query.startDate,
      endDate: query.endDate,
    })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get reputation
app.get('/domains/:domainId/reputation', async (c) => {
  try {
    const service = new DeliverabilityService(c.env.ctx, c.env)
    const query = c.req.query()
    const result = await service.getReputation({
      domainId: c.req.param('domainId'),
      refresh: query.refresh === 'true',
    })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Analyze domain
app.post('/domains/:domainId/analyze', async (c) => {
  try {
    const service = new DeliverabilityService(c.env.ctx, c.env)
    const body = await c.req.json<{ depth?: string }>()
    const result = await service.analyzeDomain({
      domainId: c.req.param('domainId'),
      depth: (body.depth as any) || 'quick',
    })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

export default {
  fetch: app.fetch,
}
