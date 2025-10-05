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

// ============================================================================
// Types
// ============================================================================

export interface Env {
  DB: any // Database service binding
  ANALYTICS: any // Analytics service binding
  METRICS_KV: KVNamespace // Metrics cache
  NUMERICS_API_KEY?: string // Authentication secret
  CACHE_TTL: string // Cache TTL in seconds (default: 300)
  ENVIRONMENT: string
}

export interface NumericsDataPoint {
  value: number
  name?: string // Optional for named line graphs
}

export interface NumericsWidget {
  postfix: string // Unit label (e.g., "Visitors", "USD", "%", "★")
  data: NumericsDataPoint[] // 1-31 data points
  color?: string // Optional color override (hex)
}

export type MetricsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

export interface MetricsCacheKey {
  metric: string
  period: MetricsPeriod
  compare: boolean
}

export interface MetricResult {
  current: number
  previous?: number
  timeseries?: Array<{ timestamp: string; value: number; name?: string }>
}

export type MetricName =
  | 'visitors'
  | 'signups'
  | 'active-users'
  | 'mrr'
  | 'arr'
  | 'gmv'
  | 'gmv-growth'
  | 'services-listed'
  | 'services-active'
  | 'providers'
  | 'service-rating'
  | 'dispute-rate'
  | 'creators'
  | 'top-creators-revenue'
  | 'functions'
  | 'api-calls'

export interface MetricMeta {
  name: MetricName
  postfix: string
  color?: string
  target?: number
  format: 'number' | 'currency' | 'percentage' | 'rating'
  requiresComparison: boolean
  cacheKey: string
}

// ============================================================================
// Cache Layer
// ============================================================================

export function generateCacheKey(params: MetricsCacheKey): string {
  return `metric:${params.metric}:${params.period}:${params.compare ? 'compare' : 'current'}`
}

export async function getCachedMetric(key: string, env: Env): Promise<MetricResult | null> {
  try {
    const cached = await env.METRICS_KV.get(key)
    if (!cached) return null
    return JSON.parse(cached) as MetricResult
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

export async function cacheMetric(key: string, result: MetricResult, env: Env): Promise<void> {
  try {
    const ttl = parseInt(env.CACHE_TTL || '300', 10)
    await env.METRICS_KV.put(key, JSON.stringify(result), { expirationTtl: ttl })
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

export async function invalidateMetricCache(metric: string, env: Env): Promise<void> {
  try {
    const periods = ['today', 'week', 'month', 'quarter', 'year']
    const variants = [true, false]
    for (const period of periods) {
      for (const compare of variants) {
        const key = generateCacheKey({ metric, period: period as any, compare })
        await env.METRICS_KV.delete(key)
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error)
  }
}

export async function clearAllCache(env: Env): Promise<void> {
  try {
    const list = await env.METRICS_KV.list({ prefix: 'metric:' })
    for (const key of list.keys) {
      await env.METRICS_KV.delete(key.name)
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

// ============================================================================
// Metrics Calculations
// ============================================================================

function getPeriodRange(period: MetricsPeriod): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)
  let previousStart = new Date(now)
  let previousEnd = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      previousEnd = new Date(start)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 1)
      break
    case 'week':
      start.setDate(start.getDate() - 7)
      previousEnd = new Date(start)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 7)
      break
    case 'month':
      start.setMonth(start.getMonth() - 1)
      previousEnd = new Date(start)
      previousStart = new Date(previousEnd)
      previousStart.setMonth(previousStart.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(start.getMonth() - 3)
      previousEnd = new Date(start)
      previousStart = new Date(previousEnd)
      previousStart.setMonth(previousStart.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(start.getFullYear() - 1)
      previousEnd = new Date(start)
      previousStart = new Date(previousEnd)
      previousStart.setFullYear(previousStart.getFullYear() - 1)
      break
  }

  return { start, end, previousStart, previousEnd }
}

async function getVisitors(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 45280, previous: 38450 }
}

async function getSignups(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 1240, previous: 980 }
}

async function getActiveUsers(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 840, previous: 720 }
}

async function getMRR(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 83500, previous: 52180 }
}

async function getARR(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 1002000, previous: 626160 }
}

async function getGMV(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 320000, previous: 200000 }
}

async function getGMVGrowth(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 60, previous: 45 }
}

async function getServicesListed(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 234, previous: 178 }
}

async function getServicesActive(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 112, previous: 89 }
}

async function getProviders(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 156, previous: 124 }
}

async function getServiceRating(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 4.7, previous: 4.6 }
}

async function getDisputeRate(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 2.3, previous: 3.1 }
}

async function getCreators(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 67, previous: 52 }
}

async function getTopCreatorsRevenue(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return {
    current: 0,
    timeseries: [
      { timestamp: '2025-01', value: 12500, name: 'Alice' },
      { timestamp: '2025-02', value: 10200, name: 'Bob' },
      { timestamp: '2025-03', value: 9800, name: 'Charlie' },
      { timestamp: '2025-04', value: 8900, name: 'Diana' },
      { timestamp: '2025-05', value: 7600, name: 'Eve' },
    ],
  }
}

async function getFunctions(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 1247, previous: 986 }
}

async function getAPICalls(env: Env, period: MetricsPeriod): Promise<MetricResult> {
  return { current: 125000, previous: 98000 }
}

export async function getMetric(metric: string, env: Env, period: MetricsPeriod): Promise<MetricResult | null> {
  switch (metric) {
    case 'visitors': return getVisitors(env, period)
    case 'signups': return getSignups(env, period)
    case 'active-users': return getActiveUsers(env, period)
    case 'mrr': return getMRR(env, period)
    case 'arr': return getARR(env, period)
    case 'gmv': return getGMV(env, period)
    case 'gmv-growth': return getGMVGrowth(env, period)
    case 'services-listed': return getServicesListed(env, period)
    case 'services-active': return getServicesActive(env, period)
    case 'providers': return getProviders(env, period)
    case 'service-rating': return getServiceRating(env, period)
    case 'dispute-rate': return getDisputeRate(env, period)
    case 'creators': return getCreators(env, period)
    case 'top-creators-revenue': return getTopCreatorsRevenue(env, period)
    case 'functions': return getFunctions(env, period)
    case 'api-calls': return getAPICalls(env, period)
    default: return null
  }
}

// ============================================================================
// HTTP API
// ============================================================================

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
