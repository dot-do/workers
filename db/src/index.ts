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

  // ============================================================================
  // HTTP INTERFACE - For health checks and debugging
  // ============================================================================

  async fetch(request: Request) {
    const app = new Hono()

    // Enable CORS
    app.use('/*', cors())

    // Health check endpoint
    app.get('/health', async (c) => {
      const pgHealth = await checkPostgresHealth()
      const clickhouseHealth = { status: 'ok' } // ClickHouse is optional

      try {
        await clickhouse.query({ query: 'SELECT 1', format: 'JSON' })
      } catch (error: any) {
        clickhouseHealth.status = 'error'
        ;(clickhouseHealth as any).message = error.message
      }

      return c.json({
        status: pgHealth.status === 'ok' && clickhouseHealth.status === 'ok' ? 'ok' : 'degraded',
        postgres: pgHealth,
        clickhouse: clickhouseHealth,
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

    // RPC over HTTP endpoint (for debugging)
    app.post('/rpc', async (c) => {
      const { method, params } = await c.req.json()
      const result = await (this as any)[method]?.(...(params || []))
      return c.json({ result })
    })

    // Root endpoint - service info
    app.get('/', (c) => {
      return c.json({
        service: 'database',
        version: '1.0.0',
        description: 'Comprehensive database abstraction layer for the platform',
        interfaces: {
          rpc: 'WorkerEntrypoint methods for service-to-service calls',
          http: 'REST API for health checks and debugging',
          mcp: 'AI agent tools (coming soon)',
        },
        endpoints: {
          health: '/health',
          stats: '/stats',
          types: '/types?ns=onet',
          activity: '/activity?limit=100',
          rpc: 'POST /rpc',
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
