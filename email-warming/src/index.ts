/**
 * Email Warming Service
 *
 * Manages IP warmup process for email domains to establish sender reputation
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { ulid } from 'ulid'
import type {
  Env,
  WarmupConfig,
  WarmupProgress,
  WarmupStats,
  WarmupDaySchedule,
  StartWarmupRequest,
  PauseWarmupRequest,
  ResumeWarmupRequest,
  ResetWarmupRequest,
  AdvanceWarmupRequest,
  RecordSendRequest,
  CheckWarmupLimitRequest,
  CheckWarmupLimitResponse,
} from './types'
import {
  startWarmupRequestSchema,
  pauseWarmupRequestSchema,
  resumeWarmupRequestSchema,
  resetWarmupRequestSchema,
  advanceWarmupRequestSchema,
  recordSendRequestSchema,
  checkWarmupLimitRequestSchema,
} from './schema'
import { WARMUP_SCHEDULES } from './types'

/**
 * Email Warming Service RPC Interface
 */
export class EmailWarmingService extends WorkerEntrypoint<Env> {
  /**
   * Start warmup for a domain
   */
  async startWarmup(request: StartWarmupRequest): Promise<WarmupProgress> {
    const validated = startWarmupRequestSchema.parse(request)
    const { config } = validated

    // Check if warmup already exists
    const existing = await this.getWarmupProgress(config.domainId)
    if (existing && existing.status !== 'completed' && existing.status !== 'failed') {
      throw new Error(`Warmup already in progress for domain ${config.domainId}`)
    }

    // Get schedule
    let schedule: number[]
    if (config.scheduleType === 'custom') {
      if (!config.customSchedule || config.customSchedule.length === 0) {
        throw new Error('Custom schedule type requires customSchedule array')
      }
      schedule = config.customSchedule
    } else {
      schedule = WARMUP_SCHEDULES[config.scheduleType]
    }

    if (config.maxDays && config.maxDays < schedule.length) {
      schedule = schedule.slice(0, config.maxDays)
    }

    const now = new Date().toISOString()
    const warmupId = ulid()

    // Create warmup schedule entries
    const daySchedules: WarmupDaySchedule[] = schedule.map((dailyLimit, index) => ({
      day: index + 1,
      dailyLimit,
      sent: 0,
      bounceRate: 0,
      complaintRate: 0,
      successRate: 0,
      completed: false,
    }))

    // Store in database
    if (this.env.DB) {
      await this.env.DB.execute(
        `INSERT INTO email_warmup (
          id, domain_id, status, schedule_type, current_day, total_days,
          daily_limit, sent_today, config, schedule, started_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [warmupId, config.domainId, 'in_progress', config.scheduleType, 1, schedule.length, schedule[0], 0, JSON.stringify(config), JSON.stringify(daySchedules), now, now]
      )

      // Update domain table
      await this.env.DB.execute(
        `UPDATE email_domains SET
          warmup_status = ?,
          warmup_started_at = ?,
          warmup_current_day = ?,
          daily_limit = ?
        WHERE id = ?`,
        ['in_progress', now, 1, schedule[0], config.domainId]
      )
    }

    // Cache in KV for fast access
    if (this.env.KV) {
      await this.env.KV.put(`warmup:${config.domainId}`, JSON.stringify({ currentDay: 1, dailyLimit: schedule[0], sentToday: 0, status: 'in_progress' }), {
        expirationTtl: 86400, // 24 hours
      })
    }

    return {
      domainId: config.domainId,
      status: 'in_progress',
      scheduleType: config.scheduleType,
      currentDay: 1,
      totalDays: schedule.length,
      dailyLimit: schedule[0],
      sentToday: 0,
      remaining: schedule[0],
      schedule: daySchedules,
      startedAt: now,
      config,
    }
  }

  /**
   * Get warmup progress for a domain
   */
  async getWarmupProgress(domainId: string): Promise<WarmupProgress | null> {
    if (!this.env.DB) {
      throw new Error('Database service not available')
    }

    const result = await this.env.DB.execute(`SELECT * FROM email_warmup WHERE domain_id = ? ORDER BY created_at DESC LIMIT 1`, [domainId])

    if (!result.rows.length) {
      return null
    }

    const row = result.rows[0] as any

    return {
      domainId: row.domain_id,
      status: row.status,
      scheduleType: row.schedule_type,
      currentDay: row.current_day,
      totalDays: row.total_days,
      dailyLimit: row.daily_limit,
      sentToday: row.sent_today,
      remaining: Math.max(0, row.daily_limit - row.sent_today),
      schedule: JSON.parse(row.schedule),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      pausedAt: row.paused_at,
      lastAdvancedAt: row.last_advanced_at,
      config: JSON.parse(row.config),
    }
  }

  /**
   * Pause warmup
   */
  async pauseWarmup(request: PauseWarmupRequest): Promise<WarmupProgress> {
    const validated = pauseWarmupRequestSchema.parse(request)
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress) {
      throw new Error(`No warmup found for domain ${validated.domainId}`)
    }

    if (progress.status !== 'in_progress') {
      throw new Error(`Cannot pause warmup in ${progress.status} status`)
    }

    const now = new Date().toISOString()

    if (this.env.DB) {
      await this.env.DB.execute(`UPDATE email_warmup SET status = ?, paused_at = ? WHERE domain_id = ? AND status = 'in_progress'`, ['paused', now, validated.domainId])

      await this.env.DB.execute(`UPDATE email_domains SET warmup_status = ? WHERE id = ?`, ['paused', validated.domainId])
    }

    if (this.env.KV) {
      const kvData = await this.env.KV.get(`warmup:${validated.domainId}`, 'json')
      if (kvData) {
        await this.env.KV.put(`warmup:${validated.domainId}`, JSON.stringify({ ...kvData, status: 'paused' }), { expirationTtl: 86400 })
      }
    }

    return { ...progress, status: 'paused', pausedAt: now }
  }

  /**
   * Resume warmup
   */
  async resumeWarmup(request: ResumeWarmupRequest): Promise<WarmupProgress> {
    const validated = resumeWarmupRequestSchema.parse(request)
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress) {
      throw new Error(`No warmup found for domain ${validated.domainId}`)
    }

    if (progress.status !== 'paused') {
      throw new Error(`Cannot resume warmup in ${progress.status} status`)
    }

    if (this.env.DB) {
      await this.env.DB.execute(`UPDATE email_warmup SET status = ? WHERE domain_id = ? AND status = 'paused'`, ['in_progress', validated.domainId])

      await this.env.DB.execute(`UPDATE email_domains SET warmup_status = ? WHERE id = ?`, ['in_progress', validated.domainId])
    }

    if (this.env.KV) {
      const kvData = await this.env.KV.get(`warmup:${validated.domainId}`, 'json')
      if (kvData) {
        await this.env.KV.put(`warmup:${validated.domainId}`, JSON.stringify({ ...kvData, status: 'in_progress' }), { expirationTtl: 86400 })
      }
    }

    return { ...progress, status: 'in_progress' }
  }

  /**
   * Reset warmup (start over from day 1)
   */
  async resetWarmup(request: ResetWarmupRequest): Promise<WarmupProgress> {
    const validated = resetWarmupRequestSchema.parse(request)
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress) {
      throw new Error(`No warmup found for domain ${validated.domainId}`)
    }

    // Reset schedule
    const resetSchedule = progress.schedule.map((day) => ({
      ...day,
      sent: 0,
      bounceRate: 0,
      complaintRate: 0,
      successRate: 0,
      completed: false,
    }))

    const now = new Date().toISOString()

    if (this.env.DB) {
      if (validated.preserveStats) {
        // Archive current warmup
        await this.env.DB.execute(`UPDATE email_warmup SET status = ? WHERE domain_id = ? AND status IN ('in_progress', 'paused')`, ['failed', validated.domainId])
      }

      // Create new warmup
      await this.env.DB.execute(
        `INSERT INTO email_warmup (
          id, domain_id, status, schedule_type, current_day, total_days,
          daily_limit, sent_today, config, schedule, started_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ulid(), validated.domainId, 'in_progress', progress.scheduleType, 1, progress.totalDays, resetSchedule[0].dailyLimit, 0, JSON.stringify(progress.config), JSON.stringify(resetSchedule), now, now]
      )

      await this.env.DB.execute(`UPDATE email_domains SET warmup_status = ?, warmup_started_at = ?, warmup_current_day = ?, daily_limit = ? WHERE id = ?`, [
        'in_progress',
        now,
        1,
        resetSchedule[0].dailyLimit,
        validated.domainId,
      ])
    }

    if (this.env.KV) {
      await this.env.KV.put(`warmup:${validated.domainId}`, JSON.stringify({ currentDay: 1, dailyLimit: resetSchedule[0].dailyLimit, sentToday: 0, status: 'in_progress' }), {
        expirationTtl: 86400,
      })
    }

    return {
      ...progress,
      currentDay: 1,
      dailyLimit: resetSchedule[0].dailyLimit,
      sentToday: 0,
      remaining: resetSchedule[0].dailyLimit,
      schedule: resetSchedule,
      startedAt: now,
      status: 'in_progress',
    }
  }

  /**
   * Advance to next day (manual or automatic)
   */
  async advanceWarmup(request: AdvanceWarmupRequest): Promise<WarmupProgress> {
    const validated = advanceWarmupRequestSchema.parse(request)
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress) {
      throw new Error(`No warmup found for domain ${validated.domainId}`)
    }

    if (progress.status !== 'in_progress') {
      throw new Error(`Cannot advance warmup in ${progress.status} status`)
    }

    // Check if we can advance
    const currentDaySchedule = progress.schedule[progress.currentDay - 1]
    if (!validated.force && currentDaySchedule.sent < currentDaySchedule.dailyLimit * 0.8) {
      throw new Error(`Cannot advance: only sent ${currentDaySchedule.sent}/${currentDaySchedule.dailyLimit} emails today (80% minimum)`)
    }

    // Check if warmup is complete
    if (progress.currentDay >= progress.totalDays) {
      const now = new Date().toISOString()

      if (this.env.DB) {
        await this.env.DB.execute(`UPDATE email_warmup SET status = ?, completed_at = ? WHERE domain_id = ? AND status = 'in_progress'`, ['completed', now, validated.domainId])

        await this.env.DB.execute(`UPDATE email_domains SET warmup_status = ?, warmup_completed_at = ? WHERE id = ?`, ['completed', now, validated.domainId])
      }

      if (this.env.KV) {
        await this.env.KV.delete(`warmup:${validated.domainId}`)
      }

      return { ...progress, status: 'completed', completedAt: now }
    }

    // Advance to next day
    const nextDay = progress.currentDay + 1
    const nextDaySchedule = progress.schedule[nextDay - 1]
    const now = new Date().toISOString()

    // Mark current day as completed
    progress.schedule[progress.currentDay - 1].completed = true

    if (this.env.DB) {
      await this.env.DB.execute(
        `UPDATE email_warmup SET
          current_day = ?,
          daily_limit = ?,
          sent_today = 0,
          last_advanced_at = ?,
          schedule = ?
        WHERE domain_id = ? AND status = 'in_progress'`,
        [nextDay, nextDaySchedule.dailyLimit, now, JSON.stringify(progress.schedule), validated.domainId]
      )

      await this.env.DB.execute(`UPDATE email_domains SET warmup_current_day = ?, daily_limit = ? WHERE id = ?`, [nextDay, nextDaySchedule.dailyLimit, validated.domainId])
    }

    if (this.env.KV) {
      await this.env.KV.put(`warmup:${validated.domainId}`, JSON.stringify({ currentDay: nextDay, dailyLimit: nextDaySchedule.dailyLimit, sentToday: 0, status: 'in_progress' }), {
        expirationTtl: 86400,
      })
    }

    return {
      ...progress,
      currentDay: nextDay,
      dailyLimit: nextDaySchedule.dailyLimit,
      sentToday: 0,
      remaining: nextDaySchedule.dailyLimit,
      lastAdvancedAt: now,
    }
  }

  /**
   * Record a send (updates counters and checks thresholds)
   */
  async recordSend(request: RecordSendRequest): Promise<void> {
    const validated = recordSendRequestSchema.parse(request)
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress || progress.status !== 'in_progress') {
      return // No active warmup, skip
    }

    const currentDaySchedule = progress.schedule[progress.currentDay - 1]

    // Update counters
    currentDaySchedule.sent++
    if (validated.status === 'delivered') {
      currentDaySchedule.successRate = (currentDaySchedule.successRate * (currentDaySchedule.sent - 1) + 1) / currentDaySchedule.sent
    } else if (validated.status === 'bounced') {
      currentDaySchedule.bounceRate = (currentDaySchedule.bounceRate * (currentDaySchedule.sent - 1) + 1) / currentDaySchedule.sent
    } else if (validated.status === 'complained') {
      currentDaySchedule.complaintRate = (currentDaySchedule.complaintRate * (currentDaySchedule.sent - 1) + 1) / currentDaySchedule.sent
    }

    // Update database
    if (this.env.DB) {
      await this.env.DB.execute(
        `UPDATE email_warmup SET
          sent_today = sent_today + 1,
          schedule = ?
        WHERE domain_id = ? AND status = 'in_progress'`,
        [JSON.stringify(progress.schedule), validated.domainId]
      )
    }

    // Update KV cache
    if (this.env.KV) {
      const kvData = await this.env.KV.get(`warmup:${validated.domainId}`, 'json')
      if (kvData) {
        await this.env.KV.put(`warmup:${validated.domainId}`, JSON.stringify({ ...kvData, sentToday: (kvData as any).sentToday + 1 }), { expirationTtl: 86400 })
      }
    }

    // Check thresholds
    if (progress.config.pauseOnHighBounce && currentDaySchedule.bounceRate > (progress.config.bounceThreshold || 0.05)) {
      await this.pauseWarmup({ domainId: validated.domainId, reason: `High bounce rate: ${(currentDaySchedule.bounceRate * 100).toFixed(2)}%` })
    } else if (progress.config.pauseOnHighComplaint && currentDaySchedule.complaintRate > (progress.config.complaintThreshold || 0.001)) {
      await this.pauseWarmup({ domainId: validated.domainId, reason: `High complaint rate: ${(currentDaySchedule.complaintRate * 100).toFixed(2)}%` })
    }

    // Auto-advance if daily limit reached and autoAdvance enabled
    if (progress.config.autoAdvance && currentDaySchedule.sent >= currentDaySchedule.dailyLimit) {
      await this.advanceWarmup({ domainId: validated.domainId })
    }
  }

  /**
   * Check if sending is allowed (within warmup limits)
   */
  async checkLimit(request: CheckWarmupLimitRequest): Promise<CheckWarmupLimitResponse> {
    const validated = checkWarmupLimitRequestSchema.parse(request)

    // Try KV first for fast access
    if (this.env.KV) {
      const kvData = (await this.env.KV.get(`warmup:${validated.domainId}`, 'json')) as any
      if (kvData) {
        const remaining = Math.max(0, kvData.dailyLimit - kvData.sentToday)
        return {
          allowed: remaining >= validated.count,
          remaining,
          dailyLimit: kvData.dailyLimit,
          currentDay: kvData.currentDay,
          status: kvData.status,
          reason: remaining < validated.count ? `Warmup limit reached (${kvData.sentToday}/${kvData.dailyLimit})` : undefined,
        }
      }
    }

    // Fallback to database
    const progress = await this.getWarmupProgress(validated.domainId)

    if (!progress) {
      // No warmup = unlimited
      return {
        allowed: true,
        remaining: Infinity,
        dailyLimit: Infinity,
        currentDay: 0,
        status: 'not_started',
      }
    }

    const remaining = progress.remaining

    return {
      allowed: remaining >= validated.count && progress.status === 'in_progress',
      remaining,
      dailyLimit: progress.dailyLimit,
      currentDay: progress.currentDay,
      status: progress.status,
      reason: remaining < validated.count ? `Warmup limit reached (${progress.sentToday}/${progress.dailyLimit})` : progress.status !== 'in_progress' ? `Warmup status: ${progress.status}` : undefined,
    }
  }

  /**
   * Get warmup statistics
   */
  async getStats(domainId: string): Promise<WarmupStats | null> {
    const progress = await this.getWarmupProgress(domainId)

    if (!progress) {
      return null
    }

    const totalSent = progress.schedule.reduce((sum, day) => sum + day.sent, 0)
    const completedDays = progress.schedule.filter((day) => day.completed).length
    const averageBounceRate = progress.schedule.reduce((sum, day) => sum + day.bounceRate, 0) / progress.currentDay
    const averageComplaintRate = progress.schedule.reduce((sum, day) => sum + day.complaintRate, 0) / progress.currentDay
    const averageSuccessRate = progress.schedule.reduce((sum, day) => sum + day.successRate, 0) / progress.currentDay
    const completionPercentage = (completedDays / progress.totalDays) * 100

    // Estimate completion date
    let estimatedCompletionDate: string | undefined
    if (progress.status === 'in_progress' && progress.startedAt) {
      const daysElapsed = completedDays
      const daysRemaining = progress.totalDays - completedDays
      const avgDaysPerDay = daysElapsed > 0 ? daysElapsed : 1 // Assume 1 day per day if just started
      const estimatedRemainingDays = daysRemaining * avgDaysPerDay
      const completionDate = new Date(progress.startedAt)
      completionDate.setDate(completionDate.getDate() + estimatedRemainingDays)
      estimatedCompletionDate = completionDate.toISOString()
    }

    return {
      domainId,
      totalSent,
      totalDays: progress.totalDays,
      currentDay: progress.currentDay,
      averageBounceRate,
      averageComplaintRate,
      averageSuccessRate,
      completionPercentage,
      estimatedCompletionDate,
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
app.get('/health', (c) => c.json({ status: 'ok', service: 'email-warming', version: '1.0.0' }))

// Start warmup
app.post('/warmup/start', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json()
    const result = await service.startWarmup(body)
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get warmup progress
app.get('/warmup/:domainId', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const result = await service.getWarmupProgress(c.req.param('domainId'))
    if (!result) {
      return c.json(error('Warmup not found'), 404)
    }
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Pause warmup
app.post('/warmup/:domainId/pause', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json<{ reason?: string }>()
    const result = await service.pauseWarmup({ domainId: c.req.param('domainId'), reason: body.reason })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Resume warmup
app.post('/warmup/:domainId/resume', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const result = await service.resumeWarmup({ domainId: c.req.param('domainId') })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Reset warmup
app.post('/warmup/:domainId/reset', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json<{ preserveStats?: boolean }>()
    const result = await service.resetWarmup({ domainId: c.req.param('domainId'), preserveStats: body.preserveStats })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Advance warmup
app.post('/warmup/:domainId/advance', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json<{ force?: boolean }>()
    const result = await service.advanceWarmup({ domainId: c.req.param('domainId'), force: body.force })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Record send
app.post('/warmup/:domainId/record', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json()
    await service.recordSend({ domainId: c.req.param('domainId'), ...body })
    return c.json(success({ recorded: true }))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Check limit
app.post('/warmup/:domainId/check', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const body = await c.req.json<{ count?: number }>()
    const result = await service.checkLimit({ domainId: c.req.param('domainId'), count: body.count })
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get stats
app.get('/warmup/:domainId/stats', async (c) => {
  try {
    const service = new EmailWarmingService(c.env.ctx, c.env)
    const result = await service.getStats(c.req.param('domainId'))
    if (!result) {
      return c.json(error('Warmup not found'), 404)
    }
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

export default {
  fetch: app.fetch,
}
