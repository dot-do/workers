/**
 * R2 SQL Integration
 * Query analytics data stored in R2 using SQL API
 */

import type { Env } from './types'

/**
 * R2 SQL Query Result
 */
export interface R2SQLResult {
  columns: string[]
  rows: any[][]
  meta?: {
    duration: number
    rowsReturned: number
    rowsScanned: number
    bytesScanned: number
  }
}

/**
 * Execute SQL query against R2 data
 * Uses Cloudflare R2 SQL API (Apache DataFusion)
 */
export async function executeR2Query(sql: string, env: Env): Promise<R2SQLResult> {
  const start = Date.now()

  try {
    // R2 SQL API endpoint (when available)
    // For now, this is a placeholder for the upcoming R2 SQL feature
    // Documentation: https://developers.cloudflare.com/r2/api/workers/workers-api/

    // Fallback: Query data from R2 bucket directly
    // This assumes data is stored in Parquet format with partitioning
    const result = await queryR2Parquet(sql, env)

    return {
      ...result,
      meta: {
        duration: Date.now() - start,
        rowsReturned: result.rows.length,
        rowsScanned: result.rows.length,
        bytesScanned: 0,
      },
    }
  } catch (error) {
    console.error('R2 SQL query error:', error)
    throw error
  }
}

/**
 * Query Parquet files stored in R2
 * Manual implementation until R2 SQL is GA
 */
async function queryR2Parquet(sql: string, env: Env): Promise<{ columns: string[]; rows: any[][] }> {
  // This is a simplified implementation
  // In production, you'd use a Parquet parser library

  // For now, return empty result
  // Real implementation would:
  // 1. Parse SQL to determine which partitions to scan
  // 2. List relevant objects in R2
  // 3. Download and parse Parquet files
  // 4. Apply WHERE/GROUP BY/ORDER BY
  // 5. Return results

  return {
    columns: [],
    rows: [],
  }
}

/**
 * Common pre-built queries for domain analytics
 */
export const DomainQueries = {
  /**
   * Domain searches by TLD
   */
  searchesByTLD: `
    SELECT
      tld,
      COUNT(*) as search_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM domain_searches
    WHERE timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY tld
    ORDER BY search_count DESC
    LIMIT 100
  `,

  /**
   * Domain registrations by registrar
   */
  registrationsByRegistrar: `
    SELECT
      registrar,
      COUNT(*) as registration_count,
      SUM(price) as total_revenue
    FROM domain_registrations
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY registrar
    ORDER BY registration_count DESC
  `,

  /**
   * DNS lookup patterns
   */
  dnsLookupPatterns: `
    SELECT
      record_type,
      COUNT(*) as lookup_count,
      AVG(response_time_ms) as avg_response_time
    FROM dns_lookups
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY record_type
    ORDER BY lookup_count DESC
  `,

  /**
   * Domain health status distribution
   */
  healthStatusDistribution: `
    SELECT
      overall_status,
      COUNT(*) as domain_count,
      AVG(check_duration_ms) as avg_check_time
    FROM domain_health_checks
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY overall_status
  `,

  /**
   * Expiring domains forecast
   */
  expiringDomains: `
    SELECT
      DATE(expiration_date) as expiry_date,
      COUNT(*) as domain_count,
      SUM(CASE WHEN auto_renew THEN 1 ELSE 0 END) as auto_renew_count
    FROM monitoring_domains
    WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    GROUP BY DATE(expiration_date)
    ORDER BY expiry_date ASC
  `,

  /**
   * Screenshot change detection summary
   */
  screenshotChanges: `
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as total_screenshots,
      SUM(CASE WHEN change_detected THEN 1 ELSE 0 END) as changes_detected
    FROM domain_screenshots
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `,
}

/**
 * Export query results to CSV
 */
export function resultToCSV(result: R2SQLResult): string {
  const lines: string[] = []

  // Header
  lines.push(result.columns.join(','))

  // Rows
  for (const row of result.rows) {
    const escapedRow = row.map((value) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Escape quotes and wrap in quotes if contains comma
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    lines.push(escapedRow.join(','))
  }

  return lines.join('\n')
}

/**
 * Export query results to JSON
 */
export function resultToJSON(result: R2SQLResult): string {
  const objects = result.rows.map((row) => {
    const obj: Record<string, any> = {}
    result.columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })

  return JSON.stringify(objects, null, 2)
}

/**
 * Write analytics data to R2 in Parquet format
 * (Placeholder - would use actual Parquet writer library)
 */
export async function writeToR2Parquet(tableName: string, data: any[], env: Env): Promise<void> {
  // Generate partition path based on current date
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hour = String(now.getUTCHours()).padStart(2, '0')

  const partitionPath = `${tableName}/year=${year}/month=${month}/day=${day}/hour=${hour}`
  const fileName = `${Date.now()}.parquet`
  const objectKey = `${partitionPath}/${fileName}`

  // In production, convert data to Parquet format
  // For now, store as JSON (not optimal for R2 SQL)
  const jsonData = JSON.stringify(data)

  await env.ANALYTICS_BUCKET.put(objectKey, jsonData, {
    customMetadata: {
      table: tableName,
      recordCount: String(data.length),
      timestamp: now.toISOString(),
    },
  })
}

/**
 * List available tables in R2 data catalog
 */
export async function listTables(env: Env): Promise<string[]> {
  const tables = new Set<string>()

  // List objects and extract table names from partition paths
  const objects = await env.ANALYTICS_BUCKET.list({ limit: 1000 })

  for (const object of objects.objects) {
    const match = object.key.match(/^([^/]+)\//)
    if (match) {
      tables.add(match[1])
    }
  }

  return Array.from(tables).sort()
}

/**
 * Get table statistics
 */
export async function getTableStats(tableName: string, env: Env): Promise<{
  name: string
  recordCount: number
  sizeBytes: number
  partitionCount: number
  oldestData: string
  newestData: string
}> {
  const prefix = `${tableName}/`
  const objects = await env.ANALYTICS_BUCKET.list({ prefix, limit: 10000 })

  let recordCount = 0
  let sizeBytes = 0
  let oldest = new Date()
  let newest = new Date(0)

  for (const object of objects.objects) {
    sizeBytes += object.size
    if (object.customMetadata?.recordCount) {
      recordCount += parseInt(object.customMetadata.recordCount)
    }
    if (object.uploaded < oldest) {
      oldest = object.uploaded
    }
    if (object.uploaded > newest) {
      newest = object.uploaded
    }
  }

  return {
    name: tableName,
    recordCount,
    sizeBytes,
    partitionCount: objects.objects.length,
    oldestData: oldest.toISOString(),
    newestData: newest.toISOString(),
  }
}
