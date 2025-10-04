/**
 * Email Sender Service
 * Comprehensive email sending with scheduling, rate limiting, and warmup
 * Exposes both RPC (WorkerEntrypoint) and HTTP (Hono) interfaces
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type {
  Env,
  SendEmailRequest,
  SendEmailResult,
  BulkSendRequest,
  BulkSendResult,
  SendStatusQuery,
  SendStatusResult,
  RateLimitCheck,
  WarmupStatus,
  SendStats,
  ScheduledEmail,
} from './types'

/**
 * RPC Interface - Service Bindings
 */
export class EmailSenderService extends WorkerEntrypoint<Env> {
  /**
   * Send single email
   */
  async send(request: SendEmailRequest): Promise<SendEmailResult> {
    const start = Date.now()

    try {
      // 1. Validate recipients if requested
      if (request.options?.validateRecipients) {
        const validationResult = await this.validateRecipients(request)
        if (!validationResult.allValid && !request.options?.skipInvalid) {
          return {
            success: false,
            to: request.to,
            from: request.from.email,
            status: 'rejected',
            error: 'Invalid recipients',
            validationErrors: validationResult.errors,
          }
        }
      }

      // 2. Check rate limits and warmup
      if (request.options?.respectRateLimits !== false) {
        const rateLimitCheck = await this.checkRateLimits(request)
        if (!rateLimitCheck.allowed) {
          // Queue for later
          return await this.queueEmail(request)
        }
      }

      // 3. Check warmup status
      if (request.options?.respectWarmup !== false && request.options?.domainId) {
        const warmupStatus = await this.checkWarmup(request.options.domainId)
        if (!warmupStatus.canSend) {
          // Queue until warmup allows
          return await this.queueEmail(request)
        }
      }

      // 4. Handle scheduling
      if (request.options?.scheduledAt) {
        return await this.scheduleEmail(request)
      }

      // 5. Send via ESP Gateway
      const espResult = await this.env.ESP_GATEWAY.send(
        {
          from: request.from.email,
          to: Array.isArray(request.to) ? request.to : [request.to],
          cc: request.cc ? (Array.isArray(request.cc) ? request.cc : [request.cc]) : undefined,
          bcc: request.bcc ? (Array.isArray(request.bcc) ? request.bcc : [request.bcc]) : undefined,
          subject: request.subject,
          html: request.html,
          text: request.text,
          attachments: request.attachments,
          tags: request.tags,
          metadata: {
            ...request.metadata,
            sentVia: 'email-sender',
            domainId: request.options?.domainId,
          },
        },
        {
          provider: request.options?.provider,
          priority: request.options?.priority || 'normal',
        }
      )

      // 6. Record send in database
      await this.recordSend(request, espResult)

      return {
        success: espResult.success,
        messageId: espResult.messageId,
        to: request.to,
        from: request.from.email,
        provider: espResult.provider,
        status: espResult.success ? 'sent' : 'failed',
        statusMessage: espResult.message,
        sentAt: new Date().toISOString(),
        error: espResult.error,
      }
    } catch (error: any) {
      return {
        success: false,
        to: request.to,
        from: request.from.email,
        status: 'failed',
        error: error.message,
      }
    }
  }

  /**
   * Send bulk emails
   */
  async bulkSend(request: BulkSendRequest): Promise<BulkSendResult> {
    const start = Date.now()
    const results: SendEmailResult[] = []

    try {
      if (request.options?.parallel) {
        // Send all in parallel
        const promises = request.emails.map((email) => this.send(email))
        const settled = await Promise.allSettled(promises)

        for (const result of settled) {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            results.push({
              success: false,
              to: '',
              from: '',
              status: 'failed',
              error: result.reason?.message || 'Unknown error',
            })
          }
        }
      } else {
        // Send sequentially
        const batchSize = request.options?.batchSize || 100
        const delayBetweenBatches = request.options?.delayBetweenBatches || 0

        for (let i = 0; i < request.emails.length; i += batchSize) {
          const batch = request.emails.slice(i, i + batchSize)

          for (const email of batch) {
            const result = await this.send(email)
            results.push(result)

            if (!result.success && !request.options?.continueOnError) {
              break
            }
          }

          // Delay between batches
          if (delayBetweenBatches > 0 && i + batchSize < request.emails.length) {
            await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
          }
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => r.status === 'failed').length
      const queuedCount = results.filter((r) => r.status === 'queued').length
      const rejectedCount = results.filter((r) => r.status === 'rejected').length

      return {
        totalCount: request.emails.length,
        successCount,
        failedCount,
        queuedCount,
        rejectedCount,
        results,
        totalTime: Date.now() - start,
        errors: results.filter((r) => r.error).map((r) => r.error!),
      }
    } catch (error: any) {
      return {
        totalCount: request.emails.length,
        successCount: 0,
        failedCount: request.emails.length,
        queuedCount: 0,
        rejectedCount: 0,
        results: [],
        totalTime: Date.now() - start,
        errors: [error.message],
      }
    }
  }

  /**
   * Get send status
   */
  async getStatus(query: SendStatusQuery): Promise<SendStatusResult[]> {
    // Query database for send records
    const results = await this.env.DB.query(
      `SELECT * FROM email_sends
       WHERE 1=1
       ${query.messageId ? 'AND message_id = ?' : ''}
       ${query.email ? 'AND to_email = ?' : ''}
       ${query.domainId ? 'AND domain_id = ?' : ''}
       ${query.campaignId ? 'AND campaign_id = ?' : ''}
       ${query.status ? 'AND status = ?' : ''}
       ${query.from ? 'AND from_email = ?' : ''}
       ${query.to ? 'AND to_email = ?' : ''}
       ${query.startDate ? 'AND sent_at >= ?' : ''}
       ${query.endDate ? 'AND sent_at <= ?' : ''}
       ORDER BY sent_at DESC
       LIMIT ? OFFSET ?`,
      [
        query.messageId,
        query.email,
        query.domainId,
        query.campaignId,
        query.status,
        query.from,
        query.to,
        query.startDate,
        query.endDate,
        query.limit || 100,
        query.offset || 0,
      ].filter(Boolean)
    )

    return results.map((row: any) => ({
      messageId: row.message_id,
      email: row.to_email,
      from: row.from_email,
      to: row.to_email,
      subject: row.subject,
      status: row.status,
      provider: row.provider,
      domainId: row.domain_id,
      campaignId: row.campaign_id,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
      repliedAt: row.replied_at,
      bouncedAt: row.bounced_at,
      bounceReason: row.bounce_reason,
      error: row.error,
    }))
  }

  /**
   * Get send statistics
   */
  async getStats(period: string, domainId?: string): Promise<SendStats> {
    // Query database for statistics
    const stats = await this.env.DB.query(
      `SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as total_bounced,
        SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as total_opened,
        SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as total_replied,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
        provider,
        domain_id
       FROM email_sends
       WHERE sent_at >= ? AND sent_at < ?
       ${domainId ? 'AND domain_id = ?' : ''}
       GROUP BY provider, domain_id`,
      [period, period, domainId].filter(Boolean)
    )

    const totalSent = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_sent), 0)
    const totalDelivered = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_delivered), 0)
    const totalBounced = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_bounced), 0)
    const totalOpened = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_opened), 0)
    const totalClicked = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_clicked), 0)
    const totalReplied = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_replied), 0)
    const totalFailed = stats.reduce((sum: number, row: any) => sum + parseInt(row.total_failed), 0)

    return {
      period,
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      totalClicked,
      totalReplied,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      replyRate: totalDelivered > 0 ? (totalReplied / totalDelivered) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      byProvider: stats.reduce((acc: Record<string, number>, row: any) => {
        acc[row.provider] = (acc[row.provider] || 0) + parseInt(row.total_sent)
        return acc
      }, {}),
      byDomain: stats.reduce((acc: Record<string, number>, row: any) => {
        acc[row.domain_id] = (acc[row.domain_id] || 0) + parseInt(row.total_sent)
        return acc
      }, {}),
      byStatus: {
        sent: totalSent,
        delivered: totalDelivered,
        bounced: totalBounced,
        opened: totalOpened,
        clicked: totalClicked,
        replied: totalReplied,
        failed: totalFailed,
      },
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(request: SendEmailRequest): Promise<RateLimitCheck> {
    const domainId = request.options?.domainId
    if (!domainId) {
      return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: '' }
    }

    // Get domain limits from database
    const domain = await this.env.DB.query('SELECT * FROM email_domains WHERE id = ?', [domainId])
    if (!domain || domain.length === 0) {
      return { allowed: false, remaining: 0, limit: 0, resetAt: '', reason: 'Domain not found' }
    }

    const limits = domain[0].limits
    const now = new Date()
    const hourKey = `${domainId}:hour:${now.getUTCHours()}`
    const dayKey = `${domainId}:day:${now.toISOString().split('T')[0]}`

    // Check hourly limit
    const hourCount = parseInt((await this.env.EMAIL_SENDER_KV?.get(hourKey)) || '0')
    if (hourCount >= limits.hourly) {
      const resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1)
      return {
        allowed: false,
        remaining: 0,
        limit: limits.hourly,
        resetAt: resetAt.toISOString(),
        reason: 'Hourly limit reached',
      }
    }

    // Check daily limit
    const dayCount = parseInt((await this.env.EMAIL_SENDER_KV?.get(dayKey)) || '0')
    if (dayCount >= limits.daily) {
      const resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      return {
        allowed: false,
        remaining: 0,
        limit: limits.daily,
        resetAt: resetAt.toISOString(),
        reason: 'Daily limit reached',
      }
    }

    return {
      allowed: true,
      remaining: Math.min(limits.hourly - hourCount, limits.daily - dayCount),
      limit: limits.daily,
      resetAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
    }
  }

  /**
   * Check warmup status
   */
  private async checkWarmup(domainId: string): Promise<WarmupStatus> {
    const domain = await this.env.DB.query('SELECT * FROM email_domains WHERE id = ?', [domainId])
    if (!domain || domain.length === 0) {
      throw new Error('Domain not found')
    }

    const warmup = domain[0].warmup
    if (!warmup.enabled || warmup.status === 'completed') {
      return {
        domainId,
        status: 'completed',
        currentDay: 30,
        dailyLimit: Infinity,
        sent: 0,
        remaining: Infinity,
        canSend: true,
        resetAt: '',
      }
    }

    const now = new Date()
    const dayKey = `${domainId}:warmup:${now.toISOString().split('T')[0]}`
    const sent = parseInt((await this.env.EMAIL_SENDER_KV?.get(dayKey)) || '0')
    const remaining = warmup.dailyLimit - sent

    return {
      domainId,
      status: warmup.status,
      currentDay: warmup.currentDay,
      dailyLimit: warmup.dailyLimit,
      sent,
      remaining,
      canSend: remaining > 0,
      resetAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
    }
  }

  /**
   * Validate recipients
   */
  private async validateRecipients(request: SendEmailRequest) {
    const emails = Array.isArray(request.to) ? request.to : [request.to]
    const validations = await this.env.EMAIL_VALIDATION.bulkValidate(emails)

    const errors: Record<string, string> = {}
    let allValid = true

    for (const result of validations.results) {
      if (!result.valid) {
        errors[result.email] = result.issues.map((i: any) => i.message).join(', ')
        allValid = false
      }
    }

    return { allValid, errors }
  }

  /**
   * Queue email for later sending
   */
  private async queueEmail(request: SendEmailRequest): Promise<SendEmailResult> {
    await this.env.EMAIL_SEND_QUEUE?.send({ type: 'send', request })

    return {
      success: true,
      to: request.to,
      from: request.from.email,
      status: 'queued',
      statusMessage: 'Queued for sending',
    }
  }

  /**
   * Schedule email for later
   */
  private async scheduleEmail(request: SendEmailRequest): Promise<SendEmailResult> {
    const scheduledEmail: ScheduledEmail = {
      id: crypto.randomUUID(),
      request,
      scheduledAt: request.options!.scheduledAt!,
      timezone: request.options!.timezone || 'UTC',
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.env.DB.insert('scheduled_emails', scheduledEmail)

    return {
      success: true,
      to: request.to,
      from: request.from.email,
      status: 'scheduled',
      scheduledAt: request.options!.scheduledAt,
    }
  }

  /**
   * Record send in database
   */
  private async recordSend(request: SendEmailRequest, espResult: any) {
    await this.env.DB.insert('email_sends', {
      message_id: espResult.messageId,
      from_email: request.from.email,
      to_email: Array.isArray(request.to) ? request.to.join(',') : request.to,
      subject: request.subject,
      status: espResult.success ? 'sent' : 'failed',
      provider: espResult.provider,
      domain_id: request.options?.domainId,
      campaign_id: request.metadata?.campaignId,
      sent_at: new Date().toISOString(),
      error: espResult.error,
    })
  }
}

/**
 * HTTP Interface - REST API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'email-sender',
    version: '1.0.0',
    status: 'healthy',
  })
})

// Send email
app.post('/send', async (c) => {
  const request = await c.req.json<SendEmailRequest>()
  const service = new EmailSenderService({} as any, c.env)
  const result = await service.send(request)
  return c.json(result)
})

// Bulk send
app.post('/send/bulk', async (c) => {
  const request = await c.req.json<BulkSendRequest>()
  const service = new EmailSenderService({} as any, c.env)
  const result = await service.bulkSend(request)
  return c.json(result)
})

// Get status
app.get('/status', async (c) => {
  const query: SendStatusQuery = {
    messageId: c.req.query('messageId'),
    email: c.req.query('email'),
    domainId: c.req.query('domainId'),
    campaignId: c.req.query('campaignId'),
    status: c.req.query('status') as any,
    from: c.req.query('from'),
    to: c.req.query('to'),
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined,
  }
  const service = new EmailSenderService({} as any, c.env)
  const result = await service.getStatus(query)
  return c.json(result)
})

// Get statistics
app.get('/stats', async (c) => {
  const period = c.req.query('period') || new Date().toISOString().split('T')[0]
  const domainId = c.req.query('domainId')
  const service = new EmailSenderService({} as any, c.env)
  const result = await service.getStats(period, domainId)
  return c.json(result)
})

export default app
