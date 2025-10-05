/**
 * Triple Storage Operations
 */

import type {
  Triple,
  TriplePattern,
  CreateTripleRequest,
  QueryTriplesRequest,
  Env,
} from './types'

/**
 * Generate unique ID for triple
 */
export function generateTripleId(): string {
  return `triple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a new semantic triple
 */
export async function createTriple(
  params: CreateTripleRequest,
  userId: string,
  env: Env
): Promise<Triple> {
  const triple: Triple = {
    id: generateTripleId(),
    subject: params.subject,
    predicate: params.predicate,
    object: params.object,
    context: params.context,
    created_at: new Date().toISOString(),
    created_by: userId,
    version: 1,
    confidence: params.context?.confidence ?? 1.0,
  }

  // Store in PostgreSQL
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO semantic_triples (
        id, subject, predicate, object, context,
        created_at, created_by, version, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      triple.id,
      triple.subject,
      triple.predicate,
      triple.object,
      JSON.stringify(triple.context || {}),
      triple.created_at,
      triple.created_by,
      triple.version,
      triple.confidence,
    ],
  })

  // Create index entries for fast graph queries
  await createTripleIndex(triple, env)

  // Optionally sync to ClickHouse for analytics
  await syncToClickHouse(triple, env)

  return triple
}

/**
 * Get a triple by ID
 */
export async function getTriple(id: string, env: Env): Promise<Triple | null> {
  const result = await env.DB_SERVICE.query({
    query: `
      SELECT id, subject, predicate, object, context,
             created_at, created_by, updated_at, version, confidence
      FROM semantic_triples
      WHERE id = ? AND deleted_at IS NULL
    `,
    params: [id],
  })

  if (!result.rows || result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    context: row.context ? JSON.parse(row.context) : undefined,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    version: row.version,
    confidence: row.confidence,
  }
}

/**
 * Query triples by pattern
 */
export async function queryTriples(
  pattern: QueryTriplesRequest,
  env: Env
): Promise<{ triples: Triple[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const params: any[] = []

  // Build WHERE clause
  if (pattern.subject) {
    conditions.push('subject = ?')
    params.push(pattern.subject)
  }

  if (pattern.predicate) {
    conditions.push('predicate = ?')
    params.push(pattern.predicate)
  }

  if (pattern.object) {
    conditions.push('object = ?')
    params.push(pattern.object)
  }

  // Context filters
  if (pattern.context?.inferred !== undefined) {
    conditions.push("context->>'inferred' = ?")
    params.push(pattern.context.inferred.toString())
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Count total
  const countResult = await env.DB_SERVICE.query({
    query: `SELECT COUNT(*) as total FROM semantic_triples ${whereClause}`,
    params,
  })
  const total = countResult.rows[0].total

  // Get paginated results
  const limit = pattern.limit ?? 20
  const offset = pattern.offset ?? 0

  const result = await env.DB_SERVICE.query({
    query: `
      SELECT id, subject, predicate, object, context,
             created_at, created_by, updated_at, version, confidence
      FROM semantic_triples
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    params: [...params, limit, offset],
  })

  const triples = result.rows.map((row: any) => ({
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    context: row.context ? JSON.parse(row.context) : undefined,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    version: row.version,
    confidence: row.confidence,
  }))

  return { triples, total }
}

/**
 * Delete a triple (soft delete)
 */
export async function deleteTriple(id: string, userId: string, env: Env): Promise<boolean> {
  const result = await env.DB_SERVICE.execute({
    query: `
      UPDATE semantic_triples
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `,
    params: [new Date().toISOString(), new Date().toISOString(), id],
  })

  // Remove from index
  await deleteTripleIndex(id, env)

  return result.rowsAffected > 0
}

/**
 * Create index entries for fast graph traversal
 */
async function createTripleIndex(triple: Triple, env: Env): Promise<void> {
  // Index by subject
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO triple_index (node, direction, triple_id)
      VALUES (?, 'subject', ?)
    `,
    params: [triple.subject, triple.id],
  })

  // Index by object
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO triple_index (node, direction, triple_id)
      VALUES (?, 'object', ?)
    `,
    params: [triple.object, triple.id],
  })

  // Index by predicate
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO triple_index (node, direction, triple_id)
      VALUES (?, 'predicate', ?)
    `,
    params: [triple.predicate, triple.id],
  })
}

/**
 * Delete triple from index
 */
async function deleteTripleIndex(tripleId: string, env: Env): Promise<void> {
  await env.DB_SERVICE.execute({
    query: 'DELETE FROM triple_index WHERE triple_id = ?',
    params: [tripleId],
  })
}

/**
 * Sync triple to ClickHouse for analytics (optional)
 */
async function syncToClickHouse(triple: Triple, env: Env): Promise<void> {
  try {
    // Extract context fields for ClickHouse columns
    const location = triple.context?.spatial?.location || ''
    const reason = triple.context?.causal?.reason || ''
    const timestamp = triple.context?.temporal?.timestamp || triple.created_at || ''

    await env.DB_SERVICE.executeClickHouse({
      query: `
        INSERT INTO semantic_triples_analytics (
          id, subject, predicate, object, timestamp,
          location, reason, created_by, confidence,
          subject_type, predicate_type, object_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        triple.id,
        triple.subject,
        triple.predicate,
        triple.object,
        timestamp,
        location,
        reason,
        triple.created_by || '',
        triple.confidence || 1.0,
        inferType(triple.subject),
        inferType(triple.predicate),
        inferType(triple.object),
      ],
    })
  } catch (error) {
    console.error('Failed to sync to ClickHouse:', error)
    // Don't fail the main operation if analytics sync fails
  }
}

/**
 * Infer entity type from name
 */
function inferType(name: string): string {
  // Simple heuristic - can be enhanced with AI
  if (name.endsWith('ing')) return 'activity'
  if (name.endsWith('ed')) return 'event'
  if (name.startsWith('will')) return 'action'

  // Check if plural (collection) or singular (item)
  if (name.endsWith('s') && !name.endsWith('ss')) return 'collection'

  return 'item'
}
