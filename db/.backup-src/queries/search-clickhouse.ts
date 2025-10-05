export interface VectorSearchOptions {
  limit?: number
  offset?: number
  threshold?: number
  filters?: Record<string, any>
  ns?: string
  type?: string
}

/**
 * Full-text search across content and data fields
 */
export async function fullTextSearch(query: string, options: VectorSearchOptions = {}) {
  const limit = Math.min(options.limit || 20, 1000)
  const offset = options.offset || 0

  // Build search conditions
  const searchPattern = `%${query}%`
  const searchConditions: string[] = []

  // Search in content field
  searchConditions.push('content LIKE {searchPattern:String}')

  // Search in data JSON field
  searchConditions.push('JSONExtractRaw(data) LIKE {searchPattern:String}')

  // Search in type field
  searchConditions.push('type LIKE {searchPattern:String}')

  let whereClause = `(${searchConditions.join(' OR ')})`
  const queryParams: Record<string, any> = { searchPattern }

  // Add namespace filter
  if (options.ns) {
    whereClause = `${whereClause} AND id LIKE {nsPattern:String}`
    queryParams.nsPattern = `${options.ns}:%`
  }

  // Add type filter
  if (options.type) {
    whereClause = `${whereClause} AND type = {filterType:String}`
    queryParams.filterType = options.type
  }

  // Filter out Relationship types (internal bookkeeping)
  whereClause = `${whereClause} AND type != 'Relationship'`

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
    WHERE ${whereClause}
    ORDER BY ts DESC
    LIMIT ${limit + 1}
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

  const hasMore = rows.length > limit
  const data = (hasMore ? rows.slice(0, limit) : rows).map((row: any) => {
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
    pagination: { limit, offset, total },
  }
}

/**
 * Vector similarity search using cosine distance
 * Note: Requires embedding column in data table (not yet implemented)
 */
export async function vectorSearch(embedding: number[], options: VectorSearchOptions = {}) {
  // TODO: Implement vector search when embedding column is added to data table
  // ClickHouse supports cosine similarity via:
  // - cosineDistance(embedding, target) for L2-normalized vectors
  // - L2Distance(embedding, target) for Euclidean distance
  //
  // Example query:
  // SELECT id, type, content, data,
  //        cosineDistance(embedding, {targetEmbedding:Array(Float32)}) as distance
  // FROM data
  // WHERE distance < {threshold:Float32}
  // ORDER BY distance ASC
  // LIMIT 20

  return {
    data: [],
    total: 0,
    pagination: { limit: options.limit || 20, offset: options.offset || 0, total: 0 },
  }
}

/**
 * Hybrid search combining full-text and vector search
 * Note: Vector component not yet implemented
 */
export async function hybridSearch(query: string, embedding: number[], options: VectorSearchOptions = {}) {
  // For now, just do full-text search
  // TODO: Implement hybrid scoring when vector search is available
  // Hybrid approach:
  // 1. Get full-text results with scores (using TF-IDF or BM25)
  // 2. Get vector results with similarity scores
  // 3. Combine scores with weights (e.g., 0.7 * textScore + 0.3 * vectorScore)
  // 4. Return top-k merged results

  const textResults = await fullTextSearch(query, options)

  return {
    data: textResults.data,
    total: textResults.total,
    pagination: textResults.pagination,
  }
}
