/**
 * Core CRUD operations for Relationships
 *
 * Strongly-typed API for creating, reading, deleting Relationships
 * Optimized for inbound lookups (sorted by toNs, toId)
 */

import type { Relationship, RelationshipFilter, QueryResult, PaginationOptions, SortOptions, BulkResult } from '@do/graph-types'
import type { ThingDatabase } from './things.js'

/**
 * Create a new Relationship
 *
 * @param relationship Relationship to create (without ulid)
 * @param db Database connection
 * @returns Created relationship with ulid
 */
export async function createRelationship(relationship: Relationship, db: ThingDatabase): Promise<Relationship & { ulid: string }> {
  const ulid = generateUlid()
  const now = new Date().toISOString()

  const query = `
    INSERT INTO relationships (
      ulid, fromNs, fromId, fromType, predicate,
      toNs, toId, toType, data, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  await db
    .prepare(query)
    .bind(
      ulid,
      relationship.fromNs,
      relationship.fromId,
      relationship.fromType,
      relationship.predicate,
      relationship.toNs,
      relationship.toId,
      relationship.toType,
      JSON.stringify(relationship.data || {}),
      now
    )
    .run()

  return {
    ...relationship,
    ulid,
  }
}

/**
 * Get inbound relationships (what points TO this thing)
 *
 * This is the PRIMARY use case - optimized by index on (to_ns, to_id)
 *
 * @param toNs Target namespace
 * @param toId Target identifier
 * @param options Filter and pagination options
 * @param db Database connection
 * @returns Inbound relationships
 */
export async function getInboundRelationships(
  toNs: string,
  toId: string,
  options: {
    predicate?: string
    limit?: number
    offset?: number
  } = {},
  db: ThingDatabase
): Promise<QueryResult<Relationship & { ulid: string }>> {
  const { predicate, limit = 100, offset = 0 } = options

  const conditions = ['toNs = ?', 'toId = ?']
  const params: unknown[] = [toNs, toId]

  if (predicate) {
    conditions.push('predicate = ?')
    params.push(predicate)
  }

  const whereClause = conditions.join(' AND ')

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM relationships WHERE ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Fetch relationships
  const query = `
    SELECT ulid, fromNs, fromId, fromType, predicate,
           toNs, toId, toType, data, createdAt
    FROM relationships
    WHERE ${whereClause}
    ORDER BY predicate, fromNs, fromId
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.fromNs,
    fromId: row.fromId,
    fromType: row.fromType,
    predicate: row.predicate,
    toNs: row.toNs,
    toId: row.toId,
    toType: row.toType,
    data: row.data ? JSON.parse(row.data) : undefined,
  }))

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}

/**
 * Get outbound relationships (what this thing points TO)
 *
 * Less common - requires scan without index optimization
 *
 * @param fromNs Source namespace
 * @param fromId Source identifier
 * @param options Filter and pagination options
 * @param db Database connection
 * @returns Outbound relationships
 */
export async function getOutboundRelationships(
  fromNs: string,
  fromId: string,
  options: {
    predicate?: string
    limit?: number
    offset?: number
  } = {},
  db: ThingDatabase
): Promise<QueryResult<Relationship & { ulid: string }>> {
  const { predicate, limit = 100, offset = 0 } = options

  const conditions = ['fromNs = ?', 'fromId = ?']
  const params: unknown[] = [fromNs, fromId]

  if (predicate) {
    conditions.push('predicate = ?')
    params.push(predicate)
  }

  const whereClause = conditions.join(' AND ')

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM relationships WHERE ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Fetch relationships
  const query = `
    SELECT ulid, fromNs, fromId, fromType, predicate,
           toNs, toId, toType, data, createdAt
    FROM relationships
    WHERE ${whereClause}
    ORDER BY predicate, toNs, toId
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.fromNs,
    fromId: row.fromId,
    fromType: row.fromType,
    predicate: row.predicate,
    toNs: row.toNs,
    toId: row.toId,
    toType: row.toType,
    data: row.data ? JSON.parse(row.data) : undefined,
  }))

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}

/**
 * Query relationships with complex filters
 *
 * @param filter Relationship filter
 * @param options Pagination and sorting
 * @param db Database connection
 * @returns Query result
 */
export async function queryRelationships(
  filter: RelationshipFilter,
  options: PaginationOptions & { sort?: SortOptions } = {},
  db: ThingDatabase
): Promise<QueryResult<Relationship & { ulid: string }>> {
  const { limit = 100, offset = 0, sort } = options

  // Build WHERE clause
  const conditions: string[] = []
  const params: unknown[] = []

  if (filter.fromNs) {
    conditions.push('fromNs = ?')
    params.push(filter.fromNs)
  }

  if (filter.fromId) {
    conditions.push('fromId = ?')
    params.push(filter.fromId)
  }

  if (filter.fromType) {
    conditions.push('fromType = ?')
    params.push(filter.fromType)
  }

  if (filter.predicate) {
    conditions.push('predicate = ?')
    params.push(filter.predicate)
  }

  if (filter.toNs) {
    conditions.push('toNs = ?')
    params.push(filter.toNs)
  }

  if (filter.toId) {
    conditions.push('toId = ?')
    params.push(filter.toId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build ORDER BY clause (default: sort by toNs, toId for index optimization)
  const orderClause = sort ? `ORDER BY ${sort.field} ${sort.direction.toUpperCase()}` : 'ORDER BY toNs, toId, predicate'

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM relationships ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Fetch relationships
  const query = `
    SELECT ulid, fromNs, fromId, fromType, predicate,
           toNs, toId, toType, data, createdAt
    FROM relationships
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.fromNs,
    fromId: row.fromId,
    fromType: row.fromType,
    predicate: row.predicate,
    toNs: row.toNs,
    toId: row.toId,
    toType: row.toType,
    data: row.data ? JSON.parse(row.data) : undefined,
  }))

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}

/**
 * Delete a relationship
 *
 * @param ulid Relationship ULID
 * @param db Database connection
 * @returns true if deleted, false if not found
 */
export async function deleteRelationship(ulid: string, db: ThingDatabase): Promise<boolean> {
  const query = `DELETE FROM relationships WHERE ulid = ?`
  const result = await db.prepare(query).bind(ulid).run()
  return result.success
}

/**
 * Delete all relationships for a thing (cleanup on thing deletion)
 *
 * @param ns Namespace
 * @param id Identifier
 * @param db Database connection
 * @returns Number of relationships deleted
 */
export async function deleteThingRelationships(ns: string, id: string, db: ThingDatabase): Promise<number> {
  const query = `
    DELETE FROM relationships
    WHERE (fromNs = ? AND fromId = ?) OR (toNs = ? AND toId = ?)
  `
  const result = await db.prepare(query).bind(ns, id, ns, id).run()
  return result.success ? 1 : 0
}

/**
 * Bulk create relationships
 *
 * @param relationships Array of relationships to create
 * @param db Database connection
 * @returns Bulk operation result
 */
export async function bulkCreateRelationships(relationships: Relationship[], db: ThingDatabase): Promise<BulkResult> {
  let success = 0
  let failed = 0
  const errors: Array<{ item: Relationship; error: string }> = []

  for (const relationship of relationships) {
    try {
      await createRelationship(relationship, db)
      success++
    } catch (error) {
      failed++
      errors.push({
        item: relationship,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { success, failed, errors: errors.length > 0 ? errors : undefined }
}

/**
 * Generate ULID for unique identifiers
 * Simple implementation - use ulid package in production
 */
function generateUlid(): string {
  const timestamp = Date.now()
  const randomness = Math.random().toString(36).substring(2, 15)
  return `${timestamp.toString(36).toUpperCase()}${randomness.toUpperCase()}`
}
