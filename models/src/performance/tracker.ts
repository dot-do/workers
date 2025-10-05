import type { D1Database, AnalyticsEngineDataset } from '@cloudflare/workers-types'
import type { ModelMetric } from '../types/schema'
import { ulid } from 'ulid'

export class PerformanceTracker {
  constructor(private db: D1Database, private analytics?: AnalyticsEngineDataset) {}

  // Record a metric
  async recordMetric(
    modelId: string,
    metricType: 'accuracy' | 'latency' | 'cost' | 'quality_score' | 'throughput',
    value: number,
    context?: Record<string, any>
  ): Promise<ModelMetric> {
    const id = ulid()
    const now = Math.floor(Date.now() / 1000)
    const contextJson = context ? JSON.stringify(context) : null

    await this.db
      .prepare(
        `INSERT INTO model_metrics (id, model_id, metric_type, metric_value, context, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, modelId, metricType, value, contextJson, now)
      .run()

    // Also send to Analytics Engine for time-series queries
    if (this.analytics) {
      this.analytics.writeDataPoint({
        blobs: [modelId, metricType],
        doubles: [value],
        indexes: [modelId]
      })
    }

    return {
      id,
      model_id: modelId,
      metric_type: metricType,
      metric_value: value,
      context,
      recorded_at: now
    }
  }

  // Get metrics for a model
  async getMetrics(
    modelId: string,
    metricType?: string,
    startTime?: number,
    endTime?: number
  ): Promise<ModelMetric[]> {
    let query = 'SELECT * FROM model_metrics WHERE model_id = ?'
    const params: any[] = [modelId]

    if (metricType) {
      query += ' AND metric_type = ?'
      params.push(metricType)
    }

    if (startTime) {
      query += ' AND recorded_at >= ?'
      params.push(startTime)
    }

    if (endTime) {
      query += ' AND recorded_at <= ?'
      params.push(endTime)
    }

    query += ' ORDER BY recorded_at DESC'

    const result = await this.db.prepare(query).bind(...params).all()

    return result.results.map((row) => ({
      id: row.id,
      model_id: row.model_id,
      metric_type: row.metric_type as any,
      metric_value: row.metric_value,
      context: row.context ? JSON.parse(row.context) : undefined,
      recorded_at: row.recorded_at
    }))
  }

  // Get aggregated statistics
  async getStatistics(
    modelId: string,
    metricType: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    avg: number
    min: number
    max: number
    count: number
    p50: number
    p95: number
    p99: number
  }> {
    let query = `
      SELECT 
        AVG(metric_value) as avg,
        MIN(metric_value) as min,
        MAX(metric_value) as max,
        COUNT(*) as count
      FROM model_metrics 
      WHERE model_id = ? AND metric_type = ?
    `
    const params: any[] = [modelId, metricType]

    if (startTime) {
      query += ' AND recorded_at >= ?'
      params.push(startTime)
    }

    if (endTime) {
      query += ' AND recorded_at <= ?'
      params.push(endTime)
    }

    const result = await this.db.prepare(query).bind(...params).first()

    // Get percentiles (approximation using LIMIT/OFFSET)
    const percentileQuery = `
      SELECT metric_value 
      FROM model_metrics 
      WHERE model_id = ? AND metric_type = ?
      ORDER BY metric_value
    `
    const allValues = await this.db.prepare(percentileQuery).bind(modelId, metricType).all()

    const values = allValues.results.map((r) => r.metric_value as number).sort((a, b) => a - b)
    const p50 = values[Math.floor(values.length * 0.5)] || 0
    const p95 = values[Math.floor(values.length * 0.95)] || 0
    const p99 = values[Math.floor(values.length * 0.99)] || 0

    return {
      avg: result?.avg || 0,
      min: result?.min || 0,
      max: result?.max || 0,
      count: result?.count || 0,
      p50,
      p95,
      p99
    }
  }

  // Compare models performance
  async compareModels(
    modelIds: string[],
    metricType: string,
    startTime?: number,
    endTime?: number
  ): Promise<
    Array<{
      model_id: string
      avg: number
      min: number
      max: number
      count: number
    }>
  > {
    const results = []

    for (const modelId of modelIds) {
      const stats = await this.getStatistics(modelId, metricType, startTime, endTime)
      results.push({
        model_id: modelId,
        avg: stats.avg,
        min: stats.min,
        max: stats.max,
        count: stats.count
      })
    }

    return results
  }

  // Track inference performance
  async trackInference(modelId: string, latencyMs: number, tokensGenerated?: number, cost?: number): Promise<void> {
    await this.recordMetric(modelId, 'latency', latencyMs, {
      tokens: tokensGenerated
    })

    if (cost) {
      await this.recordMetric(modelId, 'cost', cost, {
        tokens: tokensGenerated
      })
    }

    if (tokensGenerated) {
      const throughput = (tokensGenerated / latencyMs) * 1000 // tokens per second
      await this.recordMetric(modelId, 'throughput', throughput)
    }
  }
}
