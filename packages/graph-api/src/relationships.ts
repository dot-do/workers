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
  const now = Date.now()

  const meta = {
    ...relationship.meta,
    createdAt: relationship.meta?.createdAt || now,
  }

  const query = `
    INSERT INTO relationships (
      ulid, from_ns, from_id, from_type, predicate, reverse,
      to_ns, to_id, data, content, meta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  await db
    .prepare(query)
    .bind(
      ulid,
      relationship.fromNs,
      relationship.fromId,
      relationship.fromType || null,
      relationship.predicate,
      relationship.reverse || null,
      relationship.toNs,
      relationship.toId,
      JSON.stringify(relationship.data || {}),
      relationship.content || null,
      JSON.stringify(meta)
    )
    .run()

  return {
    ...relationship,
    ulid,
    meta,
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

  const conditions = ['to_ns = ?', 'to_id = ?']
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
    SELECT ulid, from_ns, from_id, from_type, predicate, reverse,
           to_ns, to_id, data, content, meta
    FROM relationships
    WHERE ${whereClause}
    ORDER BY predicate, from_ns, from_id
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.from_ns,
    fromId: row.from_id,
    fromType: row.from_type || undefined,
    predicate: row.predicate,
    reverse: row.reverse || undefined,
    toNs: row.to_ns,
    toId: row.to_id,
    data: row.data ? JSON.parse(row.data) : undefined,
    content: row.content || undefined,
    meta: row.meta ? JSON.parse(row.meta) : undefined,
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

  const conditions = ['from_ns = ?', 'from_id = ?']
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
    SELECT ulid, from_ns, from_id, from_type, predicate, reverse,
           to_ns, to_id, data, content, meta
    FROM relationships
    WHERE ${whereClause}
    ORDER BY predicate, to_ns, to_id
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.from_ns,
    fromId: row.from_id,
    fromType: row.from_type || undefined,
    predicate: row.predicate,
    reverse: row.reverse || undefined,
    toNs: row.to_ns,
    toId: row.to_id,
    data: row.data ? JSON.parse(row.data) : undefined,
    content: row.content || undefined,
    meta: row.meta ? JSON.parse(row.meta) : undefined,
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
    conditions.push('from_ns = ?')
    params.push(filter.fromNs)
  }

  if (filter.fromId) {
    conditions.push('from_id = ?')
    params.push(filter.fromId)
  }

  if (filter.fromType) {
    conditions.push('from_type = ?')
    params.push(filter.fromType)
  }

  if (filter.predicate) {
    conditions.push('predicate = ?')
    params.push(filter.predicate)
  }

  if (filter.toNs) {
    conditions.push('to_ns = ?')
    params.push(filter.toNs)
  }

  if (filter.toId) {
    conditions.push('to_id = ?')
    params.push(filter.toId)
  }

  if (filter.minStrength !== undefined) {
    conditions.push("JSON_EXTRACT(meta, '$.strength') >= ?")
    params.push(filter.minStrength)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build ORDER BY clause (default: sort by toNs, toId for index optimization)
  const orderClause = sort ? `ORDER BY ${sort.field} ${sort.direction.toUpperCase()}` : 'ORDER BY to_ns, to_id, predicate'

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM relationships ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Fetch relationships
  const query = `
    SELECT ulid, from_ns, from_id, from_type, predicate, reverse,
           to_ns, to_id, data, content, meta
    FROM relationships
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    fromNs: row.from_ns,
    fromId: row.from_id,
    fromType: row.from_type || undefined,
    predicate: row.predicate,
    reverse: row.reverse || undefined,
    toNs: row.to_ns,
    toId: row.to_id,
    data: row.data ? JSON.parse(row.data) : undefined,
    content: row.content || undefined,
    meta: row.meta ? JSON.parse(row.meta) : undefined,
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
    WHERE (from_ns = ? AND from_id = ?) OR (to_ns = ? AND to_id = ?)
  `
  const result = await db.prepare(query).bind(ns, id, ns, id).run()
  return result.meta?.changes || 0
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
