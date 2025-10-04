/**
 * Ads Campaign Manager Worker
 * Multi-platform campaign creation, management, and optimization
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  CampaignStatus,
  BidStrategy,
  RecommendationType,
  type AdPlatform,
  type Campaign,
  type CampaignConfig,
  type BidOptimization,
  type CampaignBudget,
  type DateRange,
  type Metrics,
  type CampaignRecommendation,
} from '@dot-do/ads-types'

/**
 * Environment bindings
 */
export interface Env {
  // KV namespace for caching
  CAMPAIGNS_KV: KVNamespace

  // D1 database for campaign storage
  DB: D1Database

  // Queue for async operations
  CAMPAIGN_QUEUE: Queue

  // Analytics Engine for event tracking
  ANALYTICS: AnalyticsEngineDataset

  // Service bindings
  ADS_AUDIENCES?: any
  ADS_CREATIVES?: any
  ADS_ANALYTICS?: any
}

/**
 * Creative rotation strategy (local type)
 */
interface CreativeRotation {
  strategy: 'even' | 'optimize' | 'weighted'
  weights?: number[]
}

/**
 * Campaign Manager RPC Service
 */
export class AdsCampaignService extends WorkerEntrypoint<Env> {
  /**
   * Create a new campaign
   */
  async createCampaign(platform: AdPlatform, config: CampaignConfig): Promise<Campaign> {
    const campaignId = crypto.randomUUID()
    const now = new Date().toISOString()

    const campaign: Campaign = {
      id: campaignId,
      config: {
        ...config,
        platform,
      },
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO campaigns (id, platform, name, status, objective, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(campaignId, platform, config.name, config.status, config.objective, JSON.stringify(campaign), now, now)
      .run()

    // Cache in KV (1 hour TTL)
    await this.env.CAMPAIGNS_KV.put(`campaign:${campaignId}`, JSON.stringify(campaign), { expirationTtl: 3600 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['campaign_created', platform, config.objective],
      doubles: [config.budget?.amount || 0],
      indexes: [campaignId],
    })

    // Queue for platform sync
    await this.env.CAMPAIGN_QUEUE.send({
      type: 'sync_campaign',
      campaignId,
      platform,
      action: 'create',
    })

    return campaign
  }

  /**
   * Update existing campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<CampaignConfig>): Promise<Campaign> {
    // Get current campaign
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Apply updates to config
    const updatedCampaign: Campaign = {
      ...campaign,
      config: {
        ...campaign.config,
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }

    // Update D1
    await this.env.DB.prepare(`UPDATE campaigns SET config = ?, updated_at = ? WHERE id = ?`)
      .bind(JSON.stringify(updatedCampaign), updatedCampaign.updatedAt, campaignId)
      .run()

    // Update cache
    await this.env.CAMPAIGNS_KV.put(`campaign:${campaignId}`, JSON.stringify(updatedCampaign), { expirationTtl: 3600 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['campaign_updated', campaign.config.platform],
      indexes: [campaignId],
    })

    // Queue for platform sync
    await this.env.CAMPAIGN_QUEUE.send({
      type: 'sync_campaign',
      campaignId,
      platform: campaign.config.platform,
      action: 'update',
    })

    return updatedCampaign
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: CampaignStatus.Paused })
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Delete from D1
    await this.env.DB.prepare(`DELETE FROM campaigns WHERE id = ?`).bind(campaignId).run()

    // Delete from cache
    await this.env.CAMPAIGNS_KV.delete(`campaign:${campaignId}`)

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['campaign_deleted', campaign.config.platform],
      indexes: [campaignId],
    })

    // Queue for platform sync
    await this.env.CAMPAIGN_QUEUE.send({
      type: 'sync_campaign',
      campaignId,
      platform: campaign.config.platform,
      action: 'delete',
    })
  }

  /**
   * Optimize campaign bids
   */
  async optimizeBids(campaignId: string, strategy: BidStrategy): Promise<BidOptimization> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Get recent metrics
    const metrics = await this.getCampaignMetrics(campaignId, {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    })

    // Calculate optimal bid based on strategy
    const currentBid = campaign.config.targetCPA || campaign.config.targetROAS || campaign.config.bidAmount || 0
    let newBid = currentBid

    switch (strategy) {
      case BidStrategy.TargetCPA:
        // Optimize for target CPA
        if (metrics.cpa > (campaign.config.targetCPA || 0)) {
          newBid = currentBid * 0.9 // Reduce bid by 10%
        } else {
          newBid = currentBid * 1.1 // Increase bid by 10%
        }
        break

      case BidStrategy.TargetROAS:
        // Optimize for target ROAS
        if (metrics.roas < (campaign.config.targetROAS || 0)) {
          newBid = currentBid * 0.9
        } else {
          newBid = currentBid * 1.1
        }
        break

      case BidStrategy.MaximizeClicks:
        // Increase bid if CTR is good
        if (metrics.ctr > 0.02) {
          newBid = currentBid * 1.15
        }
        break

      default:
        // Keep current bid
        break
    }

    const optimization: BidOptimization = {
      campaignId,
      strategy,
      previousBid: currentBid,
      newBid,
      reason: `Based on recent performance metrics (ROAS: ${metrics.roas}, CPA: ${metrics.cpa}, CTR: ${metrics.ctr})`,
      expectedImpact: {
        clicks: Math.round((newBid - currentBid) / currentBid * 100),
        conversions: Math.round((newBid - currentBid) / currentBid * 50),
        spend: newBid - currentBid,
      },
      appliedAt: new Date().toISOString(),
    }

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['bid_optimization', campaign.config.platform, strategy],
      doubles: [currentBid, newBid],
      indexes: [campaignId],
    })

    return optimization
  }

  /**
   * Adjust campaign budget
   */
  async adjustBudget(campaignId: string, budget: CampaignBudget): Promise<void> {
    await this.updateCampaign(campaignId, { budget })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['budget_adjusted'],
      doubles: [budget.amount],
      indexes: [campaignId],
    })
  }

  /**
   * Rotate campaign creatives
   */
  async rotateCreatives(campaignId: string, rotation: CreativeRotation): Promise<void> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Update creative rotation settings in metadata
    await this.updateCampaign(campaignId, {
      metadata: {
        ...campaign.config.metadata,
        creativeRotation: rotation,
      },
    })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['creative_rotation', rotation.strategy],
      indexes: [campaignId],
    })
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string, dateRange: DateRange): Promise<Metrics> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    // Check cache first
    const cacheKey = `metrics:${campaignId}:${dateRange.from}:${dateRange.to}`
    const cached = await this.env.CAMPAIGNS_KV.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from analytics service if available
    if (this.env.ADS_ANALYTICS) {
      const metrics = await this.env.ADS_ANALYTICS.getMetrics(campaignId, dateRange)
      // Cache for 10 minutes
      await this.env.CAMPAIGNS_KV.put(cacheKey, JSON.stringify(metrics), { expirationTtl: 600 })
      return metrics
    }

    // Return mock metrics if analytics service not available
    const mockMetrics: Metrics = {
      impressions: 10000,
      clicks: 500,
      views: 300,
      conversions: 25,
      purchases: 20,
      spend: 500,
      revenue: 2000,
      profit: 1500,
      ctr: 0.05,
      cpc: 1.0,
      cpm: 50,
      cpv: 1.67,
      cpa: 20,
      roas: 4.0,
      roi: 3.0,
      conversionRate: 0.05,
    }

    return mockMetrics
  }

  /**
   * Get campaign recommendations
   */
  async getCampaignRecommendations(campaignId: string): Promise<CampaignRecommendation[]> {
    const campaign = await this.getCampaign(campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    const metrics = await this.getCampaignMetrics(campaignId, {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    })

    const recommendations: CampaignRecommendation[] = []

    // Check if ROAS is below target
    if (campaign.config.targetROAS && metrics.roas < campaign.config.targetROAS) {
      recommendations.push({
        type: RecommendationType.AdjustBidStrategy,
        title: 'Reduce bids to improve ROAS',
        description: `Current ROAS ${metrics.roas} is below target ${campaign.config.targetROAS}. Consider reducing bids by 10-15%.`,
        impact: 'high',
        effort: 'low',
        estimatedChange: {
          metric: 'roas',
          currentValue: metrics.roas,
          projectedValue: metrics.roas * 1.2,
          changePercent: 20,
        },
      })
    }

    // Check if CPA is above target
    if (campaign.config.targetCPA && metrics.cpa > campaign.config.targetCPA) {
      recommendations.push({
        type: RecommendationType.AdjustBidStrategy,
        title: 'Reduce bids to lower CPA',
        description: `Current CPA $${metrics.cpa} is above target $${campaign.config.targetCPA}. Consider reducing bids.`,
        impact: 'high',
        effort: 'low',
        estimatedChange: {
          metric: 'cpa',
          currentValue: metrics.cpa,
          projectedValue: campaign.config.targetCPA,
          changePercent: -((metrics.cpa - campaign.config.targetCPA) / metrics.cpa) * 100,
        },
      })
    }

    // Check if CTR is low
    if (metrics.ctr < 0.01) {
      recommendations.push({
        type: RecommendationType.TestNewCreative,
        title: 'Low CTR - Refresh creatives',
        description: 'CTR is below 1%. Consider testing new ad copy and creatives.',
        impact: 'medium',
        effort: 'medium',
        estimatedChange: {
          metric: 'ctr',
          currentValue: metrics.ctr,
          projectedValue: 0.02,
          changePercent: 100,
        },
      })
    }

    // Check budget pacing
    const dailySpend = metrics.spend / 7 // Average daily spend over last 7 days
    const dailyBudget = campaign.config.budget?.amount || 0
    if (dailySpend > dailyBudget * 1.2) {
      recommendations.push({
        type: RecommendationType.DecreaseBudget,
        title: 'Budget overspend detected',
        description: `Daily spend $${dailySpend.toFixed(2)} exceeds budget $${dailyBudget.toFixed(2)} by 20%. Consider reducing bids or pausing campaign.`,
        impact: 'high',
        effort: 'low',
        estimatedChange: {
          metric: 'spend',
          currentValue: dailySpend,
          projectedValue: dailyBudget,
          changePercent: -20,
        },
      })
    }

    return recommendations
  }

  /**
   * Bulk create campaigns
   */
  async bulkCreateCampaigns(campaigns: CampaignConfig[]): Promise<Campaign[]> {
    const results: Campaign[] = []

    for (const config of campaigns) {
      try {
        const campaign = await this.createCampaign(config.platform, config)
        results.push(campaign)
      } catch (error) {
        console.error(`Failed to create campaign ${config.name}:`, error)
      }
    }

    return results
  }

  /**
   * Bulk pause campaigns
   */
  async bulkPauseCampaigns(campaignIds: string[]): Promise<void> {
    for (const campaignId of campaignIds) {
      try {
        await this.pauseCampaign(campaignId)
      } catch (error) {
        console.error(`Failed to pause campaign ${campaignId}:`, error)
      }
    }
  }

  /**
   * Get campaign by ID (helper method)
   */
  private async getCampaign(campaignId: string): Promise<Campaign | null> {
    // Check cache first
    const cached = await this.env.CAMPAIGNS_KV.get(`campaign:${campaignId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.DB.prepare(`SELECT * FROM campaigns WHERE id = ?`).bind(campaignId).first()

    if (!result) {
      return null
    }

    const campaign = JSON.parse(result.config as string) as Campaign

    // Cache for 1 hour
    await this.env.CAMPAIGNS_KV.put(`campaign:${campaignId}`, JSON.stringify(campaign), { expirationTtl: 3600 })

    return campaign
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('/*', cors())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'ads-campaigns', timestamp: new Date().toISOString() })
})

// Create campaign
app.post('/campaigns', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const body = await c.req.json()
  const campaign = await service.createCampaign(body.platform, body.config)
  return c.json({ success: true, data: campaign })
})

// Get campaign
app.get('/campaigns/:id', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const campaign = await service['getCampaign'](c.req.param('id'))
  if (!campaign) {
    return c.json({ success: false, error: 'Campaign not found' }, 404)
  }
  return c.json({ success: true, data: campaign })
})

// Update campaign
app.put('/campaigns/:id', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const body = await c.req.json()
  const campaign = await service.updateCampaign(c.req.param('id'), body)
  return c.json({ success: true, data: campaign })
})

// Delete campaign
app.delete('/campaigns/:id', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  await service.deleteCampaign(c.req.param('id'))
  return c.json({ success: true })
})

// Pause campaign
app.post('/campaigns/:id/pause', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  await service.pauseCampaign(c.req.param('id'))
  return c.json({ success: true })
})

// Optimize campaign
app.post('/campaigns/:id/optimize', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const body = await c.req.json()
  const optimization = await service.optimizeBids(c.req.param('id'), body.strategy)
  return c.json({ success: true, data: optimization })
})

// Get campaign metrics
app.get('/campaigns/:id/metrics', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const dateRange = {
    from: c.req.query('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: c.req.query('to') || new Date().toISOString(),
  }
  const metrics = await service.getCampaignMetrics(c.req.param('id'), dateRange)
  return c.json({ success: true, data: metrics })
})

// Get campaign recommendations
app.get('/campaigns/:id/recommendations', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const recommendations = await service.getCampaignRecommendations(c.req.param('id'))
  return c.json({ success: true, data: recommendations })
})

// Bulk create campaigns
app.post('/campaigns/bulk', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const body = await c.req.json()
  const campaigns = await service.bulkCreateCampaigns(body.campaigns)
  return c.json({ success: true, data: campaigns })
})

// Bulk pause campaigns
app.post('/campaigns/bulk/pause', async (c) => {
  const service = new AdsCampaignService({} as any, c.env)
  const body = await c.req.json()
  await service.bulkPauseCampaigns(body.campaignIds)
  return c.json({ success: true })
})

// Export worker
export default {
  fetch: app.fetch,
}
