/**
 * Metrics Calculation Functions
 * Aggregates data from DB and Analytics services
 */

import type { Env, MetricResult, MetricsPeriod } from './types'

/**
 * Get date range for period
 */
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

/**
 * 1. Website Visitors
 */
export async function getVisitors(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query Analytics service for visitor counts
  const response = await env.ANALYTICS.fetch(new Request('http://analytics/metrics/users', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }))

  const data = await response.json()

  // Mock data for development
  return {
    current: 45280,
    previous: 38450,
  }
}

/**
 * 2. Sign-ups
 */
export async function getSignups(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB service for user registrations
  const { start, end, previousStart, previousEnd } = getPeriodRange(period)

  // Mock data for development
  return {
    current: 1240,
    previous: 980,
  }
}

/**
 * 3. Active Users
 */
export async function getActiveUsers(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query Analytics service for DAU/MAU
  return {
    current: 840,
    previous: 720,
  }
}

/**
 * 4. Monthly Recurring Revenue (MRR)
 */
export async function getMRR(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for active subscriptions
  // SELECT SUM(price * billing_multiplier) as mrr
  // FROM subscriptions
  // WHERE status = 'active'

  return {
    current: 83500,
    previous: 52180,
  }
}

/**
 * 5. Annual Recurring Revenue (ARR)
 */
export async function getARR(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // ARR = MRR * 12
  const mrr = await getMRR(env, period)

  return {
    current: mrr.current * 12,
    previous: mrr.previous ? mrr.previous * 12 : undefined,
  }
}

/**
 * 6. Gross Marketplace Volume (GMV)
 */
export async function getGMV(env: Env, period: MetricsPeriod = 'quarter'): Promise<MetricResult> {
  // Query DB for completed transactions
  // SELECT
  //   DATE_TRUNC('month', completed_at) as month,
  //   SUM(amount) as gmv
  // FROM transactions
  // WHERE status = 'completed'
  // GROUP BY month

  return {
    current: 320000,
    previous: 200000,
    timeseries: [
      { timestamp: '2024-10', value: 125000, name: 'Oct' },
      { timestamp: '2024-11', value: 200000, name: 'Nov' },
      { timestamp: '2024-12', value: 320000, name: 'Dec' },
    ],
  }
}

/**
 * 7. GMV Growth Rate
 */
export async function getGMVGrowth(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  const gmv = await getGMV(env, period)

  if (!gmv.previous) {
    return { current: 0 }
  }

  const growth = ((gmv.current - gmv.previous) / gmv.previous) * 100

  return {
    current: Math.round(growth * 10) / 10, // Round to 1 decimal
    previous: gmv.previous ? 52.3 : undefined,
  }
}

/**
 * 8. Listed Services
 */
export async function getServicesListed(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for published services
  // SELECT COUNT(*) FROM services WHERE status = 'published'

  return {
    current: 187,
    previous: 156,
  }
}

/**
 * 9. Active Services (Processing Transactions)
 */
export async function getServicesActive(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for services with recent transactions
  // SELECT COUNT(DISTINCT service_id)
  // FROM transactions
  // WHERE completed_at >= NOW() - INTERVAL '30 days'

  return {
    current: 92,
    previous: 78,
  }
}

/**
 * 10. Service Providers
 */
export async function getProviders(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for users with published services
  // SELECT COUNT(DISTINCT user_id)
  // FROM services
  // WHERE status = 'published'

  return {
    current: 87,
    previous: 72,
  }
}

/**
 * 11. Average Service Rating
 */
export async function getServiceRating(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for average rating
  // SELECT AVG(rating) FROM reviews WHERE service_id IN (...)

  return {
    current: 4.6,
    previous: 4.4,
  }
}

/**
 * 12. Dispute Rate
 */
export async function getDisputeRate(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for disputes / total transactions
  // SELECT
  //   (COUNT(CASE WHEN status = 'disputed' THEN 1 END)::float /
  //    COUNT(*)::float * 100) as dispute_rate
  // FROM transactions

  return {
    current: 3.2,
    previous: 4.1,
  }
}

/**
 * 13. Creators Publishing Services
 */
export async function getCreators(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for creators (same as providers for now)
  return getProviders(env, period)
}

/**
 * 14. Top 10 Creators Revenue
 */
export async function getTopCreatorsRevenue(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for top earning creators
  // SELECT
  //   u.name,
  //   SUM(t.amount * 0.85) as earnings  -- 85% take rate
  // FROM transactions t
  // JOIN services s ON s.id = t.service_id
  // JOIN users u ON u.id = s.user_id
  // WHERE t.status = 'completed'
  // GROUP BY u.id, u.name
  // ORDER BY earnings DESC
  // LIMIT 10

  return {
    current: 0,
    timeseries: [
      { timestamp: '2024-12', value: 8200, name: 'Creator 1' },
      { timestamp: '2024-12', value: 6500, name: 'Creator 2' },
      { timestamp: '2024-12', value: 5800, name: 'Creator 3' },
      { timestamp: '2024-12', value: 4900, name: 'Creator 4' },
      { timestamp: '2024-12', value: 4200, name: 'Creator 5' },
      { timestamp: '2024-12', value: 3800, name: 'Creator 6' },
      { timestamp: '2024-12', value: 3400, name: 'Creator 7' },
      { timestamp: '2024-12', value: 2900, name: 'Creator 8' },
      { timestamp: '2024-12', value: 2600, name: 'Creator 9' },
      { timestamp: '2024-12', value: 2200, name: 'Creator 10' },
    ],
  }
}

/**
 * 15. Functions Catalogued
 */
export async function getFunctions(env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult> {
  // Query DB for total functions
  // SELECT COUNT(*) FROM functions

  return {
    current: 887,
    previous: 745,
  }
}

/**
 * 16. API Calls (Daily)
 */
export async function getAPICalls(env: Env, period: MetricsPeriod = 'week'): Promise<MetricResult> {
  // Query Analytics service for API call counts
  // SELECT
  //   DATE(timestamp) as day,
  //   COUNT(*) as calls
  // FROM api_requests
  // WHERE timestamp >= NOW() - INTERVAL '7 days'
  // GROUP BY day

  return {
    current: 0,
    timeseries: [
      { timestamp: '2024-12-02', value: 45200, name: 'Mon' },
      { timestamp: '2024-12-03', value: 48100, name: 'Tue' },
      { timestamp: '2024-12-04', value: 52300, name: 'Wed' },
      { timestamp: '2024-12-05', value: 49800, name: 'Thu' },
      { timestamp: '2024-12-06', value: 51200, name: 'Fri' },
      { timestamp: '2024-12-07', value: 38900, name: 'Sat' },
      { timestamp: '2024-12-08', value: 35600, name: 'Sun' },
    ],
  }
}

/**
 * Get metric by name
 */
export async function getMetric(name: string, env: Env, period: MetricsPeriod = 'month'): Promise<MetricResult | null> {
  switch (name) {
    case 'visitors':
      return getVisitors(env, period)
    case 'signups':
      return getSignups(env, period)
    case 'active-users':
      return getActiveUsers(env, period)
    case 'mrr':
      return getMRR(env, period)
    case 'arr':
      return getARR(env, period)
    case 'gmv':
      return getGMV(env, period)
    case 'gmv-growth':
      return getGMVGrowth(env, period)
    case 'services-listed':
      return getServicesListed(env, period)
    case 'services-active':
      return getServicesActive(env, period)
    case 'providers':
      return getProviders(env, period)
    case 'service-rating':
      return getServiceRating(env, period)
    case 'dispute-rate':
      return getDisputeRate(env, period)
    case 'creators':
      return getCreators(env, period)
    case 'top-creators-revenue':
      return getTopCreatorsRevenue(env, period)
    case 'functions':
      return getFunctions(env, period)
    case 'api-calls':
      return getAPICalls(env, period)
    default:
      return null
  }
}
