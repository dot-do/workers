/**
 * Consumption Analytics Tracker
 * Tracks content consumption using Analytics Engine and aggregates to D1
 */

import type { ConsumptionEvent } from '../types/events'
import type { ConsumptionAnalytics } from '../types/content'

export class ConsumptionTracker {
  constructor(
    private db: D1Database,
    private analytics: AnalyticsEngineDataset | null,
  ) {}

  /**
   * Track a consumption event in real-time
   */
  async trackConsumption(event: ConsumptionEvent): Promise<void> {
    // Write to Analytics Engine for real-time tracking
    if (this.analytics) {
      this.analytics.writeDataPoint({
        indexes: [event.contentId],
        blobs: [
          event.channelId || 'direct',
          event.interactionType,
          event.consumerType,
        ],
        doubles: [
          event.timeSpent || 0,
          event.completionRate || 0,
        ],
      })
    }

    // For important events, also log to D1 events table
    // (handled by EventCapture in main flow)
  }

  /**
   * Aggregate consumption data daily
   */
  async aggregateDailyMetrics(date: string): Promise<void> {
    // This would typically run as a scheduled task
    // Query Analytics Engine and aggregate into D1

    if (!this.analytics) return

    // In real implementation, query Analytics Engine API
    // For now, we'll show the D1 aggregation structure

    const contentIds = await this.getContentIdsForDate(date)

    for (const contentId of contentIds) {
      const metrics = await this.calculateDailyMetrics(contentId, date)
      await this.storeDailyMetrics(contentId, date, metrics)
    }
  }

  /**
   * Calculate daily metrics for content
   */
  private async calculateDailyMetrics(contentId: string, date: string): Promise<{
    views: number
    uniqueViewers: number
    timeSpent: number
    interactions: number
    completions: number
    byChannel: Record<string, any>
  }> {
    // In real implementation, query Analytics Engine
    // For POC, simulate with sample data

    return {
      views: Math.floor(Math.random() * 1000),
      uniqueViewers: Math.floor(Math.random() * 500),
      timeSpent: Math.floor(Math.random() * 10000),
      interactions: Math.floor(Math.random() * 100),
      completions: Math.floor(Math.random() * 300),
      byChannel: {},
    }
  }

  /**
   * Store daily metrics in D1
   */
  private async storeDailyMetrics(
    contentId: string,
    date: string,
    metrics: any,
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT OR REPLACE INTO content_consumption (
          id, content_id, date, views, unique_viewers,
          time_spent, interactions, completions, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        contentId,
        date,
        metrics.views,
        metrics.uniqueViewers,
        metrics.timeSpent,
        metrics.interactions,
        metrics.completions,
        JSON.stringify({
          avgTimeSpent: metrics.timeSpent / metrics.views,
          avgCompletionRate: metrics.completions / metrics.views,
        }),
      )
      .run()
  }

  /**
   * Get consumption analytics for content
   */
  async getContentAnalytics(
    contentId: string,
    options: {
      startDate?: string
      endDate?: string
      channelId?: string
    } = {},
  ): Promise<ConsumptionAnalytics[]> {
    let query = 'SELECT * FROM content_consumption WHERE content_id = ?'
    const params: any[] = [contentId]

    if (options.startDate) {
      query += ' AND date >= ?'
      params.push(options.startDate)
    }

    if (options.endDate) {
      query += ' AND date <= ?'
      params.push(options.endDate)
    }

    if (options.channelId) {
      query += ' AND channel_id = ?'
      params.push(options.channelId)
    }

    query += ' ORDER BY date DESC'

    const { results } = await this.db.prepare(query).bind(...params).all()

    return results.map(row => ({
      id: row.id as string,
      contentId: row.content_id as string,
      channelId: row.channel_id as string | undefined,
      date: row.date as string,
      views: row.views as number,
      uniqueViewers: row.unique_viewers as number,
      timeSpent: row.time_spent as number,
      interactions: row.interactions as number,
      completions: row.completions as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  /**
   * Get aggregated analytics summary
   */
  async getAnalyticsSummary(contentId: string): Promise<{
    totalViews: number
    totalUniqueViewers: number
    totalTimeSpent: number
    totalInteractions: number
    totalCompletions: number
    avgTimeSpent: number
    avgCompletionRate: number
    performanceByDate: Array<{
      date: string
      views: number
      interactions: number
    }>
  }> {
    const { results } = await this.db
      .prepare(`
        SELECT
          SUM(views) as total_views,
          SUM(unique_viewers) as total_unique_viewers,
          SUM(time_spent) as total_time_spent,
          SUM(interactions) as total_interactions,
          SUM(completions) as total_completions,
          AVG(views) as avg_views
        FROM content_consumption
        WHERE content_id = ?
      `)
      .bind(contentId)
      .all()

    const summary = results[0] as any

    const performanceData = await this.db
      .prepare(`
        SELECT date, views, interactions
        FROM content_consumption
        WHERE content_id = ?
        ORDER BY date DESC
        LIMIT 30
      `)
      .bind(contentId)
      .all()

    return {
      totalViews: summary.total_views || 0,
      totalUniqueViewers: summary.total_unique_viewers || 0,
      totalTimeSpent: summary.total_time_spent || 0,
      totalInteractions: summary.total_interactions || 0,
      totalCompletions: summary.total_completions || 0,
      avgTimeSpent: summary.total_views ? summary.total_time_spent / summary.total_views : 0,
      avgCompletionRate: summary.total_views ? summary.total_completions / summary.total_views : 0,
      performanceByDate: performanceData.results.map(row => ({
        date: row.date as string,
        views: row.views as number,
        interactions: row.interactions as number,
      })),
    }
  }

  /**
   * Get trending content
   */
  async getTrendingContent(
    limit: number = 10,
    days: number = 7,
  ): Promise<Array<{
    contentId: string
    views: number
    interactions: number
    trend: 'up' | 'down' | 'stable'
  }>> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const dateStr = startDate.toISOString().split('T')[0]

    const { results } = await this.db
      .prepare(`
        SELECT
          content_id,
          SUM(views) as total_views,
          SUM(interactions) as total_interactions
        FROM content_consumption
        WHERE date >= ?
        GROUP BY content_id
        ORDER BY total_views DESC
        LIMIT ?
      `)
      .bind(dateStr, limit)
      .all()

    return results.map(row => ({
      contentId: row.content_id as string,
      views: row.total_views as number,
      interactions: row.total_interactions as number,
      trend: 'stable' as const, // Would calculate based on week-over-week comparison
    }))
  }

  /**
   * Helper: Get content IDs that need aggregation
   */
  private async getContentIdsForDate(date: string): Promise<string[]> {
    // In real implementation, query Analytics Engine for unique content IDs
    // For POC, get from content table
    const { results } = await this.db
      .prepare('SELECT DISTINCT id FROM content WHERE status = "published"')
      .all()

    return results.map(row => row.id as string)
  }
}
