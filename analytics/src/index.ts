/**
 * Analytics Worker - Real-Time Analytics for Services.Delivery
 *
 * Features:
 * - Event ingestion via POST /track
 * - Real-time aggregation with KV cache
 * - Query API for dashboards
 * - SSE for live updates
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, AnalyticsEvent, QueryParams } from './types'
import { writeEvent, batchWriteEvents } from './writers'
import { getServiceMetrics, getRevenueMetrics, getMarketplaceMetrics, getExperimentMetrics, getUserMetrics } from './queries'
import { updateRealtimeCounters } from './aggregators/real-time'
import { executeR2Query, resultToCSV, resultToJSON, listTables, getTableStats, DomainQueries } from './r2-sql'
import { trackDomainEvent, getDomainAnalyticsSummary, type DomainAnalyticsEvent } from './domain-analytics'
import { getErrorSummary, getErrorTimeSeries, getErrorTrends, generateAlerts, getErrorsByService, getErrorDistribution, ErrorQueries } from './error-analytics'

const app = new Hono<{ Bindings: Env }>()

// CORS for dashboard access
app.use('/*', cors({
  origin: ['https://admin.services.delivery', 'http://localhost:3000'],
  credentials: true,
}))

/**
 * Health Check
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'analytics', timestamp: Date.now() })
})

/**
 * Track Single Event
 * POST /track
 */
app.post('/track', async (c) => {
  try {
    const event: AnalyticsEvent = await c.req.json()

    // Write to Analytics Engine (non-blocking)
    writeEvent(c.env.ANALYTICS, event)

    // Update real-time counters in KV
    await updateRealtimeCounters(c.env.ANALYTICS_KV, event)

    return c.json({ success: true })
  } catch (error) {
    console.error('Error tracking event:', error)
    return c.json({ error: 'Failed to track event' }, 500)
  }
})

/**
 * Track Batch Events
 * POST /track/batch
 */
app.post('/track/batch', async (c) => {
  try {
    const events: AnalyticsEvent[] = await c.req.json()

    if (events.length > 25) {
      return c.json({ error: 'Batch size limit exceeded (max 25)' }, 400)
    }

    // Write to Analytics Engine (non-blocking)
    batchWriteEvents(c.env.ANALYTICS, events)

    // Update real-time counters
    for (const event of events) {
      await updateRealtimeCounters(c.env.ANALYTICS_KV, event)
    }

    return c.json({ success: true, count: events.length })
  } catch (error) {
    console.error('Error tracking batch:', error)
    return c.json({ error: 'Failed to track batch' }, 500)
  }
})

/**
 * Query Service Metrics
 * GET /metrics/services
 */
app.get('/metrics/services', async (c) => {
  try {
    const params: QueryParams = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      serviceId: c.req.query('serviceId'),
      granularity: (c.req.query('granularity') as any) || 'day',
    }

    const metrics = await getServiceMetrics(c.env, params)
    return c.json({ data: metrics })
  } catch (error) {
    console.error('Error querying service metrics:', error)
    return c.json({ error: 'Failed to query metrics' }, 500)
  }
})

/**
 * Query Revenue Metrics
 * GET /metrics/revenue
 */
app.get('/metrics/revenue', async (c) => {
  try {
    const params: QueryParams = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      granularity: (c.req.query('granularity') as any) || 'day',
    }

    const metrics = await getRevenueMetrics(c.env, params)
    return c.json({ data: metrics })
  } catch (error) {
    console.error('Error querying revenue metrics:', error)
    return c.json({ error: 'Failed to query metrics' }, 500)
  }
})

/**
 * Query Marketplace Metrics
 * GET /metrics/marketplace
 */
app.get('/metrics/marketplace', async (c) => {
  try {
    const params: QueryParams = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      category: c.req.query('category'),
      granularity: (c.req.query('granularity') as any) || 'day',
    }

    const metrics = await getMarketplaceMetrics(c.env, params)
    return c.json({ data: metrics })
  } catch (error) {
    console.error('Error querying marketplace metrics:', error)
    return c.json({ error: 'Failed to query metrics' }, 500)
  }
})

/**
 * Query Experiment Metrics
 * GET /metrics/experiments
 */
app.get('/metrics/experiments', async (c) => {
  try {
    const params: QueryParams = {
      experimentId: c.req.query('experimentId'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
    }

    const metrics = await getExperimentMetrics(c.env, params)
    return c.json({ data: metrics })
  } catch (error) {
    console.error('Error querying experiment metrics:', error)
    return c.json({ error: 'Failed to query metrics' }, 500)
  }
})

/**
 * Query User Metrics
 * GET /metrics/users
 */
app.get('/metrics/users', async (c) => {
  try {
    const params: QueryParams = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      granularity: (c.req.query('granularity') as any) || 'day',
    }

    const metrics = await getUserMetrics(c.env, params)
    return c.json({ data: metrics })
  } catch (error) {
    console.error('Error querying user metrics:', error)
    return c.json({ error: 'Failed to query metrics' }, 500)
  }
})

/**
 * Real-Time Updates (SSE)
 * GET /stream
 */
app.get('/stream', async (c) => {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // Send initial connection
  await writer.write(encoder.encode('data: {"type":"connected"}\n\n'))

  // Send updates every 10 seconds
  const interval = setInterval(async () => {
    try {
      // Get latest counters from KV
      const counters = await getRealtimeCounters(c.env.ANALYTICS_KV)

      await writer.write(encoder.encode(`data: ${JSON.stringify(counters)}\n\n`))
    } catch (error) {
      console.error('Error streaming update:', error)
    }
  }, 10000)

  // Cleanup on disconnect
  c.req.raw.signal.addEventListener('abort', () => {
    clearInterval(interval)
    writer.close()
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

/**
 * Get Real-Time Counters
 */
async function getRealtimeCounters(kv: KVNamespace) {
  const keys = [
    'counter:executions:today',
    'counter:revenue:today',
    'counter:searches:today',
    'counter:conversions:today',
    'counter:users:active',
  ]

  const counters: Record<string, number> = {}

  for (const key of keys) {
    const value = await kv.get(key)
    counters[key.replace('counter:', '')] = value ? parseInt(value) : 0
  }

  return {
    type: 'update',
    timestamp: Date.now(),
    counters,
  }
}

/**
 * Domain Analytics Endpoints
 */

// Track domain event
app.post('/track/domain', async (c) => {
  try {
    const event: DomainAnalyticsEvent = await c.req.json()
    await trackDomainEvent(event, c.env)
    return c.json({ success: true })
  } catch (error) {
    console.error('Error tracking domain event:', error)
    return c.json({ error: 'Failed to track domain event' }, 500)
  }
})

// Get domain analytics summary
app.get('/domains/summary', async (c) => {
  try {
    const timeRange = (c.req.query('range') as '1h' | '24h' | '7d' | '30d') || '24h'
    const summary = await getDomainAnalyticsSummary(timeRange, c.env)
    return c.json({ data: summary })
  } catch (error) {
    console.error('Error getting domain summary:', error)
    return c.json({ error: 'Failed to get domain summary' }, 500)
  }
})

/**
 * R2 SQL Endpoints
 */

// Execute SQL query against R2 data
app.post('/sql/query', async (c) => {
  try {
    const { sql } = await c.req.json<{ sql: string }>()

    if (!sql) {
      return c.json({ error: 'SQL query required' }, 400)
    }

    const result = await executeR2Query(sql, c.env)
    return c.json({ data: result })
  } catch (error) {
    console.error('Error executing R2 query:', error)
    return c.json({ error: 'Failed to execute query' }, 500)
  }
})

// Export query results as CSV
app.post('/sql/export/csv', async (c) => {
  try {
    const { sql } = await c.req.json<{ sql: string }>()
    const result = await executeR2Query(sql, c.env)
    const csv = resultToCSV(result)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export.csv"',
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return c.json({ error: 'Failed to export CSV' }, 500)
  }
})

// Export query results as JSON
app.post('/sql/export/json', async (c) => {
  try {
    const { sql } = await c.req.json<{ sql: string }>()
    const result = await executeR2Query(sql, c.env)
    const json = resultToJSON(result)

    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="export.json"',
      },
    })
  } catch (error) {
    console.error('Error exporting JSON:', error)
    return c.json({ error: 'Failed to export JSON' }, 500)
  }
})

// List available tables in R2 catalog
app.get('/sql/tables', async (c) => {
  try {
    const tables = await listTables(c.env)
    return c.json({ data: tables })
  } catch (error) {
    console.error('Error listing tables:', error)
    return c.json({ error: 'Failed to list tables' }, 500)
  }
})

// Get table statistics
app.get('/sql/tables/:table/stats', async (c) => {
  try {
    const table = c.req.param('table')
    const stats = await getTableStats(table, c.env)
    return c.json({ data: stats })
  } catch (error) {
    console.error('Error getting table stats:', error)
    return c.json({ error: 'Failed to get table stats' }, 500)
  }
})

// Execute pre-built domain queries
app.get('/sql/queries/:queryName', async (c) => {
  try {
    const queryName = c.req.param('queryName') as keyof typeof DomainQueries

    if (!DomainQueries[queryName]) {
      return c.json({ error: 'Query not found' }, 404)
    }

    const sql = DomainQueries[queryName]
    const result = await executeR2Query(sql, c.env)
    return c.json({ data: result })
  } catch (error) {
    console.error('Error executing pre-built query:', error)
    return c.json({ error: 'Failed to execute query' }, 500)
  }
})

/**
 * Error Analytics Endpoints
 */

// Get error summary
app.get('/errors/summary', async (c) => {
  try {
    const timeRange = c.req.query('range') || '1 hour'
    const summary = await getErrorSummary(timeRange, c.env)
    return c.json({ data: summary })
  } catch (error) {
    console.error('Error getting error summary:', error)
    return c.json({ error: 'Failed to get error summary' }, 500)
  }
})

// Get error time series
app.get('/errors/timeseries', async (c) => {
  try {
    const timeRange = c.req.query('range') || '24 hours'
    const timeseries = await getErrorTimeSeries(timeRange, c.env)
    return c.json({ data: timeseries })
  } catch (error) {
    console.error('Error getting error time series:', error)
    return c.json({ error: 'Failed to get error time series' }, 500)
  }
})

// Get error trends (spike detection)
app.get('/errors/trends', async (c) => {
  try {
    const trends = await getErrorTrends(c.env)
    return c.json({ data: trends })
  } catch (error) {
    console.error('Error getting error trends:', error)
    return c.json({ error: 'Failed to get error trends' }, 500)
  }
})

// Get active alerts
app.get('/errors/alerts', async (c) => {
  try {
    const alerts = await generateAlerts(c.env)
    return c.json({ data: alerts })
  } catch (error) {
    console.error('Error generating alerts:', error)
    return c.json({ error: 'Failed to generate alerts' }, 500)
  }
})

// Get errors by service
app.get('/errors/by-service', async (c) => {
  try {
    const timeRange = c.req.query('range') || '1 hour'
    const byService = await getErrorsByService(timeRange, c.env)
    return c.json({ data: byService })
  } catch (error) {
    console.error('Error getting errors by service:', error)
    return c.json({ error: 'Failed to get errors by service' }, 500)
  }
})

// Get error distribution
app.get('/errors/distribution', async (c) => {
  try {
    const timeRange = c.req.query('range') || '24 hours'
    const distribution = await getErrorDistribution(timeRange, c.env)
    return c.json({ data: distribution })
  } catch (error) {
    console.error('Error getting error distribution:', error)
    return c.json({ error: 'Failed to get error distribution' }, 500)
  }
})

// Execute pre-built error queries
app.get('/errors/queries/:queryName', async (c) => {
  try {
    const queryName = c.req.param('queryName') as keyof typeof ErrorQueries

    if (!ErrorQueries[queryName]) {
      return c.json({ error: 'Query not found' }, 404)
    }

    const sql = ErrorQueries[queryName]
    const result = await executeR2Query(sql, c.env)
    return c.json({ data: result })
  } catch (error) {
    console.error('Error executing error query:', error)
    return c.json({ error: 'Failed to execute error query' }, 500)
  }
})

export default app
