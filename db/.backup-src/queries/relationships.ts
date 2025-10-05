import { eq, and, or, desc, sql } from 'drizzle-orm'
import { getPostgresClient } from '../postgres'

export interface RelationshipListOptions {
  limit?: number
  offset?: number
  type?: string
  visibility?: 'public' | 'private' | 'unlisted'
}

/**
 * Get relationships for a thing (both incoming and outgoing)
 */
export async function getRelationships(ns: string, id: string, options: RelationshipListOptions = {}) {
  const db = getPostgresClient()
  const { relationships } = db.query

  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0

  // Get outgoing relationships (from this thing)
  let outgoingQuery = db.select().from(relationships).where(and(eq(relationships.fromNs, ns), eq(relationships.fromId, id)))

  if (options.type) {
    outgoingQuery = outgoingQuery.where(and(eq(relationships.fromNs, ns), eq(relationships.fromId, id), eq(relationships.type, options.type)))
  }

  outgoingQuery = outgoingQuery.orderBy(desc(relationships.createdAt)).limit(limit).offset(offset)

  const outgoing = await outgoingQuery

  return { outgoing }
}

/**
 * Get incoming relationships (pointing to this thing)
 */
export async function getIncomingRelationships(ns: string, id: string, options: RelationshipListOptions = {}) {
  const db = getPostgresClient()
  const { relationships } = db.query

  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0

  let query = db.select().from(relationships).where(and(eq(relationships.toNs, ns), eq(relationships.toId, id)))

  if (options.type) {
    query = query.where(and(eq(relationships.toNs, ns), eq(relationships.toId, id), eq(relationships.type, options.type)))
  }

  query = query.orderBy(desc(relationships.createdAt)).limit(limit).offset(offset)

  const incoming = await query
  return { incoming }
}

/**
 * Upsert a relationship
 */
export async function upsert(relationship: {
  ns: string
  id: string
  type: string
  fromNs: string
  fromId: string
  toNs: string
  toId: string
  data: Record<string, any>
  code?: string | null
  visibility?: 'public' | 'private' | 'unlisted'
}) {
  const db = getPostgresClient()
  const { relationships } = db.query

  const now = new Date()
  const values = {
    ...relationship,
    visibility: relationship.visibility || 'public',
    createdAt: now,
    updatedAt: now,
  }

  const result = await db
    .insert(relationships)
    .values(values)
    .onConflictDoUpdate({
      target: [relationships.ns, relationships.id],
      set: { ...values, createdAt: sql`excluded.created_at` },
    })
    .returning()

  return result[0]
}

/**
 * Delete a relationship
 */
export async function del(ns: string, id: string) {
  const db = getPostgresClient()
  const { relationships } = db.query

  const result = await db.delete(relationships).where(and(eq(relationships.ns, ns), eq(relationships.id, id))).returning()

  return result[0] || null
}

/**
 * List all relationships for a namespace
 */
export async function list(ns: string, options: RelationshipListOptions = {}) {
  const db = getPostgresClient()
  const { relationships } = db.query

  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0

  let query = db.select().from(relationships).where(eq(relationships.ns, ns))

  if (options.type) {
    query = query.where(and(eq(relationships.ns, ns), eq(relationships.type, options.type)))
  }

  if (options.visibility) {
    query = query.where(and(eq(relationships.ns, ns), eq(relationships.visibility, options.visibility)))
  }

  query = query.orderBy(desc(relationships.createdAt)).limit(limit).offset(offset)

  const results = await query
  return {
    data: results,
    pagination: { limit, offset, total: results.length },
  }
}
