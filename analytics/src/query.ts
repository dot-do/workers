/**
 * Query API Worker
 *
 * SQL API for querying time-series data from Analytics Engine and R2
 *
 * Features:
 * - Time-series queries with Analytics Engine
 * - Historical queries with R2 SQL
 * - Pre-built query templates
 * - Usage billing calculations
 * - Performance aggregations
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ==================== Types ====================

interface Env {
  ANALYTICS_ENGINE: AnalyticsEngineDataset
  R2_BUCKET: R2Bucket
  DB?: D1Database // For storing query templates and metadata
}

interface QueryRequest {
  // Time range
  start: string // ISO 8601
  end: string // ISO 8601

  // Filters
  event?: string
  userId?: string
  organizationId?: string
  sessionId?: string

  // Aggregation
  groupBy?: 'hour' | 'day' | 'week' | 'month'
  metrics?: string[] // ['count', 'avg_duration', 'p95_duration', 'sum_usage']

  // Pagination
  limit?: number
  offset?: number
}

interface QueryResponse {
  data: TimeSeriesDataPoint[]
  meta: {
    start: string
    end: string
    count: number
    hasMore: boolean
  }
}

interface TimeSeriesDataPoint {
  timestamp: string
  count: number
  [key: string]: string | number // Additional metrics
}

interface UsageBillingRequest {
  organizationId: string
  start: string
  end: string
  sku?: string
}

interface UsageBillingResponse {
  organizationId: string
  period: {
    start: string
    end: string
  }
  items: Array<{
    sku: string
    quantity: number
    unit: string
  }>
  total: {
    quantity: number
    cost?: number // Optional if pricing configured
  }
}

// ==================== RPC Service ====================

export class AnalyticsQueryService extends WorkerEntrypoint<Env> {
  /**
   * Query time-series data
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const start = new Date(request.start)
    const end = new Date(request.end)

    // Build SQL query for Analytics Engine
    const sql = this.buildAnalyticsQuery(request)

    // Execute query
    // Note: Analytics Engine SQL API is in beta - this is a conceptual example
    // In practice, you'd use the GraphQL API or REST API
    const data = await this.queryAnalyticsEngine(sql, start, end)

    return {
      data: data.slice(request.offset || 0, (request.offset || 0) + (request.limit || 100)),
      meta: {
        start: request.start,
        end: request.end,
        count: data.length,
        hasMore: data.length > (request.offset || 0) + (request.limit || 100),
      },
    }
  }

  /**
   * Calculate usage billing for an organization
   */
  async calculateUsageBilling(request: UsageBillingRequest): Promise<UsageBillingResponse> {
    const start = new Date(request.start)
    const end = new Date(request.end)

    // Query usage events
    const sql = `
      SELECT
        indexes[1] as sku,
        SUM(blobs[3]) as total_quantity
      FROM analytics_events
      WHERE timestamp >= ${start.getTime()}
        AND timestamp <= ${end.getTime()}
        AND indexes[0] = 'org:${request.organizationId}'
        AND event = 'usage.tracked'
        ${request.sku ? `AND indexes[1] = '${request.sku}'` : ''}
      GROUP BY indexes[1]
    `

    const results = await this.queryAnalyticsEngine(sql, start, end)

    const items = results.map((r: any) => ({
      sku: r.sku,
      quantity: r.total_quantity,
      unit: 'units', // Could be enriched from metadata
    }))

    return {
      organizationId: request.organizationId,
      period: {
        start: request.start,
        end: request.end,
      },
      items,
      total: {
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      },
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(request: {
    start: string
    end: string
    path?: string
    groupBy?: 'hour' | 'day'
  }): Promise<{
    data: Array<{
      timestamp: string
      count: number
      avg_duration: number
      p50_duration: number
      p95_duration: number
      p99_duration: number
      error_rate: number
    }>
  }> {
    const start = new Date(request.start)
    const end = new Date(request.end)

    const groupInterval = request.groupBy === 'day' ? 86400000 : 3600000 // milliseconds

    const sql = `
      SELECT
        FLOOR(timestamp / ${groupInterval}) * ${groupInterval} as bucket,
        COUNT(*) as total_requests,
        AVG(blobs[1]) as avg_duration,
        PERCENTILE(blobs[1], 0.5) as p50_duration,
        PERCENTILE(blobs[1], 0.95) as p95_duration,
        PERCENTILE(blobs[1], 0.99) as p99_duration,
        SUM(CASE WHEN blobs[2] >= 400 THEN 1 ELSE 0 END) / COUNT(*) as error_rate
      FROM analytics_events
      WHERE timestamp >= ${start.getTime()}
        AND timestamp <= ${end.getTime()}
        AND event = 'api.request'
        ${request.path ? `AND indexes[2] = 'path:${request.path}'` : ''}
      GROUP BY bucket
      ORDER BY bucket ASC
    `

    const results = await this.queryAnalyticsEngine(sql, start, end)

    return {
      data: results.map((r: any) => ({
        timestamp: new Date(r.bucket).toISOString(),
        count: r.total_requests,
        avg_duration: r.avg_duration,
        p50_duration: r.p50_duration,
        p95_duration: r.p95_duration,
        p99_duration: r.p99_duration,
        error_rate: r.error_rate,
      })),
    }
  }

  /**
   * Build Analytics Engine SQL query
   */
  private buildAnalyticsQuery(request: QueryRequest): string {
    const filters: string[] = []

    if (request.event) {
      filters.push(`event = '${request.event}'`)
    }

    if (request.userId) {
      filters.push(`indexes[0] = 'user:${request.userId}'`)
    }

    if (request.organizationId) {
      filters.push(`indexes[0] = 'org:${request.organizationId}'`)
    }

    if (request.sessionId) {
      filters.push(`indexes[1] = 'session:${request.sessionId}'`)
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''

    const groupInterval = this.getGroupInterval(request.groupBy || 'hour')

    return `
      SELECT
        FLOOR(timestamp / ${groupInterval}) * ${groupInterval} as bucket,
        COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ${new Date(request.start).getTime()}
        AND timestamp <= ${new Date(request.end).getTime()}
        ${whereClause}
      GROUP BY bucket
      ORDER BY bucket ASC
    `
  }

  /**
   * Get grouping interval in milliseconds
   */
  private getGroupInterval(groupBy: string): number {
    switch (groupBy) {
      case 'hour':
        return 3600000
      case 'day':
        return 86400000
      case 'week':
        return 604800000
      case 'month':
        return 2592000000
      default:
        return 3600000
    }
  }

  /**
   * Execute Analytics Engine query
   * Note: This is a conceptual example - actual implementation depends on the Analytics Engine API
   */
  private async queryAnalyticsEngine(sql: string, start: Date, end: Date): Promise<any[]> {
    // In a real implementation, this would use the Analytics Engine GraphQL or REST API
    // For now, return mock data
    console.log('[Query] Executing SQL:', sql)

    // Mock response
    return []
  }

  /**
   * Query historical data from R2 using SQL API
   */
  async queryR2(sql: string): Promise<any[]> {
    // Use R2 SQL API to query Parquet files
    // This is a conceptual example - R2 SQL is in development
    const response = await this.env.R2_BUCKET.list({
      prefix: 'analytics/',
    })

    // Would execute SQL query against Parquet files
    return []
  }
}

// ==================== HTTP Interface ====================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Health check
app.get('/health', c => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Query time-series data
app.post('/query', async c => {
  try {
    const request = (await c.req.json()) as QueryRequest

    const service = new AnalyticsQueryService(c.env.ctx, c.env)
    const result = await service.query(request)

    return c.json(result)
  } catch (error) {
    console.error('[Query] Error:', error)
    return c.json(
      {
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// Calculate usage billing
app.post('/billing/usage', async c => {
  try {
    const request = (await c.req.json()) as UsageBillingRequest

    const service = new AnalyticsQueryService(c.env.ctx, c.env)
    const result = await service.calculateUsageBilling(request)

    return c.json(result)
  } catch (error) {
    console.error('[Query] Billing error:', error)
    return c.json(
      {
        error: 'Billing calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// Get performance metrics
app.post('/metrics/performance', async c => {
  try {
    const request = await c.req.json()

    const service = new AnalyticsQueryService(c.env.ctx, c.env)
    const result = await service.getPerformanceMetrics(request)

    return c.json(result)
  } catch (error) {
    console.error('[Query] Metrics error:', error)
    return c.json(
      {
        error: 'Metrics query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// ==================== Pre-built Query Templates ====================

// Top users by request count
app.get('/templates/top-users', async c => {
  const start = c.req.query('start') || new Date(Date.now() - 86400000).toISOString()
  const end = c.req.query('end') || new Date().toISOString()

  const service = new AnalyticsQueryService(c.env.ctx, c.env)
  const sql = `
    SELECT
      indexes[0] as user_id,
      COUNT(*) as request_count
    FROM analytics_events
    WHERE timestamp >= ${new Date(start).getTime()}
      AND timestamp <= ${new Date(end).getTime()}
      AND event = 'api.request'
    GROUP BY indexes[0]
    ORDER BY request_count DESC
    LIMIT 100
  `

  // Execute query (conceptual)
  return c.json({ data: [], meta: { start, end } })
})

// Error rate by endpoint
app.get('/templates/error-rates', async c => {
  const start = c.req.query('start') || new Date(Date.now() - 86400000).toISOString()
  const end = c.req.query('end') || new Date().toISOString()

  const service = new AnalyticsQueryService(c.env.ctx, c.env)
  const sql = `
    SELECT
      indexes[2] as endpoint,
      COUNT(*) as total,
      SUM(CASE WHEN blobs[2] >= 400 THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN blobs[2] >= 400 THEN 1 ELSE 0 END) / COUNT(*) as error_rate
    FROM analytics_events
    WHERE timestamp >= ${new Date(start).getTime()}
      AND timestamp <= ${new Date(end).getTime()}
      AND event = 'api.request'
    GROUP BY indexes[2]
    ORDER BY error_rate DESC
  `

  return c.json({ data: [], meta: { start, end } })
})

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}
