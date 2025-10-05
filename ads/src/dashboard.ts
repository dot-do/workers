/**
 * Unified Performance Dashboard
 * Aggregates metrics across house ads, Google Ads, and Bing Ads
 */

import type { Ad } from './types'
import type { ExternalAdSubmission } from './external'

/**
 * Channel Type
 */
export type AdChannel = 'house' | 'google' | 'bing'

/**
 * Unified Ad Metrics
 * Standardized metrics across all channels
 */
export interface UnifiedMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number

  // Calculated metrics
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per mille
  cvr: number // Conversion rate
  cpa: number // Cost per acquisition
  roas: number // Return on ad spend

  // Quality metrics
  qualityScore?: number
  averagePosition?: number
}

/**
 * Channel Performance
 */
export interface ChannelPerformance {
  channel: AdChannel
  metrics: UnifiedMetrics
  adCount: number
  activeAdCount: number
  lastUpdated: string
}

/**
 * Ad Performance (cross-channel)
 */
export interface AdPerformance {
  adId: string
  adName: string
  channel: AdChannel
  externalAdId?: string
  status: string
  metrics: UnifiedMetrics
  createdAt: string
  updatedAt: string
}

/**
 * Dashboard Summary
 */
export interface DashboardSummary {
  overall: UnifiedMetrics
  channels: ChannelPerformance[]
  topPerformingAds: AdPerformance[]
  dateRange: {
    from: string
    to: string
  }
  generatedAt: string
}

/**
 * Time Series Data Point
 */
export interface TimeSeriesDataPoint {
  date: string
  channel: AdChannel
  metrics: UnifiedMetrics
}

/**
 * Time Series Data
 */
export interface TimeSeriesData {
  dataPoints: TimeSeriesDataPoint[]
  dateRange: {
    from: string
    to: string
  }
}

/**
 * Channel Comparison
 */
export interface ChannelComparison {
  channels: Array<{
    channel: AdChannel
    metrics: UnifiedMetrics
    percentOfTotal: {
      impressions: number
      clicks: number
      conversions: number
      spend: number
      revenue: number
    }
  }>
  winner: {
    channel: AdChannel
    reason: string
    metric: string
    value: number
  }
}

/**
 * Performance Breakdown
 */
export interface PerformanceBreakdown {
  byChannel: ChannelPerformance[]
  byDay: Array<{
    date: string
    channels: Record<AdChannel, UnifiedMetrics>
    total: UnifiedMetrics
  }>
  byAd: AdPerformance[]
}

/**
 * Dashboard Manager
 * Aggregates and reports on performance across all ad channels
 */
export class DashboardManager {
  constructor(
    private env: {
      ADS_DB: D1Database
      ADS_KV: KVNamespace
      GOOGLE_ADS?: any
      BING_ADS?: any
    }
  ) {}

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(dateRange?: { from: string; to: string }): Promise<DashboardSummary> {
    const now = new Date()
    const from = dateRange?.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    const to = dateRange?.to || now.toISOString()

    // Get performance from all channels
    const [housePerf, googlePerf, bingPerf] = await Promise.all([
      this.getHouseAdsPerformance(from, to),
      this.getGoogleAdsPerformance(from, to),
      this.getBingAdsPerformance(from, to),
    ])

    // Aggregate overall metrics
    const overall = this.aggregateMetrics([housePerf.metrics, googlePerf.metrics, bingPerf.metrics])

    // Get top performing ads across all channels
    const topPerformingAds = await this.getTopPerformingAds(10, from, to)

    return {
      overall,
      channels: [housePerf, googlePerf, bingPerf],
      topPerformingAds,
      dateRange: { from, to },
      generatedAt: now.toISOString(),
    }
  }

  /**
   * Get channel comparison
   */
  async getChannelComparison(dateRange?: { from: string; to: string }): Promise<ChannelComparison> {
    const summary = await this.getDashboardSummary(dateRange)

    const totalImpressions = summary.overall.impressions
    const totalClicks = summary.overall.clicks
    const totalConversions = summary.overall.conversions
    const totalSpend = summary.overall.spend
    const totalRevenue = summary.overall.revenue

    const channels = summary.channels.map((ch) => ({
      channel: ch.channel,
      metrics: ch.metrics,
      percentOfTotal: {
        impressions: totalImpressions > 0 ? (ch.metrics.impressions / totalImpressions) * 100 : 0,
        clicks: totalClicks > 0 ? (ch.metrics.clicks / totalClicks) * 100 : 0,
        conversions: totalConversions > 0 ? (ch.metrics.conversions / totalConversions) * 100 : 0,
        spend: totalSpend > 0 ? (ch.metrics.spend / totalSpend) * 100 : 0,
        revenue: totalRevenue > 0 ? (ch.metrics.revenue / totalRevenue) * 100 : 0,
      },
    }))

    // Determine winner by ROAS
    const winnerChannel = [...summary.channels].sort((a, b) => b.metrics.roas - a.metrics.roas)[0]

    return {
      channels,
      winner: {
        channel: winnerChannel.channel,
        reason: 'Highest ROAS',
        metric: 'roas',
        value: winnerChannel.metrics.roas,
      },
    }
  }

  /**
   * Get time series data
   */
  async getTimeSeriesData(dateRange: { from: string; to: string }, granularity: 'day' | 'week' | 'month' = 'day'): Promise<TimeSeriesData> {
    const dataPoints: TimeSeriesDataPoint[] = []

    // Get daily metrics for each channel
    const [houseSeries, googleSeries, bingSeries] = await Promise.all([
      this.getHouseAdsTimeSeries(dateRange.from, dateRange.to),
      this.getGoogleAdsTimeSeries(dateRange.from, dateRange.to),
      this.getBingAdsTimeSeries(dateRange.from, dateRange.to),
    ])

    // Combine all series
    dataPoints.push(...houseSeries, ...googleSeries, ...bingSeries)

    return {
      dataPoints: dataPoints.sort((a, b) => a.date.localeCompare(b.date)),
      dateRange,
    }
  }

  /**
   * Get performance breakdown
   */
  async getPerformanceBreakdown(dateRange?: { from: string; to: string }): Promise<PerformanceBreakdown> {
    const summary = await this.getDashboardSummary(dateRange)
    const timeSeries = await this.getTimeSeriesData(dateRange || { from: summary.dateRange.from, to: summary.dateRange.to })

    // Group by day
    const byDay: Record<string, Record<AdChannel, UnifiedMetrics>> = {}

    for (const point of timeSeries.dataPoints) {
      if (!byDay[point.date]) {
        byDay[point.date] = {} as Record<AdChannel, UnifiedMetrics>
      }
      byDay[point.date][point.channel] = point.metrics
    }

    const byDayArray = Object.entries(byDay).map(([date, channels]) => {
      const total = this.aggregateMetrics(Object.values(channels))
      return { date, channels, total }
    })

    return {
      byChannel: summary.channels,
      byDay: byDayArray.sort((a, b) => a.date.localeCompare(b.date)),
      byAd: summary.topPerformingAds,
    }
  }

  /**
   * Get house ads performance
   */
  private async getHouseAdsPerformance(from: string, to: string): Promise<ChannelPerformance> {
    const result = await this.env.ADS_DB.prepare(
      `SELECT
        COUNT(*) as ad_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_ad_count,
        SUM(json_extract(metrics, '$.impressions')) as impressions,
        SUM(json_extract(metrics, '$.clicks')) as clicks,
        SUM(json_extract(metrics, '$.conversions')) as conversions,
        SUM(spent) as spend,
        SUM(json_extract(metrics, '$.revenue')) as revenue
       FROM ads
       WHERE created_at >= ? AND created_at <= ?`
    )
      .bind(from, to)
      .first()

    const impressions = (result?.impressions as number) || 0
    const clicks = (result?.clicks as number) || 0
    const conversions = (result?.conversions as number) || 0
    const spend = (result?.spend as number) || 0
    const revenue = (result?.revenue as number) || 0

    return {
      channel: 'house',
      metrics: this.calculateMetrics({ impressions, clicks, conversions, spend, revenue }),
      adCount: (result?.ad_count as number) || 0,
      activeAdCount: (result?.active_ad_count as number) || 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Get Google Ads performance
   */
  private async getGoogleAdsPerformance(from: string, to: string): Promise<ChannelPerformance> {
    const result = await this.env.ADS_DB.prepare(
      `SELECT
        COUNT(DISTINCT ad_id) as ad_count,
        COUNT(DISTINCT CASE WHEN status = 'running' THEN ad_id END) as active_ad_count,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM ad_external_metrics
       WHERE network = 'google' AND date >= ? AND date <= ?`
    )
      .bind(from.split('T')[0], to.split('T')[0])
      .first()

    const impressions = (result?.impressions as number) || 0
    const clicks = (result?.clicks as number) || 0
    const conversions = (result?.conversions as number) || 0
    const spend = (result?.spend as number) || 0
    const revenue = (result?.revenue as number) || 0

    return {
      channel: 'google',
      metrics: this.calculateMetrics({ impressions, clicks, conversions, spend, revenue }),
      adCount: (result?.ad_count as number) || 0,
      activeAdCount: (result?.active_ad_count as number) || 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Get Bing Ads performance
   */
  private async getBingAdsPerformance(from: string, to: string): Promise<ChannelPerformance> {
    const result = await this.env.ADS_DB.prepare(
      `SELECT
        COUNT(DISTINCT ad_id) as ad_count,
        COUNT(DISTINCT CASE WHEN status = 'running' THEN ad_id END) as active_ad_count,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM ad_external_metrics
       WHERE network = 'bing' AND date >= ? AND date <= ?`
    )
      .bind(from.split('T')[0], to.split('T')[0])
      .first()

    const impressions = (result?.impressions as number) || 0
    const clicks = (result?.clicks as number) || 0
    const conversions = (result?.conversions as number) || 0
    const spend = (result?.spend as number) || 0
    const revenue = (result?.revenue as number) || 0

    return {
      channel: 'bing',
      metrics: this.calculateMetrics({ impressions, clicks, conversions, spend, revenue }),
      adCount: (result?.ad_count as number) || 0,
      activeAdCount: (result?.active_ad_count as number) || 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Get top performing ads across all channels
   */
  private async getTopPerformingAds(limit: number, from: string, to: string): Promise<AdPerformance[]> {
    const ads: AdPerformance[] = []

    // Get house ads
    const houseAds = await this.env.ADS_DB.prepare(
      `SELECT id, config, status, spent, quality_score, metrics, created_at, updated_at
       FROM ads
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY quality_score DESC, spent ASC
       LIMIT ?`
    )
      .bind(from, to, Math.ceil(limit / 3))
      .all()

    for (const row of houseAds.results) {
      const metrics = JSON.parse(row.metrics as string)
      const config = JSON.parse(row.config as string)

      ads.push({
        adId: row.id as string,
        adName: config.name || 'Unnamed Ad',
        channel: 'house',
        status: row.status as string,
        metrics: this.calculateMetrics(metrics),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      })
    }

    // TODO: Get top Google and Bing ads from external metrics
    // This would require joining external_metrics with external_networks table

    // Sort by ROAS and return top N
    return ads.sort((a, b) => b.metrics.roas - a.metrics.roas).slice(0, limit)
  }

  /**
   * Get house ads time series
   */
  private async getHouseAdsTimeSeries(from: string, to: string): Promise<TimeSeriesDataPoint[]> {
    const results = await this.env.ADS_DB.prepare(
      `SELECT
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM ad_metrics_daily
       WHERE date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date`
    )
      .bind(from.split('T')[0], to.split('T')[0])
      .all()

    return results.results.map((row) => ({
      date: row.date as string,
      channel: 'house' as AdChannel,
      metrics: this.calculateMetrics({
        impressions: row.impressions as number,
        clicks: row.clicks as number,
        conversions: row.conversions as number,
        spend: row.spend as number,
        revenue: row.revenue as number,
      }),
    }))
  }

  /**
   * Get Google Ads time series
   */
  private async getGoogleAdsTimeSeries(from: string, to: string): Promise<TimeSeriesDataPoint[]> {
    const results = await this.env.ADS_DB.prepare(
      `SELECT
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM ad_external_metrics
       WHERE network = 'google' AND date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date`
    )
      .bind(from.split('T')[0], to.split('T')[0])
      .all()

    return results.results.map((row) => ({
      date: row.date as string,
      channel: 'google' as AdChannel,
      metrics: this.calculateMetrics({
        impressions: row.impressions as number,
        clicks: row.clicks as number,
        conversions: row.conversions as number,
        spend: row.spend as number,
        revenue: row.revenue as number,
      }),
    }))
  }

  /**
   * Get Bing Ads time series
   */
  private async getBingAdsTimeSeries(from: string, to: string): Promise<TimeSeriesDataPoint[]> {
    const results = await this.env.ADS_DB.prepare(
      `SELECT
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM ad_external_metrics
       WHERE network = 'bing' AND date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date`
    )
      .bind(from.split('T')[0], to.split('T')[0])
      .all()

    return results.results.map((row) => ({
      date: row.date as string,
      channel: 'bing' as AdChannel,
      metrics: this.calculateMetrics({
        impressions: row.impressions as number,
        clicks: row.clicks as number,
        conversions: row.conversions as number,
        spend: row.spend as number,
        revenue: row.revenue as number,
      }),
    }))
  }

  /**
   * Calculate unified metrics
   */
  private calculateMetrics(raw: { impressions: number; clicks: number; conversions: number; spend: number; revenue: number }): UnifiedMetrics {
    const ctr = raw.impressions > 0 ? raw.clicks / raw.impressions : 0
    const cpc = raw.clicks > 0 ? raw.spend / raw.clicks : 0
    const cpm = raw.impressions > 0 ? (raw.spend / raw.impressions) * 1000 : 0
    const cvr = raw.clicks > 0 ? raw.conversions / raw.clicks : 0
    const cpa = raw.conversions > 0 ? raw.spend / raw.conversions : 0
    const roas = raw.spend > 0 ? raw.revenue / raw.spend : 0

    return {
      ...raw,
      ctr,
      cpc,
      cpm,
      cvr,
      cpa,
      roas,
    }
  }

  /**
   * Aggregate multiple metrics into one
   */
  private aggregateMetrics(metricsArray: UnifiedMetrics[]): UnifiedMetrics {
    const total = metricsArray.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        spend: acc.spend + m.spend,
        revenue: acc.revenue + m.revenue,
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    )

    return this.calculateMetrics(total)
  }
}
