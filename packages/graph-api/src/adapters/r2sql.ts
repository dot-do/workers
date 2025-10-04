/**
 * R2 SQL Adapter for Graph API
 *
 * Implements graph database operations using Cloudflare R2 SQL with Apache Iceberg.
 *
 * Architecture:
 * - **Writes**: HTTP POST to Pipelines stream endpoint (JSON batches)
 * - **Reads**: Wrangler CLI or Cloudflare API (requires auth token)
 * - **Storage**: Parquet files in R2 bucket with Iceberg metadata
 *
 * R2 SQL Features:
 * - Petabyte-scale distributed queries
 * - Apache Iceberg table format
 * - Column-selective reads (Parquet)
 * - Multi-layer metadata pruning
 * - Streaming query planning
 *
 * Limitations:
 * - Open Beta (very new, announced 2025-10-01)
 * - Limited SQL support (no JOINs, aggregations)
 * - ORDER BY requires partition keys
 * - Query interface: Wrangler CLI only (no direct HTTP API yet)
 *
 * @see https://blog.cloudflare.com/r2-sql-deep-dive/
 * @see https://developers.cloudflare.com/r2-sql/
 */

import type { ThingDatabase, PreparedStatement } from '../things.js'

/**
 * R2 SQL Connection
 *
 * Includes both query and write interfaces for R2 SQL.
 */
export interface R2SQLConnection {
  /** Cloudflare account ID */
  accountId: string
  /** API token with R2 Data Catalog permissions */
  apiToken: string
  /** R2 bucket name with Data Catalog enabled */
  bucketName: string
  /** Warehouse name (usually accountId_bucketName) */
  warehouseName: string
  /** Pipelines stream endpoint URL for writes */
  streamUrl?: string
}

/**
 * R2 SQL Prepared Statement Implementation
 */
class R2SQLPreparedStatement implements PreparedStatement {
  private query: string
  private params: unknown[]
  private connection: R2SQLConnection

  constructor(query: string, connection: R2SQLConnection) {
    this.query = query
    this.params = []
    this.connection = connection
  }

  bind(...params: unknown[]): PreparedStatement {
    this.params = params
    return this
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const response = await this.execute()
    return { results: response as T[] }
  }

  async first<T = unknown>(): Promise<T | null> {
    const response = await this.execute()
    const results = response as T[]
    return results.length > 0 ? results[0] : null
  }

  async run(): Promise<{ success: boolean; meta?: Record<string, unknown> }> {
    await this.execute()
    return { success: true, meta: { changes: 1 } }
  }

  private async execute(): Promise<unknown[]> {
    // Replace ? placeholders with actual values for SQL query
    let paramIndex = 0
    const queryWithParams = this.query.replace(/\?/g, () => {
      const value = this.params[paramIndex++]
      return typeof value === 'string' ? `'${value}'` : String(value)
    })

    // Call R2 SQL query Worker
    // Local: http://localhost:8787/query (when running wrangler dev)
    // Production: https://r2sql-query.do/query (when deployed)
    const workerUrl = this.connection.streamUrl?.includes('localhost')
      ? 'http://localhost:8787/query'
      : 'https://r2sql-query.do/query'

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: queryWithParams,
          warehouse: this.connection.warehouseName,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`R2 SQL Worker error (${response.status}): ${error}`)
      }

      const data = (await response.json()) as { results: unknown[]; meta: any; error?: string }

      if (data.error) {
        throw new Error(`R2 SQL query error: ${data.error}`)
      }

      return data.results || []
    } catch (error) {
      console.error('[R2 SQL] Query failed:', error)
      console.warn('[R2 SQL] Fallback: Use Wrangler CLI:', `wrangler r2 sql query "${this.connection.warehouseName}" "${queryWithParams}"`)
      throw error
    }
  }
}

/**
 * R2 SQL Database Adapter
 */
export class R2SQLDatabase implements ThingDatabase {
  private connection: R2SQLConnection

  constructor(connection: R2SQLConnection) {
    this.connection = connection
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
    return new R2SQLPreparedStatement(query, this.connection)
  }
}

/**
 * Create R2 SQL database instance
 *
 * @param accountId Cloudflare account ID
 * @param apiToken API token with R2 Data Catalog permissions
 * @param bucketName R2 bucket name with Data Catalog enabled
 * @param warehouseName Warehouse name (usually accountId_bucketName)
 * @param streamUrl Optional Pipelines stream endpoint URL for writes
 */
export function createR2SQLDatabase(
  accountId: string,
  apiToken: string,
  bucketName: string,
  warehouseName?: string,
  streamUrl?: string
): R2SQLDatabase {
  return new R2SQLDatabase({
    accountId,
    apiToken,
    bucketName,
    warehouseName: warehouseName || `${accountId}_${bucketName}`,
    streamUrl,
  })
}

/**
 * Relationship record for R2 SQL
 */
export interface R2SQLRelationship {
  fromNs: string
  fromId: string
  fromType: string
  predicate: string
  toNs: string
  toId: string
  toType: string
  data?: string // JSON string
  createdAt: string // ISO 8601 timestamp
}

/**
 * Write relationships to R2 SQL via Pipelines stream endpoint
 */
export async function writeRelationshipsToR2SQL(
  connection: R2SQLConnection,
  relationships: R2SQLRelationship[]
): Promise<{ success: boolean; error?: string }> {
  if (!connection.streamUrl) {
    throw new Error('Stream URL not configured. Set up Pipeline first: ./scripts/r2-sql-setup.sh')
  }

  try {
    const response = await fetch(connection.streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relationships),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Stream write failed: ${error}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Initialize R2 SQL database with graph schemas
 *
 * NOTE: R2 SQL tables are created via Pipelines, not SQL DDL.
 *
 * Setup process:
 * 1. Create R2 bucket: `wrangler r2 bucket create mdxld-graph`
 * 2. Enable Data Catalog: `wrangler r2 bucket catalog enable mdxld-graph`
 * 3. Create API token with R2 Data Catalog permissions
 * 4. Run setup script: `./scripts/r2-sql-setup.sh`
 *
 * This will create:
 * - Sink (R2 Data Catalog sink pointing to bucket/namespace/table)
 * - Stream (HTTP endpoint for ingestion)
 * - Pipeline (SQL query connecting stream to sink)
 *
 * The Iceberg table schema is defined in the Pipeline configuration,
 * not via SQL DDL statements.
 *
 * @see scripts/r2-sql-setup.sh
 * @see scripts/r2-sql-relationships-schema.json
 */
export async function initR2SQLSchemas(db: R2SQLDatabase): Promise<void> {
  console.warn(
    '[R2 SQL] Tables are created via Pipelines, not SQL DDL.\n' +
      'Run ./scripts/r2-sql-setup.sh to set up the Pipeline infrastructure.\n' +
      'See docs/R2-SQL-RESEARCH.md for details.'
  )

  // No-op: R2 SQL tables are created via Pipelines
  // This function exists for API compatibility with other adapters
}
