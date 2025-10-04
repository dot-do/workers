import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { RpcRequest, RpcResponse, RpcContext, RpcMethod, RpcService } from './rpc-types'
import { createRpcMethod } from './rpc-types'
import * as things from './queries/things'
import * as relationships from './queries/relationships'
import * as search from './queries/search'
import * as analytics from './queries/analytics'
import { clickhouse, sql } from './sql'
import { getPostgresClient, checkPostgresHealth } from './postgres'

/**
 * Embedding model types - supports 10 model/dimension combinations
 */
export type EmbeddingModel =
  | 'workers-ai' // legacy: Workers AI @cf/google/embeddinggemma-300m (768d)
  | 'openai' // legacy: OpenAI text-embedding-ada-002 (1536d)
  | 'gemma-128' // EmbeddingGemma 128 dimensions (MRL)
  | 'gemma-256' // EmbeddingGemma 256 dimensions (MRL)
  | 'gemma-512' // EmbeddingGemma 512 dimensions (MRL)
  | 'gemma-768' // EmbeddingGemma 768 dimensions (MRL)
  | 'gemini-128' // Google Gemini 128 dimensions
  | 'gemini-768' // Google Gemini 768 dimensions
  | 'gemini-1536' // Google Gemini 1536 dimensions
  | 'gemini-3072' // Google Gemini 3072 dimensions

/**
 * Map embedding model name to ClickHouse column names
 */
function getModelColumns(model: EmbeddingModel): { embeddingColumn: string; timestampColumn: string } {
  const columnMap: Record<EmbeddingModel, { embeddingColumn: string; timestampColumn: string }> = {
    'workers-ai': { embeddingColumn: 'embeddingWorkersAI', timestampColumn: 'workersAIGeneratedAt' },
    openai: { embeddingColumn: 'embeddingOpenAI', timestampColumn: 'openAIGeneratedAt' },
    'gemma-128': { embeddingColumn: 'embeddingGemma128', timestampColumn: 'gemma128GeneratedAt' },
    'gemma-256': { embeddingColumn: 'embeddingGemma256', timestampColumn: 'gemma256GeneratedAt' },
    'gemma-512': { embeddingColumn: 'embeddingGemma512', timestampColumn: 'gemma512GeneratedAt' },
    'gemma-768': { embeddingColumn: 'embeddingGemma768', timestampColumn: 'gemma768GeneratedAt' },
    'gemini-128': { embeddingColumn: 'embeddingGemini128', timestampColumn: 'gemini128GeneratedAt' },
    'gemini-768': { embeddingColumn: 'embeddingGemini768', timestampColumn: 'gemini768GeneratedAt' },
    'gemini-1536': { embeddingColumn: 'embeddingGemini1536', timestampColumn: 'gemini1536GeneratedAt' },
    'gemini-3072': { embeddingColumn: 'embeddingGemini3072', timestampColumn: 'gemini3072GeneratedAt' },
  }
  return columnMap[model]
}

/**
 * HATEOAS link generation helper
 * Generates navigable links for RESTful responses
 */
interface HateoasLinks {
  self: { href: string }
  home: { href: string }
  first?: { href: string }
  prev?: { href: string }
  next?: { href: string }
  last?: { href: string }
  [key: string]: { href: string } | undefined
}

function generateHateoasLinks(
  baseUrl: string,
  path: string,
  params: Record<string, any> = {},
  pagination?: { page: number; limit: number; total: number; hasMore: boolean }
): HateoasLinks {
  const buildUrl = (p: string, overrides: Record<string, any> = {}) => {
    const queryParams = { ...params, ...overrides }
    const query = Object.entries(queryParams)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    return query ? `${baseUrl}${p}?${query}` : `${baseUrl}${p}`
  }

  const links: HateoasLinks = {
    self: { href: buildUrl(path, params) },
    home: { href: baseUrl },
  }

  if (pagination) {
    const { page, limit, total, hasMore } = pagination
    const totalPages = Math.ceil(total / limit)

    // First page link
    if (page > 1) {
      links.first = { href: buildUrl(path, { ...params, page: 1 }) }
    }

    // Previous page link
    if (page > 1) {
      links.prev = { href: buildUrl(path, { ...params, page: page - 1 }) }
    }

    // Next page link
    if (hasMore || page < totalPages) {
      links.next = { href: buildUrl(path, { ...params, page: page + 1 }) }
    }

    // Last page link
    if (totalPages > 1 && page < totalPages) {
      links.last = { href: buildUrl(path, { ...params, page: totalPages }) }
    }
  }

  return links
}

/**
 * Add HATEOAS links to response
 */
function withHateoas<T>(
  data: T,
  links: HateoasLinks,
  meta?: Record<string, any>
): { _links: HateoasLinks; data: T; _meta?: Record<string, any> } {
  const response: any = {
    _links: links,
    data,
  }
  if (meta) {
    response._meta = meta
  }
  return response
}

/**
 * Database Service - Comprehensive database abstraction layer
 * Handles ALL data access for the platform (PostgreSQL + ClickHouse)
 *
 * Interfaces:
 * - RPC: WorkerEntrypoint methods for service-to-service calls (via apis.do types)
 * - HTTP: Hono routes for health checks and debugging
 * - MCP: Tools for AI agent integration (TODO)
 */
export default class DatabaseService extends WorkerEntrypoint<Env> {
  // ============================================================================
  // RPC INTERFACE - For service-to-service communication
  // ============================================================================

  /**
   * Get a single thing by namespace and ID
   */
  async get(ns: string, id: string, options: things.GetOptions = {}) {
    return things.get(ns, id, options)
  }

  /**
   * List things with pagination and filters
   */
  async list(ns: string, options: things.ListOptions = {}) {
    return things.list(ns, options)
  }

  /**
   * Search things using full-text, vector, or hybrid search
   */
  async search(query: string, embedding?: number[], options: search.VectorSearchOptions = {}) {
    if (embedding) {
      // Hybrid search if embedding provided
      return search.hybridSearch(query, embedding, options)
    } else {
      // Full-text search only
      return search.fullTextSearch(query, options)
    }
  }

  /**
   * Vector similarity search
   */
  async vectorSearch(embedding: number[], options: search.VectorSearchOptions = {}) {
    return search.vectorSearch(embedding, options)
  }

  /**
   * Upsert (insert or update) a thing
   */
  async upsert(thing: Parameters<typeof things.upsert>[0]) {
    return things.upsert(thing)
  }

  /**
   * Delete a thing
   */
  async delete(ns: string, id: string) {
    return things.del(ns, id)
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async query(queryString: string, params?: Record<string, any>) {
    const db = getPostgresClient()
    return db.execute(queryString)
  }

  /**
   * Transaction support - execute multiple operations atomically
   */
  async transaction(fn: (tx: any) => Promise<any>) {
    const db = getPostgresClient()
    return db.transaction(fn)
  }

  /**
   * Get relationships for a thing
   */
  async getRelationships(ns: string, id: string, options: relationships.RelationshipListOptions = {}) {
    return relationships.getRelationships(ns, id, options)
  }

  /**
   * Get incoming relationships (pointing to this thing)
   */
  async getIncomingRelationships(ns: string, id: string, options: relationships.RelationshipListOptions = {}) {
    return relationships.getIncomingRelationships(ns, id, options)
  }

  /**
   * Upsert a relationship
   */
  async upsertRelationship(relationship: Parameters<typeof relationships.upsert>[0]) {
    return relationships.upsert(relationship)
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(ns: string, id: string) {
    return relationships.del(ns, id)
  }

  /**
   * List relationships for a namespace
   */
  async listRelationships(ns: string, options: relationships.RelationshipListOptions = {}) {
    return relationships.list(ns, options)
  }

  /**
   * Get database statistics
   */
  async stats() {
    return analytics.getDatabaseStats()
  }

  /**
   * Get entity type distribution
   */
  async typeDistribution(ns?: string) {
    return analytics.getTypeDistribution(ns)
  }

  /**
   * Get ClickHouse analytics
   */
  async clickhouseStats() {
    return analytics.getClickHouseStats()
  }

  /**
   * Get recent activity from ClickHouse
   */
  async recentActivity(limit?: number) {
    return analytics.getRecentActivity(limit)
  }

  /**
   * Count things in a namespace
   */
  async count(ns: string, filters?: { type?: string; visibility?: string }) {
    return things.count(ns, filters)
  }

  /**
   * Direct ClickHouse access for advanced queries
   */
  clickhouse() {
    return clickhouse
  }

  /**
   * Execute ClickHouse SQL query
   */
  async sql(strings: TemplateStringsArray, ...values: unknown[]) {
    return sql(strings, ...values)
  }

  /**
   * Execute raw ClickHouse SQL string (for RPC calls)
   */
  async executeSql(query: string) {
    // Check if this is a DDL statement (CREATE, ALTER, DROP) or DML (SELECT, INSERT, etc.)
    const isDDL = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME)\s+/i.test(query)

    if (isDDL) {
      // Use command() for DDL statements
      await clickhouse.command({
        query,
        clickhouse_settings: {
          enable_json_type: 1,
          allow_experimental_vector_similarity_index: 1,
        },
      })
      return { success: true, message: 'DDL statement executed successfully' }
    } else {
      // Use query() for SELECT statements that return data
      const resultSet = await clickhouse.query({ query, format: 'JSON' })
      return resultSet.json()
    }
  }

  // ============================================================================
  // VECTOR SEARCH & EMBEDDINGS - RPC Methods
  // ============================================================================

  /**
   * Get entities without embeddings for a specific model
   * Used by schedule service to queue entities for embedding generation
   */
  async getEntitiesWithoutEmbeddings(options: {
    ns?: string
    limit?: number
    model?: EmbeddingModel
  } = {}) {
    const { ns, limit = 100, model = 'workers-ai' } = options
    const { embeddingColumn } = getModelColumns(model)

    let query = `
      SELECT t.ns, t.id, t.type, t.content
      FROM graph_things t
      LEFT JOIN graph_embeddings e ON t.ns = e.ns AND t.id = e.id
      WHERE (e.${embeddingColumn} IS NULL OR length(e.${embeddingColumn}) = 0)
    `

    if (ns) {
      query += ` AND t.ns = '${ns}'`
    }

    query += ` LIMIT ${limit}`

    const result = await clickhouse.query({ query, format: 'JSON' })
    const data = await result.json()
    return data.data || []
  }

  /**
   * Batch update embeddings for multiple entities
   * Called by embeddings service after generating embeddings
   */
  async updateEmbeddingsBatch(embeddings: Array<{
    ns: string
    id: string
    embedding: number[]
    model: EmbeddingModel
  }>) {
    if (embeddings.length === 0) return { inserted: 0 }

    const { embeddingColumn, timestampColumn } = getModelColumns(embeddings[0].model)

    // Build INSERT statement
    const values = embeddings.map((e) => {
      const embeddingStr = `[${e.embedding.join(',')}]`
      return `('${e.ns}', '${e.id}', ${embeddingStr}, now64(), now64(), now64())`
    })

    const query = `
      INSERT INTO graph_embeddings (ns, id, ${embeddingColumn}, ${timestampColumn}, createdAt, updatedAt)
      VALUES ${values.join(', ')}
    `

    await clickhouse.command({ query })
    return { inserted: embeddings.length }
  }

  // ============================================================================
  // CHUNKING - RPC Methods for document chunking
  // ============================================================================

  /**
   * Create chunks for an entity
   * Used when entity content is too large for single embedding
   */
  async createChunks(chunks: Array<{
    ns: string
    id: string
    chunkIndex: number
    chunkText: string
    chunkTokens?: number
    charStart?: number
    charEnd?: number
  }>) {
    if (chunks.length === 0) return { inserted: 0 }

    const values = chunks.map((c) => {
      const text = c.chunkText.replace(/'/g, "''") // Escape single quotes
      return `('${c.ns}', '${c.id}', ${c.chunkIndex}, '${text}', ${c.chunkTokens || 0}, ${c.charStart || 0}, ${c.charEnd || 0}, now64(), now64())`
    })

    const query = `
      INSERT INTO graph_chunks (ns, id, chunkIndex, chunkText, chunkTokens, charStart, charEnd, createdAt, updatedAt)
      VALUES ${values.join(', ')}
    `

    await clickhouse.command({ query })
    return { inserted: chunks.length }
  }

  /**
   * Get all chunks for an entity
   */
  async getChunks(ns: string, id: string) {
    const query = `
      SELECT ns, id, chunkIndex, chunkText, chunkTokens, charStart, charEnd, createdAt, updatedAt
      FROM graph_chunks
      WHERE ns = '${ns}' AND id = '${id}'
      ORDER BY chunkIndex ASC
    `

    const result = await clickhouse.query({ query, format: 'JSON' })
    const data = await result.json()
    return data.data || []
  }

  /**
   * Get chunks without embeddings for batch processing
   */
  async getChunksWithoutEmbeddings(options: {
    ns?: string
    limit?: number
    model?: EmbeddingModel
  } = {}) {
    const { ns, limit = 100, model = 'workers-ai' } = options
    const { embeddingColumn } = getModelColumns(model)

    let query = `
      SELECT c.ns, c.id, c.chunkIndex, c.chunkText
      FROM graph_chunks c
      LEFT JOIN graph_chunk_embeddings e ON c.ns = e.ns AND c.id = e.id AND c.chunkIndex = e.chunkIndex
      WHERE (e.${embeddingColumn} IS NULL OR length(e.${embeddingColumn}) = 0)
    `

    if (ns) {
      query += ` AND c.ns = '${ns}'`
    }

    query += ` LIMIT ${limit}`

    const result = await clickhouse.query({ query, format: 'JSON' })
    const data = await result.json()
    return data.data || []
  }

  /**
   * Batch update chunk embeddings
   */
  async updateChunkEmbeddingsBatch(embeddings: Array<{
    ns: string
    id: string
    chunkIndex: number
    embedding: number[]
    model: EmbeddingModel
  }>) {
    if (embeddings.length === 0) return { inserted: 0 }

    const { embeddingColumn, timestampColumn } = getModelColumns(embeddings[0].model)

    const values = embeddings.map((e) => {
      const embeddingStr = `[${e.embedding.join(',')}]`
      return `('${e.ns}', '${e.id}', ${e.chunkIndex}, ${embeddingStr}, now64(), now64(), now64())`
    })

    const query = `
      INSERT INTO graph_chunk_embeddings (ns, id, chunkIndex, ${embeddingColumn}, ${timestampColumn}, createdAt, updatedAt)
      VALUES ${values.join(', ')}
    `

    await clickhouse.command({ query })
    return { inserted: embeddings.length }
  }

  /**
   * Vector search across chunks
   * Useful for finding relevant chunks across all entities
   */
  async searchChunks(options: {
    embedding: number[]
    model?: EmbeddingModel
    ns?: string
    limit?: number
    minScore?: number
  }) {
    const { embedding, model = 'workers-ai', ns, limit = 10, minScore = 0 } = options
    const { embeddingColumn } = getModelColumns(model)

    let query = `
      SELECT
        e.ns,
        e.id,
        e.chunkIndex,
        c.chunkText,
        c.chunkTokens,
        t.type,
        L2Distance(e.${embeddingColumn}, [${embedding.join(',')}]) AS distance,
        1 / (1 + distance) AS score
      FROM graph_chunk_embeddings e
      INNER JOIN graph_chunks c ON e.ns = c.ns AND e.id = c.id AND e.chunkIndex = c.chunkIndex
      INNER JOIN graph_things t ON e.ns = t.ns AND e.id = t.id
      WHERE length(e.${embeddingColumn}) > 0
    `

    if (ns) {
      query += ` AND e.ns = '${ns}'`
    }

    query += `
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const result = await clickhouse.query({ query, format: 'JSON' })
    const data = await result.json()
    const results = data.data || []

    return minScore > 0 ? results.filter((r: any) => r.score >= minScore) : results
  }

  // ============================================================================
  // HTTP INTERFACE - For health checks and debugging
  // ============================================================================

  async fetch(request: Request) {
    const app = new Hono()

    // Enable CORS
    app.use('/*', cors())

    // Health check endpoint
    app.get('/health', async (c) => {
      // PostgreSQL is deprecated - only check if DATABASE_URL is set
      let pgHealth: any = { status: 'deprecated', message: 'PostgreSQL deprecated - using ClickHouse only' }
      if (process.env.DATABASE_URL) {
        pgHealth = await checkPostgresHealth()
      }

      const clickhouseHealth: any = { status: 'ok' }

      try {
        await clickhouse.query({ query: 'SELECT 1', format: 'JSON' })
      } catch (error: any) {
        clickhouseHealth.status = 'error'
        clickhouseHealth.message = error.message
      }

      return c.json({
        status: clickhouseHealth.status === 'ok' ? 'ok' : 'degraded',
        clickhouse: clickhouseHealth,
        postgres: pgHealth,
        architecture: 'ClickHouse primary, Vectorize (future)',
        timestamp: new Date().toISOString(),
      })
    })

    // Database statistics endpoint
    app.get('/stats', async (c) => {
      const stats = await this.stats()
      return c.json(stats)
    })

    // Type distribution endpoint
    app.get('/types', async (c) => {
      const ns = c.req.query('ns')
      const distribution = await this.typeDistribution(ns)
      return c.json(distribution)
    })

    // Recent activity endpoint (ClickHouse)
    app.get('/activity', async (c) => {
      const limit = parseInt(c.req.query('limit') || '100')
      const activity = await this.recentActivity(limit)
      return c.json(activity)
    })

    // Admin endpoint - Apply graph schema migration
    app.post('/admin/migrate-graph-schema', async (c) => {
      try {
        // Read schema file content (embedded as constant for now)
        const schemaSQL = `
-- Graph Things Table
CREATE TABLE IF NOT EXISTS graph_things (
  ns String,
  id String,
  type String,
  data JSON,
  content String DEFAULT '',
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  typeHash UInt32 MATERIALIZED xxHash32(type),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_type (typeHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX tk_content (content) TYPE tokenbf_v1(4096, 3, 0) GRANULARITY 8
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id)
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;

-- Graph Relationships Table
CREATE TABLE IF NOT EXISTS graph_relationships (
  fromNs String,
  fromId String,
  fromType String,
  predicate String,
  toNs String,
  toId String,
  toType String,
  data JSON DEFAULT '{}',
  createdAt DateTime64(3) DEFAULT now64(),
  fromNsHash UInt32 MATERIALIZED xxHash32(fromNs),
  fromIdHash UInt32 MATERIALIZED xxHash32(fromId),
  toNsHash UInt32 MATERIALIZED xxHash32(toNs),
  toIdHash UInt32 MATERIALIZED xxHash32(toId),
  predicateHash UInt32 MATERIALIZED xxHash32(predicate),
  INDEX bf_to_ns (toNsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_to_id (toIdHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_from_ns (fromNsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_from_id (fromIdHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_predicate (predicateHash) TYPE bloom_filter() GRANULARITY 4
) ENGINE = ReplacingMergeTree(createdAt)
ORDER BY (toNs, toId, predicate, fromNs, fromId)
PRIMARY KEY (toNs, toId, predicate)
SETTINGS index_granularity = 8192;

-- Materialized View: Events → Graph Things
CREATE MATERIALIZED VIEW IF NOT EXISTS graph_things_stream TO graph_things
AS SELECT
  ns, id, type, data, content,
  ts AS createdAt, ts AS updatedAt
FROM events
WHERE type != 'Relationship' AND type IS NOT NULL;

-- Materialized View: Events → Graph Relationships
CREATE MATERIALIZED VIEW IF NOT EXISTS graph_relationships_stream TO graph_relationships
AS SELECT
  JSONExtractString(data, 'fromNs') AS fromNs,
  JSONExtractString(data, 'fromId') AS fromId,
  JSONExtractString(data, 'fromType') AS fromType,
  JSONExtractString(data, 'predicate') AS predicate,
  JSONExtractString(data, 'toNs') AS toNs,
  JSONExtractString(data, 'toId') AS toId,
  JSONExtractString(data, 'toType') AS toType,
  data,
  ts AS createdAt
FROM events
WHERE type = 'Relationship'
  AND JSONHas(data, 'fromNs')
  AND JSONHas(data, 'toNs');

-- Helper View: Inbound Relationships
CREATE VIEW IF NOT EXISTS v_inbound_relationships AS
SELECT * FROM graph_relationships
ORDER BY toNs, toId, predicate, createdAt DESC;

-- Helper View: Outbound Relationships
CREATE VIEW IF NOT EXISTS v_outbound_relationships AS
SELECT * FROM graph_relationships
ORDER BY fromNs, fromId, predicate, createdAt DESC;

-- Helper View: Predicate Stats
CREATE VIEW IF NOT EXISTS v_predicate_stats AS
SELECT
  predicate,
  COUNT(*) AS count,
  COUNT(DISTINCT fromNs || '/' || fromId) AS unique_sources,
  COUNT(DISTINCT toNs || '/' || toId) AS unique_targets,
  MIN(createdAt) AS first_seen,
  MAX(createdAt) AS last_seen
FROM graph_relationships
GROUP BY predicate
ORDER BY count DESC;

-- Helper View: Type Stats
CREATE VIEW IF NOT EXISTS v_type_stats AS
SELECT
  type,
  COUNT(*) AS count,
  COUNT(DISTINCT ns) AS unique_namespaces,
  MIN(createdAt) AS first_seen,
  MAX(createdAt) AS last_seen
FROM graph_things
GROUP BY type
ORDER BY count DESC;
`

        // Split into statements
        const statements = schemaSQL
          .split(';')
          .map((s) => s.trim())
          .filter((s) => {
            if (s.length === 0) return false
            // Remove comment-only statements, but keep statements with CREATE/ALTER/DROP
            return s.includes('CREATE') || s.includes('ALTER') || s.includes('DROP')
          })

        const results = []
        for (const statement of statements) {
          try {
            await clickhouse.command({
              query: statement,
              clickhouse_settings: {
                enable_json_type: 1,
                allow_experimental_vector_similarity_index: 1,
              },
            })
            results.push({
              success: true,
              statement: statement.split('\\n')[0].substring(0, 80) + '...',
            })
          } catch (error: any) {
            // Check if already exists
            if (error.message?.includes('already exists') || error.message?.includes('ALREADY_EXISTS')) {
              results.push({
                success: true,
                skipped: true,
                statement: statement.split('\\n')[0].substring(0, 80) + '...',
              })
            } else {
              results.push({
                success: false,
                error: error.message,
                statement: statement.split('\\n')[0].substring(0, 80) + '...',
              })
            }
          }
        }

        const successCount = results.filter((r) => r.success).length
        const errorCount = results.filter((r) => !r.success).length

        return c.json({
          status: errorCount === 0 ? 'success' : 'partial',
          summary: {
            total: statements.length,
            successful: successCount,
            failed: errorCount,
          },
          results,
        })
      } catch (error: any) {
        return c.json(
          {
            status: 'error',
            error: error.message,
          },
          500
        )
      }
    })

    // Admin endpoint - Apply vector search schema migration
    app.post('/admin/migrate-vector-schema', async (c) => {
      try {
        const schemaSQL = `
-- ClickHouse Vector Search Schema
-- Supports chunking for large documents with separate embeddings per chunk

-- Chunks Table: Track document chunks with metadata
CREATE TABLE IF NOT EXISTS graph_chunks (
  ns String,
  id String,                    -- Parent entity ID
  chunkIndex UInt32,            -- Chunk number (0-based)
  chunkText String,             -- The actual chunk text
  chunkTokens UInt32 DEFAULT 0, -- Estimated token count
  charStart UInt64 DEFAULT 0,   -- Character offset in original
  charEnd UInt64 DEFAULT 0,     -- Character end offset
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),
  -- Indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX tk_chunk (chunkText) TYPE tokenbf_v1(4096, 3, 0) GRANULARITY 8
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;

-- Embeddings Table: Store vector embeddings per whole entity (not chunks)
-- Note: Due to ClickHouse ReplacingMergeTree + vector index limitations,
-- we use separate tables for entity vs chunk embeddings
CREATE TABLE IF NOT EXISTS graph_embeddings (
  ns String,
  id String,                       -- Entity ID

  -- Original Models (Legacy)
  -- Workers AI @cf/google/embeddinggemma-300m (768 dimensions, legacy)
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  -- OpenAI text-embedding-ada-002 (1536 dimensions, legacy)
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,

  -- EmbeddingGemma (Cloudflare Workers AI) - Matryoshka Representation Learning
  -- @cf/google/embeddinggemma-300m with variable dimensions (128, 256, 512, 768)
  -- Truncate from 768 to smaller sizes for storage/speed optimization
  embeddingGemma128 Array(Float32) DEFAULT [],
  gemma128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma256 Array(Float32) DEFAULT [],
  gemma256GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma512 Array(Float32) DEFAULT [],
  gemma512GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma768 Array(Float32) DEFAULT [],
  gemma768GeneratedAt DateTime64(3) DEFAULT 0,

  -- Gemini (Google Gemini API) - Variable dimensions via output_dimensionality
  -- gemini-embedding-001 supports 128-3072 dimensions
  -- Recommended: 768, 1536, 3072 for optimal performance
  embeddingGemini128 Array(Float32) DEFAULT [],
  gemini128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini768 Array(Float32) DEFAULT [],
  gemini768GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini1536 Array(Float32) DEFAULT [],
  gemini1536GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini3072 Array(Float32) DEFAULT [],
  gemini3072GeneratedAt DateTime64(3) DEFAULT 0,

  -- Metadata
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),

  -- Hash indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,

  -- Vector similarity indexes (one per model/dimension combination)
  -- Legacy models
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,

  -- EmbeddingGemma indexes
  INDEX gemma128_idx embeddingGemma128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemma256_idx embeddingGemma256 TYPE vector_similarity('hnsw', 'L2Distance', 256) GRANULARITY 4,
  INDEX gemma512_idx embeddingGemma512 TYPE vector_similarity('hnsw', 'L2Distance', 512) GRANULARITY 4,
  INDEX gemma768_idx embeddingGemma768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,

  -- Gemini indexes
  INDEX gemini128_idx embeddingGemini128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemini768_idx embeddingGemini768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini1536_idx embeddingGemini1536 TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemini3072_idx embeddingGemini3072 TYPE vector_similarity('hnsw', 'L2Distance', 3072) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id)
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;

-- Chunk Embeddings Table: Store vector embeddings per document chunk
-- Note: Separate from graph_embeddings due to ClickHouse limitations
-- Chunks use (ns, id, chunkIndex) primary key vs (ns, id) for whole entities
CREATE TABLE IF NOT EXISTS graph_chunk_embeddings (
  ns String,
  id String,                       -- Parent entity ID
  chunkIndex UInt32,               -- Chunk number (0-based)

  -- Original Models (Legacy)
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,

  -- EmbeddingGemma (Cloudflare Workers AI) - Matryoshka Representation Learning
  embeddingGemma128 Array(Float32) DEFAULT [],
  gemma128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma256 Array(Float32) DEFAULT [],
  gemma256GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma512 Array(Float32) DEFAULT [],
  gemma512GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma768 Array(Float32) DEFAULT [],
  gemma768GeneratedAt DateTime64(3) DEFAULT 0,

  -- Gemini (Google Gemini API) - Variable dimensions
  embeddingGemini128 Array(Float32) DEFAULT [],
  gemini128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini768 Array(Float32) DEFAULT [],
  gemini768GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini1536 Array(Float32) DEFAULT [],
  gemini1536GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini3072 Array(Float32) DEFAULT [],
  gemini3072GeneratedAt DateTime64(3) DEFAULT 0,

  -- Metadata
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),

  -- Hash indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,

  -- Vector similarity indexes
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemma128_idx embeddingGemma128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemma256_idx embeddingGemma256 TYPE vector_similarity('hnsw', 'L2Distance', 256) GRANULARITY 4,
  INDEX gemma512_idx embeddingGemma512 TYPE vector_similarity('hnsw', 'L2Distance', 512) GRANULARITY 4,
  INDEX gemma768_idx embeddingGemma768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini128_idx embeddingGemini128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemini768_idx embeddingGemini768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini1536_idx embeddingGemini1536 TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemini3072_idx embeddingGemini3072 TYPE vector_similarity('hnsw', 'L2Distance', 3072) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;

-- Helper View: Join embeddings with things (whole entity only)
CREATE VIEW IF NOT EXISTS v_things_with_embeddings AS
SELECT
  t.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt,
  e.embeddingGemma128,
  e.gemma128GeneratedAt,
  e.embeddingGemma256,
  e.gemma256GeneratedAt,
  e.embeddingGemma512,
  e.gemma512GeneratedAt,
  e.embeddingGemma768,
  e.gemma768GeneratedAt,
  e.embeddingGemini128,
  e.gemini128GeneratedAt,
  e.embeddingGemini768,
  e.gemini768GeneratedAt,
  e.embeddingGemini1536,
  e.gemini1536GeneratedAt,
  e.embeddingGemini3072,
  e.gemini3072GeneratedAt
FROM graph_things t
LEFT JOIN graph_embeddings e
  ON t.ns = e.ns
  AND t.id = e.id;

-- Helper View: Join chunks with their embeddings
CREATE VIEW IF NOT EXISTS v_chunks_with_embeddings AS
SELECT
  c.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt,
  e.embeddingGemma128,
  e.gemma128GeneratedAt,
  e.embeddingGemma256,
  e.gemma256GeneratedAt,
  e.embeddingGemma512,
  e.gemma512GeneratedAt,
  e.embeddingGemma768,
  e.gemma768GeneratedAt,
  e.embeddingGemini128,
  e.gemini128GeneratedAt,
  e.embeddingGemini768,
  e.gemini768GeneratedAt,
  e.embeddingGemini1536,
  e.gemini1536GeneratedAt,
  e.embeddingGemini3072,
  e.gemini3072GeneratedAt
FROM graph_chunks c
LEFT JOIN graph_chunk_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex;

-- Helper View: Entity chunk summary with all embedding models
CREATE VIEW IF NOT EXISTS v_entity_chunk_stats AS
SELECT
  ns,
  id,
  COUNT(*) AS totalChunks,
  SUM(chunkTokens) AS totalTokens,
  -- Legacy models
  SUM(CASE WHEN e.embeddingWorkersAI IS NOT NULL AND length(e.embeddingWorkersAI) > 0 THEN 1 ELSE 0 END) AS chunksWithWorkersAI,
  SUM(CASE WHEN e.embeddingOpenAI IS NOT NULL AND length(e.embeddingOpenAI) > 0 THEN 1 ELSE 0 END) AS chunksWithOpenAI,
  -- Gemma variants
  SUM(CASE WHEN e.embeddingGemma128 IS NOT NULL AND length(e.embeddingGemma128) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma128,
  SUM(CASE WHEN e.embeddingGemma256 IS NOT NULL AND length(e.embeddingGemma256) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma256,
  SUM(CASE WHEN e.embeddingGemma512 IS NOT NULL AND length(e.embeddingGemma512) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma512,
  SUM(CASE WHEN e.embeddingGemma768 IS NOT NULL AND length(e.embeddingGemma768) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma768,
  -- Gemini variants
  SUM(CASE WHEN e.embeddingGemini128 IS NOT NULL AND length(e.embeddingGemini128) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini128,
  SUM(CASE WHEN e.embeddingGemini768 IS NOT NULL AND length(e.embeddingGemini768) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini768,
  SUM(CASE WHEN e.embeddingGemini1536 IS NOT NULL AND length(e.embeddingGemini1536) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini1536,
  SUM(CASE WHEN e.embeddingGemini3072 IS NOT NULL AND length(e.embeddingGemini3072) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini3072,
  MIN(c.createdAt) AS firstChunkCreated,
  MAX(c.updatedAt) AS lastChunkUpdated
FROM graph_chunks c
LEFT JOIN graph_chunk_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex
GROUP BY ns, id;

-- Model Summary: Count of embeddings by model
CREATE VIEW IF NOT EXISTS v_embedding_model_summary AS
SELECT
  'workersai' AS model,
  '768' AS dimensions,
  COUNT(*) AS entityEmbeddings,
  (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingWorkersAI) > 0) AS chunkEmbeddings
FROM graph_embeddings
WHERE length(embeddingWorkersAI) > 0
UNION ALL
SELECT 'openai', '1536', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingOpenAI) > 0)
FROM graph_embeddings WHERE length(embeddingOpenAI) > 0
UNION ALL
SELECT 'gemma', '128', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma128) > 0)
FROM graph_embeddings WHERE length(embeddingGemma128) > 0
UNION ALL
SELECT 'gemma', '256', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma256) > 0)
FROM graph_embeddings WHERE length(embeddingGemma256) > 0
UNION ALL
SELECT 'gemma', '512', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma512) > 0)
FROM graph_embeddings WHERE length(embeddingGemma512) > 0
UNION ALL
SELECT 'gemma', '768', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma768) > 0)
FROM graph_embeddings WHERE length(embeddingGemma768) > 0
UNION ALL
SELECT 'gemini', '128', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini128) > 0)
FROM graph_embeddings WHERE length(embeddingGemini128) > 0
UNION ALL
SELECT 'gemini', '768', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini768) > 0)
FROM graph_embeddings WHERE length(embeddingGemini768) > 0
UNION ALL
SELECT 'gemini', '1536', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini1536) > 0)
FROM graph_embeddings WHERE length(embeddingGemini1536) > 0
UNION ALL
SELECT 'gemini', '3072', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini3072) > 0)
FROM graph_embeddings WHERE length(embeddingGemini3072) > 0;
`

        // Split into statements
        const statements = schemaSQL
          .split(';')
          .map((s) => s.trim())
          .filter((s) => {
            if (s.length === 0) return false
            return s.includes('CREATE') || s.includes('ALTER') || s.includes('DROP')
          })

        const results = []
        for (const statement of statements) {
          try {
            await clickhouse.command({
              query: statement,
              clickhouse_settings: {
                enable_json_type: 1,
                allow_experimental_vector_similarity_index: 1,
              },
            })
            results.push({
              success: true,
              statement: statement.split('\\n')[0].substring(0, 80) + '...',
            })
          } catch (error: any) {
            if (error.message?.includes('already exists') || error.message?.includes('ALREADY_EXISTS')) {
              results.push({
                success: true,
                skipped: true,
                statement: statement.split('\\n')[0].substring(0, 80) + '...',
              })
            } else {
              results.push({
                success: false,
                error: error.message,
                statement: statement.split('\\n')[0].substring(0, 80) + '...',
              })
            }
          }
        }

        const successCount = results.filter((r) => r.success).length
        const errorCount = results.filter((r) => !r.success).length

        return c.json({
          status: errorCount === 0 ? 'success' : 'partial',
          summary: {
            total: statements.length,
            successful: successCount,
            failed: errorCount,
          },
          results,
        })
      } catch (error: any) {
        return c.json(
          {
            status: 'error',
            error: error.message,
          },
          500
        )
      }
    })

    // ============================================================================
    // SHARED HANDLERS (used by both /api/* and root /* routes)
    // ============================================================================

    /**
     * Get base URL from request
     */
    const getBaseUrl = (c: any) => {
      const url = new URL(c.req.url)
      return `${url.protocol}//${url.host}`
    }

    /**
     * Handler: List things with pagination and HATEOAS
     */
    const handleListThings = async (c: any) => {
      try {
        const ns = c.req.query('ns') || 'default'
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '20')
        const type = c.req.query('type')
        const visibility = c.req.query('visibility')

        const options: things.ListOptions = {
          page,
          limit,
          ...(type && { type }),
          ...(visibility && { visibility }),
        }

        const result = await this.list(ns, options)

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const path = '/things'
        const links = generateHateoasLinks(baseUrl, path, { ns, type, visibility }, {
          page,
          limit,
          total: result.total || 0,
          hasMore: result.hasMore || false,
        })

        return c.json(withHateoas(result.data, links, { page, limit, total: result.total, hasMore: result.hasMore }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    }

    /**
     * Handler: Get single thing with HATEOAS
     */
    const handleGetThing = async (c: any, ns: string, id: string) => {
      try {
        const result = await this.get(ns, id)

        if (!result) {
          return c.json({ error: 'Thing not found' }, 404)
        }

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const links: HateoasLinks = {
          self: { href: `${baseUrl}/${ns}/${id}` },
          home: { href: baseUrl },
          relationships: { href: `${baseUrl}/${ns}/${id}.relationships` },
          namespace: { href: `${baseUrl}/things?ns=${ns}` },
        }

        return c.json(withHateoas(result, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    }

    /**
     * Handler: Create thing
     */
    const handleCreateThing = async (c: any) => {
      try {
        const body = await c.req.json()
        const result = await this.upsert(body)

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const links: HateoasLinks = {
          self: { href: `${baseUrl}/${result.ns}/${result.id}` },
          home: { href: baseUrl },
        }

        return c.json(withHateoas(result, links), 201)
      } catch (error: any) {
        return c.json({ error: error.message }, 400)
      }
    }

    /**
     * Handler: Update thing
     */
    const handleUpdateThing = async (c: any, ns: string, id: string) => {
      try {
        const body = await c.req.json()
        const result = await this.upsert({ ...body, ns, id })

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const links: HateoasLinks = {
          self: { href: `${baseUrl}/${ns}/${id}` },
          home: { href: baseUrl },
        }

        return c.json(withHateoas(result, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 400)
      }
    }

    /**
     * Handler: Delete thing
     */
    const handleDeleteThing = async (c: any, ns: string, id: string) => {
      try {
        const result = await this.delete(ns, id)

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const links: HateoasLinks = {
          self: { href: `${baseUrl}/${ns}/${id}` },
          home: { href: baseUrl },
        }

        return c.json(withHateoas(result, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    }

    /**
     * Handler: Get relationships for a thing (outgoing)
     */
    const handleGetRelationships = async (c: any, ns: string, id: string, predicate?: string) => {
      try {
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '20')

        const options: relationships.RelationshipListOptions = {
          page,
          limit,
          ...(predicate && { predicate }),
        }

        const result = await this.getRelationships(ns, id, options)

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const path = predicate ? `/${ns}/${id}.${predicate}` : `/${ns}/${id}.relationships`
        const links = generateHateoasLinks(baseUrl, path, {}, {
          page,
          limit,
          total: result.total || 0,
          hasMore: result.hasMore || false,
        })

        links.thing = { href: `${baseUrl}/${ns}/${id}` }

        return c.json(withHateoas(result.data, links, { page, limit, total: result.total, hasMore: result.hasMore }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    }

    /**
     * Handler: Search
     */
    const handleSearch = async (c: any) => {
      try {
        const query = c.req.query('q') || ''
        const ns = c.req.query('ns')
        const limit = parseInt(c.req.query('limit') || '10')
        const minScore = parseFloat(c.req.query('minScore') || '0')

        const options: search.VectorSearchOptions = {
          ...(ns && { ns }),
          limit,
          minScore,
        }

        const result = await this.search(query, undefined, options)

        // Add HATEOAS links
        const baseUrl = getBaseUrl(c)
        const links: HateoasLinks = {
          self: { href: `${baseUrl}/search?q=${encodeURIComponent(query)}${ns ? `&ns=${ns}` : ''}` },
          home: { href: baseUrl },
        }

        return c.json(withHateoas(result, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    }

    // ============================================================================
    // ROOT-LEVEL ROUTES (for glyph domains and db.mw)
    // Direct access without /api prefix
    // ============================================================================

    // List things
    app.get('/things', handleListThings.bind(this))

    // Search
    app.get('/search', handleSearch.bind(this))

    // Create thing
    app.post('/things', handleCreateThing.bind(this))

    // Get/Update/Delete specific thing by ns:id
    app.get('/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')

      // Check if this is a relationships request (id.predicate format)
      if (id.includes('.')) {
        const [actualId, predicate] = id.split('.')

        // Special case: .relationships = all relationships
        if (predicate === 'relationships') {
          return handleGetRelationships.call(this, c, ns, actualId)
        }

        // Specific predicate
        return handleGetRelationships.call(this, c, ns, actualId, predicate)
      }

      return handleGetThing.call(this, c, ns, id)
    })

    app.put('/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      return handleUpdateThing.call(this, c, ns, id)
    })

    app.delete('/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      return handleDeleteThing.call(this, c, ns, id)
    })

    // ============================================================================
    // REST API - THINGS (Legacy /api/* routes for backward compatibility)
    // ============================================================================

    // List things with pagination
    app.get('/api/things', handleListThings.bind(this))

    // Get single thing
    app.get('/api/things/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      return handleGetThing.call(this, c, ns, id)
    })

    // Create thing
    app.post('/api/things', handleCreateThing.bind(this))

    // Update thing
    app.put('/api/things/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      return handleUpdateThing.call(this, c, ns, id)
    })

    // Delete thing
    app.delete('/api/things/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      return handleDeleteThing.call(this, c, ns, id)
    })

    // Count things
    app.get('/api/things/count/:ns', async (c) => {
      try {
        const ns = c.req.param('ns')
        const type = c.req.query('type')
        const visibility = c.req.query('visibility')

        const filters: { type?: string; visibility?: string } = {}
        if (type) filters.type = type
        if (visibility) filters.visibility = visibility

        const result = await this.count(ns, filters)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path, { ns, type, visibility })

        return c.json(withHateoas({ count: result }, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // ============================================================================
    // REST API - RELATIONSHIPS
    // ============================================================================

    // List relationships
    app.get('/api/relationships', async (c) => {
      try {
        const ns = c.req.query('ns') || 'default'
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '20')
        const predicate = c.req.query('predicate')

        const options: relationships.RelationshipListOptions = {
          page,
          limit,
          ...(predicate && { predicate }),
        }

        const result = await this.listRelationships(ns, options)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const total = result.total || 0
        const hasMore = result.hasMore || false
        const links = generateHateoasLinks(baseUrl, path, { ns, predicate }, { page, limit, total, hasMore })

        return c.json(withHateoas(result.data, links, { page, limit, total, hasMore }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // Get relationships for a thing (outgoing)
    app.get('/api/relationships/:ns/:id', async (c) => {
      const ns = c.req.param('ns')
      const id = c.req.param('id')
      const predicate = c.req.query('predicate') || undefined
      return handleGetRelationships.call(this, c, ns, id, predicate)
    })

    // Get incoming relationships for a thing
    app.get('/api/relationships/:ns/:id/incoming', async (c) => {
      try {
        const ns = c.req.param('ns')
        const id = c.req.param('id')
        const predicate = c.req.query('predicate')
        const page = parseInt(c.req.query('page') || '1')
        const limit = parseInt(c.req.query('limit') || '20')

        const options: relationships.RelationshipListOptions = {
          page,
          limit,
          ...(predicate && { predicate }),
        }

        const result = await this.getIncomingRelationships(ns, id, options)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const total = result.total || 0
        const hasMore = result.hasMore || false
        const links = generateHateoasLinks(baseUrl, path, { predicate }, { page, limit, total, hasMore })

        // Add resource links
        links.thing = { href: `${baseUrl}/api/things/${ns}/${id}` }
        links.outgoing = { href: `${baseUrl}/api/relationships/${ns}/${id}` }

        return c.json(withHateoas(result.data, links, { page, limit, total, hasMore }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // Create relationship
    app.post('/api/relationships', async (c) => {
      try {
        const body = await c.req.json()
        const result = await this.upsertRelationship(body)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path)

        // Add resource links
        if (result.fromNs && result.fromId) {
          links.from = { href: `${baseUrl}/api/things/${result.fromNs}/${result.fromId}` }
        }
        if (result.toNs && result.toId) {
          links.to = { href: `${baseUrl}/api/things/${result.toNs}/${result.toId}` }
        }

        return c.json(withHateoas(result, links), 201)
      } catch (error: any) {
        return c.json({ error: error.message }, 400)
      }
    })

    // Delete relationship
    app.delete('/api/relationships/:ns/:id', async (c) => {
      try {
        const ns = c.req.param('ns')
        const id = c.req.param('id')
        const result = await this.deleteRelationship(ns, id)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path)
        links.relationships = { href: `${baseUrl}/api/relationships?ns=${ns}` }

        return c.json(withHateoas(result, links))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // ============================================================================
    // REST API - SEARCH
    // ============================================================================

    // Full-text search
    app.get('/api/search', handleSearch.bind(this))

    // Vector similarity search
    app.post('/api/search/vector', async (c) => {
      try {
        const body = await c.req.json()
        const { embedding, ns, limit = 10, minScore = 0, model = 'workers-ai' } = body

        if (!embedding || !Array.isArray(embedding)) {
          return c.json({ error: 'embedding array is required' }, 400)
        }

        const options: search.VectorSearchOptions = {
          ...(ns && { ns }),
          limit,
          minScore,
          model,
        }

        const result = await this.vectorSearch(embedding, options)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path, { ns, limit, minScore, model })

        // Add resource links for each result
        const dataWithLinks = Array.isArray(result.data)
          ? result.data.map((item: any) => ({
              ...item,
              _links: {
                self: { href: `${baseUrl}/api/things/${item.ns}/${item.id}` },
              },
            }))
          : result.data

        return c.json(withHateoas(dataWithLinks, links, { total: result.total || result.data?.length || 0 }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // Hybrid search (text + vector)
    app.post('/api/search/hybrid', async (c) => {
      try {
        const body = await c.req.json()
        const { query, embedding, ns, limit = 10, minScore = 0, model = 'workers-ai' } = body

        if (!query || !embedding || !Array.isArray(embedding)) {
          return c.json({ error: 'query and embedding array are required' }, 400)
        }

        const options: search.VectorSearchOptions = {
          ...(ns && { ns }),
          limit,
          minScore,
          model,
        }

        const result = await this.search(query, embedding, options)

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path, { q: query, ns, limit, minScore, model })

        // Add resource links for each result
        const dataWithLinks = Array.isArray(result.data)
          ? result.data.map((item: any) => ({
              ...item,
              _links: {
                self: { href: `${baseUrl}/api/things/${item.ns}/${item.id}` },
              },
            }))
          : result.data

        return c.json(withHateoas(dataWithLinks, links, { total: result.total || result.data?.length || 0 }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // Search chunks (vector search across document chunks)
    app.post('/api/search/chunks', async (c) => {
      try {
        const body = await c.req.json()
        const { embedding, ns, limit = 10, minScore = 0, model = 'workers-ai' } = body

        if (!embedding || !Array.isArray(embedding)) {
          return c.json({ error: 'embedding array is required' }, 400)
        }

        const result = await this.searchChunks({
          embedding,
          ...(ns && { ns }),
          limit,
          minScore,
          model,
        })

        const baseUrl = new URL(c.req.url).origin
        const path = c.req.path
        const links = generateHateoasLinks(baseUrl, path, { ns, limit, minScore, model })

        // Add resource links for each result
        const dataWithLinks = Array.isArray(result.data)
          ? result.data.map((item: any) => ({
              ...item,
              _links: {
                self: { href: `${baseUrl}/api/things/${item.ns}/${item.id}` },
                chunk: { href: `${baseUrl}/api/things/${item.ns}/${item.id}?chunk=${item.chunkIndex}` },
              },
            }))
          : result.data

        return c.json(withHateoas(dataWithLinks, links, { total: result.data?.length || 0 }))
      } catch (error: any) {
        return c.json({ error: error.message }, 500)
      }
    })

    // RPC over HTTP endpoint (for debugging)
    app.post('/rpc', async (c) => {
      const { method, params } = await c.req.json()
      const result = await (this as any)[method]?.(...(params || []))
      return c.json({ result })
    })

    // Root endpoint - service info
    app.get('/', (c) => {
      const baseUrl = new URL(c.req.url).origin
      const isGlyphDomain = ['彡.io', '口.io', '回.io', 'db.mw'].includes(new URL(c.req.url).hostname)

      return c.json({
        service: 'database',
        version: '1.0.0',
        description: 'Comprehensive database abstraction layer for the platform with HATEOAS navigation',
        interfaces: {
          rpc: 'WorkerEntrypoint methods for service-to-service calls',
          http: 'REST API for CRUD operations, search, and analytics',
          hateoas: 'Hypermedia-driven navigation with _links in all responses',
          mcp: 'AI agent tools (coming soon)',
        },
        _links: {
          self: { href: `${baseUrl}/` },
          health: { href: `${baseUrl}/health` },
          stats: { href: `${baseUrl}/stats` },
          types: { href: `${baseUrl}/types` },
          activity: { href: `${baseUrl}/activity` },
          things: { href: `${baseUrl}${isGlyphDomain ? '' : '/api'}/things?ns=default` },
          relationships: { href: `${baseUrl}${isGlyphDomain ? '' : '/api'}/relationships?ns=default` },
          search: { href: `${baseUrl}${isGlyphDomain ? '' : '/api'}/search?q=query` },
        },
        endpoints: {
          // Root-level routes (for glyph domains: 彡.io, 口.io, 回.io, db.mw)
          ...(isGlyphDomain && {
            root: {
              things: {
                list: 'GET /things?ns=default&page=1&limit=20',
                get: 'GET /:ns/:id',
                relationships: 'GET /:ns/:id.relationships (or /:ns/:id.:predicate)',
                create: 'POST /things',
                update: 'PUT /:ns/:id',
                delete: 'DELETE /:ns/:id',
              },
              search: {
                text: 'GET /search?q=query&ns=default&limit=10',
              },
            },
          }),
          // Legacy /api/* routes (for backward compatibility)
          api: {
            things: {
              list: 'GET /api/things?ns=default&page=1&limit=20',
              get: 'GET /api/things/:ns/:id',
              create: 'POST /api/things',
              update: 'PUT /api/things/:ns/:id',
              delete: 'DELETE /api/things/:ns/:id',
              count: 'GET /api/things/count/:ns',
            },
            relationships: {
              list: 'GET /api/relationships?ns=default&page=1&limit=20',
              get: 'GET /api/relationships/:ns/:id',
              incoming: 'GET /api/relationships/:ns/:id/incoming',
              create: 'POST /api/relationships',
              delete: 'DELETE /api/relationships/:ns/:id',
            },
            search: {
              text: 'GET /api/search?q=query&ns=default&limit=10',
              vector: 'POST /api/search/vector',
              hybrid: 'POST /api/search/hybrid',
              chunks: 'POST /api/search/chunks',
            },
            rpc: 'POST /rpc',
          },
        },
        domains: {
          standard: ['database.do', 'db.mw', 'apis.do'],
          glyph: {
            '彡.io': 'Data Layer - AI-native database access (彡 = shape/pattern/database)',
            '口.io': 'Data Model - Entity types and nouns (口 = mouth/noun)',
            '回.io': 'Data Model - Things and resources (回 = rotation/thing)',
          },
        },
      })
    })

    return app.fetch(request, this.env, this.ctx)
  }

  // ============================================================================
  // RPC SERVER CONFIGURATION
  // ============================================================================

  /**
   * Get RPC service definition for this service
   */
  static getRpcService(): RpcService {
    return {
      name: 'database',
      version: '1.0.0',
      methods: [
        createRpcMethod('get', async (request: RpcRequest, context: RpcContext) => {
          const [ns, id, options = {}] = request.args
          const result = await things.get(ns, id, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('list', async (request: RpcRequest, context: RpcContext) => {
          const [ns, options = {}] = request.args
          const result = await things.list(ns, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('search', async (request: RpcRequest, context: RpcContext) => {
          const [query, embedding, options = {}] = request.args
          const result = embedding
            ? await search.hybridSearch(query, embedding, options)
            : await search.fullTextSearch(query, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('vectorSearch', async (request: RpcRequest, context: RpcContext) => {
          const [embedding, options = {}] = request.args
          const result = await search.vectorSearch(embedding, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('upsert', async (request: RpcRequest, context: RpcContext) => {
          const [thing] = request.args
          const result = await things.upsert(thing)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('delete', async (request: RpcRequest, context: RpcContext) => {
          const [ns, id] = request.args
          const result = await things.del(ns, id)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('count', async (request: RpcRequest, context: RpcContext) => {
          const [ns, filters] = request.args
          const result = await things.count(ns, filters)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('getRelationships', async (request: RpcRequest, context: RpcContext) => {
          const [ns, id, options = {}] = request.args
          const result = await relationships.getRelationships(ns, id, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('getIncomingRelationships', async (request: RpcRequest, context: RpcContext) => {
          const [ns, id, options = {}] = request.args
          const result = await relationships.getIncomingRelationships(ns, id, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('upsertRelationship', async (request: RpcRequest, context: RpcContext) => {
          const [relationship] = request.args
          const result = await relationships.upsert(relationship)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('deleteRelationship', async (request: RpcRequest, context: RpcContext) => {
          const [ns, id] = request.args
          const result = await relationships.del(ns, id)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('listRelationships', async (request: RpcRequest, context: RpcContext) => {
          const [ns, options = {}] = request.args
          const result = await relationships.list(ns, options)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('stats', async (request: RpcRequest, context: RpcContext) => {
          const result = await analytics.getDatabaseStats()
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('typeDistribution', async (request: RpcRequest, context: RpcContext) => {
          const [ns] = request.args
          const result = await analytics.getTypeDistribution(ns)
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('clickhouseStats', async (request: RpcRequest, context: RpcContext) => {
          const result = await analytics.getClickHouseStats()
          return { data: result, requestId: request.requestId }
        }),
        createRpcMethod('recentActivity', async (request: RpcRequest, context: RpcContext) => {
          const [limit] = request.args
          const result = await analytics.getRecentActivity(limit)
          return { data: result, requestId: request.requestId }
        }),
      ],
      metadata: {
        description: 'Comprehensive database abstraction layer for the platform',
        interfaces: ['rpc', 'http', 'mcp'],
      },
    }
  }
}
