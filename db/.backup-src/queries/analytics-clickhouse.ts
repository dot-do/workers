import { clickhouse } from '../sql'

/**
 * Get database statistics (stub - TODO: Implement using ClickHouse)
 */
export async function getDatabaseStats() {
  return {
    thingsByNamespace: [],
    relationshipsByType: [],
    totals: {},
  }
}

/**
 * Get entity type distribution (stub - TODO: Implement using ClickHouse)
 */
export async function getTypeDistribution(ns?: string) {
  return []
}

/**
 * Get ClickHouse analytics (if available)
 */
export async function getClickHouseStats() {
  try {
    // Query ClickHouse for event statistics
    const eventStats = await clickhouse.query({
      query: `
        SELECT
          type,
          COUNT(*) as count,
          MIN(ts) as first_seen,
          MAX(ts) as last_seen
        FROM events
        GROUP BY type
        ORDER BY count DESC
        LIMIT 100
      `,
      format: 'JSON',
    })

    const dataStats = await clickhouse.query({
      query: `
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT id) as unique_ids,
          COUNT(DISTINCT type) as unique_types,
          MIN(ts) as oldest_record,
          MAX(ts) as newest_record
        FROM data
      `,
      format: 'JSON',
    })

    return {
      events: await eventStats.json(),
      data: await dataStats.json(),
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Get recent activity from ClickHouse
 */
export async function getRecentActivity(limit: number = 100) {
  try {
    const results = await clickhouse.query({
      query: `
        SELECT
          ulid,
          type,
          id,
          ts,
          data
        FROM events
        ORDER BY ts DESC
        LIMIT ${limit}
      `,
      format: 'JSON',
    })

    return await results.json()
  } catch (error: any) {
    return { error: error.message }
  }
}
