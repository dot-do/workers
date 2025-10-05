/**
 * Ads Worker
 * Display ad serving engine with experimentation-first approach
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Ad, AdStatus, AdContext, AdImpression, AdClick, AdConversion, AdSelectionResult, FrequencyCap } from './types'
import { ExternalNetworkManager } from './external'
import type { SubmissionOptions, ExternalAdSubmission, PromotionEligibility } from './external'
import { DashboardManager } from './dashboard'
import type { DashboardSummary, ChannelComparison, TimeSeriesData, PerformanceBreakdown } from './dashboard'

/**
 * Environment bindings
 */
export interface Env {
  ADS_KV: KVNamespace
  ADS_DB: D1Database
  ADS_QUEUE: Queue
  ADS_ANALYTICS: AnalyticsEngineDataset

  // Service bindings
  EXPERIMENT?: any
  ANALYTICS?: any
  CAMPAIGNS?: any
  CREATIVES?: any
  DB?: any
  GOOGLE_ADS?: any
  BING_ADS?: any
}

/**
 * Ads Service (RPC Interface)
 */
export class AdsService extends WorkerEntrypoint<Env> {
  private externalNetworks: ExternalNetworkManager
  private dashboard: DashboardManager

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.externalNetworks = new ExternalNetworkManager(env)
    this.dashboard = new DashboardManager(env)
  }

  /**
   * Select ad for user/context
   * Main method called for every ad impression request
   */
  async selectAd(context: AdContext): Promise<AdSelectionResult> {
    // 1. Get eligible ads (targeting, budget, status)
    const eligibleAds = await this.getEligibleAds(context)

    if (eligibleAds.length === 0) {
      throw new Error('No eligible ads available')
    }

    // 2. Apply frequency capping
    const uncappedAds = await this.filterByFrequencyCap(eligibleAds, context.userId)

    if (uncappedAds.length === 0) {
      // All ads frequency capped, return best available
      const ad = this.selectByQuality(eligibleAds)
      return this.createImpressionResult(ad, context, undefined)
    }

    // 3. Check if user in active experiment
    const experiment = await this.getActiveExperiment()

    if (experiment && this.env.EXPERIMENT) {
      try {
        // 4. Get variant assignment from experiment worker
        const assignment = await this.env.EXPERIMENT.assignVariant(experiment.id, {
          userId: context.userId,
          sessionId: context.sessionId,
          timestamp: context.timestamp,
          device: context.device,
          location: context.location,
          features: context.userFeatures || {},
        })

        // 5. Map variant config to ad
        const adId = assignment.config.adId
        const experimentAd = uncappedAds.find((ad) => ad.id === adId)

        if (experimentAd) {
          return this.createImpressionResult(experimentAd, context, {
            experimentId: experiment.id,
            assignmentId: assignment.id,
            variantId: assignment.variantId,
          })
        }
      } catch (error) {
        console.error('Experiment assignment failed:', error)
        // Fall through to quality-based selection
      }
    }

    // 6. Fallback: Select by quality * bid
    const selectedAd = this.selectByQuality(uncappedAds)
    return this.createImpressionResult(selectedAd, context, undefined)
  }

  /**
   * Record impression
   */
  async recordImpression(impressionId: string, viewability?: number): Promise<void> {
    // Get impression
    const impression = await this.getImpression(impressionId)
    if (!impression) {
      throw new Error(`Impression ${impressionId} not found`)
    }

    // Update viewability if provided
    if (viewability !== undefined) {
      await this.env.ADS_DB.prepare(`UPDATE ad_impressions SET viewability = ? WHERE id = ?`).bind(viewability, impressionId).run()
    }

    // Update ad metrics
    await this.incrementAdMetric(impression.adId, 'impressions', 1)

    // Track in Analytics
    this.env.ADS_ANALYTICS.writeDataPoint({
      blobs: ['impression', impression.adId],
      doubles: [1, viewability || 0],
      indexes: [impression.adId],
    })

    // If in experiment, record observation
    if (impression.assignmentId && this.env.EXPERIMENT) {
      try {
        await this.env.EXPERIMENT.recordObservation(impression.assignmentId, 'impression', 1)
      } catch (error) {
        console.error('Failed to record experiment observation:', error)
      }
    }
  }

  /**
   * Record click
   */
  async recordClick(impressionId: string): Promise<AdClick> {
    const clickId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get impression
    const impression = await this.getImpression(impressionId)
    if (!impression) {
      throw new Error(`Impression ${impressionId} not found`)
    }

    const click: AdClick = {
      id: clickId,
      impressionId,
      adId: impression.adId,
      userId: impression.userId,
      sessionId: impression.sessionId,
      timestamp: now,
    }

    // Store click
    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_clicks (id, impression_id, ad_id, user_id, session_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(clickId, impressionId, impression.adId, impression.userId, impression.sessionId, now)
      .run()

    // Update ad metrics
    await this.incrementAdMetric(impression.adId, 'clicks', 1)

    // Track in Analytics
    this.env.ADS_ANALYTICS.writeDataPoint({
      blobs: ['click', impression.adId],
      doubles: [1],
      indexes: [impression.adId],
    })

    // If in experiment, record observation
    if (impression.assignmentId && this.env.EXPERIMENT) {
      try {
        await this.env.EXPERIMENT.recordObservation(impression.assignmentId, 'click', 1)
      } catch (error) {
        console.error('Failed to record experiment observation:', error)
      }
    }

    return click
  }

  /**
   * Record conversion
   */
  async recordConversion(impressionId: string, value: number, clickId?: string): Promise<AdConversion> {
    const conversionId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get impression
    const impression = await this.getImpression(impressionId)
    if (!impression) {
      throw new Error(`Impression ${impressionId} not found`)
    }

    const conversion: AdConversion = {
      id: conversionId,
      impressionId,
      clickId,
      adId: impression.adId,
      userId: impression.userId,
      value,
      timestamp: now,
    }

    // Store conversion
    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_conversions (id, impression_id, click_id, ad_id, user_id, value, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(conversionId, impressionId, clickId || null, impression.adId, impression.userId, value, now)
      .run()

    // Update ad metrics
    await this.incrementAdMetric(impression.adId, 'conversions', 1)
    await this.incrementAdMetric(impression.adId, 'revenue', value)

    // Track in Analytics
    this.env.ADS_ANALYTICS.writeDataPoint({
      blobs: ['conversion', impression.adId],
      doubles: [1, value],
      indexes: [impression.adId],
    })

    // If in experiment, record observation
    if (impression.assignmentId && this.env.EXPERIMENT) {
      try {
        await this.env.EXPERIMENT.recordObservation(impression.assignmentId, 'conversion', 1)
        await this.env.EXPERIMENT.recordObservation(impression.assignmentId, 'revenue', value)
      } catch (error) {
        console.error('Failed to record experiment observation:', error)
      }
    }

    return conversion
  }

  /**
   * Get ad performance
   */
  async getAdPerformance(adId: string, dateRange?: { from: string; to: string }): Promise<Ad> {
    // Check cache
    const cached = await this.env.ADS_KV.get(`ad:${adId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.ADS_DB.prepare(`SELECT * FROM ads WHERE id = ?`).bind(adId).first()

    if (!result) {
      throw new Error(`Ad ${adId} not found`)
    }

    const ad: Ad = {
      id: result.id as string,
      campaignId: result.campaign_id as string,
      creativeId: result.creative_id as string,
      status: result.status as AdStatus,
      targeting: result.targeting ? JSON.parse(result.targeting as string) : undefined,
      bid: result.bid as number,
      dailyBudget: result.daily_budget as number | undefined,
      totalBudget: result.total_budget as number | undefined,
      spent: result.spent as number,
      qualityScore: result.quality_score as number,
      metrics: JSON.parse(result.metrics as string),
      config: JSON.parse(result.config as string),
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }

    // Cache for 5 minutes
    await this.env.ADS_KV.put(`ad:${adId}`, JSON.stringify(ad), { expirationTtl: 300 })

    return ad
  }

  /**
   * Get eligible ads (targeting, budget, status)
   */
  private async getEligibleAds(context: AdContext): Promise<Ad[]> {
    // Query active ads
    const results = await this.env.ADS_DB.prepare(
      `SELECT * FROM ads
       WHERE status = 'active'
       AND (daily_budget IS NULL OR spent < daily_budget)
       AND (total_budget IS NULL OR spent < total_budget)
       LIMIT 100`
    )
      .all()

    const ads = results.results.map((row: any) => ({
      id: row.id,
      campaignId: row.campaign_id,
      creativeId: row.creative_id,
      status: row.status,
      targeting: row.targeting ? JSON.parse(row.targeting) : undefined,
      bid: row.bid,
      dailyBudget: row.daily_budget,
      totalBudget: row.total_budget,
      spent: row.spent,
      qualityScore: row.quality_score,
      metrics: JSON.parse(row.metrics),
      config: JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    // Filter by targeting
    return ads.filter((ad) => this.matchesTargeting(ad, context))
  }

  /**
   * Check if ad matches targeting criteria
   */
  private matchesTargeting(ad: Ad, context: AdContext): boolean {
    if (!ad.targeting) {
      return true
    }

    // Check location
    if (ad.targeting.locations && ad.targeting.locations.length > 0) {
      if (!ad.targeting.locations.includes(context.location)) {
        return false
      }
    }

    // Check device
    if (ad.targeting.devices && ad.targeting.devices.length > 0) {
      if (!ad.targeting.devices.includes(context.device)) {
        return false
      }
    }

    // Check keywords
    if (ad.targeting.keywords && ad.targeting.keywords.length > 0 && context.keywords) {
      const hasMatch = ad.targeting.keywords.some((keyword) => context.keywords?.includes(keyword))
      if (!hasMatch) {
        return false
      }
    }

    return true
  }

  /**
   * Filter ads by frequency cap
   */
  private async filterByFrequencyCap(ads: Ad[], userId: string): Promise<Ad[]> {
    const uncapped: Ad[] = []

    for (const ad of ads) {
      const isCapped = await this.isFrequencyCapped(ad.id, userId)
      if (!isCapped) {
        uncapped.push(ad)
      }
    }

    return uncapped
  }

  /**
   * Check if ad is frequency capped for user
   */
  private async isFrequencyCapped(adId: string, userId: string): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - 24 * 60 * 60 * 1000 // 24 hours ago

    // Get frequency cap from cache
    const key = `freq:${adId}:${userId}`
    const cached = await this.env.ADS_KV.get(key)

    if (cached) {
      const cap: FrequencyCap = JSON.parse(cached)

      // Check if within window
      if (new Date(cap.windowEnd).getTime() > now) {
        // Check if capped (e.g., max 5 impressions per day)
        const maxImpressionsPerDay = 5
        return cap.count >= maxImpressionsPerDay
      }
    }

    // Not capped or window expired
    return false
  }

  /**
   * Increment frequency cap counter
   */
  private async incrementFrequencyCap(adId: string, userId: string): Promise<void> {
    const now = Date.now()
    const windowEnd = now + 24 * 60 * 60 * 1000 // 24 hours from now

    const key = `freq:${adId}:${userId}`
    const cached = await this.env.ADS_KV.get(key)

    let cap: FrequencyCap

    if (cached) {
      cap = JSON.parse(cached)
      cap.count++
    } else {
      cap = {
        userId,
        adId,
        count: 1,
        windowStart: new Date(now).toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
      }
    }

    // Store with TTL of 24 hours
    await this.env.ADS_KV.put(key, JSON.stringify(cap), { expirationTtl: 86400 })
  }

  /**
   * Select ad by quality score * bid
   */
  private selectByQuality(ads: Ad[]): Ad {
    let bestAd: Ad | null = null
    let bestScore = -1

    for (const ad of ads) {
      const score = ad.qualityScore * ad.bid
      if (score > bestScore) {
        bestScore = score
        bestAd = ad
      }
    }

    if (!bestAd) {
      return ads[0]
    }

    return bestAd
  }

  /**
   * Create impression and return result
   */
  private async createImpressionResult(
    ad: Ad,
    context: AdContext,
    experimentAssignment?: { experimentId: string; assignmentId: string; variantId: string }
  ): Promise<AdSelectionResult> {
    const impressionId = crypto.randomUUID()
    const now = new Date().toISOString()

    const impression: AdImpression = {
      id: impressionId,
      adId: ad.id,
      userId: context.userId,
      sessionId: context.sessionId,
      experimentId: experimentAssignment?.experimentId,
      assignmentId: experimentAssignment?.assignmentId,
      context,
      timestamp: now,
    }

    // Store impression
    await this.env.ADS_DB.prepare(
      `INSERT INTO ad_impressions (id, ad_id, user_id, session_id, experiment_id, assignment_id, context, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(impressionId, ad.id, context.userId, context.sessionId, experimentAssignment?.experimentId || null, experimentAssignment?.assignmentId || null, JSON.stringify(context), now)
      .run()

    // Increment frequency cap
    await this.incrementFrequencyCap(ad.id, context.userId)

    // Track in analytics (actual impression recording happens later via recordImpression)
    this.env.ADS_ANALYTICS.writeDataPoint({
      blobs: ['ad_selected', ad.id, experimentAssignment ? 'experiment' : 'quality'],
      doubles: [ad.bid, ad.qualityScore],
      indexes: [ad.id],
    })

    return {
      ad,
      impression,
      experimentAssignment,
    }
  }

  /**
   * Get impression by ID
   */
  private async getImpression(impressionId: string): Promise<AdImpression | null> {
    const result = await this.env.ADS_DB.prepare(`SELECT * FROM ad_impressions WHERE id = ?`).bind(impressionId).first()

    if (!result) {
      return null
    }

    return {
      id: result.id as string,
      adId: result.ad_id as string,
      userId: result.user_id as string,
      sessionId: result.session_id as string,
      experimentId: result.experiment_id as string | undefined,
      assignmentId: result.assignment_id as string | undefined,
      context: JSON.parse(result.context as string),
      timestamp: result.timestamp as string,
      viewability: result.viewability as number | undefined,
      position: result.position as number | undefined,
    }
  }

  /**
   * Get active experiment
   */
  private async getActiveExperiment(): Promise<{ id: string } | null> {
    // Check cache for active experiment
    const cached = await this.env.ADS_KV.get('active_experiment')
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from database
    // For now, return null (no active experiment)
    // In production, this would query the experiment worker or database
    return null
  }

  /**
   * Increment ad metric
   */
  private async incrementAdMetric(adId: string, metric: 'impressions' | 'clicks' | 'conversions' | 'revenue', value: number): Promise<void> {
    await this.env.ADS_DB.prepare(
      `UPDATE ads
       SET metrics = json_set(metrics, '$.${metric}', COALESCE(json_extract(metrics, '$.${metric}'), 0) + ?),
           updated_at = ?
       WHERE id = ?`
    )
      .bind(value, new Date().toISOString(), adId)
      .run()

    // Invalidate cache
    await this.env.ADS_KV.delete(`ad:${adId}`)
  }

  // ========================================
  // External Network Integration
  // ========================================

  /**
   * Submit ad to Google Ad Network
   */
  async submitToGoogleNetwork(userId: string, adId: string, options?: SubmissionOptions): Promise<ExternalAdSubmission> {
    return this.externalNetworks.submitToGoogleNetwork(userId, adId, options)
  }

  /**
   * Submit ad to Bing Ad Network
   */
  async submitToBingNetwork(userId: string, adId: string, options?: SubmissionOptions): Promise<ExternalAdSubmission> {
    return this.externalNetworks.submitToBingNetwork(userId, adId, options)
  }

  /**
   * Get external ad status
   */
  async getExternalAdStatus(adId: string, network: 'google' | 'bing'): Promise<ExternalAdSubmission | null> {
    return this.externalNetworks.getExternalAdStatus(adId, network)
  }

  /**
   * Sync performance from external networks
   */
  async syncExternalPerformance(adId: string): Promise<void> {
    return this.externalNetworks.syncExternalPerformance(adId)
  }

  /**
   * Evaluate ad for promotion eligibility
   */
  async evaluateForPromotion(adId: string): Promise<PromotionEligibility> {
    return this.externalNetworks.evaluateForPromotion(adId)
  }

  /**
   * Automatically promote best-performing ads
   */
  async promoteBestPerformers(userId: string, limit?: number): Promise<ExternalAdSubmission[]> {
    return this.externalNetworks.promoteBestPerformers(userId, limit)
  }

  // ========================================
  // Unified Performance Dashboard
  // ========================================

  /**
   * Get dashboard summary (house ads + Google + Bing)
   */
  async getDashboardSummary(dateRange?: { from: string; to: string }): Promise<DashboardSummary> {
    return this.dashboard.getDashboardSummary(dateRange)
  }

  /**
   * Get channel comparison
   */
  async getChannelComparison(dateRange?: { from: string; to: string }): Promise<ChannelComparison> {
    return this.dashboard.getChannelComparison(dateRange)
  }

  /**
   * Get time series data
   */
  async getTimeSeriesData(dateRange: { from: string; to: string }, granularity?: 'day' | 'week' | 'month'): Promise<TimeSeriesData> {
    return this.dashboard.getTimeSeriesData(dateRange, granularity)
  }

  /**
   * Get performance breakdown
   */
  async getPerformanceBreakdown(dateRange?: { from: string; to: string }): Promise<PerformanceBreakdown> {
    return this.dashboard.getPerformanceBreakdown(dateRange)
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'ads', timestamp: new Date().toISOString() })
})

// Select ad
app.post('/select', async (c) => {
  const service = new AdsService({} as any, c.env)
  const context = await c.req.json()
  const result = await service.selectAd(context)
  return c.json({ success: true, data: result })
})

// Record impression
app.post('/impressions/:id/record', async (c) => {
  const service = new AdsService({} as any, c.env)
  const body = await c.req.json()
  await service.recordImpression(c.req.param('id'), body.viewability)
  return c.json({ success: true })
})

// Record click
app.post('/impressions/:id/click', async (c) => {
  const service = new AdsService({} as any, c.env)
  const click = await service.recordClick(c.req.param('id'))
  return c.json({ success: true, data: click })
})

// Record conversion
app.post('/impressions/:id/conversion', async (c) => {
  const service = new AdsService({} as any, c.env)
  const body = await c.req.json()
  const conversion = await service.recordConversion(c.req.param('id'), body.value, body.clickId)
  return c.json({ success: true, data: conversion })
})

// Get ad performance
app.get('/ads/:id/performance', async (c) => {
  const service = new AdsService({} as any, c.env)
  const ad = await service.getAdPerformance(c.req.param('id'))
  return c.json({ success: true, data: ad })
})

// External network endpoints
app.post('/ads/:id/external/google', async (c) => {
  const service = new AdsService({} as any, c.env)
  const body = await c.req.json()
  const result = await service.submitToGoogleNetwork(body.userId, c.req.param('id'), body.options)
  return c.json({ success: true, data: result })
})

app.post('/ads/:id/external/bing', async (c) => {
  const service = new AdsService({} as any, c.env)
  const body = await c.req.json()
  const result = await service.submitToBingNetwork(body.userId, c.req.param('id'), body.options)
  return c.json({ success: true, data: result })
})

app.get('/ads/:id/external/:network/status', async (c) => {
  const service = new AdsService({} as any, c.env)
  const result = await service.getExternalAdStatus(c.req.param('id'), c.req.param('network') as 'google' | 'bing')
  return c.json({ success: true, data: result })
})

app.post('/ads/:id/external/sync', async (c) => {
  const service = new AdsService({} as any, c.env)
  await service.syncExternalPerformance(c.req.param('id'))
  return c.json({ success: true })
})

app.get('/ads/:id/external/eligibility', async (c) => {
  const service = new AdsService({} as any, c.env)
  const result = await service.evaluateForPromotion(c.req.param('id'))
  return c.json({ success: true, data: result })
})

app.post('/ads/external/promote', async (c) => {
  const service = new AdsService({} as any, c.env)
  const body = await c.req.json()
  const result = await service.promoteBestPerformers(body.userId, body.limit)
  return c.json({ success: true, data: result })
})

// Dashboard endpoints
app.get('/dashboard/summary', async (c) => {
  const service = new AdsService({} as any, c.env)
  const from = c.req.query('from')
  const to = c.req.query('to')
  const result = await service.getDashboardSummary(from && to ? { from, to } : undefined)
  return c.json({ success: true, data: result })
})

app.get('/dashboard/comparison', async (c) => {
  const service = new AdsService({} as any, c.env)
  const from = c.req.query('from')
  const to = c.req.query('to')
  const result = await service.getChannelComparison(from && to ? { from, to } : undefined)
  return c.json({ success: true, data: result })
})

app.get('/dashboard/timeseries', async (c) => {
  const service = new AdsService({} as any, c.env)
  const from = c.req.query('from')
  const to = c.req.query('to')
  const granularity = c.req.query('granularity') as 'day' | 'week' | 'month' | undefined

  if (!from || !to) {
    return c.json({ success: false, error: 'from and to query parameters are required' }, 400)
  }

  const result = await service.getTimeSeriesData({ from, to }, granularity)
  return c.json({ success: true, data: result })
})

app.get('/dashboard/breakdown', async (c) => {
  const service = new AdsService({} as any, c.env)
  const from = c.req.query('from')
  const to = c.req.query('to')
  const result = await service.getPerformanceBreakdown(from && to ? { from, to } : undefined)
  return c.json({ success: true, data: result })
})

export default {
  fetch: app.fetch,
}
