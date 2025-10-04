/**
 * Ads Analytics & Attribution Worker
 * Performance tracking, attribution modeling, and reporting
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  AdEventType,
  AttributionModel,
  AdPlatform,
  type AdEvent,
  type Conversion,
  type Metrics,
  type AggregatedMetrics,
  type CrossPlatformMetrics,
  type AttributionReport,
  type AttributionWindow,
  type ConversionPath,
  type ModelComparison,
  type DateRange,
  type ReportConfig,
  type Report,
  type ScheduledReport,
  type Schedule,
  type AlertConfig,
  type TriggeredAlert,
  type CustomMetric,
  type ROASMetrics,
  type ChannelPerformance,
} from '@dot-do/ads-types'

/**
 * Environment bindings
 */
export interface Env {
  // KV namespace for caching
  ANALYTICS_KV: KVNamespace

  // D1 database for analytics storage
  DB: D1Database

  // Analytics Engine for event tracking
  ANALYTICS: AnalyticsEngineDataset

  // Queue for async processing
  ANALYTICS_QUEUE: Queue

  // Service bindings
  ADS_CAMPAIGNS?: any
  ADS_AUDIENCES?: any
}

/**
 * Analytics & Attribution RPC Service
 */
export class AdsAnalyticsService extends WorkerEntrypoint<Env> {
  /**
   * Track event
   */
  async trackEvent(event: AdEvent): Promise<void> {
    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO ad_events (id, type, campaign_id, ad_id, audience_id, user_id, session_id, timestamp, platform, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(event.id, event.type, event.campaignId, event.adId, event.audienceId, event.userId, event.sessionId, event.timestamp, event.platform, JSON.stringify(event.metadata || {}))
      .run()

    // Track in Analytics Engine
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['event_tracked', event.type, event.platform],
      doubles: [1],
      indexes: [event.campaignId],
    })

    // Queue for real-time processing
    await this.env.ANALYTICS_QUEUE.send({
      type: 'process_event',
      event,
    })
  }

  /**
   * Track conversion with attribution
   */
  async trackConversion(conversion: Conversion): Promise<void> {
    // Store conversion
    await this.env.DB.prepare(
      `INSERT INTO conversions (id, campaign_id, user_id, session_id, value, currency, conversion_type, attributed_touchpoints, timestamp, platform)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        conversion.id,
        conversion.campaignId,
        conversion.userId,
        conversion.sessionId,
        conversion.value,
        conversion.currency,
        conversion.conversionType,
        JSON.stringify(conversion.attributedTouchpoints),
        conversion.timestamp,
        conversion.platform
      )
      .run()

    // Track in Analytics Engine
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['conversion_tracked', conversion.platform],
      doubles: [conversion.value],
      indexes: [conversion.campaignId],
    })
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string, dateRange: DateRange): Promise<Metrics> {
    // Check cache first
    const cacheKey = `metrics:campaign:${campaignId}:${dateRange.from}:${dateRange.to}`
    const cached = await this.env.ANALYTICS_KV.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.DB.prepare(
      `SELECT
        COUNT(CASE WHEN type = ? THEN 1 END) as impressions,
        COUNT(CASE WHEN type = ? THEN 1 END) as clicks,
        COUNT(CASE WHEN type = ? THEN 1 END) as views
       FROM ad_events
       WHERE campaign_id = ? AND timestamp BETWEEN ? AND ?`
    )
      .bind(AdEventType.Impression, AdEventType.Click, AdEventType.View, campaignId, dateRange.from, dateRange.to)
      .first()

    // Fetch conversions
    const conversionResult = await this.env.DB.prepare(
      `SELECT
        COUNT(*) as conversions,
        SUM(value) as revenue
       FROM conversions
       WHERE campaign_id = ? AND timestamp BETWEEN ? AND ?`
    )
      .bind(campaignId, dateRange.from, dateRange.to)
      .first()

    const impressions = (result?.impressions as number) || 0
    const clicks = (result?.clicks as number) || 0
    const views = (result?.views as number) || 0
    const conversions = (conversionResult?.conversions as number) || 0
    const revenue = (conversionResult?.revenue as number) || 0

    // Mock spend data (in production, would fetch from campaign service)
    const spend = Math.random() * 10000 + 5000

    // Calculate metrics
    const metrics: Metrics = {
      impressions,
      clicks,
      views,
      conversions,
      purchases: conversions, // Simplified
      spend,
      revenue,
      profit: revenue - spend,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpv: views > 0 ? spend / views : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      roas: spend > 0 ? revenue / spend : 0,
      roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    }

    // Cache for 1 hour
    await this.env.ANALYTICS_KV.put(cacheKey, JSON.stringify(metrics), { expirationTtl: 3600 })

    return metrics
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(filters: { platform?: AdPlatform; dateRange: DateRange }, groupBy: string): Promise<AggregatedMetrics> {
    // Simplified implementation - in production would aggregate from database
    const groups: Array<{ key: string; metrics: Metrics }> = []

    if (groupBy === 'date') {
      // Mock daily metrics
      const start = new Date(filters.dateRange.from)
      const end = new Date(filters.dateRange.to)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        groups.push({
          key: dateKey,
          metrics: this.generateMockMetrics(),
        })
      }
    } else if (groupBy === 'platform') {
      // Mock platform metrics
      const platforms: AdPlatform[] = [AdPlatform.GoogleAds, AdPlatform.MetaAds, AdPlatform.LinkedInAds]
      platforms.forEach((platform) => {
        groups.push({
          key: platform,
          metrics: this.generateMockMetrics(),
        })
      })
    }

    // Calculate totals
    const totals: Metrics = groups.reduce(
      (acc, group) => ({
        impressions: acc.impressions + group.metrics.impressions,
        clicks: acc.clicks + group.metrics.clicks,
        views: acc.views + group.metrics.views,
        conversions: acc.conversions + group.metrics.conversions,
        purchases: acc.purchases + group.metrics.purchases,
        spend: acc.spend + group.metrics.spend,
        revenue: acc.revenue + group.metrics.revenue,
        profit: acc.profit + group.metrics.profit,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpv: 0,
        cpa: 0,
        roas: 0,
        roi: 0,
        conversionRate: 0,
      }),
      {
        impressions: 0,
        clicks: 0,
        views: 0,
        conversions: 0,
        purchases: 0,
        spend: 0,
        revenue: 0,
        profit: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpv: 0,
        cpa: 0,
        roas: 0,
        roi: 0,
        conversionRate: 0,
      }
    )

    // Recalculate aggregate metrics
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
    totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0
    totals.cpv = totals.views > 0 ? totals.spend / totals.views : 0
    totals.cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0
    totals.roas = totals.spend > 0 ? totals.revenue / totals.spend : 0
    totals.roi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0

    return {
      groupBy,
      groups,
      totals,
      dateRange: filters.dateRange,
    }
  }

  /**
   * Get cross-platform metrics
   */
  async getCrossPlatformMetrics(dateRange: DateRange): Promise<CrossPlatformMetrics> {
    const platforms: AdPlatform[] = [AdPlatform.GoogleAds, AdPlatform.MetaAds, AdPlatform.LinkedInAds, AdPlatform.MicrosoftAds, AdPlatform.TikTokAds, AdPlatform.TwitterAds]

    const platformMetrics: Record<AdPlatform, Metrics> = {} as any

    for (const platform of platforms) {
      platformMetrics[platform] = this.generateMockMetrics()
    }

    // Calculate total
    const total = Object.values(platformMetrics).reduce(
      (acc, metrics) => ({
        impressions: acc.impressions + metrics.impressions,
        clicks: acc.clicks + metrics.clicks,
        views: acc.views + metrics.views,
        conversions: acc.conversions + metrics.conversions,
        purchases: acc.purchases + metrics.purchases,
        spend: acc.spend + metrics.spend,
        revenue: acc.revenue + metrics.revenue,
        profit: acc.profit + metrics.profit,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpv: 0,
        cpa: 0,
        roas: 0,
        roi: 0,
        conversionRate: 0,
      }),
      {
        impressions: 0,
        clicks: 0,
        views: 0,
        conversions: 0,
        purchases: 0,
        spend: 0,
        revenue: 0,
        profit: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpv: 0,
        cpa: 0,
        roas: 0,
        roi: 0,
        conversionRate: 0,
      }
    )

    // Recalculate metrics
    total.ctr = total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0
    total.cpc = total.clicks > 0 ? total.spend / total.clicks : 0
    total.roas = total.spend > 0 ? total.revenue / total.spend : 0
    total.roi = total.spend > 0 ? ((total.revenue - total.spend) / total.spend) * 100 : 0
    total.conversionRate = total.clicks > 0 ? (total.conversions / total.clicks) * 100 : 0

    return {
      platforms: platformMetrics,
      total,
      breakdown: {
        byCampaign: {},
        byObjective: {},
        byDevice: {},
      },
    }
  }

  /**
   * Generate attribution report
   */
  async getAttributionReport(model: AttributionModel, window: AttributionWindow, dateRange: DateRange): Promise<AttributionReport> {
    // Fetch conversions
    const conversions = await this.env.DB.prepare(`SELECT * FROM conversions WHERE timestamp BETWEEN ? AND ? LIMIT 100`)
      .bind(dateRange.from, dateRange.to)
      .all()

    const conversionData = conversions.results || []

    // Apply attribution model
    const attributions: Array<{
      campaignId: string
      campaignName: string
      platform: AdPlatform
      conversions: number
      revenue: number
      credit: number
    }> = []

    // Group by campaign
    const campaignMap = new Map<string, { conversions: number; revenue: number; credit: number }>()

    conversionData.forEach((conv: any) => {
      const touchpoints = JSON.parse(conv.attributed_touchpoints || '[]')

      touchpoints.forEach((tp: any, index: number) => {
        let credit = 0

        switch (model) {
          case AttributionModel.LastClick:
            credit = index === touchpoints.length - 1 ? 1 : 0
            break
          case AttributionModel.FirstClick:
            credit = index === 0 ? 1 : 0
            break
          case AttributionModel.Linear:
            credit = 1 / touchpoints.length
            break
          case AttributionModel.TimeDecay:
            // More recent touchpoints get more credit
            credit = Math.pow(2, index) / touchpoints.reduce((_: number, __: any, i: number) => _ + Math.pow(2, i), 0)
            break
          case AttributionModel.PositionBased:
            // 40% first, 40% last, 20% distributed
            if (index === 0) credit = 0.4
            else if (index === touchpoints.length - 1) credit = 0.4
            else credit = 0.2 / (touchpoints.length - 2)
            break
          default:
            credit = 1 / touchpoints.length
        }

        const existing = campaignMap.get(tp.campaignId) || { conversions: 0, revenue: 0, credit: 0 }
        campaignMap.set(tp.campaignId, {
          conversions: existing.conversions + 1,
          revenue: existing.revenue + conv.value * credit,
          credit: existing.credit + credit,
        })
      })
    })

    campaignMap.forEach((data, campaignId) => {
      attributions.push({
        campaignId,
        campaignName: `Campaign ${campaignId}`,
        platform: AdPlatform.GoogleAds,
        conversions: data.conversions,
        revenue: data.revenue,
        credit: data.credit,
      })
    })

    // Generate mock paths
    const paths: ConversionPath[] = conversionData.slice(0, 10).map((conv: any) => ({
      touchpoints: JSON.parse(conv.attributed_touchpoints || '[]'),
      conversionValue: conv.value,
      conversionTime: conv.timestamp,
      pathLength: JSON.parse(conv.attributed_touchpoints || '[]').length,
      timeToConversion: Math.random() * 30, // Mock days
    }))

    const totalConversions = conversionData.length
    const totalRevenue = conversionData.reduce((sum: number, conv: any) => sum + (conv.value || 0), 0)

    return {
      model,
      window,
      conversions: totalConversions,
      revenue: totalRevenue,
      attributions,
      path: paths,
    }
  }

  /**
   * Compare attribution models
   */
  async compareAttributionModels(window: AttributionWindow, dateRange: DateRange): Promise<ModelComparison> {
    const models = [AttributionModel.LastClick, AttributionModel.FirstClick, AttributionModel.Linear, AttributionModel.TimeDecay, AttributionModel.PositionBased]

    const modelResults = await Promise.all(
      models.map(async (model) => {
        const report = await this.getAttributionReport(model, window, dateRange)
        return {
          model,
          conversions: report.conversions,
          revenue: report.revenue,
          difference: 0, // Will calculate below
        }
      })
    )

    // Use first model as baseline
    const baseline = modelResults[0]
    modelResults.forEach((result) => {
      result.difference = ((result.revenue - baseline.revenue) / baseline.revenue) * 100
    })

    return {
      models: modelResults,
      recommendations: [
        'Linear attribution provides balanced view across touchpoints',
        'Time-decay gives more weight to recent interactions',
        'Position-based emphasizes first and last touch',
      ],
    }
  }

  /**
   * Get ROAS metrics
   */
  async getROASMetrics(campaignId: string, dateRange: DateRange): Promise<ROASMetrics> {
    const metrics = await this.getCampaignMetrics(campaignId, dateRange)

    return {
      revenue: metrics.revenue,
      adSpend: metrics.spend,
      roas: metrics.roas,
      targetROAS: 3.0,
      roasEfficiency: metrics.roas / 3.0,
      dateRange,
    }
  }

  /**
   * Get channel performance
   */
  async getChannelPerformance(platform: AdPlatform, dateRange: DateRange): Promise<ChannelPerformance> {
    const metrics = this.generateMockMetrics()

    return {
      channel: platform,
      metrics,
      trends: {
        impressions: { current: metrics.impressions, previous: metrics.impressions * 0.9, change: metrics.impressions * 0.1, changePercent: 11.1, direction: 'up' },
        clicks: { current: metrics.clicks, previous: metrics.clicks * 0.95, change: metrics.clicks * 0.05, changePercent: 5.3, direction: 'up' },
        conversions: { current: metrics.conversions, previous: metrics.conversions * 1.1, change: -metrics.conversions * 0.1, changePercent: -9.1, direction: 'down' },
        spend: { current: metrics.spend, previous: metrics.spend * 0.98, change: metrics.spend * 0.02, changePercent: 2.0, direction: 'up' },
        roas: { current: metrics.roas, previous: metrics.roas * 0.92, change: metrics.roas * 0.08, changePercent: 8.7, direction: 'up' },
      },
      share: {
        impressions: 25,
        clicks: 30,
        conversions: 28,
        spend: 26,
      },
    }
  }

  /**
   * Generate report
   */
  async generateReport(config: ReportConfig): Promise<Report> {
    const reportId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Generate mock data based on config
    const data: any[] = []
    const summary = this.generateMockMetrics()

    // Store report
    await this.env.DB.prepare(`INSERT INTO reports (id, config, data, summary, generated_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(reportId, JSON.stringify(config), JSON.stringify(data), JSON.stringify(summary), now)
      .run()

    return {
      id: reportId,
      config,
      data,
      summary,
      generatedAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(config: ReportConfig, schedule: Schedule, recipients: string[]): Promise<ScheduledReport> {
    const reportId = crypto.randomUUID()
    const now = new Date().toISOString()
    const nextRun = this.calculateNextRun(schedule)

    const scheduledReport: ScheduledReport = {
      id: reportId,
      config,
      schedule,
      recipients,
      nextRunAt: nextRun,
      createdAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(`INSERT INTO scheduled_reports (id, config, schedule, recipients, next_run_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(reportId, JSON.stringify(config), JSON.stringify(schedule), JSON.stringify(recipients), nextRun, now)
      .run()

    return scheduledReport
  }

  /**
   * Create alert
   */
  async createAlert(config: AlertConfig): Promise<string> {
    const alertId = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.env.DB.prepare(`INSERT INTO alerts (id, config, created_at) VALUES (?, ?, ?)`).bind(alertId, JSON.stringify(config), now).run()

    return alertId
  }

  /**
   * Create custom metric
   */
  async createCustomMetric(name: string, description: string, formula: string, unit?: string, format?: string): Promise<CustomMetric> {
    const metricId = crypto.randomUUID()
    const now = new Date().toISOString()

    const metric: CustomMetric = {
      id: metricId,
      name,
      description,
      formula,
      unit,
      format: format as any,
      createdAt: now,
    }

    await this.env.DB.prepare(`INSERT INTO custom_metrics (id, name, description, formula, unit, format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(metricId, name, description, formula, unit, format, now)
      .run()

    return metric
  }

  /**
   * Helper: Generate mock metrics
   */
  private generateMockMetrics(): Metrics {
    const impressions = Math.floor(Math.random() * 500000) + 100000
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01))
    const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02))
    const spend = Math.random() * 50000 + 10000
    const revenue = spend * (Math.random() * 3 + 1)

    return {
      impressions,
      clicks,
      views: Math.floor(clicks * 0.8),
      conversions,
      purchases: conversions,
      spend,
      revenue,
      profit: revenue - spend,
      ctr: (clicks / impressions) * 100,
      cpc: spend / clicks,
      cpm: (spend / impressions) * 1000,
      cpv: spend / (clicks * 0.8),
      cpa: spend / conversions,
      roas: revenue / spend,
      roi: ((revenue - spend) / spend) * 100,
      conversionRate: (conversions / clicks) * 100,
    }
  }

  /**
   * Helper: Calculate next run time
   */
  private calculateNextRun(schedule: Schedule): string {
    const now = new Date()

    switch (schedule.frequency) {
      case 'hourly':
        now.setHours(now.getHours() + 1)
        break
      case 'daily':
        now.setDate(now.getDate() + 1)
        if (schedule.hour !== undefined) now.setHours(schedule.hour, schedule.minute || 0, 0, 0)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        break
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
    }

    return now.toISOString()
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
  return c.json({ status: 'healthy', service: 'ads-analytics', timestamp: new Date().toISOString() })
})

// Events
app.post('/events', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const event = await c.req.json()
  await service.trackEvent(event)
  return c.json({ success: true })
})

app.post('/conversions', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const conversion = await c.req.json()
  await service.trackConversion(conversion)
  return c.json({ success: true })
})

// Metrics
app.get('/campaigns/:id/metrics', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const metrics = await service.getCampaignMetrics(c.req.param('id'), {
    from: query.from || '',
    to: query.to || '',
  })
  return c.json({ success: true, data: metrics })
})

app.get('/metrics/aggregated', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const metrics = await service.getAggregatedMetrics(
    {
      platform: query.platform as AdPlatform,
      dateRange: {
        from: query.from || '',
        to: query.to || '',
      },
    },
    query.groupBy || 'date'
  )
  return c.json({ success: true, data: metrics })
})

app.get('/metrics/cross-platform', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const metrics = await service.getCrossPlatformMetrics({
    from: query.from || '',
    to: query.to || '',
  })
  return c.json({ success: true, data: metrics })
})

// Attribution
app.get('/attribution/report', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const report = await service.getAttributionReport(
    (query.model as AttributionModel) || AttributionModel.Linear,
    {
      clickWindow: parseInt(query.clickWindow || '30'),
      viewWindow: parseInt(query.viewWindow || '7'),
    },
    {
      from: query.from || '',
      to: query.to || '',
    }
  )
  return c.json({ success: true, data: report })
})

app.get('/attribution/compare', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const comparison = await service.compareAttributionModels(
    {
      clickWindow: parseInt(query.clickWindow || '30'),
      viewWindow: parseInt(query.viewWindow || '7'),
    },
    {
      from: query.from || '',
      to: query.to || '',
    }
  )
  return c.json({ success: true, data: comparison })
})

// ROAS
app.get('/campaigns/:id/roas', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const roas = await service.getROASMetrics(c.req.param('id'), {
    from: query.from || '',
    to: query.to || '',
  })
  return c.json({ success: true, data: roas })
})

// Channel Performance
app.get('/channels/:platform/performance', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const query = c.req.query()
  const performance = await service.getChannelPerformance(c.req.param('platform') as AdPlatform, {
    from: query.from || '',
    to: query.to || '',
  })
  return c.json({ success: true, data: performance })
})

// Reports
app.post('/reports', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const config = await c.req.json()
  const report = await service.generateReport(config)
  return c.json({ success: true, data: report })
})

app.post('/reports/scheduled', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const body = await c.req.json()
  const scheduledReport = await service.createScheduledReport(body.config, body.schedule, body.recipients)
  return c.json({ success: true, data: scheduledReport })
})

// Alerts
app.post('/alerts', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const config = await c.req.json()
  const alertId = await service.createAlert(config)
  return c.json({ success: true, data: { id: alertId } })
})

// Custom Metrics
app.post('/metrics/custom', async (c) => {
  const service = new AdsAnalyticsService({} as any, c.env)
  const body = await c.req.json()
  const metric = await service.createCustomMetric(body.name, body.description, body.formula, body.unit, body.format)
  return c.json({ success: true, data: metric })
})

// Export worker
export default {
  fetch: app.fetch,
}
