/**
 * R2 SQL Adapter for Graph API
 *
 * Implements graph database operations using Cloudflare R2 SQL
 *
 * R2 SQL is DuckDB under the hood - columnar storage, analytics-optimized
 */

import type { ThingDatabase, PreparedStatement } from '../things.js'

/**
 * R2 SQL Connection
 *
 * R2 SQL uses HTTP API for queries
 */
export interface R2SQLConnection {
  accountId: string
  apiToken: string
  bucketName: string
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
    // Replace ? placeholders with $1, $2, etc for DuckDB
    let paramIndex = 1
    const duckdbQuery = this.query.replace(/\?/g, () => `$${paramIndex++}`)

    // R2 SQL API endpoint
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.connection.accountId}/r2/buckets/${this.connection.bucketName}/sql`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.connection.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: duckdbQuery,
        params: this.params,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`R2 SQL query failed: ${error}`)
    }

    const data = await response.json() as { result: unknown[] }
    return data.result || []
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
 */
export function createR2SQLDatabase(
  accountId: string,
  apiToken: string,
  bucketName: string
): R2SQLDatabase {
  return new R2SQLDatabase({
    accountId,
    apiToken,
    bucketName,
  })
}

/**
 * Initialize R2 SQL database with graph schemas
 */
export async function initR2SQLSchemas(db: R2SQLDatabase): Promise<void> {
  // Create Things table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS things (
      ulid VARCHAR PRIMARY KEY,
      ns VARCHAR NOT NULL,
      id VARCHAR NOT NULL,
      type VARCHAR NOT NULL,
      data JSON NOT NULL,
      content TEXT,
      createdAt VARCHAR NOT NULL,
      updatedAt VARCHAR NOT NULL,
      UNIQUE(ns, id)
    )
  `)

  // Create Relationships table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS relationships (
      ulid VARCHAR PRIMARY KEY,
      fromNs VARCHAR NOT NULL,
      fromId VARCHAR NOT NULL,
      fromType VARCHAR NOT NULL,
      predicate VARCHAR NOT NULL,
      toNs VARCHAR NOT NULL,
      toId VARCHAR NOT NULL,
      toType VARCHAR NOT NULL,
      data JSON,
      createdAt VARCHAR NOT NULL,
      UNIQUE(fromNs, fromId, predicate, toNs, toId)
    )
  `)

  // Note: DuckDB automatically creates indexes for performance
  // It uses columnar storage and vectorized execution
}
