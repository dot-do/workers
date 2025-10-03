import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
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
 * - RPC: WorkerEntrypoint methods for service-to-service calls
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
}
