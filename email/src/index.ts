import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ResendProvider } from './providers/resend'
import { WorkOSProvider } from './providers/workos'
import type { EmailMessage, EmailResult, EmailStatus, EmailProvider, SendTemplateOptions, ListEmailsOptions, EmailLog } from './types'
import { renderTemplate, listTemplates, getTemplate } from './templates'
import { generateEmailId, formatEmailLog, isValidEmail, success, error } from './utils'
import {
  processColdEmail,
  extractVariables,
  validateVariables,
  generateSampleVariables,
  getColdEmailTemplate,
  listColdEmailTemplates,
  type ColdEmailOptions,
  type ColdEmailResult,
} from './cold-email'

/**
 * Email Service - Transactional email delivery
 *
 * Handles sending emails via multiple providers (Resend, SendGrid, WorkOS)
 * Supports templating, tracking, and delivery status
 *
 * Interfaces:
 * - RPC: WorkerEntrypoint methods for service-to-service calls
 * - HTTP: Hono routes for direct API access
 * - Webhooks: Resend delivery status updates
 */
export default class EmailService extends WorkerEntrypoint<Env> {
  // ============================================================================
  // RPC INTERFACE - For service-to-service communication
  // ============================================================================

  /**
   * Send a raw email
   */
  async send(message: EmailMessage, options: { provider?: string; userId?: string } = {}): Promise<EmailResult> {
    const provider = this.getProvider(options.provider)
    const emailId = generateEmailId()

    try {
      // Send via provider
      const result = await provider.send(message)

      // Log to database
      await this.logEmail({
        id: emailId,
        userId: options.userId,
        recipient: Array.isArray(message.to) ? message.to[0].toString() : message.to.toString(),
        subject: message.subject,
        provider: provider.name,
        providerId: result.providerId,
        status: result.status,
        error: result.error,
        sentAt: result.timestamp,
      })

      return result
    } catch (err) {
      const errorResult: EmailResult = {
        id: emailId,
        provider: provider.name,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }

      await this.logEmail({
        id: emailId,
        userId: options.userId,
        recipient: Array.isArray(message.to) ? message.to[0].toString() : message.to.toString(),
        subject: message.subject,
        provider: provider.name,
        status: 'failed',
        error: errorResult.error,
        sentAt: errorResult.timestamp,
      })

      return errorResult
    }
  }

  /**
   * Send a templated email
   */
  async sendTemplate(options: SendTemplateOptions): Promise<EmailResult> {
    const { template, to, data, from, userId, provider } = options

    // Render template
    const rendered = renderTemplate(template, data)

    // Create email message
    const message: EmailMessage = {
      to,
      from: from || 'noreply@services.do',
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }

    // Send email
    const result = await this.send(message, { provider, userId })

    // Update log with template name
    if (result.id) {
      await this.updateEmailLog(result.id, { template })
    }

    return result
  }

  /**
   * Get email delivery status
   */
  async getEmailStatus(id: string): Promise<EmailStatus | null> {
    // Get from database first
    const log = await this.getEmailLog(id)
    if (!log) return null

    // Try to get live status from provider
    const provider = this.getProvider(log.provider)
    if (provider.getStatus && log.providerId) {
      const liveStatus = await provider.getStatus(log.providerId)
      if (liveStatus) {
        // Update database with latest status
        await this.updateEmailLog(id, {
          status: liveStatus.status,
          deliveredAt: liveStatus.deliveredAt,
          openedAt: liveStatus.openedAt,
          clickedAt: liveStatus.clickedAt,
          bouncedAt: liveStatus.bouncedAt,
        })
        return liveStatus
      }
    }

    // Return database record
    return {
      id: log.id,
      providerId: log.providerId || '',
      status: log.status as EmailStatus['status'],
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      openedAt: log.openedAt,
      clickedAt: log.clickedAt,
      bouncedAt: log.bouncedAt,
      error: log.error,
      recipient: log.recipient,
    }
  }

  /**
   * List emails for a user
   */
  async listEmails(options: ListEmailsOptions = {}): Promise<{ emails: EmailLog[]; total: number }> {
    const { userId, limit = 50, offset = 0, status, template } = options

    // Build query
    let query = 'SELECT * FROM email_logs WHERE 1=1'
    const params: any[] = []

    if (userId) {
      query += ' AND user_id = ?'
      params.push(userId)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (template) {
      query += ' AND template = ?'
      params.push(template)
    }

    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // Execute query (placeholder - actual implementation would use DB service)
    // const results = await this.env.DB.query(query, params)

    // For now, return mock data
    return {
      emails: [],
      total: 0,
    }
  }

  /**
   * List available templates
   */
  async getTemplates() {
    return listTemplates()
  }

  /**
   * Get a specific template
   */
  async getTemplate(name: string) {
    return getTemplate(name)
  }

  // ============================================================================
  // COLD EMAIL METHODS
  // ============================================================================

  /**
   * Send a cold email with tracking and personalization
   */
  async sendColdEmail(message: EmailMessage, options: ColdEmailOptions): Promise<ColdEmailResult> {
    const trackingBaseUrl = this.env.TRACKING_BASE_URL || 'https://track.services.do'

    // Process cold email (add tracking, personalization, unsubscribe)
    const processed = processColdEmail(message, options, trackingBaseUrl)

    // Send via email-sender service (respects warmup, rate limits)
    let result: EmailResult

    if (this.env.EMAIL_SENDER) {
      result = await this.env.EMAIL_SENDER.send({
        to: processed.message.to,
        from: processed.message.from,
        subject: processed.message.subject,
        html: processed.message.html,
        text: processed.message.text,
        attachments: processed.message.attachments,
        tags: processed.message.tags,
        metadata: {
          contactId: options.contactId,
          campaignId: options.campaignId,
          domainId: options.domainId,
        },
        options: {
          domainId: options.domainId,
          respectWarmup: options.respectWarmup,
          respectRateLimits: options.respectRateLimits,
          trackOpens: options.trackOpens,
          trackClicks: options.trackClicks,
        },
      })
    } else {
      // Fallback to direct sending if email-sender not available
      result = await this.send(processed.message, { userId: options.campaignId })
    }

    // Return extended result with cold email metadata
    return {
      ...result,
      contactId: options.contactId,
      campaignId: options.campaignId,
      trackedLinks: processed.trackedLinks,
      hasTrackingPixel: processed.hasTrackingPixel,
      hasUnsubscribeLink: processed.hasUnsubscribeLink,
    }
  }

  /**
   * Get cold email template
   */
  async getColdEmailTemplate(id: string) {
    return getColdEmailTemplate(id)
  }

  /**
   * List cold email templates
   */
  async listColdEmailTemplates(category?: string) {
    return listColdEmailTemplates(category as any)
  }

  /**
   * Extract variables from template
   */
  async extractTemplateVariables(template: string) {
    return extractVariables(template)
  }

  /**
   * Validate template variables
   */
  async validateTemplateVariables(template: string, variables: Record<string, string>) {
    return validateVariables(template, variables)
  }

  /**
   * Generate sample variables
   */
  async getSampleVariables() {
    return generateSampleVariables()
  }

  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private getProvider(name?: string): EmailProvider {
    const providerName = name || 'resend'

    switch (providerName) {
      case 'resend':
        if (!this.env.RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY not configured')
        }
        return new ResendProvider(this.env.RESEND_API_KEY)

      case 'workos':
        if (!this.env.WORKOS_API_KEY) {
          throw new Error('WORKOS_API_KEY not configured')
        }
        return new WorkOSProvider(this.env.WORKOS_API_KEY)

      default:
        throw new Error(`Unknown email provider: ${providerName}`)
    }
  }

  private async logEmail(log: Partial<EmailLog>): Promise<void> {
    const formattedLog = formatEmailLog(log)
    // Store in database
    // await this.env.DB.insert('email_logs', formattedLog)
    console.log('Email logged:', formattedLog)
  }

  private async getEmailLog(id: string): Promise<EmailLog | null> {
    // Fetch from database
    // const result = await this.env.DB.query('SELECT * FROM email_logs WHERE id = ?', [id])
    // return result[0] || null
    return null
  }

  private async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<void> {
    // Update database
    // await this.env.DB.update('email_logs', { id }, updates)
    console.log('Email log updated:', id, updates)
  }
}

// ============================================================================
// HTTP INTERFACE - Hono routes
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json(success({ status: 'healthy', service: 'email' }))
})

/**
 * Send a raw email
 */
app.post('/send', async (c) => {
  try {
    const body = await c.req.json<EmailMessage & { userId?: string; provider?: string }>()

    // Validate
    if (!body.to || !body.from || !body.subject) {
      return c.json(error('INVALID_REQUEST', 'Missing required fields: to, from, subject'), 400)
    }

    if (!body.html && !body.text) {
      return c.json(error('INVALID_REQUEST', 'Email must have either HTML or text content'), 400)
    }

    // Create service instance
    const service = new EmailService(c.env.ctx, c.env)

    // Send email
    const result = await service.send(body, {
      userId: body.userId,
      provider: body.provider,
    })

    if (result.status === 'failed') {
      return c.json(error('SEND_FAILED', result.error || 'Failed to send email', result), 500)
    }

    return c.json(success(result, 'Email sent successfully'))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Send a templated email
 */
app.post('/templates/:name', async (c) => {
  try {
    const templateName = c.req.param('name')
    const body = await c.req.json<{ to: string | string[]; data: any; from?: string; userId?: string; provider?: string }>()

    // Validate
    if (!body.to || !body.data) {
      return c.json(error('INVALID_REQUEST', 'Missing required fields: to, data'), 400)
    }

    // Create service instance
    const service = new EmailService(c.env.ctx, c.env)

    // Send templated email
    const result = await service.sendTemplate({
      template: templateName,
      to: body.to,
      data: body.data,
      from: body.from,
      userId: body.userId,
      provider: body.provider,
    })

    if (result.status === 'failed') {
      return c.json(error('SEND_FAILED', result.error || 'Failed to send email', result), 500)
    }

    return c.json(success(result, 'Email sent successfully'))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Get email status
 */
app.get('/status/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const service = new EmailService(c.env.ctx, c.env)

    const status = await service.getEmailStatus(id)

    if (!status) {
      return c.json(error('NOT_FOUND', 'Email not found'), 404)
    }

    return c.json(success(status))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * List emails
 */
app.get('/history', async (c) => {
  try {
    const userId = c.req.query('userId')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')
    const status = c.req.query('status')
    const template = c.req.query('template')

    const service = new EmailService(c.env.ctx, c.env)

    const result = await service.listEmails({
      userId,
      limit,
      offset,
      status,
      template,
    })

    return c.json(success(result))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * List available templates
 */
app.get('/templates', async (c) => {
  try {
    const service = new EmailService(c.env.ctx, c.env)
    const templates = await service.getTemplates()
    return c.json(success(templates))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Get template details
 */
app.get('/templates/:name', async (c) => {
  try {
    const name = c.req.param('name')
    const service = new EmailService(c.env.ctx, c.env)
    const template = await service.getTemplate(name)

    if (!template) {
      return c.json(error('NOT_FOUND', 'Template not found'), 404)
    }

    return c.json(success(template))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Webhook handler for Resend delivery status
 */
app.post('/webhooks/resend', async (c) => {
  try {
    // In production, verify webhook signature
    // const signature = c.req.header('svix-signature')
    // const timestamp = c.req.header('svix-timestamp')
    // const payload = await c.req.text()

    const event = await c.req.json<{
      type: string
      data: {
        email_id: string
        from: string
        to: string[]
        subject: string
        created_at: string
      }
    }>()

    console.log('Resend webhook received:', event)

    // Update email status based on event type
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'sent',
      'email.complained': 'complained',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    }

    const status = statusMap[event.type]
    if (status) {
      // Update in database
      // await service.updateEmailLog(event.data.email_id, { status })
    }

    return c.json(success({ received: true }))
  } catch (err) {
    console.error('Webhook error:', err)
    return c.json(error('WEBHOOK_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

// ============================================================================
// COLD EMAIL ENDPOINTS
// ============================================================================

/**
 * Send a cold email
 */
app.post('/cold-email/send', async (c) => {
  try {
    const body = await c.req.json<EmailMessage & ColdEmailOptions>()

    // Validate
    if (!body.to || !body.from || !body.subject || !body.contactId || !body.campaignId || !body.domainId) {
      return c.json(error('INVALID_REQUEST', 'Missing required fields'), 400)
    }

    if (!body.html && !body.text) {
      return c.json(error('INVALID_REQUEST', 'Email must have either HTML or text content'), 400)
    }

    // Create service instance
    const service = new EmailService(c.env.ctx, c.env)

    // Send cold email
    const result = await service.sendColdEmail(
      {
        to: body.to,
        from: body.from,
        subject: body.subject,
        html: body.html,
        text: body.text,
        attachments: body.attachments,
      },
      {
        contactId: body.contactId,
        campaignId: body.campaignId,
        domainId: body.domainId,
        variables: body.variables,
        trackOpens: body.trackOpens,
        trackClicks: body.trackClicks,
        respectWarmup: body.respectWarmup,
        respectRateLimits: body.respectRateLimits,
        unsubscribeUrl: body.unsubscribeUrl,
        listUnsubscribeHeader: body.listUnsubscribeHeader,
      }
    )

    if (result.status === 'failed') {
      return c.json(error('SEND_FAILED', result.error || 'Failed to send cold email', result), 500)
    }

    return c.json(success(result, 'Cold email sent successfully'))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Get cold email templates
 */
app.get('/cold-email/templates', async (c) => {
  try {
    const category = c.req.query('category')
    const service = new EmailService(c.env.ctx, c.env)
    const templates = await service.listColdEmailTemplates(category)
    return c.json(success(templates))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Get specific cold email template
 */
app.get('/cold-email/templates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const service = new EmailService(c.env.ctx, c.env)
    const template = await service.getColdEmailTemplate(id)

    if (!template) {
      return c.json(error('NOT_FOUND', 'Template not found'), 404)
    }

    return c.json(success(template))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Extract variables from template
 */
app.post('/cold-email/variables/extract', async (c) => {
  try {
    const { template } = await c.req.json<{ template: string }>()

    if (!template) {
      return c.json(error('INVALID_REQUEST', 'Template is required'), 400)
    }

    const service = new EmailService(c.env.ctx, c.env)
    const variables = await service.extractTemplateVariables(template)

    return c.json(success({ variables }))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Validate template variables
 */
app.post('/cold-email/variables/validate', async (c) => {
  try {
    const { template, variables } = await c.req.json<{ template: string; variables: Record<string, string> }>()

    if (!template) {
      return c.json(error('INVALID_REQUEST', 'Template is required'), 400)
    }

    const service = new EmailService(c.env.ctx, c.env)
    const validation = await service.validateTemplateVariables(template, variables || {})

    return c.json(success(validation))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

/**
 * Get sample variables
 */
app.get('/cold-email/variables/sample', async (c) => {
  try {
    const service = new EmailService(c.env.ctx, c.env)
    const variables = await service.getSampleVariables()
    return c.json(success(variables))
  } catch (err) {
    return c.json(error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error'), 500)
  }
})

export { EmailService }
export { app as http }
