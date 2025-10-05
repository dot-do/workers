import { sql } from '../sql'

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
  const fullId = `${ns}:${id}`

  const result = await sql`
    SELECT
      id,
      type,
      content,
      data,
      meta,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE id = ${fullId}
    ORDER BY ts DESC
    LIMIT 1
  `

  const rows = result.data || []
  if (rows.length === 0) return null

  const row = rows[0]
  const [namespace, entityId] = row.id.split(':', 2)

  return {
    ns: namespace,
    id: entityId,
    type: row.type,
    content: row.content,
    data: row.data,
    visibility: 'public',
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

/**
 * List things with pagination and filters
 */
export async function list(ns: string, options: ListOptions = {}, env?: any) {
  const limit = Math.min(options.limit || 20, 1000)
  const page = options.page || 1
  const offset = options.offset || (page - 1) * limit
  const order = options.order || 'desc'

  // Build base query
  const pattern = `${ns}:%`

  let whereClause = 'id LIKE {pattern:String}'
  const queryParams: Record<string, any> = { pattern }

  if (options.type) {
    whereClause += ' AND type = {filterType:String}'
    queryParams.filterType = options.type
  }

  // Build query manually since we need dynamic WHERE clause
  const query = `
    SELECT
      id,
      type,
      content,
      data,
      meta,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${whereClause}
    ORDER BY ts ${order === 'desc' ? 'DESC' : 'ASC'}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `

  // Execute with parameterization
  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  const hasMore = rows.length > limit
  const data = (hasMore ? rows.slice(0, limit) : rows).map((row: any) => {
    const [namespace, entityId] = row.id.split(':', 2)
    return {
      ns: namespace,
      id: entityId,
      type: row.type,
      content: row.content,
      data: row.data,
      visibility: 'public',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  })

  // Get total count
  const countQuery = `
    SELECT count(*) as count
    FROM data
    WHERE ${whereClause}
  `

  const countResultSet = await client.query({
    query: countQuery,
    format: 'JSON',
    query_params: queryParams,
  })
  const countResult: any = await countResultSet.json()
  const total = Number(countResult.data?.[0]?.count || 0)

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
  const fullId = `${thing.ns}:${thing.id}`
  const now = new Date()
  const content = thing.content || ''

  // Use ClickHouse command() for INSERT (doesn't return data, no FORMAT clause)
  const client = (await import('../sql')).clickhouse

  await client.command({
    query: `
      INSERT INTO data (id, type, content, data, meta, ts, ulid)
      VALUES (
        {fullId:String},
        {type:String},
        {content:String},
        {data:String},
        {meta:String},
        parseDateTimeBestEffort({ts:String}),
        generateULID()
      )
    `,
    query_params: {
      fullId,
      type: thing.type,
      content,
      data: JSON.stringify(thing.data),
      meta: JSON.stringify({ visibility: thing.visibility || 'public' }),
      ts: now.toISOString(),
    },
  })

  return {
    ns: thing.ns,
    id: thing.id,
    type: thing.type,
    content: thing.content,
    data: thing.data,
    visibility: thing.visibility || 'public',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Delete a thing
 */
export async function del(ns: string, id: string) {
  const fullId = `${ns}:${id}`

  // First, get the record to return it
  const existing = await get(ns, id)
  if (!existing) return null

  // ClickHouse uses ALTER TABLE DELETE for deletes (it's async)
  const client = (await import('../sql')).clickhouse
  await client.command({
    query: `ALTER TABLE data DELETE WHERE id = {fullId:String}`,
    query_params: { fullId },
  })

  return existing
}

/**
 * Search things by text query
 */
export async function search(query: string, options: SearchOptions = {}) {
  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0
  const fields = options.fields || ['type', 'content', 'data']

  // Build search conditions
  const searchConditions: string[] = []
  if (fields.includes('type')) {
    searchConditions.push(`type LIKE {queryPattern:String}`)
  }
  if (fields.includes('content')) {
    searchConditions.push(`content LIKE {queryPattern:String}`)
  }
  if (fields.includes('data')) {
    searchConditions.push(`JSONExtractRaw(data) LIKE {queryPattern:String}`)
  }

  const whereClause = searchConditions.join(' OR ')
  let finalWhere = whereClause

  // Add type filter if specified
  if (options.type) {
    finalWhere = `(${whereClause}) AND type = {filterType:String}`
  }

  const queryPattern = `%${query}%`
  const queryParams: Record<string, any> = { queryPattern }
  if (options.type) {
    queryParams.filterType = options.type
  }

  const searchQuery = `
    SELECT
      id,
      type,
      content,
      data,
      meta,
      ts as createdAt,
      ts as updatedAt
    FROM data
    WHERE ${finalWhere}
    ORDER BY ts DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query: searchQuery,
    format: 'JSON',
    query_params: queryParams,
  })
  const result = await resultSet.json()
  const rows = result.data || []

  const data = rows.map((row: any) => {
    const [namespace, entityId] = row.id.split(':', 2)
    return {
      ns: namespace || 'default',
      id: entityId || row.id,
      type: row.type,
      content: row.content,
      data: row.data,
      visibility: 'public',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  })

  return {
    data,
    pagination: { limit, offset, total: data.length },
  }
}

/**
 * Get things count by namespace
 */
export async function count(ns: string, filters?: { type?: string; visibility?: string }) {
  const pattern = `${ns}:%`
  let whereClause = 'id LIKE {pattern:String}'
  const queryParams: Record<string, any> = { pattern }

  if (filters?.type) {
    whereClause += ' AND type = {filterType:String}'
    queryParams.filterType = filters.type
  }

  const query = `
    SELECT count(*) as count
    FROM data
    WHERE ${whereClause}
  `

  const client = (await import('../sql')).clickhouse
  const resultSet = await client.query({
    query,
    format: 'JSON',
    query_params: queryParams,
  })
  const result: any = await resultSet.json()

  return Number(result.data?.[0]?.count || 0)
}
