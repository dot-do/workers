/**
 * Numerics Dashboard Worker - Real-Time Metrics API
 *
 * Provides 16 KPI metrics in Numerics JSON format for Apple ecosystem dashboards
 * (Apple TV, Apple Watch, iPhone, Mac)
 *
 * Features:
 * - Numerics JSON API format
 * - KV-based caching (5min TTL)
 * - API key authentication
 * - Rate limiting
 * - MCP tool definitions
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, NumericsWidget, MetricsPeriod, MetricName } from './types'
import { getMetric } from './metrics'
import { generateCacheKey, getCachedMetric, cacheMetric, clearAllCache } from './cache'

const app = new Hono<{ Bindings: Env }>()

// CORS for direct device access
app.use('/*', cors({
  origin: ['https://numericsdashboard.app', 'https://admin.services.delivery', 'http://localhost:3000'],
  credentials: true,
}))

/**
 * Authentication Middleware
 */
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const apiKey = c.env.NUMERICS_API_KEY

  if (!apiKey) {
    // No API key configured - allow all requests (development mode)
    return next()
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.substring(7)

  if (token !== apiKey) {
    return c.json({ error: 'Invalid API key' }, 403)
  }

  return next()
})

/**
 * Health Check
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'numerics', timestamp: Date.now() })
})

/**
 * Metric Endpoint Factory
 * Creates a metric endpoint that returns Numerics JSON format
 */
function metricEndpoint(metricName: MetricName, postfix: string, color?: string) {
  return async (c: any) => {
    try {
      const period = (c.req.query('period') as MetricsPeriod) || 'month'
      const compare = c.req.query('compare') === 'true' || c.req.query('compare') === 'previous'

      // Check cache first
      const cacheKey = generateCacheKey({ metric: metricName, period, compare })
      const cached = await getCachedMetric(cacheKey, c.env)

      let result

      if (cached) {
        result = cached
      } else {
        // Calculate metric
        result = await getMetric(metricName, c.env, period)

        if (!result) {
          return c.json({ error: 'Metric not found' }, 404)
        }

        // Cache result
        await cacheMetric(cacheKey, result, c.env)
      }

      // Format as Numerics widget
      const widget: NumericsWidget = {
        postfix,
        data: [],
      }

      if (color) {
        widget.color = color
      }

      // Handle timeseries data (for line graphs)
      if (result.timeseries && result.timeseries.length > 0) {
        widget.data = result.timeseries.map((point) => ({
          value: point.value,
          name: point.name,
        }))
      } else {
        // Handle simple number widgets
        widget.data.push({ value: result.current })

        if (compare && result.previous !== undefined) {
          widget.data.push({ value: result.previous })
        }
      }

      return c.json(widget)
    } catch (error) {
      console.error(`Error fetching ${metricName}:`, error)
      return c.json({ error: 'Failed to fetch metric' }, 500)
    }
  }
}

/**
 * Funnel Metrics
 */
app.get('/api/metrics/visitors', metricEndpoint('visitors', 'Visitors'))
app.get('/api/metrics/signups', metricEndpoint('signups', 'Sign-ups'))
app.get('/api/metrics/active-users', metricEndpoint('active-users', 'Active Users'))

/**
 * Revenue Metrics (OKR Tracking)
 */
app.get('/api/metrics/mrr', metricEndpoint('mrr', 'USD'))
app.get('/api/metrics/arr', metricEndpoint('arr', 'USD'))
app.get('/api/metrics/gmv', metricEndpoint('gmv', 'USD'))
app.get('/api/metrics/gmv-growth', metricEndpoint('gmv-growth', '%'))

/**
 * Marketplace Metrics (KR Tracking)
 */
app.get('/api/metrics/services-listed', metricEndpoint('services-listed', 'Services'))
app.get('/api/metrics/services-active', metricEndpoint('services-active', 'Active'))
app.get('/api/metrics/providers', metricEndpoint('providers', 'Providers'))
app.get('/api/metrics/service-rating', metricEndpoint('service-rating', '★'))
app.get('/api/metrics/dispute-rate', metricEndpoint('dispute-rate', '%', '#FF6B6B'))

/**
 * Creator Metrics
 */
app.get('/api/metrics/creators', metricEndpoint('creators', 'Creators'))
app.get('/api/metrics/top-creators-revenue', metricEndpoint('top-creators-revenue', 'USD/mo'))

/**
 * Platform Metrics
 */
app.get('/api/metrics/functions', metricEndpoint('functions', 'Functions'))
app.get('/api/metrics/api-calls', metricEndpoint('api-calls', 'Calls/day'))

/**
 * List All Available Metrics
 * GET /api/metrics
 */
app.get('/api/metrics', (c) => {
  const metrics = [
    { name: 'visitors', postfix: 'Visitors', path: '/api/metrics/visitors' },
    { name: 'signups', postfix: 'Sign-ups', path: '/api/metrics/signups' },
    { name: 'active-users', postfix: 'Active Users', path: '/api/metrics/active-users' },
    { name: 'mrr', postfix: 'USD', path: '/api/metrics/mrr' },
    { name: 'arr', postfix: 'USD', path: '/api/metrics/arr' },
    { name: 'gmv', postfix: 'USD', path: '/api/metrics/gmv' },
    { name: 'gmv-growth', postfix: '%', path: '/api/metrics/gmv-growth' },
    { name: 'services-listed', postfix: 'Services', path: '/api/metrics/services-listed' },
    { name: 'services-active', postfix: 'Active', path: '/api/metrics/services-active' },
    { name: 'providers', postfix: 'Providers', path: '/api/metrics/providers' },
    { name: 'service-rating', postfix: '★', path: '/api/metrics/service-rating' },
    { name: 'dispute-rate', postfix: '%', path: '/api/metrics/dispute-rate' },
    { name: 'creators', postfix: 'Creators', path: '/api/metrics/creators' },
    { name: 'top-creators-revenue', postfix: 'USD/mo', path: '/api/metrics/top-creators-revenue' },
    { name: 'functions', postfix: 'Functions', path: '/api/metrics/functions' },
    { name: 'api-calls', postfix: 'Calls/day', path: '/api/metrics/api-calls' },
  ]

  return c.json({
    metrics,
    documentation: 'https://docs.numericsdashboard.app/json-api',
    queryParameters: {
      period: ['today', 'week', 'month', 'quarter', 'year'],
      compare: ['true', 'false'],
    },
  })
})

/**
 * Clear Cache
 * DELETE /api/cache
 */
app.delete('/api/cache', async (c) => {
  try {
    await clearAllCache(c.env)
    return c.json({ success: true, message: 'Cache cleared' })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return c.json({ error: 'Failed to clear cache' }, 500)
  }
})

/**
 * MCP Tool Definitions
 * GET /mcp/tools
 */
app.get('/mcp/tools', (c) => {
  return c.json({
    name: 'metrics',
    description: 'Real-time KPI metrics for Services.Delivery platform',
    version: '1.0.0',
    tools: {
      visitors: { description: 'Website visitors count', returns: 'number', change: 'percentage' },
      signups: { description: 'New user sign-ups', returns: 'number', change: 'percentage' },
      activeUsers: { description: 'Active users (DAU/MAU)', returns: 'number', change: 'percentage' },
      mrr: { description: 'Monthly Recurring Revenue', returns: 'currency', change: 'percentage', target: 83500 },
      arr: { description: 'Annual Recurring Revenue', returns: 'currency', change: 'percentage', target: 1000000 },
      gmv: { description: 'Gross Marketplace Volume', returns: 'currency', change: 'percentage' },
      gmvGrowth: { description: 'GMV Growth Rate', returns: 'percentage', target: 60 },
      servicesListed: { description: 'Total services listed', returns: 'number', target: 200 },
      servicesActive: { description: 'Services processing transactions', returns: 'number', target: 100 },
      providers: { description: 'Service providers', returns: 'number', target: 100 },
      serviceRating: { description: 'Average service rating', returns: 'number', target: 4.5 },
      disputeRate: { description: 'Transaction dispute rate', returns: 'percentage', target: 5, alert: 'above' },
      creators: { description: 'Creators publishing services', returns: 'number', target: 50 },
      topCreatorsRevenue: { description: 'Top 10 creators by revenue', returns: 'array' },
      functions: { description: 'Functions catalogued', returns: 'number', target: 1000 },
      apiCalls: { description: 'Daily API call volume', returns: 'timeseries' },
    },
  })
})

export default app
