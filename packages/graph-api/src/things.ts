/**
 * Core CRUD operations for Things
 *
 * Strongly-typed API for creating, reading, updating, deleting Things
 */

import type {
  Thing,
  ThingFilter,
  QueryResult,
  PaginationOptions,
  SortOptions,
  BulkResult,
} from '@do/graph-types'

/**
 * Database interface for Thing operations
 * Can be implemented for ClickHouse, R2 SQL, PostgreSQL, etc.
 */
export interface ThingDatabase {
  execute(query: string, params?: unknown[]): Promise<unknown[]>
  prepare(query: string): PreparedStatement
}

export interface PreparedStatement {
  bind(...params: unknown[]): PreparedStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>
}

/**
 * Create a new Thing
 *
 * @param thing Thing to create (without ulid, will be generated)
 * @param db Database connection
 * @returns Created thing with ulid
 */
export async function createThing(thing: Thing, db: ThingDatabase): Promise<Thing & { ulid: string }> {
  const ulid = generateUlid()
  const now = Date.now()

  const meta = {
    ...thing.meta,
    createdAt: thing.meta?.createdAt || now,
    updatedAt: thing.meta?.updatedAt || now,
    version: 1,
  }

  const query = `
    INSERT INTO things (
      ulid, ns, id, type, data, code, content, meta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `

  await db.prepare(query).bind(ulid, thing.ns, thing.id, thing.type, JSON.stringify(thing.data || {}), thing.code || null, thing.content || null, JSON.stringify(meta)).run()

  return {
    ...thing,
    ulid,
    meta,
  }
}

/**
 * Get a Thing by ns+id (most common operation)
 *
 * @param ns Namespace
 * @param id Identifier
 * @param db Database connection
 * @returns Thing or null if not found
 */
export async function getThing(ns: string, id: string, db: ThingDatabase): Promise<(Thing & { ulid: string }) | null> {
  const query = `
    SELECT ulid, ns, id, type, data, code, content, meta
    FROM things
    WHERE ns = ? AND id = ?
    LIMIT 1
  `

  const result = await db.prepare(query).bind(ns, id).first<any>()

  if (!result) return null

  return {
    ulid: result.ulid,
    ns: result.ns,
    id: result.id,
    type: result.type,
    data: result.data ? JSON.parse(result.data) : undefined,
    code: result.code || undefined,
    content: result.content || undefined,
    meta: result.meta ? JSON.parse(result.meta) : undefined,
  }
}

/**
 * Update a Thing
 *
 * @param ns Namespace
 * @param id Identifier
 * @param updates Partial Thing updates
 * @param db Database connection
 * @returns Updated thing or null if not found
 */
export async function updateThing(
  ns: string,
  id: string,
  updates: Partial<Omit<Thing, 'ns' | 'id'>>,
  db: ThingDatabase
): Promise<(Thing & { ulid: string }) | null> {
  const existing = await getThing(ns, id, db)
  if (!existing) return null

  const now = Date.now()
  const meta = {
    ...existing.meta,
    ...updates.meta,
    updatedAt: now,
    version: (existing.meta?.version || 1) + 1,
  }

  const updated: Thing = {
    ns,
    id,
    type: updates.type !== undefined ? updates.type : existing.type,
    data: updates.data !== undefined ? updates.data : existing.data,
    code: updates.code !== undefined ? updates.code : existing.code,
    content: updates.content !== undefined ? updates.content : existing.content,
    meta,
  }

  const query = `
    UPDATE things
    SET type = ?, data = ?, code = ?, content = ?, meta = ?
    WHERE ns = ? AND id = ?
  `

  await db
    .prepare(query)
    .bind(updated.type, JSON.stringify(updated.data || {}), updated.code || null, updated.content || null, JSON.stringify(meta), ns, id)
    .run()

  return {
    ...updated,
    ulid: existing.ulid,
  }
}

/**
 * Delete a Thing
 *
 * @param ns Namespace
 * @param id Identifier
 * @param db Database connection
 * @returns true if deleted, false if not found
 */
export async function deleteThing(ns: string, id: string, db: ThingDatabase): Promise<boolean> {
  const query = `DELETE FROM things WHERE ns = ? AND id = ?`
  const result = await db.prepare(query).bind(ns, id).run()
  return result.success
}

/**
 * Query Things with filters
 *
 * @param filter Query filter
 * @param options Pagination and sorting
 * @param db Database connection
 * @returns Query result with pagination
 */
export async function queryThings(
  filter: ThingFilter,
  options: PaginationOptions & { sort?: SortOptions } = {},
  db: ThingDatabase
): Promise<QueryResult<Thing & { ulid: string }>> {
  const { limit = 100, offset = 0, sort } = options

  // Build WHERE clause
  const conditions: string[] = []
  const params: unknown[] = []

  if (filter.ns) {
    conditions.push('ns = ?')
    params.push(filter.ns)
  }

  if (filter.id) {
    conditions.push('id = ?')
    params.push(filter.id)
  }

  if (filter.type) {
    conditions.push('type = ?')
    params.push(filter.type)
  }

  if (filter.contentLike) {
    conditions.push('content LIKE ?')
    params.push(`%${filter.contentLike}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build ORDER BY clause
  const orderClause = sort ? `ORDER BY ${sort.field} ${sort.direction.toUpperCase()}` : 'ORDER BY ns, id'

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM things ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>()
  const total = countResult?.total || 0

  // Fetch items
  const query = `
    SELECT ulid, ns, id, type, data, code, content, meta
    FROM things
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `

  const results = await db.prepare(query).bind(...params, limit, offset).all<any>()

  const items = results.results.map((row) => ({
    ulid: row.ulid,
    ns: row.ns,
    id: row.id,
    type: row.type,
    data: row.data ? JSON.parse(row.data) : undefined,
    code: row.code || undefined,
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
 * Bulk create Things
 *
 * @param things Array of things to create
 * @param db Database connection
 * @returns Bulk operation result
 */
export async function bulkCreateThings(things: Thing[], db: ThingDatabase): Promise<BulkResult> {
  let success = 0
  let failed = 0
  const errors: Array<{ item: Thing; error: string }> = []

  for (const thing of things) {
    try {
      await createThing(thing, db)
      success++
    } catch (error) {
      failed++
      errors.push({
        item: thing,
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
