/**
 * ClickHouse Adapter for Graph API
 *
 * Implements graph database operations using Cloudflare ClickHouse
 * with optimized graph_things and graph_relationships tables.
 *
 * This adapter uses the @clickhouse/client-web library for direct
 * ClickHouse HTTP API access (not Analytics Engine).
 */

import { createClient, type ClickHouseClient } from '@clickhouse/client-web'
import type { ThingDatabase, PreparedStatement } from '../things.js'

/**
 * ClickHouse Connection Config
 */
export interface ClickHouseConfig {
  url: string // ClickHouse HTTP endpoint
  database: string // Database name
  username?: string // Optional username
  password?: string // Optional password
}

/**
 * ClickHouse Prepared Statement Implementation
 */
class ClickHousePreparedStatement implements PreparedStatement {
  private query: string
  private params: unknown[]
  private client: ClickHouseClient

  constructor(query: string, client: ClickHouseClient) {
    this.query = query
    this.params = []
    this.client = client
  }

  bind(...params: unknown[]): PreparedStatement {
    this.params = params
    return this
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const results = await this.execute()
    return { results: results as T[] }
  }

  async first<T = unknown>(): Promise<T | null> {
    const results = await this.execute()
    const array = results as T[]
    return array.length > 0 ? array[0] : null
  }

  async run(): Promise<{ success: boolean; meta?: Record<string, unknown> }> {
    await this.execute()
    return { success: true, meta: { changes: 1 } }
  }

  private async execute(): Promise<unknown[]> {
    // Build query with named parameters
    const queryParams: Record<string, unknown> = {}
    let parameterizedQuery = this.query

    this.params.forEach((param, index) => {
      const key = `p${index}`
      const paramType = this.inferType(param)
      const placeholder = `{${key}:${paramType}}`

      // Replace first occurrence of ? with the named parameter
      parameterizedQuery = parameterizedQuery.replace('?', placeholder)
      queryParams[key] = param
    })

    try {
      const resultSet = await this.client.query({
        query: parameterizedQuery,
        format: 'JSON',
        query_params: queryParams,
        clickhouse_settings: {
          enable_json_type: 1,
        },
      })

      const data = await resultSet.json()
      return (data as any).data || []
    } catch (error: any) {
      throw new Error(`ClickHouse query failed: ${error.message}`)
    }
  }

  private inferType(value: unknown): string {
    switch (typeof value) {
      case 'number':
        return Number.isInteger(value as number) ? 'Int64' : 'Float64'
      case 'boolean':
        return 'Bool'
      case 'string':
        return 'String'
      default:
        return 'String'
    }
  }
}

/**
 * ClickHouse Database Adapter for Graph Operations
 *
 * Uses optimized graph_things and graph_relationships tables
 */
export class ClickHouseDatabase implements ThingDatabase {
  private client: ClickHouseClient

  constructor(config: ClickHouseConfig) {
    this.client = createClient(config)
  }

  async execute(query: string, params?: unknown[]): Promise<unknown[]> {
    const stmt = this.prepare(query)
    if (params) {
      stmt.bind(...params)
    }
    const result = await stmt.all()
    return result.results
  }

  prepare(query: string): PreparedStatement {
    return new ClickHousePreparedStatement(query, this.client)
  }

  /**
   * Direct ClickHouse client access for advanced queries
   */
  getClient(): ClickHouseClient {
    return this.client
  }
}

/**
 * Create ClickHouse database instance from config
 */
export function createClickHouseDatabase(config: ClickHouseConfig): ClickHouseDatabase {
  return new ClickHouseDatabase(config)
}

/**
 * Create ClickHouse database instance from environment variables
 */
export function createClickHouseDatabaseFromEnv(): ClickHouseDatabase {
  const config: ClickHouseConfig = {
    url: process.env.CLICKHOUSE_URL || '',
    database: process.env.CLICKHOUSE_DATABASE || '',
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
  }

  if (!config.url || !config.database) {
    throw new Error('CLICKHOUSE_URL and CLICKHOUSE_DATABASE environment variables are required')
  }

  return new ClickHouseDatabase(config)
}

/**
 * Initialize ClickHouse database with optimized graph schemas
 *
 * Note: This creates simplified tables. For full schema with materialized views,
 * use the migration script: pnpm tsx workers/db/migrate-graph-schema.ts
 */
export async function initClickHouseSchemas(db: ClickHouseDatabase): Promise<void> {
  const client = db.getClient()

  // Create graph_things table (optimized for entity queries)
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS graph_things (
        ns String,
        id String,
        type String,
        data JSON,
        content String DEFAULT '',
        createdAt DateTime64(3) DEFAULT now64(),
        updatedAt DateTime64(3) DEFAULT now64()
      ) ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY (ns, id)
      PRIMARY KEY (ns, id)
    `,
    clickhouse_settings: {
      enable_json_type: 1,
    },
  })

  // Create graph_relationships table (optimized for inbound queries - backlinks!)
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS graph_relationships (
        fromNs String,
        fromId String,
        fromType String,
        predicate String,
        toNs String,
        toId String,
        toType String,
        data JSON DEFAULT '{}',
        createdAt DateTime64(3) DEFAULT now64()
      ) ENGINE = ReplacingMergeTree(createdAt)
      ORDER BY (toNs, toId, predicate, fromNs, fromId)
      PRIMARY KEY (toNs, toId, predicate)
    `,
    clickhouse_settings: {
      enable_json_type: 1,
    },
  })
}
