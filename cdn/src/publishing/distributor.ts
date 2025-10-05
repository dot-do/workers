/**
 * Multi-Channel Publishing System
 * Distributes content to various channels and platforms
 */

import type { DistributionChannel, ContentDistribution } from '../types/content'
import type { DistributionEvent } from '../types/events'
import { EventCapture } from '../events/capture'

export class ContentDistributor {
  constructor(
    private db: D1Database,
    private eventCapture: EventCapture,
  ) {}

  /**
   * Register a distribution channel
   */
  async registerChannel(channel: DistributionChannel): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO distribution_channels (
          id, name, type, platform, config, created_at, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        channel.id,
        channel.name,
        channel.type,
        channel.platform || null,
        JSON.stringify(channel.config || {}),
        channel.createdAt,
        channel.active ? 1 : 0,
      )
      .run()
  }

  /**
   * Get all active channels
   */
  async getActiveChannels(): Promise<DistributionChannel[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM distribution_channels WHERE active = 1 ORDER BY name')
      .all()

    return results.map(row => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as any,
      platform: row.platform as string | undefined,
      config: row.config ? JSON.parse(row.config as string) : undefined,
      createdAt: row.created_at as number,
      active: Boolean(row.active),
    }))
  }

  /**
   * Schedule content distribution to a channel
   */
  async scheduleDistribution(
    contentId: string,
    channelId: string,
    scheduledAt: number,
    actorId: string,
  ): Promise<ContentDistribution> {
    const distribution: ContentDistribution = {
      id: crypto.randomUUID(),
      contentId,
      channelId,
      status: 'scheduled',
      scheduledAt,
    }

    await this.db
      .prepare(`
        INSERT INTO content_distributions (
          id, content_id, channel_id, status, scheduled_at
        ) VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        distribution.id,
        distribution.contentId,
        distribution.channelId,
        distribution.status,
        distribution.scheduledAt,
      )
      .run()

    // Capture distribution event
    const event: DistributionEvent = {
      id: crypto.randomUUID(),
      eventType: 'distribution',
      contentId,
      timestamp: Date.now(),
      actorId,
      actorType: 'system',
      action: 'add',
      channelId,
      channelType: await this.getChannelType(channelId),
      status: 'scheduled',
      metadata: {
        scheduledTime: scheduledAt,
      },
    }

    await this.eventCapture.captureEvent(event)

    return distribution
  }

  /**
   * Publish content to a channel immediately
   */
  async publishToChannel(
    contentId: string,
    channelId: string,
    actorId: string,
    customizations?: Record<string, any>,
  ): Promise<ContentDistribution> {
    const channel = await this.getChannel(channelId)
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`)
    }

    const now = Date.now()
    const distributionUrl = await this.generateDistributionUrl(contentId, channel)

    const distribution: ContentDistribution = {
      id: crypto.randomUUID(),
      contentId,
      channelId,
      status: 'published',
      publishedAt: now,
      distributionUrl,
      metadata: customizations,
    }

    await this.db
      .prepare(`
        INSERT INTO content_distributions (
          id, content_id, channel_id, status, published_at,
          distribution_url, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        distribution.id,
        distribution.contentId,
        distribution.channelId,
        distribution.status,
        distribution.publishedAt,
        distribution.distributionUrl,
        JSON.stringify(distribution.metadata || {}),
      )
      .run()

    // Capture distribution event
    const event: DistributionEvent = {
      id: crypto.randomUUID(),
      eventType: 'distribution',
      contentId,
      timestamp: now,
      actorId,
      actorType: 'human',
      action: 'add',
      channelId,
      channelType: channel.type,
      platform: channel.platform,
      distributionUrl,
      status: 'published',
      metadata: {
        publishedTime: now,
        customizations,
      },
    }

    await this.eventCapture.captureEvent(event)

    return distribution
  }

  /**
   * Get all distributions for content
   */
  async getContentDistributions(contentId: string): Promise<ContentDistribution[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM content_distributions WHERE content_id = ? ORDER BY published_at DESC')
      .bind(contentId)
      .all()

    return results.map(row => ({
      id: row.id as string,
      contentId: row.content_id as string,
      channelId: row.channel_id as string,
      status: row.status as any,
      scheduledAt: row.scheduled_at as number | undefined,
      publishedAt: row.published_at as number | undefined,
      retractedAt: row.retracted_at as number | undefined,
      distributionUrl: row.distribution_url as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  /**
   * Retract content from a channel
   */
  async retractDistribution(distributionId: string, actorId: string, reason: string): Promise<void> {
    const distribution = await this.getDistribution(distributionId)
    if (!distribution) {
      throw new Error(`Distribution ${distributionId} not found`)
    }

    const now = Date.now()

    await this.db
      .prepare(`
        UPDATE content_distributions
        SET status = 'retracted', retracted_at = ?
        WHERE id = ?
      `)
      .bind(now, distributionId)
      .run()

    // Capture distribution event
    const event: DistributionEvent = {
      id: crypto.randomUUID(),
      eventType: 'distribution',
      contentId: distribution.contentId,
      timestamp: now,
      actorId,
      actorType: 'human',
      action: 'delete',
      channelId: distribution.channelId,
      channelType: await this.getChannelType(distribution.channelId),
      status: 'retracted',
      metadata: {
        reason,
        originalPublishedTime: distribution.publishedAt,
      },
    }

    await this.eventCapture.captureEvent(event)
  }

  /**
   * Get distribution performance metrics
   */
  async getDistributionMetrics(contentId: string): Promise<{
    channelBreakdown: Record<string, {
      channel: DistributionChannel
      views: number
      interactions: number
      avgTimeSpent: number
    }>
    totalViews: number
    totalInteractions: number
    bestPerforming: string | null
  }> {
    const distributions = await this.getContentDistributions(contentId)
    const channelBreakdown: Record<string, any> = {}
    let totalViews = 0
    let totalInteractions = 0
    let bestPerforming: string | null = null
    let bestPerformingViews = 0

    for (const dist of distributions) {
      const channel = await this.getChannel(dist.channelId)
      if (!channel) continue

      // Get consumption metrics for this channel
      const { results } = await this.db
        .prepare(`
          SELECT
            SUM(views) as views,
            SUM(interactions) as interactions,
            AVG(time_spent) as avg_time_spent
          FROM content_consumption
          WHERE content_id = ? AND channel_id = ?
        `)
        .bind(contentId, dist.channelId)
        .all()

      const metrics = results[0] as any
      const views = metrics?.views || 0
      const interactions = metrics?.interactions || 0
      const avgTimeSpent = metrics?.avg_time_spent || 0

      channelBreakdown[dist.channelId] = {
        channel,
        views,
        interactions,
        avgTimeSpent,
      }

      totalViews += views
      totalInteractions += interactions

      if (views > bestPerformingViews) {
        bestPerforming = dist.channelId
        bestPerformingViews = views
      }
    }

    return {
      channelBreakdown,
      totalViews,
      totalInteractions,
      bestPerforming,
    }
  }

  /**
   * Helper: Get channel by ID
   */
  private async getChannel(channelId: string): Promise<DistributionChannel | null> {
    const row = await this.db
      .prepare('SELECT * FROM distribution_channels WHERE id = ?')
      .bind(channelId)
      .first()

    if (!row) return null

    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as any,
      platform: row.platform as string | undefined,
      config: row.config ? JSON.parse(row.config as string) : undefined,
      createdAt: row.created_at as number,
      active: Boolean(row.active),
    }
  }

  /**
   * Helper: Get channel type
   */
  private async getChannelType(channelId: string): Promise<any> {
    const channel = await this.getChannel(channelId)
    return channel?.type || 'website'
  }

  /**
   * Helper: Get distribution by ID
   */
  private async getDistribution(distributionId: string): Promise<ContentDistribution | null> {
    const row = await this.db
      .prepare('SELECT * FROM content_distributions WHERE id = ?')
      .bind(distributionId)
      .first()

    if (!row) return null

    return {
      id: row.id as string,
      contentId: row.content_id as string,
      channelId: row.channel_id as string,
      status: row.status as any,
      scheduledAt: row.scheduled_at as number | undefined,
      publishedAt: row.published_at as number | undefined,
      retractedAt: row.retracted_at as number | undefined,
      distributionUrl: row.distribution_url as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * Helper: Generate distribution URL
   */
  private async generateDistributionUrl(contentId: string, channel: DistributionChannel): Promise<string> {
    // In real implementation, this would use channel config to construct proper URL
    const baseUrl = (channel.config as any)?.baseUrl || 'https://example.com'
    return `${baseUrl}/content/${contentId}`
  }
}
