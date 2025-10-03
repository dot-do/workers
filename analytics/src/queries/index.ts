/**
 * Analytics Query API
 * Query Analytics Engine using SQL API
 */

import type { Env, QueryParams, ServiceMetrics, RevenueMetrics, MarketplaceMetrics, ExperimentMetrics, UserMetrics } from '../types'

/**
 * Execute SQL query against Analytics Engine
 */
async function executeQuery(env: Env, sql: string): Promise<any> {
  const API = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`

  const response = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: sql,
  })

  if (!response.ok) {
    throw new Error(`Analytics Engine query failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Query Service Metrics
 */
export async function getServiceMetrics(env: Env, params: QueryParams): Promise<ServiceMetrics[]> {
  const { startDate, endDate, serviceId, granularity } = params

  const whereClause = buildWhereClause({
    blob1: 'service_execution',
    blob2: serviceId,
    startDate,
    endDate,
  })

  const sql = `
    SELECT
      blob2 AS serviceId,
      COUNT(*) * MAX(_sample_interval) AS executions,
      quantile(0.5)(double1) AS p50_latency,
      quantile(0.95)(double1) AS p95_latency,
      quantile(0.99)(double1) AS p99_latency,
      AVG(double1) AS avg_latency,
      SUM(CASE WHEN blob6 = 'error' THEN 1 ELSE 0 END) * MAX(_sample_interval) AS errors,
      SUM(CASE WHEN blob6 = 'success' THEN 1 ELSE 0 END) * MAX(_sample_interval) AS successes
    FROM services_delivery_analytics
    ${whereClause}
    GROUP BY blob2
    ORDER BY executions DESC
  `

  const result = await executeQuery(env, sql)

  return result.data.map((row: any) => ({
    serviceId: row.serviceId,
    serviceName: row.serviceId, // TODO: Join with service name from DB
    executions: row.executions,
    latency: {
      p50: row.p50_latency,
      p95: row.p95_latency,
      p99: row.p99_latency,
      avg: row.avg_latency,
    },
    errorRate: row.executions > 0 ? (row.errors / row.executions) * 100 : 0,
    successRate: row.executions > 0 ? (row.successes / row.executions) * 100 : 0,
    period: `${startDate} to ${endDate}`,
  }))
}

/**
 * Query Revenue Metrics
 */
export async function getRevenueMetrics(env: Env, params: QueryParams): Promise<RevenueMetrics> {
  const { startDate, endDate } = params

  const whereClause = buildWhereClause({
    blob1: 'revenue_transaction',
    startDate,
    endDate,
  })

  const sql = `
    SELECT
      SUM(double2) * MAX(_sample_interval) AS gmv,
      COUNT(*) * MAX(_sample_interval) AS transactionCount,
      AVG(double2) AS avgOrderValue
    FROM services_delivery_analytics
    ${whereClause}
  `

  const result = await executeQuery(env, sql)
  const row = result.data[0]

  const gmv = row?.gmv || 0
  const transactionCount = row?.transactionCount || 0
  const avgOrderValue = row?.avgOrderValue || 0

  // Assuming 15% take rate (should be queried from metadata)
  const takeRate = 15
  const platformRevenue = gmv * (takeRate / 100)
  const creatorEarnings = gmv - platformRevenue

  // For MRR, query last 30 days of recurring revenue
  // This is a simplified calculation
  const mrr = platformRevenue / 30 * 30 // Assuming monthly average

  return {
    gmv,
    mrr,
    takeRate,
    creatorEarnings,
    transactionCount,
    avgOrderValue,
    period: `${startDate} to ${endDate}`,
  }
}

/**
 * Query Marketplace Metrics
 */
export async function getMarketplaceMetrics(env: Env, params: QueryParams): Promise<MarketplaceMetrics> {
  const { startDate, endDate, category } = params

  const whereClause = buildWhereClause({
    blob5: category,
    startDate,
    endDate,
  })

  const searchSql = `
    SELECT COUNT(*) * MAX(_sample_interval) AS searches
    FROM services_delivery_analytics
    WHERE blob1 = 'marketplace_search' ${whereClause.replace('WHERE', 'AND')}
  `

  const viewSql = `
    SELECT COUNT(*) * MAX(_sample_interval) AS views
    FROM services_delivery_analytics
    WHERE blob1 = 'marketplace_view' ${whereClause.replace('WHERE', 'AND')}
  `

  const conversionSql = `
    SELECT COUNT(*) * MAX(_sample_interval) AS conversions
    FROM services_delivery_analytics
    WHERE blob1 = 'marketplace_conversion' ${whereClause.replace('WHERE', 'AND')}
  `

  const topServicesSql = `
    SELECT
      blob2 AS serviceId,
      COUNT(*) * MAX(_sample_interval) AS views
    FROM services_delivery_analytics
    WHERE blob1 = 'marketplace_view' ${whereClause.replace('WHERE', 'AND')}
    GROUP BY blob2
    ORDER BY views DESC
    LIMIT 10
  `

  const [searchResult, viewResult, conversionResult, topServicesResult] = await Promise.all([
    executeQuery(env, searchSql),
    executeQuery(env, viewSql),
    executeQuery(env, conversionSql),
    executeQuery(env, topServicesSql),
  ])

  const searches = searchResult.data[0]?.searches || 0
  const views = viewResult.data[0]?.views || 0
  const conversions = conversionResult.data[0]?.conversions || 0

  return {
    searches,
    views,
    conversions,
    conversionRate: views > 0 ? (conversions / views) * 100 : 0,
    topServices: topServicesResult.data.map((row: any) => ({
      id: row.serviceId,
      name: row.serviceId, // TODO: Join with service name
      views: row.views,
    })),
    topCategories: [], // TODO: Implement category aggregation
    period: `${startDate} to ${endDate}`,
  }
}

/**
 * Query Experiment Metrics
 */
export async function getExperimentMetrics(env: Env, params: QueryParams): Promise<ExperimentMetrics[]> {
  const { experimentId, startDate, endDate } = params

  const whereClause = buildWhereClause({
    blob2: experimentId,
    startDate,
    endDate,
  })

  const sql = `
    SELECT
      blob2 AS experimentId,
      double3 AS variantIndex,
      SUM(CASE WHEN blob1 = 'experiment_view' THEN 1 ELSE 0 END) * MAX(_sample_interval) AS views,
      SUM(CASE WHEN blob1 = 'experiment_conversion' THEN 1 ELSE 0 END) * MAX(_sample_interval) AS conversions
    FROM services_delivery_analytics
    WHERE (blob1 = 'experiment_view' OR blob1 = 'experiment_conversion') ${whereClause.replace('WHERE', 'AND')}
    GROUP BY blob2, double3
    ORDER BY variantIndex
  `

  const result = await executeQuery(env, sql)

  // Group by experiment
  const experimentsMap = new Map<string, ExperimentMetrics>()

  for (const row of result.data) {
    if (!experimentsMap.has(row.experimentId)) {
      experimentsMap.set(row.experimentId, {
        experimentId: row.experimentId,
        experimentName: row.experimentId, // TODO: Join with experiment name
        variants: [],
        confidence: 0,
        period: `${startDate} to ${endDate}`,
      })
    }

    const experiment = experimentsMap.get(row.experimentId)!
    const conversionRate = row.views > 0 ? (row.conversions / row.views) * 100 : 0

    experiment.variants.push({
      index: row.variantIndex,
      name: `Variant ${String.fromCharCode(65 + row.variantIndex)}`, // A, B, C...
      views: row.views,
      conversions: row.conversions,
      conversionRate,
    })
  }

  // Calculate confidence and winner for each experiment
  for (const experiment of experimentsMap.values()) {
    if (experiment.variants.length > 1) {
      const maxConversionRate = Math.max(...experiment.variants.map((v) => v.conversionRate))
      experiment.winner = experiment.variants.findIndex((v) => v.conversionRate === maxConversionRate)
      experiment.confidence = calculateConfidence(experiment.variants)
    }
  }

  return Array.from(experimentsMap.values())
}

/**
 * Query User Metrics
 */
export async function getUserMetrics(env: Env, params: QueryParams): Promise<UserMetrics> {
  const { startDate, endDate } = params

  const whereClause = buildWhereClause({
    blob1: 'user_session',
    startDate,
    endDate,
  })

  const sql = `
    SELECT
      COUNT(DISTINCT blob3) AS uniqueUsers,
      COUNT(*) * MAX(_sample_interval) AS sessions,
      AVG(CAST(JSON_EXTRACT(metadata, '$.duration') AS FLOAT)) AS avgSessionDuration
    FROM services_delivery_analytics
    ${whereClause}
  `

  const result = await executeQuery(env, sql)
  const row = result.data[0]

  // For DAU/MAU, we need to query with appropriate time windows
  // This is a simplified version
  const dau = row?.uniqueUsers || 0
  const mau = dau * 30 // Simplified estimate

  return {
    dau,
    mau,
    retention: {
      day1: 0, // TODO: Implement cohort analysis
      day7: 0,
      day30: 0,
    },
    avgSessionDuration: row?.avgSessionDuration || 0,
    churnRate: 0, // TODO: Implement churn calculation
    period: `${startDate} to ${endDate}`,
  }
}

/**
 * Build WHERE clause for SQL queries
 */
function buildWhereClause(filters: Record<string, any>): string {
  const conditions: string[] = []

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue

    if (key === 'startDate') {
      conditions.push(`timestamp >= toDateTime('${value}')`)
    } else if (key === 'endDate') {
      conditions.push(`timestamp <= toDateTime('${value}')`)
    } else {
      conditions.push(`${key} = '${value}'`)
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

/**
 * Calculate statistical confidence (simplified)
 */
function calculateConfidence(variants: Array<{ views: number; conversions: number }>): number {
  if (variants.length < 2) return 0

  const [control, ...treatments] = variants

  if (control.views < 100) return 0

  const controlRate = control.views > 0 ? control.conversions / control.views : 0
  const maxTreatmentRate = Math.max(...treatments.map((v) => (v.views > 0 ? v.conversions / v.views : 0)))

  const lift = controlRate > 0 ? (maxTreatmentRate - controlRate) / controlRate : 0
  if (lift < 0.05) return 0

  const sampleFactor = Math.min(control.views / 1000, 1)
  const liftFactor = Math.min(lift, 0.5) / 0.5

  return Math.round(sampleFactor * liftFactor * 100)
}
