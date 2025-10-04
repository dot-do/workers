/**
 * Error Analytics - Query and Analyze Errors from Pipeline Logs
 *
 * Features:
 * - Error aggregation by severity, service, type
 * - Time-series trend analysis
 * - Spike detection (anomaly detection)
 * - Alerting for concerning trends
 * - Dashboard metrics
 */

import type { Env } from './types'
import { executeR2Query, type R2SQLResult } from './r2-sql'

/**
 * Error Summary
 */
export interface ErrorSummary {
  total: number
  bySeverity: {
    critical: number
    error: number
    warning: number
    info: number
  }
  byCategory: Record<string, number>
  byService: Record<string, number>
  topErrors: ErrorDetail[]
}

/**
 * Error Detail
 */
export interface ErrorDetail {
  errorType: string
  errorMessage: string
  severity: string
  category: string
  count: number
  services: string[]
  firstSeen: string
  lastSeen: string
}

/**
 * Time-Series Data Point
 */
export interface TimeSeriesPoint {
  timestamp: string
  total: number
  critical: number
  error: number
  warning: number
  info: number
}

/**
 * Error Trend
 */
export interface ErrorTrend {
  service: string
  errorType: string
  currentRate: number // errors per minute
  baselineRate: number // average from previous period
  percentChange: number
  isSpike: boolean // true if change > threshold
  severity: string
}

/**
 * Alert
 */
export interface Alert {
  id: string
  timestamp: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  service?: string
  errorType?: string
  metrics: {
    current: number
    baseline: number
    percentChange: number
  }
}

/**
 * Get error summary for a time range
 */
export async function getErrorSummary(timeRange: string, env: Env): Promise<ErrorSummary> {
  const sql = `
    SELECT
      severity,
      category,
      scriptName as service,
      errorType,
      errorMessage,
      COUNT(*) as count,
      MIN(timestamp) as firstSeen,
      MAX(timestamp) as lastSeen
    FROM logs
    WHERE
      timestamp >= datetime('now', '-${timeRange}')
      AND severity IN ('critical', 'error', 'warning', 'info')
      AND errorType IS NOT NULL
    GROUP BY severity, category, scriptName, errorType, errorMessage
    ORDER BY count DESC
  `

  const result = await executeR2Query(sql, env)

  // Aggregate results
  const summary: ErrorSummary = {
    total: 0,
    bySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
    byCategory: {},
    byService: {},
    topErrors: [],
  }

  const errorMap = new Map<string, ErrorDetail>()

  for (const row of result.rows) {
    const [severity, category, service, errorType, errorMessage, count, firstSeen, lastSeen] = row

    summary.total += count

    // By severity
    if (severity in summary.bySeverity) {
      summary.bySeverity[severity as keyof typeof summary.bySeverity] += count
    }

    // By category
    summary.byCategory[category] = (summary.byCategory[category] || 0) + count

    // By service
    summary.byService[service] = (summary.byService[service] || 0) + count

    // Error details
    const key = `${errorType}:${errorMessage}`
    if (!errorMap.has(key)) {
      errorMap.set(key, {
        errorType,
        errorMessage,
        severity,
        category,
        count: 0,
        services: [],
        firstSeen,
        lastSeen,
      })
    }

    const detail = errorMap.get(key)!
    detail.count += count
    if (!detail.services.includes(service)) {
      detail.services.push(service)
    }
  }

  // Get top 10 errors
  summary.topErrors = Array.from(errorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return summary
}

/**
 * Get error time series (5-minute buckets)
 */
export async function getErrorTimeSeries(timeRange: string, env: Env): Promise<TimeSeriesPoint[]> {
  const sql = `
    SELECT
      datetime(timestamp, 'start of day', '+' || (strftime('%H', timestamp) || ' hours'), '+' || ((strftime('%M', timestamp) / 5) * 5 || ' minutes')) as bucket,
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
    FROM logs
    WHERE
      timestamp >= datetime('now', '-${timeRange}')
      AND errorType IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket ASC
  `

  const result = await executeR2Query(sql, env)

  return result.rows.map((row) => ({
    timestamp: row[0],
    total: row[1],
    critical: row[2],
    error: row[3],
    warning: row[4],
    info: row[5],
  }))
}

/**
 * Get error trends by service (compare last hour vs previous hour)
 */
export async function getErrorTrends(env: Env): Promise<ErrorTrend[]> {
  const sql = `
    WITH current_period AS (
      SELECT
        scriptName as service,
        errorType,
        severity,
        COUNT(*) as count
      FROM logs
      WHERE
        timestamp >= datetime('now', '-1 hour')
        AND errorType IS NOT NULL
      GROUP BY scriptName, errorType, severity
    ),
    baseline_period AS (
      SELECT
        scriptName as service,
        errorType,
        severity,
        COUNT(*) as count
      FROM logs
      WHERE
        timestamp >= datetime('now', '-2 hours')
        AND timestamp < datetime('now', '-1 hour')
        AND errorType IS NOT NULL
      GROUP BY scriptName, errorType, severity
    )
    SELECT
      COALESCE(c.service, b.service) as service,
      COALESCE(c.errorType, b.errorType) as errorType,
      COALESCE(c.severity, b.severity) as severity,
      COALESCE(c.count, 0) as current_count,
      COALESCE(b.count, 0) as baseline_count
    FROM current_period c
    FULL OUTER JOIN baseline_period b
      ON c.service = b.service
      AND c.errorType = b.errorType
      AND c.severity = b.severity
    ORDER BY current_count DESC
  `

  const result = await executeR2Query(sql, env)

  const trends: ErrorTrend[] = []

  for (const row of result.rows) {
    const [service, errorType, severity, currentCount, baselineCount] = row

    const currentRate = currentCount / 60 // errors per minute
    const baselineRate = baselineCount / 60

    // Calculate percent change
    let percentChange = 0
    if (baselineRate > 0) {
      percentChange = ((currentRate - baselineRate) / baselineRate) * 100
    } else if (currentRate > 0) {
      percentChange = 100 // New error type
    }

    // Spike detection threshold:
    // - Critical/Error: 50% increase
    // - Warning: 100% increase
    const threshold = severity === 'critical' || severity === 'error' ? 50 : 100
    const isSpike = percentChange > threshold && currentRate > 1 // At least 1 error/min

    trends.push({
      service,
      errorType,
      currentRate,
      baselineRate,
      percentChange,
      isSpike,
      severity,
    })
  }

  return trends.sort((a, b) => {
    // Sort by: spikes first, then by percent change
    if (a.isSpike && !b.isSpike) return -1
    if (!a.isSpike && b.isSpike) return 1
    return b.percentChange - a.percentChange
  })
}

/**
 * Generate alerts for concerning error trends
 */
export async function generateAlerts(env: Env): Promise<Alert[]> {
  const trends = await getErrorTrends(env)
  const alerts: Alert[] = []

  for (const trend of trends) {
    if (trend.isSpike) {
      const alertSeverity = trend.severity === 'critical' ? 'critical' : trend.severity === 'error' ? 'high' : 'medium'

      alerts.push({
        id: `spike_${trend.service}_${trend.errorType}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: alertSeverity,
        title: `Error Spike Detected: ${trend.service}`,
        message: `${trend.errorType} errors increased by ${trend.percentChange.toFixed(1)}% in the last hour (${trend.currentRate.toFixed(2)}/min vs ${trend.baselineRate.toFixed(2)}/min baseline)`,
        service: trend.service,
        errorType: trend.errorType,
        metrics: {
          current: trend.currentRate,
          baseline: trend.baselineRate,
          percentChange: trend.percentChange,
        },
      })
    }
  }

  // Check for sustained high error rates
  const summary = await getErrorSummary('1 hour', env)

  if (summary.bySeverity.critical > 100) {
    alerts.push({
      id: `critical_threshold_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      title: 'High Critical Error Rate',
      message: `${summary.bySeverity.critical} critical errors in the last hour`,
      metrics: {
        current: summary.bySeverity.critical,
        baseline: 100,
        percentChange: ((summary.bySeverity.critical - 100) / 100) * 100,
      },
    })
  }

  if (summary.bySeverity.error > 500) {
    alerts.push({
      id: `error_threshold_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'high',
      title: 'High Error Rate',
      message: `${summary.bySeverity.error} errors in the last hour`,
      metrics: {
        current: summary.bySeverity.error,
        baseline: 500,
        percentChange: ((summary.bySeverity.error - 500) / 500) * 100,
      },
    })
  }

  return alerts
}

/**
 * Get errors by service
 */
export async function getErrorsByService(timeRange: string, env: Env): Promise<Record<string, ErrorSummary>> {
  const sql = `
    SELECT
      scriptName as service,
      severity,
      category,
      errorType,
      errorMessage,
      COUNT(*) as count,
      MIN(timestamp) as firstSeen,
      MAX(timestamp) as lastSeen
    FROM logs
    WHERE
      timestamp >= datetime('now', '-${timeRange}')
      AND errorType IS NOT NULL
    GROUP BY scriptName, severity, category, errorType, errorMessage
    ORDER BY service, count DESC
  `

  const result = await executeR2Query(sql, env)

  const byService: Record<string, ErrorSummary> = {}

  for (const row of result.rows) {
    const [service, severity, category, errorType, errorMessage, count, firstSeen, lastSeen] = row

    if (!byService[service]) {
      byService[service] = {
        total: 0,
        bySeverity: { critical: 0, error: 0, warning: 0, info: 0 },
        byCategory: {},
        byService: {},
        topErrors: [],
      }
    }

    const summary = byService[service]
    summary.total += count

    if (severity in summary.bySeverity) {
      summary.bySeverity[severity as keyof typeof summary.bySeverity] += count
    }

    summary.byCategory[category] = (summary.byCategory[category] || 0) + count

    summary.topErrors.push({
      errorType,
      errorMessage,
      severity,
      category,
      count,
      services: [service],
      firstSeen,
      lastSeen,
    })
  }

  // Sort top errors for each service
  for (const service in byService) {
    byService[service].topErrors = byService[service].topErrors.sort((a, b) => b.count - a.count).slice(0, 10)
  }

  return byService
}

/**
 * Get error distribution by type
 */
export async function getErrorDistribution(timeRange: string, env: Env): Promise<{ type: string; count: number; percentage: number }[]> {
  const sql = `
    SELECT
      errorType,
      COUNT(*) as count
    FROM logs
    WHERE
      timestamp >= datetime('now', '-${timeRange}')
      AND errorType IS NOT NULL
    GROUP BY errorType
    ORDER BY count DESC
  `

  const result = await executeR2Query(sql, env)
  const total = result.rows.reduce((sum, row) => sum + row[1], 0)

  return result.rows.map((row) => ({
    type: row[0],
    count: row[1],
    percentage: (row[1] / total) * 100,
  }))
}

/**
 * Pre-built queries for error analytics
 */
export const ErrorQueries = {
  /**
   * Critical errors in last hour
   */
  criticalErrors: `
    SELECT
      scriptName as service,
      errorType,
      errorMessage,
      COUNT(*) as count,
      MIN(timestamp) as firstSeen,
      MAX(timestamp) as lastSeen
    FROM logs
    WHERE
      timestamp >= datetime('now', '-1 hour')
      AND severity = 'critical'
    GROUP BY scriptName, errorType, errorMessage
    ORDER BY count DESC
    LIMIT 50
  `,

  /**
   * Error rate by service (5-minute buckets)
   */
  errorRateByService: `
    SELECT
      datetime(timestamp, 'start of day', '+' || (strftime('%H', timestamp) || ' hours'), '+' || ((strftime('%M', timestamp) / 5) * 5 || ' minutes')) as bucket,
      scriptName as service,
      COUNT(*) as error_count
    FROM logs
    WHERE
      timestamp >= datetime('now', '-24 hours')
      AND errorType IS NOT NULL
    GROUP BY bucket, service
    ORDER BY bucket ASC, error_count DESC
  `,

  /**
   * Most common error messages
   */
  commonErrorMessages: `
    SELECT
      errorMessage,
      errorType,
      severity,
      COUNT(*) as count,
      COUNT(DISTINCT scriptName) as affected_services
    FROM logs
    WHERE
      timestamp >= datetime('now', '-24 hours')
      AND errorType IS NOT NULL
    GROUP BY errorMessage, errorType, severity
    ORDER BY count DESC
    LIMIT 100
  `,

  /**
   * Services with highest error rates
   */
  servicesWithHighestErrors: `
    SELECT
      scriptName as service,
      COUNT(*) as total_errors,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
      SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as error_count,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_count
    FROM logs
    WHERE
      timestamp >= datetime('now', '-1 hour')
      AND errorType IS NOT NULL
    GROUP BY scriptName
    ORDER BY total_errors DESC
    LIMIT 50
  `,

  /**
   * Error patterns by time of day
   */
  errorPatternsByHour: `
    SELECT
      strftime('%H', timestamp) as hour,
      severity,
      COUNT(*) as count
    FROM logs
    WHERE
      timestamp >= datetime('now', '-7 days')
      AND errorType IS NOT NULL
    GROUP BY hour, severity
    ORDER BY hour ASC, severity ASC
  `,

  /**
   * New errors (first seen in last hour)
   */
  newErrors: `
    WITH recent_errors AS (
      SELECT DISTINCT errorType, errorMessage
      FROM logs
      WHERE timestamp >= datetime('now', '-1 hour')
        AND errorType IS NOT NULL
    ),
    historical_errors AS (
      SELECT DISTINCT errorType, errorMessage
      FROM logs
      WHERE timestamp >= datetime('now', '-7 days')
        AND timestamp < datetime('now', '-1 hour')
        AND errorType IS NOT NULL
    )
    SELECT
      r.errorType,
      r.errorMessage,
      (SELECT COUNT(*) FROM logs WHERE errorType = r.errorType AND errorMessage = r.errorMessage AND timestamp >= datetime('now', '-1 hour')) as count
    FROM recent_errors r
    LEFT JOIN historical_errors h
      ON r.errorType = h.errorType
      AND r.errorMessage = h.errorMessage
    WHERE h.errorType IS NULL
    ORDER BY count DESC
  `,
}
