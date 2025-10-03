import { sql } from 'drizzle-orm'
import { getPostgresClient } from '../postgres'

export interface VectorSearchOptions {
  limit?: number
  offset?: number
  threshold?: number // Similarity threshold (0-1)
  ns?: string
  type?: string
}

/**
 * Vector similarity search using pgvector
 */
export async function vectorSearch(embedding: number[], options: VectorSearchOptions = {}) {
  const db = getPostgresClient()
  const { things } = db.query

  const limit = Math.min(options.limit || 20, 100)
  const threshold = options.threshold || 0.5

  // Cosine similarity search with pgvector
  const query = sql`
    SELECT
      ns, id, type, content, data, visibility, created_at, updated_at,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
    FROM things
    WHERE
      embedding IS NOT NULL
      ${options.ns ? sql`AND ns = ${options.ns}` : sql``}
      ${options.type ? sql`AND type = ${options.type}` : sql``}
      AND 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) >= ${threshold}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
    OFFSET ${options.offset || 0}
  `

  const results = await db.execute(query)
  return {
    data: (results as any).rows || [],
    pagination: { limit, offset: options.offset || 0 },
  }
}

/**
 * Full-text search using PostgreSQL to_tsvector
 */
export async function fullTextSearch(query: string, options: VectorSearchOptions = {}) {
  const db = getPostgresClient()
  const { things } = db.query

  const limit = Math.min(options.limit || 100, 1000)

  // Full-text search with ranking
  const searchQuery = sql`
    SELECT
      ns, id, type, content, data, visibility, created_at, updated_at,
      ts_rank(
        to_tsvector('english', coalesce(content, '') || ' ' || coalesce(type, '')),
        to_tsquery('english', ${query})
      ) as rank
    FROM things
    WHERE
      to_tsvector('english', coalesce(content, '') || ' ' || coalesce(type, '')) @@ to_tsquery('english', ${query})
      ${options.ns ? sql`AND ns = ${options.ns}` : sql``}
      ${options.type ? sql`AND type = ${options.type}` : sql``}
    ORDER BY rank DESC
    LIMIT ${limit}
    OFFSET ${options.offset || 0}
  `

  const results = await db.execute(searchQuery)
  return {
    data: (results as any).rows || [],
    pagination: { limit, offset: options.offset || 0 },
  }
}

/**
 * Hybrid search: combines vector and full-text search using Reciprocal Rank Fusion (RRF)
 */
export async function hybridSearch(query: string, embedding: number[], options: VectorSearchOptions & { alpha?: number } = {}) {
  const alpha = options.alpha ?? 0.5 // Balance between vector (0) and text (1)
  const limit = Math.min(options.limit || 20, 100)

  // Get results from both searches
  const [vectorResults, textResults] = await Promise.all([
    vectorSearch(embedding, { ...options, limit: limit * 2 }),
    fullTextSearch(query, { ...options, limit: limit * 2 }),
  ])

  // Combine results using RRF
  const k = 60 // RRF constant
  const scores = new Map<string, { item: any; score: number }>()

  // Score vector results
  vectorResults.data.forEach((item: any, index: number) => {
    const key = `${item.ns}:${item.id}`
    const vectorScore = (1 - alpha) / (k + index + 1)
    scores.set(key, { item, score: vectorScore })
  })

  // Score text results and combine
  textResults.data.forEach((item: any, index: number) => {
    const key = `${item.ns}:${item.id}`
    const textScore = alpha / (k + index + 1)
    const existing = scores.get(key)
    if (existing) {
      existing.score += textScore
    } else {
      scores.set(key, { item, score: textScore })
    }
  })

  // Sort by combined score and return
  const ranked = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return {
    data: ranked.map((r) => ({ ...r.item, score: r.score })),
    pagination: { limit, offset: 0 },
  }
}
