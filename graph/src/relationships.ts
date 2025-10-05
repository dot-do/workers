/**
 * Relationships CRUD Operations
 * Subject-Predicate-Object triple management
 */

import type { D1Database } from '@cloudflare/workers-types'

// ============================================================================
// Types
// ============================================================================

export interface RelationshipRecord {
  id: number
  subject: string
  predicate: string
  object: string
  properties: string // JSON string
  namespace?: string
  created_at: string
  updated_at: string
}

export interface CreateRelationshipInput {
  subject: string
  predicate: string
  object: string
  properties?: Record<string, any>
  namespace?: string
}

export interface UpdateRelationshipInput {
  properties?: Record<string, any>
}

export interface ListRelationshipsOptions {
  subject?: string
  predicate?: string
  object?: string
  namespace?: string
  limit?: number
  offset?: number
  includeThingDetails?: boolean // Join with things table
}

export interface RelationshipWithThings extends RelationshipRecord {
  subjectType?: string
  subjectProperties?: string
  objectType?: string
  objectProperties?: string
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new relationship
 */
export async function create(db: D1Database, input: CreateRelationshipInput): Promise<RelationshipRecord> {
  const stmt = db
    .prepare(
      `
    INSERT INTO relationships (subject, predicate, object, properties, namespace)
    VALUES (?1, ?2, ?3, ?4, ?5)
    RETURNING *
  `
    )
    .bind(input.subject, input.predicate, input.object, JSON.stringify(input.properties || {}), input.namespace || null)

  const result = await stmt.first<RelationshipRecord>()
  if (!result) throw new Error('Failed to create relationship')

  return result
}

/**
 * Get a relationship by ID
 */
export async function get(db: D1Database, id: number): Promise<RelationshipRecord | null> {
  const stmt = db.prepare('SELECT * FROM relationships WHERE id = ?1').bind(id)
  return await stmt.first<RelationshipRecord>()
}

/**
 * Update a relationship's properties
 */
export async function update(db: D1Database, id: number, input: UpdateRelationshipInput): Promise<RelationshipRecord> {
  const existing = await get(db, id)
  if (!existing) throw new Error(`Relationship not found: ${id}`)

  const newProperties = input.properties ? { ...JSON.parse(existing.properties), ...input.properties } : JSON.parse(existing.properties)

  const stmt = db
    .prepare(
      `
    UPDATE relationships
    SET properties = ?1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?2
    RETURNING *
  `
    )
    .bind(JSON.stringify(newProperties), id)

  const result = await stmt.first<RelationshipRecord>()
  if (!result) throw new Error('Failed to update relationship')

  return result
}

/**
 * Upsert a relationship (based on subject + predicate + object uniqueness)
 */
export async function upsert(db: D1Database, input: CreateRelationshipInput): Promise<RelationshipRecord> {
  // Check if relationship exists
  const existing = await findOne(db, {
    subject: input.subject,
    predicate: input.predicate,
    object: input.object,
  })

  if (existing) {
    // Update existing
    return await update(db, existing.id, { properties: input.properties })
  } else {
    // Create new
    return await create(db, input)
  }
}

/**
 * Delete a relationship
 */
export async function del(db: D1Database, id: number): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM relationships WHERE id = ?1').bind(id)
  const result = await stmt.run()
  return (result.meta.changes ?? 0) > 0
}

/**
 * Delete all relationships for a subject
 */
export async function deleteBySubject(db: D1Database, subject: string): Promise<number> {
  const stmt = db.prepare('DELETE FROM relationships WHERE subject = ?1').bind(subject)
  const result = await stmt.run()
  return result.meta.changes ?? 0
}

/**
 * Delete all relationships pointing to an object
 */
export async function deleteByObject(db: D1Database, object: string): Promise<number> {
  const stmt = db.prepare('DELETE FROM relationships WHERE object = ?1').bind(object)
  const result = await stmt.run()
  return result.meta.changes ?? 0
}

/**
 * List relationships with filters and pagination
 */
export async function list(db: D1Database, options: ListRelationshipsOptions = {}): Promise<{ relationships: RelationshipRecord[]; total: number }> {
  const { subject, predicate, object, namespace, limit = 20, offset = 0, includeThingDetails = false } = options

  // Build WHERE clauses
  const whereClauses: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (subject) {
    whereClauses.push(`r.subject = ?${paramIndex++}`)
    params.push(subject)
  }
  if (predicate) {
    whereClauses.push(`r.predicate = ?${paramIndex++}`)
    params.push(predicate)
  }
  if (object) {
    whereClauses.push(`r.object = ?${paramIndex++}`)
    params.push(object)
  }
  if (namespace) {
    whereClauses.push(`r.namespace = ?${paramIndex++}`)
    params.push(namespace)
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM relationships r ${whereClause}`).bind(...params)
  const countResult = await countStmt.first<{ total: number }>()
  const total = countResult?.total ?? 0

  // Build SELECT query
  let selectQuery: string
  if (includeThingDetails) {
    selectQuery = `
      SELECT
        r.*,
        s.type as subjectType,
        s.properties as subjectProperties,
        o.type as objectType,
        o.properties as objectProperties
      FROM relationships r
      LEFT JOIN things s ON r.subject = s.id
      LEFT JOIN things o ON r.object = o.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}
    `
  } else {
    selectQuery = `
      SELECT * FROM relationships r
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}
    `
  }

  const listStmt = db.prepare(selectQuery).bind(...params, limit, offset)
  const result = await listStmt.all<RelationshipRecord>()
  const relationships = result.results ?? []

  return { relationships, total }
}

/**
 * Find a single relationship by triple
 */
export async function findOne(db: D1Database, filter: { subject: string; predicate: string; object: string }): Promise<RelationshipRecord | null> {
  const stmt = db.prepare('SELECT * FROM relationships WHERE subject = ?1 AND predicate = ?2 AND object = ?3 LIMIT 1').bind(filter.subject, filter.predicate, filter.object)

  return await stmt.first<RelationshipRecord>()
}

/**
 * Get all outgoing relationships from a subject
 */
export async function getOutgoing(db: D1Database, subject: string, predicateFilter?: string): Promise<RelationshipWithThings[]> {
  let query = `
    SELECT
      r.*,
      t.type as objectType,
      t.properties as objectProperties
    FROM relationships r
    LEFT JOIN things t ON r.object = t.id
    WHERE r.subject = ?1
  `
  const params = [subject]

  if (predicateFilter) {
    query += ' AND r.predicate = ?2'
    params.push(predicateFilter)
  }

  query += ' ORDER BY r.created_at DESC'

  const stmt = db.prepare(query).bind(...params)
  const result = await stmt.all<RelationshipWithThings>()
  return result.results ?? []
}

/**
 * Get all incoming relationships to an object
 */
export async function getIncoming(db: D1Database, object: string, predicateFilter?: string): Promise<RelationshipWithThings[]> {
  let query = `
    SELECT
      r.*,
      t.type as subjectType,
      t.properties as subjectProperties
    FROM relationships r
    LEFT JOIN things t ON r.subject = t.id
    WHERE r.object = ?1
  `
  const params = [object]

  if (predicateFilter) {
    query += ' AND r.predicate = ?2'
    params.push(predicateFilter)
  }

  query += ' ORDER BY r.created_at DESC'

  const stmt = db.prepare(query).bind(...params)
  const result = await stmt.all<RelationshipWithThings>()
  return result.results ?? []
}

/**
 * Get all relationships for a thing (both incoming and outgoing)
 */
export async function getAll(db: D1Database, thingId: string): Promise<{ outgoing: RelationshipWithThings[]; incoming: RelationshipWithThings[] }> {
  const [outgoing, incoming] = await Promise.all([getOutgoing(db, thingId), getIncoming(db, thingId)])

  return { outgoing, incoming }
}

/**
 * Batch create relationships
 */
export async function batchCreate(db: D1Database, inputs: CreateRelationshipInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  const statements: D1PreparedStatement[] = []

  for (const input of inputs) {
    const stmt = db
      .prepare(
        `
      INSERT INTO relationships (subject, predicate, object, properties, namespace)
      VALUES (?1, ?2, ?3, ?4, ?5)
    `
      )
      .bind(input.subject, input.predicate, input.object, JSON.stringify(input.properties || {}), input.namespace || null)

    statements.push(stmt)
  }

  const results = await db.batch(statements)
  return results.length
}

/**
 * Count relationships by predicate type
 */
export async function countByPredicate(db: D1Database, namespace?: string): Promise<Record<string, number>> {
  const whereClause = namespace ? 'WHERE namespace = ?1' : ''
  const stmt = db.prepare(`
    SELECT predicate, COUNT(*) as count
    FROM relationships
    ${whereClause}
    GROUP BY predicate
    ORDER BY count DESC
  `)

  const result = namespace ? await stmt.bind(namespace).all<{ predicate: string; count: number }>() : await stmt.all<{ predicate: string; count: number }>()

  const counts: Record<string, number> = {}
  for (const row of result.results ?? []) {
    counts[row.predicate] = row.count
  }
  return counts
}

/**
 * Check if a relationship exists
 */
export async function exists(db: D1Database, subject: string, predicate: string, object: string): Promise<boolean> {
  const result = await findOne(db, { subject, predicate, object })
  return result !== null
}

/**
 * Replace all outgoing relationships for a subject with a specific predicate
 */
export async function replaceOutgoing(db: D1Database, subject: string, predicate: string, objects: string[], properties?: Record<string, any>): Promise<number> {
  // Delete existing relationships
  const deleteStmt = db.prepare('DELETE FROM relationships WHERE subject = ?1 AND predicate = ?2').bind(subject, predicate)
  await deleteStmt.run()

  // Create new relationships
  if (objects.length === 0) return 0

  const inputs: CreateRelationshipInput[] = objects.map((object) => ({
    subject,
    predicate,
    object,
    properties,
  }))

  return await batchCreate(db, inputs)
}
