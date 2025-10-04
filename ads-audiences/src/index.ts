/**
 * Ads Audience Manager Worker
 * Unified audience management across all platforms
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  AudienceType,
  AudienceStatus,
  MatchType,
  type AdPlatform,
  type Audience,
  type AudienceDefinition,
  type CustomerList,
  type LookalikeConfig,
  type RetargetingRules,
  type AudienceInsights,
  type OverlapAnalysis,
  type AudienceRules,
} from '@dot-do/ads-types'

/**
 * Environment bindings
 */
export interface Env {
  // KV namespace for caching
  AUDIENCES_KV: KVNamespace

  // D1 database for audience storage
  DB: D1Database

  // R2 bucket for customer list uploads
  CUSTOMER_LISTS: R2Bucket

  // Queue for async operations
  AUDIENCE_QUEUE: Queue

  // Analytics Engine for event tracking
  ANALYTICS: AnalyticsEngineDataset

  // Service bindings
  ADS_CAMPAIGNS?: any
  ADS_ANALYTICS?: any
}

/**
 * Segmentation criteria (local type)
 */
interface SegmentationCriteria {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: string | number | string[]
}

/**
 * Audience segment (local type)
 */
interface AudienceSegment {
  id: string
  audienceId: string
  name: string
  criteria: SegmentationCriteria[]
  size: number
  createdAt: string
}

/**
 * Audience Manager RPC Service
 */
export class AdsAudienceService extends WorkerEntrypoint<Env> {
  /**
   * Create a new audience
   */
  async createAudience(definition: AudienceDefinition): Promise<Audience> {
    const audienceId = crypto.randomUUID()
    const now = new Date().toISOString()

    const audience: Audience = {
      id: audienceId,
      definition,
      status: AudienceStatus.Active,
      size: definition.size || 0,
      platforms: [],
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO audiences (id, name, type, size, definition, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(audienceId, definition.name, definition.type, audience.size, JSON.stringify(definition), now, now)
      .run()

    // Cache in KV (6 hours TTL)
    await this.env.AUDIENCES_KV.put(`audience:${audienceId}`, JSON.stringify(audience), { expirationTtl: 21600 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audience_created', definition.type],
      doubles: [audience.size],
      indexes: [audienceId],
    })

    return audience
  }

  /**
   * Update existing audience
   */
  async updateAudience(audienceId: string, updates: Partial<AudienceDefinition>): Promise<Audience> {
    const audience = await this.getAudience(audienceId)
    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`)
    }

    const updatedDefinition = {
      ...audience.definition,
      ...updates,
    }

    const updatedAudience: Audience = {
      ...audience,
      definition: updatedDefinition,
      updatedAt: new Date().toISOString(),
    }

    // Update D1
    await this.env.DB.prepare(`UPDATE audiences SET name = ?, definition = ?, updated_at = ? WHERE id = ?`)
      .bind(updatedDefinition.name, JSON.stringify(updatedDefinition), updatedAudience.updatedAt, audienceId)
      .run()

    // Update cache
    await this.env.AUDIENCES_KV.put(`audience:${audienceId}`, JSON.stringify(updatedAudience), { expirationTtl: 21600 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audience_updated', audience.definition.type],
      indexes: [audienceId],
    })

    return updatedAudience
  }

  /**
   * Delete audience
   */
  async deleteAudience(audienceId: string): Promise<void> {
    const audience = await this.getAudience(audienceId)
    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`)
    }

    // Delete from D1
    await this.env.DB.prepare(`DELETE FROM audiences WHERE id = ?`).bind(audienceId).run()

    // Delete from cache
    await this.env.AUDIENCES_KV.delete(`audience:${audienceId}`)

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audience_deleted', audience.definition.type],
      indexes: [audienceId],
    })
  }

  /**
   * Upload customer list and create audience
   */
  async uploadCustomerList(list: CustomerList, name: string, description?: string): Promise<Audience> {
    // Hash customer data for privacy
    const hashedData = await this.hashCustomerData(list.data, list.matchType)

    // Store hashed list in R2
    const listId = crypto.randomUUID()
    await this.env.CUSTOMER_LISTS.put(`lists/${listId}.json`, JSON.stringify(hashedData))

    // Create audience definition
    const definition: AudienceDefinition = {
      name,
      description,
      type: AudienceType.Custom,
      size: list.data.length,
      customerList: list,
    }

    const audience = await this.createAudience(definition)

    // Queue for platform sync
    await this.env.AUDIENCE_QUEUE.send({
      type: 'sync_customer_list',
      audienceId: audience.id,
      listId,
      matchType: list.matchType,
    })

    return audience
  }

  /**
   * Create lookalike audience
   */
  async createLookalikeAudience(sourceAudienceId: string, similarity: number, location?: string[]): Promise<Audience> {
    const sourceAudience = await this.getAudience(sourceAudienceId)
    if (!sourceAudience) {
      throw new Error(`Source audience ${sourceAudienceId} not found`)
    }

    // Estimate lookalike audience size (typically 100x larger)
    const estimatedSize = sourceAudience.size * 100

    const config: LookalikeConfig = {
      sourceAudienceId,
      similarity,
      location,
    }

    const definition: AudienceDefinition = {
      name: `${sourceAudience.definition.name} - Lookalike (${similarity}%)`,
      type: AudienceType.Lookalike,
      size: estimatedSize,
      sourceAudienceId,
    }

    const audience = await this.createAudience(definition)

    // Queue for platform sync
    await this.env.AUDIENCE_QUEUE.send({
      type: 'create_lookalike',
      audienceId: audience.id,
      sourceAudienceId,
      similarity,
      config,
    })

    return audience
  }

  /**
   * Create retargeting audience
   */
  async createRetargetingAudience(pixelId: string, retargetingRules: RetargetingRules): Promise<Audience> {
    // Estimate size based on rules
    const estimatedSize = 10000 // Placeholder

    // Convert retargeting rules to audience rules format
    const audienceRules: AudienceRules = {
      operator: 'AND',
      conditions: [
        { field: 'pixel_id', operator: 'equals', value: pixelId },
        { field: 'time_window', operator: 'less_than', value: retargetingRules.timeWindow },
      ],
    }

    const definition: AudienceDefinition = {
      name: `Retargeting - ${pixelId}`,
      description: `Retargeting audience based on pixel ${pixelId}`,
      type: AudienceType.Retargeting,
      size: estimatedSize,
      rules: audienceRules,
    }

    const audience = await this.createAudience(definition)

    // Queue for platform sync
    await this.env.AUDIENCE_QUEUE.send({
      type: 'create_retargeting',
      audienceId: audience.id,
      pixelId,
      retargetingRules,
    })

    return audience
  }

  /**
   * Segment audience based on criteria
   */
  async segmentAudience(audienceId: string, criteria: SegmentationCriteria[]): Promise<AudienceSegment[]> {
    const audience = await this.getAudience(audienceId)
    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`)
    }

    // Create segments based on criteria
    const segments: AudienceSegment[] = []

    for (const criterion of criteria) {
      const segmentId = crypto.randomUUID()
      const segment: AudienceSegment = {
        id: segmentId,
        audienceId,
        name: `Segment: ${criterion.field} ${criterion.operator} ${criterion.value}`,
        criteria: [criterion],
        size: Math.floor(audience.size * 0.3), // Estimate 30% of audience per segment
        createdAt: new Date().toISOString(),
      }
      segments.push(segment)
    }

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audience_segmented'],
      doubles: [segments.length],
      indexes: [audienceId],
    })

    return segments
  }

  /**
   * Combine multiple audiences
   */
  async combineAudiences(audienceIds: string[], operator: 'AND' | 'OR' | 'NOT'): Promise<Audience> {
    if (audienceIds.length < 2) {
      throw new Error('Need at least 2 audiences to combine')
    }

    // Fetch all source audiences
    const audiences = await Promise.all(audienceIds.map((id) => this.getAudience(id)))

    if (audiences.some((a) => !a)) {
      throw new Error('One or more source audiences not found')
    }

    // Calculate combined audience size based on operator
    let combinedSize: number
    const totalSize = audiences.reduce((sum, a) => sum + (a?.size || 0), 0)

    switch (operator) {
      case 'AND':
        // Intersection - typically smallest audience size
        combinedSize = Math.min(...audiences.map((a) => a!.size))
        break
      case 'OR':
        // Union - sum with 20% overlap deduction
        combinedSize = Math.floor(totalSize * 0.8)
        break
      case 'NOT':
        // Exclusion - first audience minus second
        combinedSize = audiences[0]!.size - Math.floor(audiences[1]!.size * 0.1)
        break
    }

    const definition: AudienceDefinition = {
      name: `Combined (${operator}) - ${audiences.map((a) => a!.definition.name).join(', ')}`,
      description: `Combined audience using ${operator} operator`,
      type: AudienceType.Custom,
      size: combinedSize,
      rules: {
        operator,
        conditions: [], // Would be populated with actual audience intersection logic
      },
    }

    const audience = await this.createAudience(definition)

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audiences_combined', operator],
      doubles: [combinedSize],
      indexes: [audience.id],
    })

    return audience
  }

  /**
   * Get audience insights
   */
  async getAudienceInsights(audienceId: string): Promise<AudienceInsights> {
    const audience = await this.getAudience(audienceId)
    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`)
    }

    // Check cache first
    const cacheKey = `insights:${audienceId}`
    const cached = await this.env.AUDIENCES_KV.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Generate mock insights (in production, would fetch from analytics)
    const insights: AudienceInsights = {
      demographics: {
        age: {
          '18-24': 15,
          '25-34': 35,
          '35-44': 25,
          '45-54': 15,
          '55+': 10,
        },
        gender: {
          male: 48,
          female: 50,
          other: 2,
        },
        location: {
          'United States': 40,
          'United Kingdom': 15,
          Canada: 10,
          Other: 35,
        },
      },
      interests: [
        { name: 'Technology', score: 85, index: 170 },
        { name: 'E-commerce', score: 78, index: 156 },
        { name: 'Digital Marketing', score: 72, index: 144 },
        { name: 'Software', score: 68, index: 136 },
      ],
      behaviors: [
        { name: 'Online Shoppers', percentage: 75 },
        { name: 'Mobile Users', percentage: 88 },
        { name: 'Social Media Active', percentage: 65 },
      ],
      devices: {
        mobile: 55,
        desktop: 35,
        tablet: 10,
      },
      purchasePower: {
        low: 20,
        medium: 50,
        high: 30,
      },
      engagement: {
        highlyEngaged: 25,
        moderatelyEngaged: 50,
        lowEngaged: 25,
      },
    }

    // Cache for 6 hours
    await this.env.AUDIENCES_KV.put(cacheKey, JSON.stringify(insights), { expirationTtl: 21600 })

    return insights
  }

  /**
   * Get audience overlap analysis
   */
  async getAudienceOverlap(audienceIds: string[]): Promise<OverlapAnalysis> {
    if (audienceIds.length < 2) {
      throw new Error('Need at least 2 audiences for overlap analysis')
    }

    // Fetch all audiences
    const audiences = await Promise.all(audienceIds.map((id) => this.getAudience(id)))

    if (audiences.some((a) => !a)) {
      throw new Error('One or more audiences not found')
    }

    // Calculate overlap percentages (mock calculation)
    const overlaps: Array<{ audienceIds: string[]; size: number; percentage: number }> = []

    for (let i = 0; i < audiences.length; i++) {
      for (let j = i + 1; j < audiences.length; j++) {
        const a1 = audiences[i]!
        const a2 = audiences[j]!
        const minSize = Math.min(a1.size, a2.size)
        const overlapSize = Math.floor(minSize * 0.2) // Assume 20% overlap
        const overlapPercent = (overlapSize / minSize) * 100

        overlaps.push({
          audienceIds: [a1.id, a2.id],
          size: overlapSize,
          percentage: Math.round(overlapPercent * 100) / 100,
        })
      }
    }

    // Calculate unique sizes for each audience
    const unique = audiences.map((a) => {
      const overlapTotal = overlaps.filter((o) => o.audienceIds.includes(a!.id)).reduce((sum, o) => sum + o.size, 0)
      const uniqueSize = a!.size - Math.floor(overlapTotal / 2) // Estimate unique
      return {
        audienceId: a!.id,
        uniqueSize: Math.max(0, uniqueSize),
        percentage: Math.round((uniqueSize / a!.size) * 10000) / 100,
      }
    })

    const analysis: OverlapAnalysis = {
      audiences: audiences.map((a) => ({
        id: a!.id,
        name: a!.definition.name,
        size: a!.size,
      })),
      overlaps,
      unique,
    }

    return analysis
  }

  /**
   * Sync audience to platform
   */
  async syncAudienceToPlatform(audienceId: string, platform: AdPlatform): Promise<void> {
    const audience = await this.getAudience(audienceId)
    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`)
    }

    // Queue for platform sync
    await this.env.AUDIENCE_QUEUE.send({
      type: 'sync_to_platform',
      audienceId,
      platform,
    })

    // Update audience platforms
    if (!audience.platforms.includes(platform)) {
      audience.platforms.push(platform)
      await this.updateAudience(audienceId, audience.definition)
    }

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['audience_synced', platform],
      indexes: [audienceId],
    })
  }

  /**
   * Get audience by ID (helper method)
   */
  private async getAudience(audienceId: string): Promise<Audience | null> {
    // Check cache first
    const cached = await this.env.AUDIENCES_KV.get(`audience:${audienceId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.DB.prepare(`SELECT * FROM audiences WHERE id = ?`).bind(audienceId).first()

    if (!result) {
      return null
    }

    const audience: Audience = {
      id: result.id as string,
      definition: JSON.parse(result.definition as string),
      status: AudienceStatus.Active,
      size: result.size as number,
      platforms: [],
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }

    // Cache for 6 hours
    await this.env.AUDIENCES_KV.put(`audience:${audienceId}`, JSON.stringify(audience), { expirationTtl: 21600 })

    return audience
  }

  /**
   * Hash customer data for privacy (helper method)
   */
  private async hashCustomerData(data: any[], matchType: MatchType): Promise<string[]> {
    // In production, use SHA-256 hashing
    // For now, return mock hashed data
    return data.map((item) => {
      const value = typeof item === 'string' ? item : JSON.stringify(item)
      return `hashed_${matchType}_${value.substring(0, 8)}`
    })
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
  return c.json({ status: 'healthy', service: 'ads-audiences', timestamp: new Date().toISOString() })
})

// Create audience
app.post('/audiences', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.createAudience(body)
  return c.json({ success: true, data: audience })
})

// Get audience
app.get('/audiences/:id', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const audience = await service['getAudience'](c.req.param('id'))
  if (!audience) {
    return c.json({ success: false, error: 'Audience not found' }, 404)
  }
  return c.json({ success: true, data: audience })
})

// Update audience
app.put('/audiences/:id', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.updateAudience(c.req.param('id'), body)
  return c.json({ success: true, data: audience })
})

// Delete audience
app.delete('/audiences/:id', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  await service.deleteAudience(c.req.param('id'))
  return c.json({ success: true })
})

// Upload customer list
app.post('/audiences/upload', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.uploadCustomerList(body.list, body.name, body.description)
  return c.json({ success: true, data: audience })
})

// Create lookalike audience
app.post('/audiences/lookalike', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.createLookalikeAudience(body.sourceAudienceId, body.similarity, body.location)
  return c.json({ success: true, data: audience })
})

// Create retargeting audience
app.post('/audiences/retargeting', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.createRetargetingAudience(body.pixelId, body.rules)
  return c.json({ success: true, data: audience })
})

// Segment audience
app.post('/audiences/:id/segment', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const segments = await service.segmentAudience(c.req.param('id'), body.criteria)
  return c.json({ success: true, data: segments })
})

// Combine audiences
app.post('/audiences/combine', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const audience = await service.combineAudiences(body.audienceIds, body.operator)
  return c.json({ success: true, data: audience })
})

// Get audience insights
app.get('/audiences/:id/insights', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const insights = await service.getAudienceInsights(c.req.param('id'))
  return c.json({ success: true, data: insights })
})

// Get audience overlap
app.post('/audiences/overlap', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  const body = await c.req.json()
  const overlap = await service.getAudienceOverlap(body.audienceIds)
  return c.json({ success: true, data: overlap })
})

// Sync audience to platform
app.post('/audiences/:id/sync/:platform', async (c) => {
  const service = new AdsAudienceService({} as any, c.env)
  await service.syncAudienceToPlatform(c.req.param('id'), c.req.param('platform') as AdPlatform)
  return c.json({ success: true })
})

// Export worker
export default {
  fetch: app.fetch,
}
