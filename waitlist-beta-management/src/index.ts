/**
 * Waitlist & Beta Management Service
 *
 * Manages launch waitlist, beta invitations, and early access.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ulid } from 'ulid'
import type {
  Env,
  WaitlistEntry,
  BetaInvitation,
  AddToWaitlistRequest,
  GenerateInvitesRequest,
  GenerateInvitesResponse,
  CheckInviteRequest,
  CheckInviteResponse,
  AcceptInviteRequest,
  WaitlistAnalytics,
  PriorityScoreBreakdown,
  WaitlistQueueMessage,
  WaitlistEmailData,
  InvitationEmailData,
  ReminderEmailData,
} from './types'
import {
  addToWaitlistSchema,
  generateInvitesSchema,
  checkInviteSchema,
  acceptInviteSchema,
  getWaitlistSchema,
  getInvitationsSchema,
} from './schema'

// ============================================================================
// RPC Interface (WorkerEntrypoint)
// ============================================================================

export class WaitlistBetaManagementService extends WorkerEntrypoint<Env> {
  /**
   * Add someone to the waitlist
   */
  async addToWaitlist(request: AddToWaitlistRequest): Promise<WaitlistEntry> {
    const validated = addToWaitlistSchema.parse(request)

    // Check if already on waitlist
    const existing = await this.getWaitlistEntryByEmail(validated.email)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const id = ulid()

    // Calculate priority score
    const priorityScore = await this.calculatePriorityScore({
      hasReferral: !!validated.referralCode,
      earlySignup: await this.isEarlySignup(),
      hasCompany: !!validated.company,
      hasUseCase: !!validated.useCase,
      sourceValue: this.getSourceValue(validated.source),
      referralCount: 0, // Will be updated as they refer others
    })

    const entry: WaitlistEntry = {
      id,
      email: validated.email,
      name: validated.name,
      company: validated.company,
      role: validated.role,
      useCase: validated.useCase,
      source: validated.source,
      referralCode: validated.referralCode,
      priorityScore: priorityScore.totalScore,
      metadata: validated.metadata,
      status: 'pending',
      signedUpAt: now,
      createdAt: now,
      updatedAt: now,
    }

    // Insert into database
    await this.env.DB.prepare(
      `INSERT INTO waitlist_entries (
        id, email, name, company, role, use_case, source, referral_code,
        priority_score, metadata, status, signed_up_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.id,
        entry.email,
        entry.name || null,
        entry.company || null,
        entry.role || null,
        entry.useCase || null,
        entry.source || null,
        entry.referralCode || null,
        entry.priorityScore,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.status,
        entry.signedUpAt,
        entry.createdAt,
        entry.updatedAt
      )
      .run()

    // Update referrer's score if they used a referral code
    if (entry.referralCode) {
      await this.incrementReferralCount(entry.referralCode)
    }

    // Send welcome email
    await this.sendWaitlistWelcomeEmail(entry)

    // Track analytics
    await this.trackWaitlistSignup(entry)

    return entry
  }

  /**
   * Generate and send beta invitations
   */
  async generateInvites(request: GenerateInvitesRequest): Promise<GenerateInvitesResponse> {
    const validated = generateInvitesSchema.parse(request)

    // Get eligible waitlist entries
    const entries = await this.getEligibleForInvitation(validated.count, validated.priorityThreshold || 0, validated.excludeStatuses)

    const invitations: BetaInvitation[] = []
    const summary = { generated: 0, sent: 0, failed: 0 }

    for (const entry of entries) {
      const invitation = await this.createInvitation(entry)
      invitations.push(invitation)
      summary.generated++

      if (!validated.dryRun) {
        try {
          // Queue invitation email
          await this.env.WAITLIST_QUEUE.send({ type: 'send_invitation', invitationId: invitation.id })
          summary.sent++
        } catch (error) {
          console.error(`Failed to queue invitation for ${entry.email}:`, error)
          summary.failed++
        }
      }
    }

    return { invitations, dryRun: validated.dryRun || false, summary }
  }

  /**
   * Check if an invite code is valid
   */
  async checkInvite(request: CheckInviteRequest): Promise<CheckInviteResponse> {
    const validated = checkInviteSchema.parse(request)

    const invitation = await this.getInvitationByCode(validated.inviteCode)

    if (!invitation) {
      return { valid: false, error: 'Invitation not found' }
    }

    if (invitation.status === 'accepted') {
      return { valid: false, error: 'Invitation already accepted', invitation }
    }

    if (invitation.status === 'expired' || new Date(invitation.expiresAt) < new Date()) {
      return { valid: false, error: 'Invitation expired', invitation }
    }

    return { valid: true, invitation }
  }

  /**
   * Accept a beta invitation
   */
  async acceptInvite(request: AcceptInviteRequest): Promise<BetaInvitation> {
    const validated = acceptInviteSchema.parse(request)

    const checkResult = await this.checkInvite({ inviteCode: validated.inviteCode })
    if (!checkResult.valid || !checkResult.invitation) {
      throw new Error(checkResult.error || 'Invalid invitation')
    }

    const invitation = checkResult.invitation
    const now = new Date().toISOString()

    // Update invitation status
    await this.env.DB.prepare(`UPDATE beta_invitations SET status = ?, accepted_at = ?, updated_at = ? WHERE id = ?`)
      .bind('accepted', now, now, invitation.id)
      .run()

    // Update waitlist entry status
    await this.env.DB.prepare(`UPDATE waitlist_entries SET status = ?, converted_at = ?, updated_at = ? WHERE id = ?`)
      .bind('accepted', now, now, invitation.waitlistEntryId)
      .run()

    // Track conversion
    await this.trackInvitationAccepted(invitation)

    return { ...invitation, status: 'accepted', acceptedAt: now, updatedAt: now }
  }

  /**
   * Get waitlist analytics
   */
  async getAnalytics(): Promise<WaitlistAnalytics> {
    // Total count
    const totalResult = await this.env.DB.prepare(`SELECT COUNT(*) as count FROM waitlist_entries`).first<{ count: number }>()
    const total = totalResult?.count || 0

    // By status
    const statusResults = await this.env.DB.prepare(`SELECT status, COUNT(*) as count FROM waitlist_entries GROUP BY status`).all<{
      status: string
      count: number
    }>()
    const byStatus = statusResults.results.reduce(
      (acc, row) => {
        acc[row.status as any] = row.count
        return acc
      },
      {} as Record<string, number>
    )

    // By source
    const sourceResults = await this.env.DB.prepare(`SELECT source, COUNT(*) as count FROM waitlist_entries WHERE source IS NOT NULL GROUP BY source`).all<{
      source: string
      count: number
    }>()
    const bySource = sourceResults.results.reduce(
      (acc, row) => {
        acc[row.source] = row.count
        return acc
      },
      {} as Record<string, number>
    )

    // Average priority score
    const avgResult = await this.env.DB.prepare(`SELECT AVG(priority_score) as avg FROM waitlist_entries`).first<{ avg: number }>()
    const averagePriorityScore = Math.round(avgResult?.avg || 0)

    // Conversion rate
    const invitedCount = byStatus.invited || 0
    const acceptedCount = byStatus.accepted || 0
    const conversionRate = invitedCount > 0 ? (acceptedCount / invitedCount) * 100 : 0

    // Top referrers
    const topReferrersResults = await this.env.DB.prepare(
      `SELECT referral_code, COUNT(*) as count FROM waitlist_entries WHERE referral_code IS NOT NULL GROUP BY referral_code ORDER BY count DESC LIMIT 10`
    ).all<{ referral_code: string; count: number }>()
    const topReferrers = topReferrersResults.results.map((row) => ({ referralCode: row.referral_code, count: row.count }))

    return { total, byStatus: byStatus as any, bySource, averagePriorityScore, conversionRate, topReferrers }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getWaitlistEntryByEmail(email: string): Promise<WaitlistEntry | null> {
    const result = await this.env.DB.prepare(`SELECT * FROM waitlist_entries WHERE email = ?`).bind(email).first()
    return result ? this.mapWaitlistEntry(result) : null
  }

  private async isEarlySignup(): Promise<boolean> {
    const result = await this.env.DB.prepare(`SELECT COUNT(*) as count FROM waitlist_entries`).first<{ count: number }>()
    return (result?.count || 0) < 100
  }

  private getSourceValue(source?: string): number {
    if (!source) return 0
    const sourceScores: Record<string, number> = {
      twitter: 20,
      linkedin: 18,
      producthunt: 15,
      hackernews: 15,
      reddit: 12,
      blog: 10,
      email: 8,
      other: 5,
    }
    return sourceScores[source.toLowerCase()] || 5
  }

  private async calculatePriorityScore(factors: any): Promise<PriorityScoreBreakdown> {
    const breakdown: Record<string, number> = {}

    breakdown.referral = factors.hasReferral ? 20 : 0
    breakdown.earlySignup = factors.earlySignup ? 15 : 0
    breakdown.company = factors.hasCompany ? 10 : 0
    breakdown.useCase = factors.hasUseCase ? 10 : 0
    breakdown.source = factors.sourceValue
    breakdown.referralCount = Math.min(factors.referralCount * 5, 25)

    const totalScore = Math.min(Object.values(breakdown).reduce((sum, val) => sum + val, 0), 100)

    return { totalScore, factors, breakdown }
  }

  private async getEligibleForInvitation(count: number, priorityThreshold: number, excludeStatuses?: string[]): Promise<WaitlistEntry[]> {
    const excludeList = excludeStatuses || ['invited', 'accepted', 'rejected']
    const placeholders = excludeList.map(() => '?').join(',')

    const results = await this.env.DB.prepare(
      `SELECT * FROM waitlist_entries
       WHERE status NOT IN (${placeholders})
       AND priority_score >= ?
       ORDER BY priority_score DESC, signed_up_at ASC
       LIMIT ?`
    )
      .bind(...excludeList, priorityThreshold, count)
      .all()

    return results.results.map((row) => this.mapWaitlistEntry(row))
  }

  private async createInvitation(entry: WaitlistEntry): Promise<BetaInvitation> {
    const now = new Date().toISOString()
    const id = ulid()
    const inviteCode = this.generateInviteCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const invitation: BetaInvitation = {
      id,
      waitlistEntryId: entry.id,
      inviteCode,
      email: entry.email,
      name: entry.name,
      status: 'pending',
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }

    await this.env.DB.prepare(
      `INSERT INTO beta_invitations (id, waitlist_entry_id, invite_code, email, name, status, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(invitation.id, invitation.waitlistEntryId, invitation.inviteCode, invitation.email, invitation.name || null, invitation.status, invitation.expiresAt, invitation.createdAt, invitation.updatedAt)
      .run()

    // Update waitlist entry status
    await this.env.DB.prepare(`UPDATE waitlist_entries SET status = ?, invited_at = ?, updated_at = ? WHERE id = ?`)
      .bind('invited', now, now, entry.id)
      .run()

    return invitation
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous characters
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  private async getInvitationByCode(inviteCode: string): Promise<BetaInvitation | null> {
    const result = await this.env.DB.prepare(`SELECT * FROM beta_invitations WHERE invite_code = ?`).bind(inviteCode).first()
    return result ? this.mapBetaInvitation(result) : null
  }

  private async incrementReferralCount(referralCode: string): Promise<void> {
    // Find the referrer and update their priority score
    const referrer = await this.env.DB.prepare(`SELECT id, priority_score FROM waitlist_entries WHERE email = ?`).bind(referralCode).first()

    if (referrer) {
      const newScore = Math.min((referrer.priority_score as number) + 5, 100)
      await this.env.DB.prepare(`UPDATE waitlist_entries SET priority_score = ?, updated_at = ? WHERE id = ?`)
        .bind(newScore, new Date().toISOString(), referrer.id)
        .run()
    }
  }

  private async sendWaitlistWelcomeEmail(entry: WaitlistEntry): Promise<void> {
    try {
      const position = await this.getWaitlistPosition(entry.id)
      const total = (await this.env.DB.prepare(`SELECT COUNT(*) as count FROM waitlist_entries`).first<{ count: number }>())?.count || 0

      const emailData: WaitlistEmailData = {
        email: entry.email,
        name: entry.name,
        position,
        totalWaitlist: total,
      }

      // Call email service (simplified - would use actual email service binding)
      console.log('Sending waitlist welcome email:', emailData)
    } catch (error) {
      console.error('Failed to send waitlist welcome email:', error)
    }
  }

  private async getWaitlistPosition(entryId: string): Promise<number> {
    const entry = await this.env.DB.prepare(`SELECT priority_score, signed_up_at FROM waitlist_entries WHERE id = ?`).bind(entryId).first()
    if (!entry) return 0

    const result = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM waitlist_entries
       WHERE priority_score > ? OR (priority_score = ? AND signed_up_at < ?)`
    )
      .bind(entry.priority_score, entry.priority_score, entry.signed_up_at)
      .first<{ count: number }>()

    return (result?.count || 0) + 1
  }

  private async trackWaitlistSignup(entry: WaitlistEntry): Promise<void> {
    // Track via analytics service
    console.log('Tracking waitlist signup:', { email: entry.email, source: entry.source, priorityScore: entry.priorityScore })
  }

  private async trackInvitationAccepted(invitation: BetaInvitation): Promise<void> {
    console.log('Tracking invitation accepted:', { invitationId: invitation.id, email: invitation.email })
  }

  private mapWaitlistEntry(row: any): WaitlistEntry {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      company: row.company,
      role: row.role,
      useCase: row.use_case,
      source: row.source,
      referralCode: row.referral_code,
      priorityScore: row.priority_score,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status,
      signedUpAt: row.signed_up_at,
      invitedAt: row.invited_at,
      convertedAt: row.converted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapBetaInvitation(row: any): BetaInvitation {
    return {
      id: row.id,
      waitlistEntryId: row.waitlist_entry_id,
      inviteCode: row.invite_code,
      email: row.email,
      name: row.name,
      status: row.status,
      sentAt: row.sent_at,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      rejectedAt: row.rejected_at,
      reminderSentAt: row.reminder_sent_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

// ============================================================================
// HTTP API (Hono Routes)
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

// Health check
app.get('/health', (c) => c.json({ ok: true, service: 'waitlist-beta-management' }))

// Add to waitlist (public endpoint)
app.post('/waitlist', async (c) => {
  try {
    const service = new WaitlistBetaManagementService(c.env.ctx, c.env)
    const body = await c.req.json()
    const entry = await service.addToWaitlist(body)
    return c.json({ success: true, data: entry }, 201)
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get waitlist entries (admin)
app.get('/waitlist', async (c) => {
  try {
    const query = getWaitlistSchema.parse(c.req.query())
    // Would call RPC method with query params
    return c.json({ success: true, data: [], pagination: { total: 0 } })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Generate invitations (admin)
app.post('/invitations/generate', async (c) => {
  try {
    const service = new WaitlistBetaManagementService(c.env.ctx, c.env)
    const body = await c.req.json()
    const result = await service.generateInvites(body)
    return c.json({ success: true, data: result })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Check invite code (public)
app.get('/invitations/check/:code', async (c) => {
  try {
    const service = new WaitlistBetaManagementService(c.env.ctx, c.env)
    const result = await service.checkInvite({ inviteCode: c.req.param('code') })
    return c.json({ success: result.valid, data: result })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Accept invitation (public)
app.post('/invitations/accept', async (c) => {
  try {
    const service = new WaitlistBetaManagementService(c.env.ctx, c.env)
    const body = await c.req.json()
    const invitation = await service.acceptInvite(body)
    return c.json({ success: true, data: invitation })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get analytics (admin)
app.get('/analytics', async (c) => {
  try {
    const service = new WaitlistBetaManagementService(c.env.ctx, c.env)
    const analytics = await service.getAnalytics()
    return c.json({ success: true, data: analytics })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ============================================================================
// Queue Handler
// ============================================================================

async function handleQueueMessage(batch: MessageBatch<WaitlistQueueMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const data = message.body

      switch (data.type) {
        case 'send_invitation':
          await sendInvitationEmail(data.invitationId, env)
          break
        case 'send_reminder':
          await sendReminderEmail(data.invitationId, env)
          break
        case 'expire_invitations':
          await expireOldInvitations(env)
          break
      }

      message.ack()
    } catch (error) {
      console.error('Queue message processing failed:', error)
      message.retry()
    }
  }
}

async function sendInvitationEmail(invitationId: string, env: Env): Promise<void> {
  const service = new WaitlistBetaManagementService({} as any, env)
  const invitation = await env.DB.prepare(`SELECT * FROM beta_invitations WHERE id = ?`).bind(invitationId).first()

  if (!invitation) {
    throw new Error(`Invitation ${invitationId} not found`)
  }

  const emailData: InvitationEmailData = {
    email: invitation.email as string,
    name: invitation.name as string,
    inviteCode: invitation.invite_code as string,
    inviteUrl: `https://app.do/invite/${invitation.invite_code}`,
    expiresAt: invitation.expires_at as string,
  }

  console.log('Sending invitation email:', emailData)

  // Update status
  const now = new Date().toISOString()
  await env.DB.prepare(`UPDATE beta_invitations SET status = ?, sent_at = ?, updated_at = ? WHERE id = ?`).bind('sent', now, now, invitationId).run()
}

async function sendReminderEmail(invitationId: string, env: Env): Promise<void> {
  const invitation = await env.DB.prepare(`SELECT * FROM beta_invitations WHERE id = ?`).bind(invitationId).first()

  if (!invitation) return

  const emailData: ReminderEmailData = {
    email: invitation.email as string,
    name: invitation.name as string,
    inviteCode: invitation.invite_code as string,
    inviteUrl: `https://app.do/invite/${invitation.invite_code}`,
    expiresIn: '2 days',
  }

  console.log('Sending reminder email:', emailData)

  const now = new Date().toISOString()
  await env.DB.prepare(`UPDATE beta_invitations SET reminder_sent_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, invitationId).run()
}

async function expireOldInvitations(env: Env): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(`UPDATE beta_invitations SET status = ?, updated_at = ? WHERE expires_at < ? AND status NOT IN ('accepted', 'expired')`)
    .bind('expired', now, now)
    .run()
}

// ============================================================================
// Exports
// ============================================================================

export { WaitlistBetaManagementService as default, WaitlistBetaManagementService }

export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
