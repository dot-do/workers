/**
 * Referral Program Service
 *
 * Manages referral codes, tracking, rewards, and viral growth mechanics.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ulid } from 'ulid'
import type {
  Env,
  ReferralCode,
  Referral,
  RewardDistribution,
  GenerateReferralCodeRequest,
  TrackReferralRequest,
  ConvertReferralRequest,
  UserReferralStats,
  ReferralAnalytics,
  LeaderboardEntry,
  GetLeaderboardRequest,
  FraudCheckResult,
  ReferralTier,
  ReferralQueueMessage,
} from './types'
import { TIER_CONFIGS } from './types'
import { generateReferralCodeSchema, trackReferralSchema, convertReferralSchema, getLeaderboardSchema, getUserReferralsSchema } from './schema'

// ============================================================================
// RPC Interface (WorkerEntrypoint)
// ============================================================================

export class ReferralProgramService extends WorkerEntrypoint<Env> {
  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(request: GenerateReferralCodeRequest): Promise<ReferralCode> {
    const validated = generateReferralCodeSchema.parse(request)

    // Check if user already has a code
    const existing = await this.getReferralCodeByUserId(validated.userId)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const id = ulid()
    const code = validated.customCode || this.generateCode(validated.email)

    // Check code uniqueness
    const codeExists = await this.checkCodeExists(code)
    if (codeExists) {
      throw new Error('Referral code already exists. Please choose a different custom code.')
    }

    const referralCode: ReferralCode = {
      id,
      userId: validated.userId,
      code,
      email: validated.email,
      name: validated.name,
      status: 'active',
      referralCount: 0,
      successfulReferrals: 0,
      creditsEarned: 0,
      tier: 'bronze',
      createdAt: now,
      updatedAt: now,
    }

    // Insert into database
    await this.env.DB.prepare(
      `INSERT INTO referral_codes (id, user_id, code, email, name, status, referral_count, successful_referrals, credits_earned, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        referralCode.id,
        referralCode.userId,
        referralCode.code,
        referralCode.email,
        referralCode.name || null,
        referralCode.status,
        referralCode.referralCount,
        referralCode.successfulReferrals,
        referralCode.creditsEarned,
        referralCode.tier,
        referralCode.createdAt,
        referralCode.updatedAt
      )
      .run()

    // Cache code for fast lookup
    await this.env.KV.put(`referral:code:${code}`, JSON.stringify(referralCode), { expirationTtl: 86400 })

    // Track analytics
    await this.trackCodeGeneration(referralCode)

    return referralCode
  }

  /**
   * Track a new referral (when someone uses a referral code)
   */
  async trackReferral(request: TrackReferralRequest): Promise<Referral> {
    const validated = trackReferralSchema.parse(request)

    // Get referral code
    const referralCode = await this.getReferralCodeByCode(validated.referralCode)
    if (!referralCode) {
      throw new Error('Invalid referral code')
    }

    // Check for self-referral
    if (referralCode.email === validated.referredEmail) {
      throw new Error('Cannot refer yourself')
    }

    // Check if already referred
    const existing = await this.getReferralByEmail(validated.referredEmail)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const id = ulid()

    const referral: Referral = {
      id,
      referralCodeId: referralCode.id,
      referrerUserId: referralCode.userId,
      referredEmail: validated.referredEmail,
      status: 'pending',
      source: validated.source,
      referredAt: now,
      rewardAmount: this.calculateReward(referralCode.tier),
      metadata: validated.metadata,
      createdAt: now,
      updatedAt: now,
    }

    // Insert into database
    await this.env.DB.prepare(
      `INSERT INTO referrals (id, referral_code_id, referrer_user_id, referred_email, status, source, referred_at, reward_amount, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        referral.id,
        referral.referralCodeId,
        referral.referrerUserId,
        referral.referredEmail,
        referral.status,
        referral.source || null,
        referral.referredAt,
        referral.rewardAmount,
        referral.metadata ? JSON.stringify(referral.metadata) : null,
        referral.createdAt,
        referral.updatedAt
      )
      .run()

    // Update referral count
    await this.incrementReferralCount(referralCode.id)

    // Queue fraud check
    await this.env.REFERRAL_QUEUE.send({ type: 'check_fraud', referralId: referral.id })

    // Track analytics
    await this.trackReferralCreated(referral)

    return referral
  }

  /**
   * Convert a referral (when referred user signs up)
   */
  async convertReferral(request: ConvertReferralRequest): Promise<Referral> {
    const validated = convertReferralSchema.parse(request)

    // Find pending referral
    const referral = await this.getReferralByEmail(validated.referredEmail)
    if (!referral) {
      throw new Error('Referral not found')
    }

    if (referral.status !== 'pending') {
      throw new Error('Referral already processed')
    }

    const now = new Date().toISOString()

    // Update referral
    await this.env.DB.prepare(`UPDATE referrals SET status = ?, referred_user_id = ?, converted_at = ?, updated_at = ? WHERE id = ?`)
      .bind('converted', validated.referredUserId, now, now, referral.id)
      .run()

    // Update referral code stats
    await this.incrementSuccessfulReferrals(referral.referralCodeId)

    // Queue reward distribution
    await this.env.REFERRAL_QUEUE.send({ type: 'distribute_reward', referralId: referral.id })

    // Update tier if needed
    await this.env.REFERRAL_QUEUE.send({ type: 'update_tier', userId: referral.referrerUserId })

    // Track conversion
    await this.trackReferralConverted(referral)

    return { ...referral, status: 'converted', referredUserId: validated.referredUserId, convertedAt: now, updatedAt: now }
  }

  /**
   * Get user's referral statistics
   */
  async getUserStats(userId: string): Promise<UserReferralStats> {
    // Get referral code
    const referralCode = await this.getReferralCodeByUserId(userId)
    if (!referralCode) {
      throw new Error('User has no referral code')
    }

    // Get referrals
    const referrals = await this.env.DB.prepare(`SELECT * FROM referrals WHERE referrer_user_id = ? ORDER BY created_at DESC LIMIT 10`)
      .bind(userId)
      .all()

    const recentReferrals = referrals.results.map((r) => this.mapReferral(r))

    // Calculate stats
    const pending = recentReferrals.filter((r) => r.status === 'pending').length
    const conversionRate = referralCode.referralCount > 0 ? (referralCode.successfulReferrals / referralCode.referralCount) * 100 : 0

    // Calculate next tier
    const currentTier = TIER_CONFIGS.find((t) => t.tier === referralCode.tier)
    const nextTier = TIER_CONFIGS.find((t) => t.minReferrals > referralCode.successfulReferrals)
    const nextTierAt = nextTier ? nextTier.minReferrals - referralCode.successfulReferrals : 0

    return {
      userId,
      email: referralCode.email,
      referralCode: referralCode.code,
      totalReferrals: referralCode.referralCount,
      successfulReferrals: referralCode.successfulReferrals,
      pendingReferrals: pending,
      conversionRate: Math.round(conversionRate),
      creditsEarned: referralCode.creditsEarned,
      tier: referralCode.tier,
      nextTierAt,
      recentReferrals,
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardEntry[]> {
    const validated = getLeaderboardSchema.parse(request)

    let query = `SELECT rc.*, ROW_NUMBER() OVER (ORDER BY rc.successful_referrals DESC, rc.created_at ASC) as rank
                 FROM referral_codes rc
                 WHERE rc.status = 'active'`

    // Add timeframe filter
    if (validated.timeframe !== 'alltime') {
      const since = this.getTimeframeCutoff(validated.timeframe)
      query += ` AND rc.created_at >= '${since}'`
    }

    query += ` ORDER BY rc.successful_referrals DESC, rc.created_at ASC LIMIT ? OFFSET ?`

    const results = await this.env.DB.prepare(query).bind(validated.limit, validated.offset).all()

    return results.results.map((row, index) => ({
      rank: validated.offset + index + 1,
      userId: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      referralCount: row.successful_referrals as number,
      creditsEarned: row.credits_earned as number,
      tier: row.tier as ReferralTier,
      badge: TIER_CONFIGS.find((t) => t.tier === row.tier)?.badge,
    }))
  }

  /**
   * Get referral analytics
   */
  async getAnalytics(): Promise<ReferralAnalytics> {
    // Total referrals
    const totalResult = await this.env.DB.prepare(`SELECT COUNT(*) as count FROM referrals`).first<{ count: number }>()
    const totalReferrals = totalResult?.count || 0

    // Converted referrals
    const convertedResult = await this.env.DB.prepare(`SELECT COUNT(*) as count FROM referrals WHERE status = 'converted'`).first<{ count: number }>()
    const totalConverted = convertedResult?.count || 0

    // Conversion rate
    const conversionRate = totalReferrals > 0 ? (totalConverted / totalReferrals) * 100 : 0

    // Viral coefficient (referrals per user)
    const usersResult = await this.env.DB.prepare(`SELECT COUNT(DISTINCT referrer_user_id) as count FROM referrals`).first<{ count: number }>()
    const totalUsers = usersResult?.count || 1
    const viralCoefficient = totalReferrals / totalUsers

    // Credits distributed
    const creditsResult = await this.env.DB.prepare(`SELECT SUM(credits_earned) as sum FROM referral_codes`).first<{ sum: number }>()
    const totalCreditsDistributed = creditsResult?.sum || 0

    // Average reward
    const averageRewardPerReferral = totalConverted > 0 ? totalCreditsDistributed / totalConverted : 0

    // By status
    const statusResults = await this.env.DB.prepare(`SELECT status, COUNT(*) as count FROM referrals GROUP BY status`).all<{ status: string; count: number }>()
    const byStatus = statusResults.results.reduce(
      (acc, row) => {
        acc[row.status as any] = row.count
        return acc
      },
      {} as Record<string, number>
    )

    // By source
    const sourceResults = await this.env.DB.prepare(`SELECT source, COUNT(*) as count FROM referrals WHERE source IS NOT NULL GROUP BY source`).all<{
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

    // By tier
    const tierResults = await this.env.DB.prepare(`SELECT tier, COUNT(*) as count FROM referral_codes GROUP BY tier`).all<{ tier: string; count: number }>()
    const byTier = tierResults.results.reduce(
      (acc, row) => {
        acc[row.tier as any] = row.count
        return acc
      },
      {} as Record<string, number>
    )

    // Top referrers
    const topReferrers = await this.getLeaderboard({ limit: 10 })

    return {
      totalReferrals,
      totalConverted,
      conversionRate: Math.round(conversionRate * 10) / 10,
      viralCoefficient: Math.round(viralCoefficient * 100) / 100,
      totalCreditsDistributed,
      averageRewardPerReferral: Math.round(averageRewardPerReferral),
      byStatus: byStatus as any,
      bySource,
      byTier: byTier as any,
      topReferrers,
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateCode(email: string): string {
    // Generate a short, readable code from email
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const random = Math.random().toString(36).substring(2, 6)
    return `${username}${random}`.substring(0, 15)
  }

  private async checkCodeExists(code: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`SELECT id FROM referral_codes WHERE code = ?`).bind(code).first()
    return !!result
  }

  private async getReferralCodeByUserId(userId: string): Promise<ReferralCode | null> {
    const result = await this.env.DB.prepare(`SELECT * FROM referral_codes WHERE user_id = ?`).bind(userId).first()
    return result ? this.mapReferralCode(result) : null
  }

  private async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    // Try cache first
    const cached = await this.env.KV.get(`referral:code:${code}`)
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await this.env.DB.prepare(`SELECT * FROM referral_codes WHERE code = ?`).bind(code).first()
    if (result) {
      const referralCode = this.mapReferralCode(result)
      await this.env.KV.put(`referral:code:${code}`, JSON.stringify(referralCode), { expirationTtl: 86400 })
      return referralCode
    }

    return null
  }

  private async getReferralByEmail(email: string): Promise<Referral | null> {
    const result = await this.env.DB.prepare(`SELECT * FROM referrals WHERE referred_email = ?`).bind(email).first()
    return result ? this.mapReferral(result) : null
  }

  private async incrementReferralCount(referralCodeId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE referral_codes SET referral_count = referral_count + 1, updated_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), referralCodeId)
      .run()
  }

  private async incrementSuccessfulReferrals(referralCodeId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE referral_codes SET successful_referrals = successful_referrals + 1, updated_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), referralCodeId)
      .run()
  }

  private calculateReward(tier: ReferralTier): number {
    const baseReward = 100 // Base credits per referral
    const tierConfig = TIER_CONFIGS.find((t) => t.tier === tier)
    return Math.round(baseReward * (tierConfig?.multiplier || 1))
  }

  private async updateTier(userId: string): Promise<void> {
    const referralCode = await this.getReferralCodeByUserId(userId)
    if (!referralCode) return

    const newTier = this.calculateTier(referralCode.successfulReferrals)
    if (newTier !== referralCode.tier) {
      await this.env.DB.prepare(`UPDATE referral_codes SET tier = ?, updated_at = ? WHERE id = ?`)
        .bind(newTier, new Date().toISOString(), referralCode.id)
        .run()

      // Send tier upgrade notification
      console.log(`User ${userId} upgraded to ${newTier}`)
    }
  }

  private calculateTier(successfulReferrals: number): ReferralTier {
    for (let i = TIER_CONFIGS.length - 1; i >= 0; i--) {
      const tier = TIER_CONFIGS[i]
      if (successfulReferrals >= tier.minReferrals) {
        return tier.tier
      }
    }
    return 'bronze'
  }

  private getTimeframeCutoff(timeframe: string): string {
    const now = new Date()
    switch (timeframe) {
      case 'day':
        now.setDate(now.getDate() - 1)
        break
      case 'week':
        now.setDate(now.getDate() - 7)
        break
      case 'month':
        now.setMonth(now.getMonth() - 1)
        break
    }
    return now.toISOString()
  }

  private async checkFraud(referralId: string): Promise<FraudCheckResult> {
    // Simplified fraud check (in production, would be more sophisticated)
    const result: FraudCheckResult = {
      isFraudulent: false,
      confidence: 0.9,
      reasons: [],
      flags: [],
    }

    // Check for rapid referrals
    const referral = await this.env.DB.prepare(`SELECT * FROM referrals WHERE id = ?`).bind(referralId).first()
    if (referral) {
      const recentCount = await this.env.DB.prepare(
        `SELECT COUNT(*) as count FROM referrals
         WHERE referrer_user_id = ?
         AND referred_at >= datetime('now', '-1 hour')`
      )
        .bind(referral.referrer_user_id)
        .first<{ count: number }>()

      if ((recentCount?.count || 0) > 10) {
        result.flags.push({
          type: 'rapid_referrals',
          severity: 'high',
          description: 'More than 10 referrals in the last hour',
        })
      }
    }

    return result
  }

  private async trackCodeGeneration(code: ReferralCode): Promise<void> {
    console.log('Referral code generated:', { userId: code.userId, code: code.code })
  }

  private async trackReferralCreated(referral: Referral): Promise<void> {
    console.log('Referral created:', { referralId: referral.id, referredEmail: referral.referredEmail })
  }

  private async trackReferralConverted(referral: Referral): Promise<void> {
    console.log('Referral converted:', { referralId: referral.id, referredUserId: referral.referredUserId })
  }

  private mapReferralCode(row: any): ReferralCode {
    return {
      id: row.id,
      userId: row.user_id,
      code: row.code,
      email: row.email,
      name: row.name,
      status: row.status,
      referralCount: row.referral_count,
      successfulReferrals: row.successful_referrals,
      creditsEarned: row.credits_earned,
      tier: row.tier,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapReferral(row: any): Referral {
    return {
      id: row.id,
      referralCodeId: row.referral_code_id,
      referrerUserId: row.referrer_user_id,
      referredUserId: row.referred_user_id,
      referredEmail: row.referred_email,
      status: row.status,
      source: row.source,
      referredAt: row.referred_at,
      convertedAt: row.converted_at,
      creditedAt: row.credited_at,
      rewardAmount: row.reward_amount,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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
app.get('/health', (c) => c.json({ ok: true, service: 'referral-program' }))

// Generate referral code (authenticated)
app.post('/codes/generate', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const body = await c.req.json()
    const code = await service.generateReferralCode(body)
    return c.json({ success: true, data: code }, 201)
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Track referral (public)
app.post('/referrals/track', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const body = await c.req.json()
    const referral = await service.trackReferral(body)
    return c.json({ success: true, data: referral }, 201)
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Convert referral (internal)
app.post('/referrals/convert', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const body = await c.req.json()
    const referral = await service.convertReferral(body)
    return c.json({ success: true, data: referral })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get user stats (authenticated)
app.get('/stats/:userId', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const stats = await service.getUserStats(c.req.param('userId'))
    return c.json({ success: true, data: stats })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get leaderboard (public)
app.get('/leaderboard', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const query = c.req.query()
    const leaderboard = await service.getLeaderboard({
      timeframe: query.timeframe as any,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    })
    return c.json({ success: true, data: leaderboard })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get analytics (admin)
app.get('/analytics', async (c) => {
  try {
    const service = new ReferralProgramService(c.env.ctx, c.env)
    const analytics = await service.getAnalytics()
    return c.json({ success: true, data: analytics })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ============================================================================
// Queue Handler
// ============================================================================

async function handleQueueMessage(batch: MessageBatch<ReferralQueueMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const data = message.body
      const service = new ReferralProgramService({} as any, env)

      switch (data.type) {
        case 'distribute_reward':
          await distributeReward(data.referralId, env)
          break
        case 'check_fraud':
          await checkFraud(data.referralId, service)
          break
        case 'update_tier':
          await service['updateTier'](data.userId)
          break
      }

      message.ack()
    } catch (error) {
      console.error('Queue message processing failed:', error)
      message.retry()
    }
  }
}

async function distributeReward(referralId: string, env: Env): Promise<void> {
  const referral = await env.DB.prepare(`SELECT * FROM referrals WHERE id = ?`).bind(referralId).first()
  if (!referral || referral.status !== 'converted') return

  // Credit the referrer
  await env.DB.prepare(`UPDATE referral_codes SET credits_earned = credits_earned + ?, updated_at = ? WHERE id = ?`)
    .bind(referral.reward_amount, new Date().toISOString(), referral.referral_code_id)
    .run()

  // Mark as credited
  await env.DB.prepare(`UPDATE referrals SET status = 'credited', credited_at = ?, updated_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), new Date().toISOString(), referralId)
    .run()

  console.log(`Distributed ${referral.reward_amount} credits for referral ${referralId}`)
}

async function checkFraud(referralId: string, service: ReferralProgramService): Promise<void> {
  const result = await service['checkFraud'](referralId)

  if (result.isFraudulent) {
    // Mark as fraudulent
    const env = (service as any).env
    await env.DB.prepare(`UPDATE referrals SET status = 'fraudulent', updated_at = ? WHERE id = ?`).bind(new Date().toISOString(), referralId).run()

    console.log(`Referral ${referralId} flagged as fraudulent:`, result.reasons)
  }
}

// ============================================================================
// Exports
// ============================================================================

export { ReferralProgramService as default, ReferralProgramService }

export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
