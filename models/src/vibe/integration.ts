import type { D1Database } from '@cloudflare/workers-types'
import type { ModelCost, VibeModelComparison } from '../types/schema'
import { ulid } from 'ulid'
import { PerformanceTracker } from '../performance/tracker'

// Based on https://blog.cloudflare.com/deploy-your-own-ai-vibe-coding-platform/
export class VibeCodingIntegration {
  private perfTracker: PerformanceTracker

  constructor(private db: D1Database) {
    this.perfTracker = new PerformanceTracker(db)
  }

  // Track AI Gateway request (vibe coding platform)
  async trackAIRequest(data: {
    model_id: string
    provider: string
    model_name: string
    latency_ms: number
    tokens_input: number
    tokens_output: number
    cost_usd: number
    quality_score?: number // User feedback or automated evaluation
  }): Promise<void> {
    // Track cost
    await this.recordCost({
      model_id: data.model_id,
      provider: data.provider,
      cost_type: 'inference',
      amount: data.cost_usd,
      currency: 'USD',
      usage_data: {
        tokens: data.tokens_input + data.tokens_output,
        requests: 1
      }
    })

    // Track performance
    await this.perfTracker.trackInference(data.model_id, data.latency_ms, data.tokens_output, data.cost_usd)

    // Track quality if provided
    if (data.quality_score !== undefined) {
      await this.perfTracker.recordMetric(data.model_id, 'quality_score', data.quality_score, {
        provider: data.provider,
        model_name: data.model_name
      })
    }
  }

  // Record cost
  async recordCost(cost: Omit<ModelCost, 'id' | 'recorded_at'>): Promise<ModelCost> {
    const id = ulid()
    const now = Math.floor(Date.now() / 1000)

    await this.db
      .prepare(
        `INSERT INTO model_costs (id, model_id, provider, cost_type, amount, currency, usage_data, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, cost.model_id, cost.provider, cost.cost_type, cost.amount, cost.currency, JSON.stringify(cost.usage_data), now)
      .run()

    return {
      id,
      ...cost,
      recorded_at: now
    }
  }

  // Get cost summary for a model
  async getCostSummary(
    modelId: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    total_cost: number
    by_provider: Record<string, number>
    by_type: Record<string, number>
    total_requests: number
    total_tokens: number
  }> {
    let query = 'SELECT * FROM model_costs WHERE model_id = ?'
    const params: any[] = [modelId]

    if (startTime) {
      query += ' AND recorded_at >= ?'
      params.push(startTime)
    }

    if (endTime) {
      query += ' AND recorded_at <= ?'
      params.push(endTime)
    }

    const result = await this.db.prepare(query).bind(...params).all()

    let total = 0
    const byProvider: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let totalRequests = 0
    let totalTokens = 0

    for (const row of result.results) {
      const amount = row.amount as number
      const provider = row.provider as string
      const costType = row.cost_type as string
      const usageData = row.usage_data ? JSON.parse(row.usage_data as string) : {}

      total += amount
      byProvider[provider] = (byProvider[provider] || 0) + amount
      byType[costType] = (byType[costType] || 0) + amount

      if (usageData.requests) totalRequests += usageData.requests
      if (usageData.tokens) totalTokens += usageData.tokens
    }

    return {
      total_cost: total,
      by_provider: byProvider,
      by_type: byType,
      total_requests: totalRequests,
      total_tokens: totalTokens
    }
  }

  // Compare multiple models (A/B testing)
  async compareModels(
    experimentId: string,
    modelIds: string[],
    startTime?: number,
    endTime?: number
  ): Promise<VibeModelComparison> {
    const models = []

    for (const modelId of modelIds) {
      // Get performance stats
      const qualityStats = await this.perfTracker.getStatistics(modelId, 'quality_score', startTime, endTime)
      const latencyStats = await this.perfTracker.getStatistics(modelId, 'latency', startTime, endTime)

      // Get cost summary
      const costSummary = await this.getCostSummary(modelId, startTime, endTime)

      // Get model metadata
      const modelThing = await this.db.prepare('SELECT * FROM things WHERE id = ?').bind(modelId).first()

      const metadata = modelThing?.metadata ? JSON.parse(modelThing.metadata as string) : {}

      models.push({
        model_id: modelId,
        provider: metadata.provider || 'unknown',
        model_name: metadata.model_name || 'unknown',
        avg_quality: qualityStats.avg,
        avg_latency: latencyStats.avg,
        total_cost: costSummary.total_cost,
        sample_count: qualityStats.count
      })
    }

    // Determine winner (best quality/cost ratio)
    let winner: string | undefined
    let bestScore = -Infinity

    for (const model of models) {
      if (model.total_cost > 0) {
        const score = model.avg_quality / model.total_cost
        if (score > bestScore) {
          bestScore = score
          winner = model.model_id
        }
      }
    }

    return {
      experiment_id: experimentId,
      models,
      winner,
      created_at: Math.floor(Date.now() / 1000)
    }
  }

  // Get cost trends over time
  async getCostTrends(
    modelId: string,
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<
    Array<{
      timestamp: number
      cost: number
      requests: number
      tokens: number
    }>
  > {
    // Group by time bucket
    const interval = granularity === 'hour' ? 3600 : granularity === 'day' ? 86400 : 604800

    const result = await this.db
      .prepare(
        `
      SELECT 
        (recorded_at / ?) * ? as bucket,
        SUM(amount) as total_cost,
        SUM(json_extract(usage_data, '$.requests')) as total_requests,
        SUM(json_extract(usage_data, '$.tokens')) as total_tokens
      FROM model_costs
      WHERE model_id = ?
      GROUP BY bucket
      ORDER BY bucket ASC
    `
      )
      .bind(interval, interval, modelId)
      .all()

    return result.results.map((row) => ({
      timestamp: row.bucket as number,
      cost: row.total_cost as number,
      requests: row.total_requests as number,
      tokens: row.total_tokens as number
    }))
  }

  // Get ROI analysis
  async getROI(
    modelId: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    total_cost: number
    cost_per_request: number
    cost_per_token: number
    avg_quality: number
    value_score: number // quality / cost
  }> {
    const costSummary = await this.getCostSummary(modelId, startTime, endTime)
    const qualityStats = await this.perfTracker.getStatistics(modelId, 'quality_score', startTime, endTime)

    const costPerRequest = costSummary.total_requests > 0 ? costSummary.total_cost / costSummary.total_requests : 0
    const costPerToken = costSummary.total_tokens > 0 ? costSummary.total_cost / costSummary.total_tokens : 0
    const valueScore = costSummary.total_cost > 0 ? qualityStats.avg / costSummary.total_cost : 0

    return {
      total_cost: costSummary.total_cost,
      cost_per_request: costPerRequest,
      cost_per_token: costPerToken,
      avg_quality: qualityStats.avg,
      value_score: valueScore
    }
  }
}
