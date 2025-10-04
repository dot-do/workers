import { eq, and, or, like, desc, sql } from 'drizzle-orm'
import { getPostgresClient } from '../postgres'
import type { PgColumn } from 'drizzle-orm/pg-core'

export interface GetOptions {
  includeEmbedding?: boolean
}

export interface ListOptions {
  limit?: number
  offset?: number
  page?: number
  type?: string
  visibility?: 'public' | 'private' | 'unlisted'
  orderBy?: 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface SearchOptions extends ListOptions {
  fields?: ('type' | 'content' | 'data')[]
}

/**
 * Get a single thing by namespace and ID
 */
export async function get(ns: string, id: string, options: GetOptions = {}, env?: any) {
  const db = getPostgresClient(env)
  const { things } = db.query

  const result = await db
    .select({
      ns: things.ns,
      id: things.id,
      type: things.type,
      content: things.content,
      code: things.code,
      data: things.data,
      visibility: things.visibility,
      embedding: options.includeEmbedding ? things.embedding : sql`null`.as('embedding'),
      createdAt: things.createdAt,
      updatedAt: things.updatedAt,
    })
    .from(things)
    .where(and(eq(things.ns, ns), eq(things.id, id)))
    .limit(1)

  return result[0] || null
}

/**
 * List things with pagination and filters
 */
export async function list(ns: string, options: ListOptions = {}, env?: any) {
  const db = getPostgresClient(env)
  const { things } = db.query

  const limit = Math.min(options.limit || 20, 1000) // Max 1000
  const page = options.page || 1
  const offset = options.offset || (page - 1) * limit
  const order = options.order || 'desc'
  const orderByField = options.orderBy || 'createdAt'

  let query = db.select().from(things).where(eq(things.ns, ns))

  // Apply filters
  if (options.type) {
    query = query.where(and(eq(things.ns, ns), eq(things.type, options.type)))
  }
  if (options.visibility) {
    query = query.where(and(eq(things.ns, ns), eq(things.visibility, options.visibility)))
  }

  // Apply ordering
  const orderByColumn = things[orderByField as keyof typeof things] as PgColumn
  query = query.orderBy(order === 'desc' ? desc(orderByColumn) : orderByColumn)

  // Fetch one more than limit to check if there are more results
  query = query.limit(limit + 1).offset(offset)

  const results = await query
  const hasMore = results.length > limit
  const data = hasMore ? results.slice(0, limit) : results

  // Get total count (approximate - could be expensive for large datasets)
  const countQuery = db.select({ count: sql`count(*)` }).from(things).where(eq(things.ns, ns))
  const countResult = await countQuery
  const total = Number(countResult[0]?.count || 0)

  return {
    data,
    total,
    hasMore,
  }
}

/**
 * Upsert (insert or update) a thing
 */
export async function upsert(thing: {
  ns: string
  id: string
  type: string
  content?: string | null
  code?: string | null
  data: Record<string, any>
  visibility?: 'public' | 'private' | 'unlisted'
  embedding?: number[] | null
}) {
  const db = getPostgresClient()
  const { things } = db.query

  const now = new Date()
  const values = {
    ...thing,
    visibility: thing.visibility || 'public',
    createdAt: now,
    updatedAt: now,
  }

  const result = await db
    .insert(things)
    .values(values)
    .onConflictDoUpdate({
      target: [things.ns, things.id],
      set: { ...values, createdAt: sql`excluded.created_at` }, // Preserve original createdAt
    })
    .returning()

  return result[0]
}

/**
 * Delete a thing
 */
export async function del(ns: string, id: string) {
  const db = getPostgresClient()
  const { things } = db.query

  const result = await db.delete(things).where(and(eq(things.ns, ns), eq(things.id, id))).returning()

  return result[0] || null
}

/**
 * Search things by text query
 */
export async function search(query: string, options: SearchOptions = {}) {
  const db = getPostgresClient()
  const { things } = db.query

  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0
  const fields = options.fields || ['type', 'content', 'data']

  // Build search conditions for each field
  const searchConditions = fields.map((field) => {
    if (field === 'type') return like(things.type, `%${query}%`)
    if (field === 'content') return like(things.content, `%${query}%`)
    // For data (JSONB), convert to text for searching
    return sql`${things.data}::text LIKE ${`%${query}%`}`
  })

  let dbQuery = db.select().from(things).where(or(...searchConditions))

  // Apply filters
  if (options.type) {
    dbQuery = dbQuery.where(eq(things.type, options.type))
  }
  if (options.visibility) {
    dbQuery = dbQuery.where(eq(things.visibility, options.visibility))
  }

  // Apply ordering and pagination
  dbQuery = dbQuery.orderBy(desc(things.updatedAt)).limit(limit).offset(offset)

  const results = await dbQuery
  return {
    data: results,
    pagination: { limit, offset, total: results.length },
  }
}

/**
 * Get things count by namespace
 */
export async function count(ns: string, filters?: { type?: string; visibility?: string }) {
  const db = getPostgresClient()
  const { things } = db.query

  let query = db.select({ count: sql<number>`count(*)` }).from(things).where(eq(things.ns, ns))

  if (filters?.type) {
    query = query.where(and(eq(things.ns, ns), eq(things.type, filters.type)))
  }
  if (filters?.visibility) {
    query = query.where(and(eq(things.ns, ns), eq(things.visibility, filters.visibility as any)))
  }

  const result = await query
  return result[0]?.count || 0
}
