import { sql } from 'drizzle-orm'
import { getPostgresClient } from '../postgres'
import { clickhouse } from '../sql'

/**
 * Get database statistics from PostgreSQL
 */
export async function getDatabaseStats() {
  const db = getPostgresClient()

  // Count things by namespace
  const thingsByNs = await db.execute(sql`
    SELECT ns, COUNT(*) as count
    FROM things
    GROUP BY ns
    ORDER BY count DESC
  `)

  // Count relationships by type
  const relationshipsByType = await db.execute(sql`
    SELECT type, COUNT(*) as count
    FROM relationships
    GROUP BY type
    ORDER BY count DESC
  `)

  // Get total counts
  const totals = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM things) as total_things,
      (SELECT COUNT(*) FROM relationships) as total_relationships,
      (SELECT COUNT(*) FROM things WHERE embedding IS NOT NULL) as things_with_embeddings
  `)

  return {
    thingsByNamespace: (thingsByNs as any).rows || [],
    relationshipsByType: (relationshipsByType as any).rows || [],
    totals: (totals as any).rows?.[0] || {},
  }
}

/**
 * Get entity type distribution
 */
export async function getTypeDistribution(ns?: string) {
  const db = getPostgresClient()

  const query = ns
    ? sql`SELECT type, COUNT(*) as count FROM things WHERE ns = ${ns} GROUP BY type ORDER BY count DESC`
    : sql`SELECT type, COUNT(*) as count FROM things GROUP BY type ORDER BY count DESC`

  const results = await db.execute(query)
  return (results as any).rows || []
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
