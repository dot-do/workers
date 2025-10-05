/**
 * Things CRUD Operations
 * Create, Read, Update, Delete operations for Schema.org entities
 */

import type { D1Database } from '@cloudflare/workers-types'
import { validateThing, type Thing } from './schema-org'

// ============================================================================
// Types
// ============================================================================

export interface ThingRecord {
  id: string
  type: string
  properties: string // JSON string
  source?: string
  namespace?: string
  created_at: string
  updated_at: string
}

export interface CreateThingInput {
  id: string
  type: string
  properties: Record<string, any>
  source?: string
  namespace?: string
}

export interface UpdateThingInput {
  properties?: Record<string, any>
  source?: string
  namespace?: string
}

export interface ListThingsOptions {
  type?: string
  source?: string
  namespace?: string
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at' | 'id'
  orderDir?: 'ASC' | 'DESC'
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new thing
 */
export async function create(db: D1Database, input: CreateThingInput): Promise<ThingRecord> {
  // Validate against Schema.org type
  validateThing(input.type, input.properties)

  const stmt = db
    .prepare(
      `
    INSERT INTO things (id, type, properties, source, namespace)
    VALUES (?1, ?2, ?3, ?4, ?5)
    RETURNING *
  `
    )
    .bind(input.id, input.type, JSON.stringify(input.properties), input.source || null, input.namespace || null)

  const result = await stmt.first<ThingRecord>()
  if (!result) throw new Error('Failed to create thing')

  return result
}

/**
 * Get a thing by ID
 */
export async function get(db: D1Database, id: string): Promise<ThingRecord | null> {
  const stmt = db.prepare('SELECT * FROM things WHERE id = ?1').bind(id)
  return await stmt.first<ThingRecord>()
}

/**
 * Update a thing
 */
export async function update(db: D1Database, id: string, input: UpdateThingInput): Promise<ThingRecord> {
  const existing = await get(db, id)
  if (!existing) throw new Error(`Thing not found: ${id}`)

  // Merge properties if provided
  const newProperties = input.properties ? { ...JSON.parse(existing.properties), ...input.properties } : JSON.parse(existing.properties)

  // Validate merged properties
  validateThing(existing.type, newProperties)

  const stmt = db
    .prepare(
      `
    UPDATE things
    SET properties = ?1,
        source = COALESCE(?2, source),
        namespace = COALESCE(?3, namespace),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?4
    RETURNING *
  `
    )
    .bind(JSON.stringify(newProperties), input.source || null, input.namespace || null, id)

  const result = await stmt.first<ThingRecord>()
  if (!result) throw new Error('Failed to update thing')

  return result
}

/**
 * Upsert a thing (insert or update)
 */
export async function upsert(db: D1Database, input: CreateThingInput): Promise<ThingRecord> {
  // Validate against Schema.org type
  validateThing(input.type, input.properties)

  const stmt = db
    .prepare(
      `
    INSERT INTO things (id, type, properties, source, namespace)
    VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      properties = excluded.properties,
      source = excluded.source,
      namespace = excluded.namespace,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
    )
    .bind(input.id, input.type, JSON.stringify(input.properties), input.source || null, input.namespace || null)

  const result = await stmt.first<ThingRecord>()
  if (!result) throw new Error('Failed to upsert thing')

  return result
}

/**
 * Delete a thing
 */
export async function del(db: D1Database, id: string): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM things WHERE id = ?1').bind(id)
  const result = await stmt.run()
  return (result.meta.changes ?? 0) > 0
}

/**
 * List things with filters and pagination
 */
export async function list(db: D1Database, options: ListThingsOptions = {}): Promise<{ things: ThingRecord[]; total: number }> {
  const { type, source, namespace, limit = 20, offset = 0, orderBy = 'created_at', orderDir = 'DESC' } = options

  // Build WHERE clauses
  const whereClauses: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (type) {
    whereClauses.push(`type = ?${paramIndex++}`)
    params.push(type)
  }
  if (source) {
    whereClauses.push(`source = ?${paramIndex++}`)
    params.push(source)
  }
  if (namespace) {
    whereClauses.push(`namespace = ?${paramIndex++}`)
    params.push(namespace)
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM things ${whereClause}`).bind(...params)
  const countResult = await countStmt.first<{ total: number }>()
  const total = countResult?.total ?? 0

  // Get paginated results
  const listStmt = db
    .prepare(
      `
    SELECT * FROM things
    ${whereClause}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}
  `
    )
    .bind(...params, limit, offset)

  const result = await listStmt.all<ThingRecord>()
  const things = result.results ?? []

  return { things, total }
}

/**
 * Count things by type
 */
export async function countByType(db: D1Database, namespace?: string): Promise<Record<string, number>> {
  const whereClause = namespace ? 'WHERE namespace = ?1' : ''
  const stmt = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM things
    ${whereClause}
    GROUP BY type
    ORDER BY count DESC
  `)

  const result = namespace ? await stmt.bind(namespace).all<{ type: string; count: number }>() : await stmt.all<{ type: string; count: number }>()

  const counts: Record<string, number> = {}
  for (const row of result.results ?? []) {
    counts[row.type] = row.count
  }
  return counts
}

/**
 * Search things by name or description
 * Note: This is a basic LIKE search. For production, use external search service.
 */
export async function search(db: D1Database, query: string, options: ListThingsOptions = {}): Promise<ThingRecord[]> {
  const { type, source, namespace, limit = 20 } = options

  // Build WHERE clauses
  const whereClauses: string[] = []
  const params: any[] = []
  let paramIndex = 1

  // Search in properties (name, description)
  whereClauses.push(`(properties LIKE ?${paramIndex++} OR properties LIKE ?${paramIndex++})`)
  const searchPattern = `%${query}%`
  params.push(searchPattern, searchPattern)

  if (type) {
    whereClauses.push(`type = ?${paramIndex++}`)
    params.push(type)
  }
  if (source) {
    whereClauses.push(`source = ?${paramIndex++}`)
    params.push(source)
  }
  if (namespace) {
    whereClauses.push(`namespace = ?${paramIndex++}`)
    params.push(namespace)
  }

  const whereClause = whereClauses.join(' AND ')

  const stmt = db
    .prepare(
      `
    SELECT * FROM things
    WHERE ${whereClause}
    ORDER BY updated_at DESC
    LIMIT ?${paramIndex++}
  `
    )
    .bind(...params, limit)

  const result = await stmt.all<ThingRecord>()
  return result.results ?? []
}

/**
 * Get thing with parsed properties
 */
export async function getWithProperties(db: D1Database, id: string): Promise<(ThingRecord & { parsedProperties: any }) | null> {
  const thing = await get(db, id)
  if (!thing) return null

  return {
    ...thing,
    parsedProperties: JSON.parse(thing.properties),
  }
}

/**
 * Batch upsert things
 */
export async function batchUpsert(db: D1Database, inputs: CreateThingInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  // Validate all inputs first
  for (const input of inputs) {
    validateThing(input.type, input.properties)
  }

  // Use transaction for atomic batch insert
  const statements: D1PreparedStatement[] = []

  for (const input of inputs) {
    const stmt = db
      .prepare(
        `
      INSERT INTO things (id, type, properties, source, namespace)
      VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        properties = excluded.properties,
        source = excluded.source,
        namespace = excluded.namespace,
        updated_at = CURRENT_TIMESTAMP
    `
      )
      .bind(input.id, input.type, JSON.stringify(input.properties), input.source || null, input.namespace || null)

    statements.push(stmt)
  }

  // Execute batch
  const results = await db.batch(statements)
  return results.length
}

/**
 * Get things by IDs (batch get)
 */
export async function batchGet(db: D1Database, ids: string[]): Promise<ThingRecord[]> {
  if (ids.length === 0) return []

  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',')
  const stmt = db.prepare(`SELECT * FROM things WHERE id IN (${placeholders})`).bind(...ids)

  const result = await stmt.all<ThingRecord>()
  return result.results ?? []
}

/**
 * Delete things by type
 */
export async function deleteByType(db: D1Database, type: string, namespace?: string): Promise<number> {
  const whereClause = namespace ? 'WHERE type = ?1 AND namespace = ?2' : 'WHERE type = ?1'
  const stmt = namespace ? db.prepare(`DELETE FROM things ${whereClause}`).bind(type, namespace) : db.prepare(`DELETE FROM things ${whereClause}`).bind(type)

  const result = await stmt.run()
  return result.meta.changes ?? 0
}
