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

export default app
