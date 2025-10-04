/**
 * Ads Creative Optimizer Worker
 * Creative management, A/B testing, and performance optimization
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  AdFormat,
  CreativeStatus,
  AssetType,
  CreativeRecommendationType,
  type AdPlatform,
  type Creative,
  type Asset,
  type AdCopy,
  type CreativeTest,
  type TestResults,
  type DCOCampaign,
  type DCOComponents,
  type DCORules,
  type CreativeVariation,
  type CreativePerformance,
  type CreativeRecommendation,
  type AssetFilters,
  type AssetMetadata,
  type AssetPerformance,
} from '@dot-do/ads-types'

/**
 * Environment bindings
 */
export interface Env {
  // KV namespace for caching
  CREATIVES_KV: KVNamespace

  // D1 database for creative storage
  DB: D1Database

  // R2 bucket for asset uploads
  ASSETS: R2Bucket

  // Queue for async operations
  CREATIVE_QUEUE: Queue

  // Analytics Engine for event tracking
  ANALYTICS: AnalyticsEngineDataset

  // Service bindings
  ADS_CAMPAIGNS?: any
  ADS_ANALYTICS?: any
}

/**
 * Creative Optimizer RPC Service
 */
export class AdsCreativeService extends WorkerEntrypoint<Env> {
  /**
   * Upload asset
   */
  async uploadAsset(file: ArrayBuffer, metadata: AssetMetadata): Promise<Asset> {
    const assetId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Upload to R2
    const filename = `${assetId}.${metadata.type === AssetType.Image ? 'jpg' : 'mp4'}`
    await this.env.ASSETS.put(`assets/${filename}`, file)

    const asset: Asset = {
      id: assetId,
      type: metadata.type,
      name: metadata.name,
      url: `https://assets.example.com/${filename}`,
      metadata: {
        fileSize: file.byteLength,
      },
      tags: metadata.tags || [],
      platform: metadata.platform,
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO assets (id, type, name, url, metadata, tags, platform, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        assetId,
        metadata.type,
        metadata.name,
        asset.url,
        JSON.stringify(asset.metadata),
        JSON.stringify(asset.tags),
        metadata.platform,
        now,
        now
      )
      .run()

    // Cache in KV (24 hours TTL)
    await this.env.CREATIVES_KV.put(`asset:${assetId}`, JSON.stringify(asset), { expirationTtl: 86400 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['asset_uploaded', metadata.type],
      doubles: [file.byteLength],
      indexes: [assetId],
    })

    return asset
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<Asset | null> {
    // Check cache first
    const cached = await this.env.CREATIVES_KV.get(`asset:${assetId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.DB.prepare(`SELECT * FROM assets WHERE id = ?`).bind(assetId).first()

    if (!result) {
      return null
    }

    const asset: Asset = {
      id: result.id as string,
      type: result.type as AssetType,
      name: result.name as string,
      url: result.url as string,
      metadata: JSON.parse(result.metadata as string),
      tags: JSON.parse(result.tags as string),
      platform: result.platform as AdPlatform | undefined,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }

    // Cache for 24 hours
    await this.env.CREATIVES_KV.put(`asset:${assetId}`, JSON.stringify(asset), { expirationTtl: 86400 })

    return asset
  }

  /**
   * List assets with filters
   */
  async listAssets(filters?: AssetFilters, limit = 50, offset = 0): Promise<{ assets: Asset[]; total: number }> {
    let query = 'SELECT * FROM assets WHERE 1=1'
    const bindings: any[] = []

    if (filters?.type) {
      query += ' AND type = ?'
      bindings.push(filters.type)
    }

    if (filters?.platform) {
      query += ' AND platform = ?'
      bindings.push(filters.platform)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    bindings.push(limit, offset)

    const results = await this.env.DB.prepare(query).bind(...bindings).all()

    const assets: Asset[] = (results.results || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      url: row.url,
      metadata: JSON.parse(row.metadata),
      tags: JSON.parse(row.tags),
      platform: row.platform,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    // Get total count
    const countResult = await this.env.DB.prepare('SELECT COUNT(*) as count FROM assets').first()
    const total = (countResult?.count as number) || 0

    return { assets, total }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`)
    }

    // Delete from D1
    await this.env.DB.prepare(`DELETE FROM assets WHERE id = ?`).bind(assetId).run()

    // Delete from cache
    await this.env.CREATIVES_KV.delete(`asset:${assetId}`)

    // Delete from R2 (async via queue)
    await this.env.CREATIVE_QUEUE.send({
      type: 'delete_asset_file',
      assetId,
      url: asset.url,
    })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['asset_deleted', asset.type],
      indexes: [assetId],
    })
  }

  /**
   * Create creative
   */
  async createCreative(
    name: string,
    format: AdFormat,
    platform: AdPlatform,
    copy: AdCopy,
    assetIds: string[],
    campaignId?: string
  ): Promise<Creative> {
    const creativeId = crypto.randomUUID()
    const now = new Date().toISOString()

    const creative: Creative = {
      id: creativeId,
      campaignId,
      name,
      format,
      platform,
      status: CreativeStatus.Draft,
      copy,
      assets: assetIds,
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO creatives (id, campaign_id, name, format, platform, status, copy, assets, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(creativeId, campaignId, name, format, platform, CreativeStatus.Draft, JSON.stringify(copy), JSON.stringify(assetIds), now, now)
      .run()

    // Cache in KV (1 hour TTL)
    await this.env.CREATIVES_KV.put(`creative:${creativeId}`, JSON.stringify(creative), { expirationTtl: 3600 })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['creative_created', format, platform],
      indexes: [creativeId],
    })

    return creative
  }

  /**
   * Update creative
   */
  async updateCreative(creativeId: string, updates: Partial<Creative>): Promise<Creative> {
    const creative = await this.getCreative(creativeId)
    if (!creative) {
      throw new Error(`Creative ${creativeId} not found`)
    }

    const updatedCreative: Creative = {
      ...creative,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update D1
    await this.env.DB.prepare(
      `UPDATE creatives
       SET name = ?, status = ?, copy = ?, assets = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        updatedCreative.name,
        updatedCreative.status,
        JSON.stringify(updatedCreative.copy),
        JSON.stringify(updatedCreative.assets),
        updatedCreative.updatedAt,
        creativeId
      )
      .run()

    // Update cache
    await this.env.CREATIVES_KV.put(`creative:${creativeId}`, JSON.stringify(updatedCreative), { expirationTtl: 3600 })

    return updatedCreative
  }

  /**
   * Delete creative
   */
  async deleteCreative(creativeId: string): Promise<void> {
    const creative = await this.getCreative(creativeId)
    if (!creative) {
      throw new Error(`Creative ${creativeId} not found`)
    }

    // Delete from D1
    await this.env.DB.prepare(`DELETE FROM creatives WHERE id = ?`).bind(creativeId).run()

    // Delete from cache
    await this.env.CREATIVES_KV.delete(`creative:${creativeId}`)

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['creative_deleted', creative.format],
      indexes: [creativeId],
    })
  }

  /**
   * Get creative by ID
   */
  async getCreative(creativeId: string): Promise<Creative | null> {
    // Check cache first
    const cached = await this.env.CREATIVES_KV.get(`creative:${creativeId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from D1
    const result = await this.env.DB.prepare(`SELECT * FROM creatives WHERE id = ?`).bind(creativeId).first()

    if (!result) {
      return null
    }

    const creative: Creative = {
      id: result.id as string,
      campaignId: result.campaign_id as string | undefined,
      name: result.name as string,
      format: result.format as AdFormat,
      platform: result.platform as AdPlatform,
      status: result.status as CreativeStatus,
      copy: JSON.parse(result.copy as string),
      assets: JSON.parse(result.assets as string),
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }

    // Cache for 1 hour
    await this.env.CREATIVES_KV.put(`creative:${creativeId}`, JSON.stringify(creative), { expirationTtl: 3600 })

    return creative
  }

  /**
   * Create A/B test
   */
  async createTest(name: string, campaignId: string, variants: CreativeVariation[]): Promise<CreativeTest> {
    const testId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Validate allocations sum to 100
    const totalAllocation = variants.reduce((sum, v: CreativeVariation) => sum + v.allocation, 0)
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(`Total allocation must equal 100% (got ${totalAllocation}%)`)
    }

    const test: CreativeTest = {
      id: testId,
      name,
      campaignId,
      variants,
      status: 'running',
      startedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO creative_tests (id, name, campaign_id, variants, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(testId, name, campaignId, JSON.stringify(variants), 'running', now)
      .run()

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['test_created'],
      doubles: [variants.length],
      indexes: [testId],
    })

    return test
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<TestResults> {
    // Fetch test
    const testResult = await this.env.DB.prepare(`SELECT * FROM creative_tests WHERE id = ?`).bind(testId).first()

    if (!testResult) {
      throw new Error(`Test ${testId} not found`)
    }

    const variants = JSON.parse(testResult.variants as string)

    // Mock performance data (in production, would fetch from analytics)
    const results: TestResults = {
      testId,
      variants: variants.map((v: CreativeVariation) => ({
        id: v.id,
        name: v.name,
        performance: {
          impressions: Math.floor(Math.random() * 100000) + 50000,
          clicks: Math.floor(Math.random() * 5000) + 1000,
          conversions: Math.floor(Math.random() * 500) + 100,
          spend: Math.random() * 10000 + 5000,
          ctr: 0,
          cpc: 0,
          cpa: 0,
          conversionRate: 0,
          score: Math.floor(Math.random() * 30) + 70,
          dateFrom: testResult.started_at as string,
          dateTo: new Date().toISOString(),
        },
        sampleSize: Math.floor(Math.random() * 100000) + 50000,
      })),
      recommendations: [
        'Variant A shows 15% higher CTR - consider scaling',
        'Variant B has better conversion rate but lower volume',
        'Test additional headline variations',
      ],
      statisticalSignificance: true,
    }

    // Calculate derived metrics
    results.variants.forEach((v) => {
      v.performance.ctr = (v.performance.clicks / v.performance.impressions) * 100
      v.performance.cpc = v.performance.spend / v.performance.clicks
      v.performance.cpa = v.performance.spend / v.performance.conversions
      v.performance.conversionRate = (v.performance.conversions / v.performance.clicks) * 100
    })

    // Determine winner (highest score)
    const sortedVariants = [...results.variants].sort((a, b) => b.performance.score - a.performance.score)
    if (sortedVariants.length > 1) {
      const winner = sortedVariants[0]
      const control = sortedVariants[1]
      results.winner = {
        id: winner.id,
        confidence: 0.95, // Mock confidence
        improvement: ((winner.performance.score - control.performance.score) / control.performance.score) * 100,
      }
    }

    return results
  }

  /**
   * Stop test and select winner
   */
  async stopTest(testId: string, winnerId?: string): Promise<void> {
    const now = new Date().toISOString()

    await this.env.DB.prepare(`UPDATE creative_tests SET status = ?, ended_at = ?, winner = ? WHERE id = ?`)
      .bind('completed', now, winnerId, testId)
      .run()

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['test_completed'],
      indexes: [testId],
    })
  }

  /**
   * Create DCO campaign
   */
  async createDCOCampaign(campaignId: string, components: DCOComponents, rules: DCORules): Promise<DCOCampaign> {
    const dcoId = crypto.randomUUID()
    const now = new Date().toISOString()

    const dco: DCOCampaign = {
      id: dcoId,
      campaignId,
      components,
      rules,
      status: 'active',
      createdAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO dco_campaigns (id, campaign_id, components, rules, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(dcoId, campaignId, JSON.stringify(components), JSON.stringify(rules), 'active', now)
      .run()

    // Queue for combination generation
    await this.env.CREATIVE_QUEUE.send({
      type: 'generate_dco_combinations',
      dcoId,
      components,
    })

    // Track event
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['dco_created'],
      doubles: [components.headlines.length + components.descriptions.length + components.images.length],
      indexes: [dcoId],
    })

    return dco
  }

  /**
   * Get creative recommendations
   */
  async getCreativeRecommendations(campaignId: string): Promise<CreativeRecommendation[]> {
    // Mock recommendations (in production, would use ML model)
    const recommendations: CreativeRecommendation[] = [
      {
        type: CreativeRecommendationType.RefreshCreative,
        title: 'Refresh Creative Assets',
        description: 'Your top-performing creative has been running for 30+ days. Consider refreshing to combat ad fatigue.',
        priority: 'high',
        estimatedImpact: {
          metric: 'CTR',
          improvementPercent: 12,
        },
        actionSteps: ['Upload new image variants', 'Test updated headlines', 'Rotate out stale creative'],
      },
      {
        type: CreativeRecommendationType.TestNewVariation,
        title: 'Test New Headline Variations',
        description: 'Your current headlines focus on features. Test benefit-driven messaging.',
        priority: 'medium',
        estimatedImpact: {
          metric: 'Conversion Rate',
          improvementPercent: 8,
        },
        actionSteps: ['Create 3-5 benefit-focused headlines', 'Run A/B test with 20% traffic split', 'Monitor for 7 days'],
      },
      {
        type: CreativeRecommendationType.AddAssets,
        title: 'Expand Image Library',
        description: 'Campaigns with 10+ images perform 23% better on average.',
        priority: 'medium',
        estimatedImpact: {
          metric: 'Impressions',
          improvementPercent: 23,
        },
        actionSteps: ['Upload 5-10 additional images', 'Ensure variety in composition', 'Test different aspect ratios'],
      },
    ]

    return recommendations
  }

  /**
   * Update asset performance
   */
  async updateAssetPerformance(assetId: string, performance: AssetPerformance): Promise<void> {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`)
    }

    asset.performance = performance
    asset.updatedAt = new Date().toISOString()

    // Update D1
    await this.env.DB.prepare(`UPDATE assets SET performance = ?, updated_at = ? WHERE id = ?`)
      .bind(JSON.stringify(performance), asset.updatedAt, assetId)
      .run()

    // Update cache
    await this.env.CREATIVES_KV.put(`asset:${assetId}`, JSON.stringify(asset), { expirationTtl: 86400 })
  }

  /**
   * Get creative performance
   */
  async getCreativePerformance(creativeId: string, dateFrom: string, dateTo: string): Promise<CreativePerformance> {
    // Mock performance data (in production, would fetch from analytics service)
    const performance: CreativePerformance = {
      impressions: Math.floor(Math.random() * 500000) + 100000,
      clicks: Math.floor(Math.random() * 25000) + 5000,
      conversions: Math.floor(Math.random() * 2500) + 500,
      spend: Math.random() * 50000 + 10000,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      conversionRate: 0,
      score: Math.floor(Math.random() * 30) + 70,
      dateFrom,
      dateTo,
    }

    // Calculate derived metrics
    performance.ctr = (performance.clicks / performance.impressions) * 100
    performance.cpc = performance.spend / performance.clicks
    performance.cpa = performance.spend / performance.conversions
    performance.conversionRate = (performance.conversions / performance.clicks) * 100

    return performance
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
  return c.json({ status: 'healthy', service: 'ads-creatives', timestamp: new Date().toISOString() })
})

// Assets
app.post('/assets', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const formData = await c.req.formData()
  const fileEntry = formData.get('file')
  const metadata = JSON.parse((formData.get('metadata') as string) || '{}')

  if (!fileEntry || typeof fileEntry === 'string') {
    return c.json({ success: false, error: 'File is required' }, 400)
  }

  const file = fileEntry as File
  const buffer = await file.arrayBuffer()
  const asset = await service.uploadAsset(buffer, metadata)
  return c.json({ success: true, data: asset })
})

app.get('/assets/:id', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const asset = await service.getAsset(c.req.param('id'))
  if (!asset) {
    return c.json({ success: false, error: 'Asset not found' }, 404)
  }
  return c.json({ success: true, data: asset })
})

app.get('/assets', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const query = c.req.query()
  const filters: AssetFilters = {}
  if (query.type) filters.type = query.type as AssetType
  if (query.platform) filters.platform = query.platform as AdPlatform

  const limit = parseInt(query.limit || '50')
  const offset = parseInt(query.offset || '0')

  const result = await service.listAssets(filters, limit, offset)
  return c.json({ success: true, data: result })
})

app.delete('/assets/:id', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  await service.deleteAsset(c.req.param('id'))
  return c.json({ success: true })
})

// Creatives
app.post('/creatives', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const body = await c.req.json()
  const creative = await service.createCreative(body.name, body.format, body.platform, body.copy, body.assets, body.campaignId)
  return c.json({ success: true, data: creative })
})

app.get('/creatives/:id', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const creative = await service.getCreative(c.req.param('id'))
  if (!creative) {
    return c.json({ success: false, error: 'Creative not found' }, 404)
  }
  return c.json({ success: true, data: creative })
})

app.put('/creatives/:id', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const body = await c.req.json()
  const creative = await service.updateCreative(c.req.param('id'), body)
  return c.json({ success: true, data: creative })
})

app.delete('/creatives/:id', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  await service.deleteCreative(c.req.param('id'))
  return c.json({ success: true })
})

app.get('/creatives/:id/performance', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const query = c.req.query()
  const performance = await service.getCreativePerformance(c.req.param('id'), query.dateFrom || '', query.dateTo || '')
  return c.json({ success: true, data: performance })
})

// Tests
app.post('/tests', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const body = await c.req.json()
  const test = await service.createTest(body.name, body.campaignId, body.variants)
  return c.json({ success: true, data: test })
})

app.get('/tests/:id/results', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const results = await service.getTestResults(c.req.param('id'))
  return c.json({ success: true, data: results })
})

app.post('/tests/:id/stop', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const body = await c.req.json()
  await service.stopTest(c.req.param('id'), body.winnerId)
  return c.json({ success: true })
})

// DCO
app.post('/dco', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const body = await c.req.json()
  const dco = await service.createDCOCampaign(body.campaignId, body.components, body.rules)
  return c.json({ success: true, data: dco })
})

// Recommendations
app.get('/campaigns/:id/recommendations', async (c) => {
  const service = new AdsCreativeService({} as any, c.env)
  const recommendations = await service.getCreativeRecommendations(c.req.param('id'))
  return c.json({ success: true, data: recommendations })
})

// Export worker
export default {
  fetch: app.fetch,
}
