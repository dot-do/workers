/**
 * Email Campaigns Service
 *
 * Manages cold email campaigns with multi-step sequences, A/B testing, and engagement tracking
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import type {
  Env,
  Campaign,
  CampaignConfig,
  CampaignStats,
  ContactProgress,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  StartCampaignRequest,
  PauseCampaignRequest,
  ResumeCampaignRequest,
  DeleteCampaignRequest,
  ListCampaignsRequest,
  ListCampaignsResponse,
  GetCampaignStatsRequest,
  ProcessContactRequest,
  ProcessContactResponse,
  SequenceStepStats,
} from './types'
import {
  createCampaignRequestSchema,
  updateCampaignRequestSchema,
  startCampaignRequestSchema,
  pauseCampaignRequestSchema,
  resumeCampaignRequestSchema,
  deleteCampaignRequestSchema,
  listCampaignsRequestSchema,
  getCampaignStatsRequestSchema,
  processContactRequestSchema,
} from './schema'

/**
 * Email Campaigns Service RPC Interface
 */
export class EmailCampaignsService extends WorkerEntrypoint<Env> {
  /**
   * Create a new campaign
   */
  async createCampaign(request: CreateCampaignRequest): Promise<Campaign> {
    const validated = createCampaignRequestSchema.parse(request)
    const id = ulid()
    const now = new Date().toISOString()

    const campaign: Campaign = {
      id,
      ...validated.config,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }

    // Store campaign in database
    if (this.env.DB) {
      await this.env.DB.execute(
        `INSERT INTO email_campaigns (
          id, name, description, domain_id, status, sequences,
          targeting, schedule, unsubscribe_url, metadata,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, campaign.name, campaign.description || null, campaign.domainId, campaign.status, JSON.stringify(campaign.sequences), JSON.stringify(campaign.targeting), JSON.stringify(campaign.schedule || null), campaign.unsubscribeUrl || null, JSON.stringify(campaign.metadata || {}), campaign.createdAt, campaign.updatedAt]
      )
    }

    return campaign
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string): Promise<Campaign | null> {
    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    const result = await this.env.DB.execute(`SELECT * FROM email_campaigns WHERE id = ?`, [id])

    if (!result.rows.length) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      domainId: row.domain_id,
      status: row.status,
      sequences: JSON.parse(row.sequences),
      targeting: JSON.parse(row.targeting),
      schedule: row.schedule ? JSON.parse(row.schedule) : undefined,
      unsubscribeUrl: row.unsubscribe_url,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(request: UpdateCampaignRequest): Promise<Campaign> {
    const validated = updateCampaignRequestSchema.parse(request)
    const existing = await this.getCampaign(validated.id)

    if (!existing) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (existing.status !== 'draft' && existing.status !== 'paused') {
      throw new Error(`Cannot update campaign in ${existing.status} status`)
    }

    const updated: Campaign = {
      ...existing,
      ...validated.updates,
      updatedAt: new Date().toISOString(),
    }

    if (this.env.DB) {
      await this.env.DB.execute(
        `UPDATE email_campaigns SET
          name = ?, description = ?, sequences = ?, targeting = ?,
          schedule = ?, unsubscribe_url = ?, metadata = ?, updated_at = ?
        WHERE id = ?`,
        [updated.name, updated.description || null, JSON.stringify(updated.sequences), JSON.stringify(updated.targeting), JSON.stringify(updated.schedule || null), updated.unsubscribeUrl || null, JSON.stringify(updated.metadata || {}), updated.updatedAt, updated.id]
      )
    }

    return updated
  }

  /**
   * Start a campaign
   */
  async startCampaign(request: StartCampaignRequest): Promise<Campaign> {
    const validated = startCampaignRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.id)

    if (!campaign) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused' && campaign.status !== 'scheduled') {
      throw new Error(`Cannot start campaign in ${campaign.status} status`)
    }

    const now = new Date().toISOString()
    const startedAt = validated.startAt || now
    const status = validated.startAt && new Date(validated.startAt) > new Date() ? 'scheduled' : 'active'

    if (this.env.DB) {
      await this.env.DB.execute(`UPDATE email_campaigns SET status = ?, started_at = ?, updated_at = ? WHERE id = ?`, [status, startedAt, now, validated.id])
    }

    // Queue campaign processing
    if (status === 'active' && this.env.CAMPAIGN_QUEUE) {
      await this.env.CAMPAIGN_QUEUE.send({ type: 'process_campaign', campaignId: validated.id })
    }

    return { ...campaign, status, startedAt, updatedAt: now }
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(request: PauseCampaignRequest): Promise<Campaign> {
    const validated = pauseCampaignRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.id)

    if (!campaign) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (campaign.status !== 'active') {
      throw new Error(`Cannot pause campaign in ${campaign.status} status`)
    }

    const now = new Date().toISOString()

    if (this.env.DB) {
      await this.env.DB.execute(`UPDATE email_campaigns SET status = ?, updated_at = ? WHERE id = ?`, ['paused', now, validated.id])
    }

    return { ...campaign, status: 'paused', updatedAt: now }
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(request: ResumeCampaignRequest): Promise<Campaign> {
    const validated = resumeCampaignRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.id)

    if (!campaign) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (campaign.status !== 'paused') {
      throw new Error(`Cannot resume campaign in ${campaign.status} status`)
    }

    const now = new Date().toISOString()

    if (this.env.DB) {
      await this.env.DB.execute(`UPDATE email_campaigns SET status = ?, updated_at = ? WHERE id = ?`, ['active', now, validated.id])
    }

    // Queue campaign processing
    if (this.env.CAMPAIGN_QUEUE) {
      await this.env.CAMPAIGN_QUEUE.send({ type: 'process_campaign', campaignId: validated.id })
    }

    return { ...campaign, status: 'active', updatedAt: now }
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(request: DeleteCampaignRequest): Promise<void> {
    const validated = deleteCampaignRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.id)

    if (!campaign) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (campaign.status === 'active') {
      throw new Error('Cannot delete active campaign. Pause it first.')
    }

    if (this.env.DB) {
      // Archive instead of delete
      await this.env.DB.execute(`UPDATE email_campaigns SET status = ?, updated_at = ? WHERE id = ?`, ['archived', new Date().toISOString(), validated.id])
    }
  }

  /**
   * List campaigns
   */
  async listCampaigns(request: ListCampaignsRequest): Promise<ListCampaignsResponse> {
    const validated = listCampaignsRequestSchema.parse(request)

    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    let query = 'SELECT * FROM email_campaigns WHERE 1=1'
    const params: any[] = []

    if (validated.status && validated.status.length > 0) {
      query += ` AND status IN (${validated.status.map(() => '?').join(',')})`
      params.push(...validated.status)
    }

    if (validated.domainId) {
      query += ' AND domain_id = ?'
      params.push(validated.domainId)
    }

    if (validated.search) {
      query += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${validated.search}%`, `%${validated.search}%`)
    }

    query += ' ORDER BY created_at DESC'

    // Get total count
    const countResult = await this.env.DB.execute(query.replace('SELECT *', 'SELECT COUNT(*) as count'), params)
    const total = (countResult.rows[0] as any).count

    // Get paginated results
    query += ' LIMIT ? OFFSET ?'
    params.push(validated.limit, validated.offset)

    const result = await this.env.DB.execute(query, params)

    const campaigns: Campaign[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      domainId: row.domain_id,
      status: row.status,
      sequences: JSON.parse(row.sequences),
      targeting: JSON.parse(row.targeting),
      schedule: row.schedule ? JSON.parse(row.schedule) : undefined,
      unsubscribeUrl: row.unsubscribe_url,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }))

    return {
      campaigns,
      total,
      limit: validated.limit,
      offset: validated.offset,
      hasMore: validated.offset + campaigns.length < total,
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(request: GetCampaignStatsRequest): Promise<CampaignStats> {
    const validated = getCampaignStatsRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.id)

    if (!campaign) {
      throw new Error(`Campaign ${validated.id} not found`)
    }

    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    // Get contact progress stats
    const contactStats = await this.env.DB.execute(`SELECT status, COUNT(*) as count FROM campaign_contact_progress WHERE campaign_id = ? GROUP BY status`, [validated.id])

    const contacts = {
      total: 0,
      pending: 0,
      active: 0,
      completed: 0,
      unsubscribed: 0,
      bounced: 0,
    }

    for (const row of contactStats.rows as any[]) {
      contacts.total += row.count
      if (row.status === 'pending') contacts.pending = row.count
      else if (row.status === 'sent' || row.status === 'opened' || row.status === 'clicked') contacts.active += row.count
      else if (row.status === 'replied') contacts.completed = row.count
      else if (row.status === 'unsubscribed') contacts.unsubscribed = row.count
      else if (row.status === 'bounced') contacts.bounced = row.count
    }

    // Get email stats
    const emailStats = await this.env.DB.execute(
      `SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN status != 'bounced' AND status != 'failed' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN opened_count > 0 THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN clicked_count > 0 THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN replied_count > 0 THEN 1 ELSE 0 END) as replied,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM campaign_contact_progress
      WHERE campaign_id = ? AND sent_count > 0`,
      [validated.id]
    )

    const emailRow = emailStats.rows[0] as any
    const emails = {
      sent: emailRow.sent || 0,
      delivered: emailRow.delivered || 0,
      opened: emailRow.opened || 0,
      clicked: emailRow.clicked || 0,
      replied: emailRow.replied || 0,
      bounced: emailRow.bounced || 0,
      failed: emailRow.failed || 0,
    }

    // Calculate rates
    const rates = {
      deliveryRate: emails.sent > 0 ? emails.delivered / emails.sent : 0,
      openRate: emails.delivered > 0 ? emails.opened / emails.delivered : 0,
      clickRate: emails.delivered > 0 ? emails.clicked / emails.delivered : 0,
      replyRate: emails.delivered > 0 ? emails.replied / emails.delivered : 0,
      bounceRate: emails.sent > 0 ? emails.bounced / emails.sent : 0,
      unsubscribeRate: emails.delivered > 0 ? contacts.unsubscribed / emails.delivered : 0,
    }

    // Get sequence step stats
    const sequences: SequenceStepStats[] = campaign.sequences.map((step, index) => ({
      stepId: step.id,
      order: step.order,
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
    }))

    // TODO: Populate sequence stats from database
    // This requires tracking which step each contact is on

    return {
      campaignId: validated.id,
      contacts,
      emails,
      rates,
      sequences,
      abTests: validated.includeABTests ? [] : undefined, // TODO: Implement A/B test stats
    }
  }

  /**
   * Process a contact through the campaign sequence
   */
  async processContact(request: ProcessContactRequest): Promise<ProcessContactResponse> {
    const validated = processContactRequestSchema.parse(request)
    const campaign = await this.getCampaign(validated.campaignId)

    if (!campaign) {
      throw new Error(`Campaign ${validated.campaignId} not found`)
    }

    if (campaign.status !== 'active') {
      throw new Error(`Campaign ${validated.campaignId} is not active`)
    }

    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    // Get contact progress
    const progressResult = await this.env.DB.execute(`SELECT * FROM campaign_contact_progress WHERE campaign_id = ? AND contact_id = ?`, [validated.campaignId, validated.contactId])

    let progress: ContactProgress
    const now = new Date().toISOString()

    if (progressResult.rows.length === 0) {
      // Initialize contact progress
      progress = {
        campaignId: validated.campaignId,
        contactId: validated.contactId,
        currentStep: 0,
        status: 'pending',
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        repliedCount: 0,
      }

      await this.env.DB.execute(
        `INSERT INTO campaign_contact_progress (
          campaign_id, contact_id, current_step, status,
          sent_count, opened_count, clicked_count, replied_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [progress.campaignId, progress.contactId, progress.currentStep, progress.status, progress.sentCount, progress.openedCount, progress.clickedCount, progress.repliedCount]
      )
    } else {
      progress = {
        campaignId: (progressResult.rows[0] as any).campaign_id,
        contactId: (progressResult.rows[0] as any).contact_id,
        currentStep: (progressResult.rows[0] as any).current_step,
        status: (progressResult.rows[0] as any).status,
        sentCount: (progressResult.rows[0] as any).sent_count,
        openedCount: (progressResult.rows[0] as any).opened_count,
        clickedCount: (progressResult.rows[0] as any).clicked_count,
        repliedCount: (progressResult.rows[0] as any).replied_count,
        lastSentAt: (progressResult.rows[0] as any).last_sent_at,
        lastOpenedAt: (progressResult.rows[0] as any).last_opened_at,
        lastClickedAt: (progressResult.rows[0] as any).last_clicked_at,
        lastRepliedAt: (progressResult.rows[0] as any).last_replied_at,
        completedAt: (progressResult.rows[0] as any).completed_at,
        unsubscribedAt: (progressResult.rows[0] as any).unsubscribed_at,
      }
    }

    // Check if contact is already completed or unsubscribed
    if (progress.status === 'unsubscribed' || progress.status === 'replied' || progress.completedAt) {
      return {
        campaignId: validated.campaignId,
        contactId: validated.contactId,
        currentStep: progress.currentStep,
        status: progress.status,
        completed: true,
      }
    }

    // Check if we should send next email
    const currentSequence = campaign.sequences[progress.currentStep]
    if (!currentSequence) {
      // No more steps - mark as completed
      await this.env.DB.execute(`UPDATE campaign_contact_progress SET status = ?, completed_at = ? WHERE campaign_id = ? AND contact_id = ?`, ['replied', now, validated.campaignId, validated.contactId])

      return {
        campaignId: validated.campaignId,
        contactId: validated.contactId,
        currentStep: progress.currentStep,
        status: 'replied',
        completed: true,
      }
    }

    // Check delay
    if (progress.lastSentAt) {
      const lastSent = new Date(progress.lastSentAt)
      const nextSendTime = new Date(lastSent.getTime() + currentSequence.delay * 60 * 60 * 1000)
      if (nextSendTime > new Date()) {
        return {
          campaignId: validated.campaignId,
          contactId: validated.contactId,
          currentStep: progress.currentStep,
          status: progress.status,
          nextSendAt: nextSendTime.toISOString(),
          completed: false,
        }
      }
    }

    // Send email via EMAIL service
    if (this.env.EMAIL) {
      try {
        // Get contact data
        const contactResult = await this.env.DB.execute(`SELECT * FROM email_contacts WHERE id = ?`, [validated.contactId])
        if (!contactResult.rows.length) {
          throw new Error(`Contact ${validated.contactId} not found`)
        }
        const contact = contactResult.rows[0] as any

        // Send cold email
        await this.env.EMAIL.sendColdEmail(
          {
            to: contact.email,
            from: { email: `hello@${campaign.domainId}`, name: 'Sales Team' },
            subject: currentSequence.subject,
            html: currentSequence.html,
            text: currentSequence.text,
          },
          {
            contactId: validated.contactId,
            campaignId: validated.campaignId,
            domainId: campaign.domainId,
            variables: {
              firstName: contact.first_name || 'there',
              lastName: contact.last_name || '',
              email: contact.email,
              company: contact.company_name || '',
            },
            trackOpens: currentSequence.trackOpens,
            trackClicks: currentSequence.trackClicks,
            unsubscribeUrl: campaign.unsubscribeUrl,
            respectWarmup: true,
            respectRateLimits: true,
          }
        )

        // Update progress
        await this.env.DB.execute(
          `UPDATE campaign_contact_progress SET
            current_step = ?, status = ?, sent_count = ?, last_sent_at = ?
          WHERE campaign_id = ? AND contact_id = ?`,
          [progress.currentStep + 1, 'sent', progress.sentCount + 1, now, validated.campaignId, validated.contactId]
        )

        return {
          campaignId: validated.campaignId,
          contactId: validated.contactId,
          currentStep: progress.currentStep + 1,
          status: 'sent',
          completed: false,
        }
      } catch (error: any) {
        console.error('Failed to send email:', error)
        throw error
      }
    } else {
      throw new Error('EMAIL service not available')
    }
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
app.get('/health', (c) => c.json({ status: 'ok', service: 'email-campaigns', version: '1.0.0' }))

// Create campaign
app.post('/campaigns', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const body = await c.req.json()
    const result = await service.createCampaign(body)
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get campaign
app.get('/campaigns/:id', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const result = await service.getCampaign(c.req.param('id'))
    if (!result) {
      return c.json(error('Campaign not found'), 404)
    }
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Update campaign
app.put('/campaigns/:id', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const body = await c.req.json()
    const result = await service.updateCampaign({ id: c.req.param('id'), updates: body })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Start campaign
app.post('/campaigns/:id/start', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const body = await c.req.json<{ startAt?: string }>()
    const result = await service.startCampaign({ id: c.req.param('id'), startAt: body.startAt })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Pause campaign
app.post('/campaigns/:id/pause', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const result = await service.pauseCampaign({ id: c.req.param('id') })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Resume campaign
app.post('/campaigns/:id/resume', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const result = await service.resumeCampaign({ id: c.req.param('id') })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Delete campaign
app.delete('/campaigns/:id', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    await service.deleteCampaign({ id: c.req.param('id') })
    return c.json(success({ deleted: true }))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// List campaigns
app.get('/campaigns', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const query = c.req.query()
    const result = await service.listCampaigns({
      status: query.status ? query.status.split(',') : undefined,
      domainId: query.domainId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
      search: query.search,
    } as any)
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get campaign stats
app.get('/campaigns/:id/stats', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const result = await service.getCampaignStats({
      id: c.req.param('id'),
      includeABTests: c.req.query('includeABTests') !== 'false',
    })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Process contact
app.post('/campaigns/:id/contacts/:contactId/process', async (c) => {
  try {
    const service = new EmailCampaignsService(c.env.ctx, c.env)
    const result = await service.processContact({
      campaignId: c.req.param('id'),
      contactId: c.req.param('contactId'),
    })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

export default {
  fetch: app.fetch,
}
