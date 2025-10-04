import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ulid } from 'ulid'
import type {
  Env,
  CreatePostRequest,
  CreatePostResponse,
  UpdatePostRequest,
  PublishPostRequest,
  PublishPostResponse,
  ConnectPlatformRequest,
  DisconnectPlatformRequest,
  CreateQueueRequest,
  AddToQueueRequest,
  GetAnalyticsRequest,
  GetAnalyticsResponse,
  GetOptimalTimesRequest,
  GetOptimalTimesResponse,
  SyncPlatformAnalyticsRequest,
  SocialMediaPost,
  PlatformConnection,
  ContentQueue,
  SocialQueueMessage,
  SocialPlatform,
  OptimalTime,
} from './types'
import {
  validateCreatePost,
  validateUpdatePost,
  validatePublishPost,
  validateConnectPlatform,
  validateDisconnectPlatform,
  validateCreateQueue,
  validateAddToQueue,
  validateGetAnalytics,
  validateGetOptimalTimes,
  validateSyncPlatformAnalytics,
} from './schema'
import { PLATFORM_REQUIREMENTS, DEFAULT_OPTIMAL_TIMES } from './types'

/**
 * Social Media Automation Service
 *
 * Manages social media post scheduling, publishing, and analytics across multiple platforms.
 */
export class SocialMediaAutomationService extends WorkerEntrypoint<Env> {
  // ==================== RPC Methods ====================

  /**
   * Create a new social media post
   */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    const validated = validateCreatePost(request)

    // Validate platform requirements
    const requirements = PLATFORM_REQUIREMENTS[validated.platform]
    if (validated.content.length > requirements.textMaxLength) {
      throw new Error(`Content exceeds maximum length for ${validated.platform}: ${requirements.textMaxLength} characters`)
    }

    if (validated.hashtags && requirements.hashtagsMax && validated.hashtags.length > requirements.hashtagsMax) {
      throw new Error(`Too many hashtags for ${validated.platform}: max ${requirements.hashtagsMax}`)
    }

    if (validated.mediaUrls && requirements.mediaMax && validated.mediaUrls.length > requirements.mediaMax) {
      throw new Error(`Too many media files for ${validated.platform}: max ${requirements.mediaMax}`)
    }

    const now = new Date().toISOString()
    const postId = ulid()

    // Determine status and scheduling
    let status: 'draft' | 'scheduled' | 'publishing' = 'draft'
    let optimalTimeScore: number | undefined

    if (validated.schedulingType === 'immediate') {
      status = 'publishing'
      // Queue immediate publish
      await this.env.SOCIAL_QUEUE.send({
        type: 'publish_post',
        postId,
      })
    } else if (validated.schedulingType === 'scheduled' && validated.scheduledAt) {
      status = 'scheduled'
    } else if (validated.schedulingType === 'optimal') {
      // Find optimal time and schedule
      const optimalTimes = await this.getOptimalTimes({
        userId: validated.userId,
        platform: validated.platform,
      })

      if (optimalTimes.optimalTimes.length > 0) {
        const best = optimalTimes.optimalTimes[0]
        optimalTimeScore = best.score

        // Calculate next occurrence of this optimal time
        const scheduledAt = this.calculateNextOptimalTime(best)
        validated.scheduledAt = scheduledAt.toISOString()
        status = 'scheduled'
      } else {
        // Fallback to immediate if no optimal times found
        status = 'publishing'
        await this.env.SOCIAL_QUEUE.send({
          type: 'publish_post',
          postId,
        })
      }
    }

    const post: SocialMediaPost = {
      id: postId,
      userId: validated.userId,
      platform: validated.platform,
      type: validated.type,
      status,
      content: validated.content,
      hashtags: validated.hashtags,
      mentions: validated.mentions,
      mediaUrls: validated.mediaUrls,
      linkUrl: validated.linkUrl,
      schedulingType: validated.schedulingType,
      scheduledAt: validated.scheduledAt,
      optimalTimeScore,
      createdAt: now,
      updatedAt: now,
    }

    // Save to database
    await this.env.DB.prepare(
      `INSERT INTO social_media_posts (
        id, user_id, platform, type, status, content, hashtags, mentions, media_urls,
        link_url, scheduling_type, scheduled_at, optimal_time_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        post.id,
        post.userId,
        post.platform,
        post.type,
        post.status,
        post.content,
        post.hashtags ? JSON.stringify(post.hashtags) : null,
        post.mentions ? JSON.stringify(post.mentions) : null,
        post.mediaUrls ? JSON.stringify(post.mediaUrls) : null,
        post.linkUrl,
        post.schedulingType,
        post.scheduledAt,
        post.optimalTimeScore,
        post.createdAt,
        post.updatedAt
      )
      .run()

    // Cache for quick access
    await this.env.KV.put(`post:${postId}`, JSON.stringify(post), {
      expirationTtl: 3600, // 1 hour
    })

    return { post }
  }

  /**
   * Update an existing post (only if not yet published)
   */
  async updatePost(request: UpdatePostRequest): Promise<SocialMediaPost> {
    const validated = validateUpdatePost(request)

    // Fetch existing post
    const existing = await this.env.DB.prepare('SELECT * FROM social_media_posts WHERE id = ?').bind(validated.postId).first<any>()

    if (!existing) {
      throw new Error('Post not found')
    }

    if (existing.status === 'published') {
      throw new Error('Cannot update published posts')
    }

    // Update fields
    const updates: string[] = []
    const values: any[] = []

    if (validated.content !== undefined) {
      updates.push('content = ?')
      values.push(validated.content)
    }

    if (validated.hashtags !== undefined) {
      updates.push('hashtags = ?')
      values.push(JSON.stringify(validated.hashtags))
    }

    if (validated.mentions !== undefined) {
      updates.push('mentions = ?')
      values.push(JSON.stringify(validated.mentions))
    }

    if (validated.mediaUrls !== undefined) {
      updates.push('media_urls = ?')
      values.push(JSON.stringify(validated.mediaUrls))
    }

    if (validated.linkUrl !== undefined) {
      updates.push('link_url = ?')
      values.push(validated.linkUrl)
    }

    if (validated.schedulingType !== undefined) {
      updates.push('scheduling_type = ?')
      values.push(validated.schedulingType)
    }

    if (validated.scheduledAt !== undefined) {
      updates.push('scheduled_at = ?')
      values.push(validated.scheduledAt)

      // If rescheduled, change status back to scheduled
      if (existing.status === 'publishing' || existing.status === 'failed') {
        updates.push('status = ?')
        values.push('scheduled')
      }
    }

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())

    values.push(validated.postId)

    await this.env.DB.prepare(`UPDATE social_media_posts SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()

    // Invalidate cache
    await this.env.KV.delete(`post:${validated.postId}`)

    // Fetch updated post
    const updated = await this.env.DB.prepare('SELECT * FROM social_media_posts WHERE id = ?').bind(validated.postId).first<any>()

    return this.mapDbPostToPost(updated)
  }

  /**
   * Publish a post immediately
   */
  async publishPost(request: PublishPostRequest): Promise<PublishPostResponse> {
    const validated = validatePublishPost(request)

    const post = await this.env.DB.prepare('SELECT * FROM social_media_posts WHERE id = ?').bind(validated.postId).first<any>()

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.status === 'published') {
      throw new Error('Post already published')
    }

    // Check if scheduled time has passed or force publish
    if (!validated.force && post.scheduled_at) {
      const scheduledTime = new Date(post.scheduled_at)
      const now = new Date()
      if (scheduledTime > now) {
        throw new Error('Post scheduled for future. Use force=true to publish now.')
      }
    }

    // Get platform connection
    const connection = await this.env.DB.prepare('SELECT * FROM platform_connections WHERE user_id = ? AND platform = ? AND status = ?')
      .bind(post.user_id, post.platform, 'active')
      .first<any>()

    if (!connection) {
      throw new Error(`No active ${post.platform} connection found`)
    }

    // Publish to platform (mock implementation - real integration would call platform APIs)
    const platformPostId = ulid()
    const platformUrl = this.generatePlatformUrl(post.platform, platformPostId)

    // Update post status
    await this.env.DB.prepare(
      `UPDATE social_media_posts
       SET status = ?, platform_post_id = ?, platform_url = ?, published_at = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind('published', platformPostId, platformUrl, new Date().toISOString(), new Date().toISOString(), validated.postId)
      .run()

    // Update connection last used
    await this.env.DB.prepare('UPDATE platform_connections SET last_used_at = ?, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), new Date().toISOString(), connection.id)
      .run()

    // Queue analytics sync for later
    await this.env.SOCIAL_QUEUE.send({
      type: 'sync_analytics',
      userId: post.user_id,
      platform: post.platform,
      postIds: [validated.postId],
    })

    // Track analytics
    await this.env.ANALYTICS_SERVICE?.track({
      event: 'post_published',
      userId: post.user_id,
      properties: {
        postId: validated.postId,
        platform: post.platform,
        type: post.type,
      },
    })

    const updatedPost = await this.env.DB.prepare('SELECT * FROM social_media_posts WHERE id = ?').bind(validated.postId).first<any>()

    return {
      post: this.mapDbPostToPost(updatedPost),
      platformPostId,
      platformUrl,
    }
  }

  /**
   * Connect a social media platform
   */
  async connectPlatform(request: ConnectPlatformRequest): Promise<PlatformConnection> {
    const validated = validateConnectPlatform(request)

    // Check for existing connection
    const existing = await this.env.DB.prepare('SELECT * FROM platform_connections WHERE user_id = ? AND platform = ?')
      .bind(validated.userId, validated.platform)
      .first<any>()

    const now = new Date().toISOString()
    const connectionId = existing?.id || ulid()

    // Calculate expiration
    let expiresAt: string | undefined
    if (validated.expiresIn) {
      const expiry = new Date()
      expiry.setSeconds(expiry.getSeconds() + validated.expiresIn)
      expiresAt = expiry.toISOString()
    }

    // In production, would fetch platform user info using access token
    // Mock implementation:
    const platformUserId = ulid()
    const platformUsername = `user_${platformUserId.slice(0, 8)}`

    if (existing) {
      // Update existing connection
      await this.env.DB.prepare(
        `UPDATE platform_connections
         SET access_token = ?, refresh_token = ?, expires_at = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(validated.accessToken, validated.refreshToken || null, expiresAt || null, 'active', now, connectionId)
        .run()
    } else {
      // Create new connection
      await this.env.DB.prepare(
        `INSERT INTO platform_connections (
          id, user_id, platform, status, access_token, refresh_token, expires_at,
          platform_user_id, platform_username, permissions, connected_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          connectionId,
          validated.userId,
          validated.platform,
          'active',
          validated.accessToken,
          validated.refreshToken || null,
          expiresAt || null,
          platformUserId,
          platformUsername,
          JSON.stringify(['post', 'read']),
          now,
          now,
          now
        )
        .run()
    }

    const connection = await this.env.DB.prepare('SELECT * FROM platform_connections WHERE id = ?').bind(connectionId).first<any>()

    return this.mapDbConnectionToConnection(connection)
  }

  /**
   * Disconnect a social media platform
   */
  async disconnectPlatform(request: DisconnectPlatformRequest): Promise<{ success: boolean }> {
    const validated = validateDisconnectPlatform(request)

    await this.env.DB.prepare('UPDATE platform_connections SET status = ?, updated_at = ? WHERE user_id = ? AND platform = ?')
      .bind('revoked', new Date().toISOString(), validated.userId, validated.platform)
      .run()

    return { success: true }
  }

  /**
   * Create a content queue
   */
  async createQueue(request: CreateQueueRequest): Promise<ContentQueue> {
    const validated = validateCreateQueue(request)

    const now = new Date().toISOString()
    const queueId = ulid()

    const queue: ContentQueue = {
      id: queueId,
      userId: validated.userId,
      name: validated.name,
      status: 'active',
      platforms: validated.platforms,
      postsPerDay: validated.postsPerDay,
      preferredTimes: validated.preferredTimes,
      timezone: validated.timezone,
      posts: [],
      currentPosition: 0,
      createdAt: now,
      updatedAt: now,
    }

    await this.env.DB.prepare(
      `INSERT INTO content_queues (
        id, user_id, name, status, platforms, posts_per_day, preferred_times,
        timezone, posts, current_position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        queue.id,
        queue.userId,
        queue.name,
        queue.status,
        JSON.stringify(queue.platforms),
        queue.postsPerDay,
        queue.preferredTimes ? JSON.stringify(queue.preferredTimes) : null,
        queue.timezone,
        JSON.stringify(queue.posts),
        queue.currentPosition,
        queue.createdAt,
        queue.updatedAt
      )
      .run()

    return queue
  }

  /**
   * Add posts to a queue
   */
  async addToQueue(request: AddToQueueRequest): Promise<ContentQueue> {
    const validated = validateAddToQueue(request)

    const queue = await this.env.DB.prepare('SELECT * FROM content_queues WHERE id = ?').bind(validated.queueId).first<any>()

    if (!queue) {
      throw new Error('Queue not found')
    }

    const posts = JSON.parse(queue.posts || '[]')
    posts.push(...validated.postIds)

    await this.env.DB.prepare('UPDATE content_queues SET posts = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(posts), new Date().toISOString(), validated.queueId)
      .run()

    // Queue processing
    await this.env.SOCIAL_QUEUE.send({
      type: 'process_queue',
      queueId: validated.queueId,
    })

    const updated = await this.env.DB.prepare('SELECT * FROM content_queues WHERE id = ?').bind(validated.queueId).first<any>()

    return this.mapDbQueueToQueue(updated)
  }

  /**
   * Get analytics for posts
   */
  async getAnalytics(request: GetAnalyticsRequest): Promise<GetAnalyticsResponse> {
    const validated = validateGetAnalytics(request)

    let query = 'SELECT * FROM post_analytics WHERE 1=1'
    const params: any[] = []

    if (validated.postId) {
      query += ' AND post_id = ?'
      params.push(validated.postId)
    }

    if (validated.platform) {
      query += ' AND platform = ?'
      params.push(validated.platform)
    }

    if (validated.startDate) {
      query += ' AND date >= ?'
      params.push(validated.startDate)
    }

    if (validated.endDate) {
      query += ' AND date <= ?'
      params.push(validated.endDate)
    }

    query += ' ORDER BY date DESC'

    if (validated.limit) {
      query += ' LIMIT ?'
      params.push(validated.limit)
    }

    const results = await this.env.DB.prepare(query).bind(...params).all()
    const analytics = results.results || []

    // Calculate summary
    const summary = analytics.reduce(
      (acc: any, row: any) => {
        acc.totalLikes += row.likes || 0
        acc.totalComments += row.comments || 0
        acc.totalShares += row.shares || 0
        acc.totalViews += row.views || 0
        acc.totalClicks += row.clicks || 0
        return acc
      },
      { totalLikes: 0, totalComments: 0, totalShares: 0, totalViews: 0, totalClicks: 0 }
    )

    summary.avgEngagementRate = analytics.length > 0 ? analytics.reduce((acc: number, row: any) => acc + (row.engagement_rate || 0), 0) / analytics.length : 0

    summary.avgClickThroughRate =
      analytics.length > 0 ? analytics.reduce((acc: number, row: any) => acc + (row.click_through_rate || 0), 0) / analytics.length : 0

    return {
      analytics: analytics.map((a: any) => ({
        postId: a.post_id,
        platform: a.platform,
        date: a.date,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        views: a.views,
        clicks: a.clicks,
        engagementRate: a.engagement_rate,
        clickThroughRate: a.click_through_rate,
        reach: a.reach,
        impressions: a.impressions,
        syncedAt: a.synced_at,
      })),
      summary,
    }
  }

  /**
   * Get optimal posting times for a platform
   */
  async getOptimalTimes(request: GetOptimalTimesRequest): Promise<GetOptimalTimesResponse> {
    const validated = validateGetOptimalTimes(request)

    // In production, calculate from user's historical analytics
    // For now, return default optimal times
    const optimalTimes = DEFAULT_OPTIMAL_TIMES.filter((t) => t.platform === validated.platform).sort((a, b) => b.score - a.score)

    const best = optimalTimes[0]
    const recommendation = best
      ? `Best time to post on ${validated.platform}: ${this.getDayName(best.dayOfWeek)} at ${this.formatHour(best.hour)} (score: ${best.score}/100)`
      : 'No optimal times data available'

    return {
      optimalTimes,
      recommendation,
    }
  }

  /**
   * Sync analytics from platform
   */
  async syncPlatformAnalytics(request: SyncPlatformAnalyticsRequest): Promise<{ synced: number }> {
    const validated = validateSyncPlatformAnalytics(request)

    // Get posts to sync
    let posts: any[]
    if (validated.postIds) {
      const placeholders = validated.postIds.map(() => '?').join(',')
      const results = await this.env.DB.prepare(`SELECT * FROM social_media_posts WHERE id IN (${placeholders}) AND status = ?`)
        .bind(...validated.postIds, 'published')
        .all()
      posts = results.results || []
    } else {
      // Sync all published posts for this user and platform
      const results = await this.env.DB.prepare('SELECT * FROM social_media_posts WHERE user_id = ? AND platform = ? AND status = ?')
        .bind(validated.userId, validated.platform, 'published')
        .all()
      posts = results.results || []
    }

    let synced = 0

    for (const post of posts) {
      // In production, fetch real analytics from platform API
      // Mock analytics update
      const likes = Math.floor(Math.random() * 100)
      const comments = Math.floor(Math.random() * 20)
      const shares = Math.floor(Math.random() * 10)
      const views = Math.floor(Math.random() * 1000) + 100
      const clicks = Math.floor(Math.random() * 50)

      const engagementRate = ((likes + comments + shares) / views) * 100
      const clickThroughRate = (clicks / views) * 100

      // Update post metrics
      await this.env.DB.prepare(
        `UPDATE social_media_posts
         SET likes = ?, comments = ?, shares = ?, views = ?, clicks = ?, last_synced_at = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(likes, comments, shares, views, clicks, new Date().toISOString(), new Date().toISOString(), post.id)
        .run()

      // Save daily analytics snapshot
      const today = new Date().toISOString().split('T')[0]
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO post_analytics (
          post_id, platform, date, likes, comments, shares, views, clicks,
          engagement_rate, click_through_rate, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(post.id, post.platform, today, likes, comments, shares, views, clicks, engagementRate, clickThroughRate, new Date().toISOString())
        .run()

      synced++
    }

    return { synced }
  }

  // ==================== Helper Methods ====================

  private mapDbPostToPost(row: any): SocialMediaPost {
    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      type: row.type,
      status: row.status,
      content: row.content,
      hashtags: row.hashtags ? JSON.parse(row.hashtags) : undefined,
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
      mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : undefined,
      linkUrl: row.link_url,
      schedulingType: row.scheduling_type,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      optimalTimeScore: row.optimal_time_score,
      platformPostId: row.platform_post_id,
      platformUrl: row.platform_url,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      views: row.views,
      clicks: row.clicks,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapDbConnectionToConnection(row: any): PlatformConnection {
    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      status: row.status,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      platformUserId: row.platform_user_id,
      platformUsername: row.platform_username,
      displayName: row.display_name,
      profileUrl: row.profile_url,
      avatarUrl: row.avatar_url,
      permissions: JSON.parse(row.permissions || '[]'),
      connectedAt: row.connected_at,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapDbQueueToQueue(row: any): ContentQueue {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      status: row.status,
      platforms: JSON.parse(row.platforms),
      postsPerDay: row.posts_per_day,
      preferredTimes: row.preferred_times ? JSON.parse(row.preferred_times) : undefined,
      timezone: row.timezone,
      posts: JSON.parse(row.posts || '[]'),
      currentPosition: row.current_position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private calculateNextOptimalTime(optimalTime: OptimalTime): Date {
    const now = new Date()
    const target = new Date(now)

    // Find next occurrence of the optimal day/hour
    const currentDay = now.getDay()
    const daysUntilTarget = (optimalTime.dayOfWeek - currentDay + 7) % 7

    target.setDate(target.getDate() + daysUntilTarget)
    target.setHours(optimalTime.hour, 0, 0, 0)

    // If calculated time is in the past, add 7 days
    if (target <= now) {
      target.setDate(target.getDate() + 7)
    }

    return target
  }

  private generatePlatformUrl(platform: SocialPlatform, postId: string): string {
    const urls: Record<SocialPlatform, string> = {
      twitter: `https://twitter.com/user/status/${postId}`,
      linkedin: `https://www.linkedin.com/feed/update/${postId}`,
      facebook: `https://www.facebook.com/post/${postId}`,
      instagram: `https://www.instagram.com/p/${postId}`,
      tiktok: `https://www.tiktok.com/@user/video/${postId}`,
      youtube: `https://www.youtube.com/watch?v=${postId}`,
    }
    return urls[platform]
  }

  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  private formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${period}`
  }
}

// ==================== HTTP API ====================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

app.get('/health', (c) => c.json({ status: 'ok', service: 'social-media-automation' }))

// Posts
app.post('/posts', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.createPost(body)
  return c.json({ success: true, data: result })
})

app.put('/posts/:id', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.updatePost({ ...body, postId: c.req.param('id') })
  return c.json({ success: true, data: result })
})

app.post('/posts/:id/publish', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.publishPost({ postId: c.req.param('id'), ...body })
  return c.json({ success: true, data: result })
})

// Platforms
app.post('/platforms/connect', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.connectPlatform(body)
  return c.json({ success: true, data: result })
})

app.post('/platforms/disconnect', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.disconnectPlatform(body)
  return c.json({ success: true, data: result })
})

// Queues
app.post('/queues', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.createQueue(body)
  return c.json({ success: true, data: result })
})

app.post('/queues/:id/posts', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.addToQueue({ ...body, queueId: c.req.param('id') })
  return c.json({ success: true, data: result })
})

// Analytics
app.get('/analytics', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const query = c.req.query()
  const result = await service.getAnalytics(query)
  return c.json({ success: true, data: result })
})

app.get('/optimal-times', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const query = c.req.query()
  const result = await service.getOptimalTimes(query)
  return c.json({ success: true, data: result })
})

app.post('/analytics/sync', async (c) => {
  const service = new SocialMediaAutomationService(c.env.ctx, c.env)
  const body = await c.req.json()
  const result = await service.syncPlatformAnalytics(body)
  return c.json({ success: true, data: result })
})

// ==================== Queue Handler ====================

async function handleQueueMessage(batch: MessageBatch<SocialQueueMessage>, env: Env) {
  const service = new SocialMediaAutomationService({} as any, env)

  for (const message of batch.messages) {
    try {
      const msg = message.body

      switch (msg.type) {
        case 'publish_post':
          await service.publishPost({ postId: msg.postId })
          break

        case 'sync_analytics':
          await service.syncPlatformAnalytics({
            userId: msg.userId,
            platform: msg.platform,
            postIds: msg.postIds,
          })
          break

        case 'process_queue':
          // Process next post in queue
          // Implementation would handle queue scheduling logic
          break

        case 'refresh_token':
          // Refresh OAuth token
          // Implementation would handle token refresh
          break
      }

      message.ack()
    } catch (error) {
      console.error('Queue processing error:', error)
      message.retry()
    }
  }
}

export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
