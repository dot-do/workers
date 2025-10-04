/**
 * ClickHouse Adapter for Graph API
 *
 * Implements graph database operations using Cloudflare ClickHouse
 *
 * ClickHouse is a columnar OLAP database optimized for analytics queries
 */

import type { ThingDatabase, PreparedStatement } from '../things.js'

/**
 * ClickHouse Connection
 *
 * ClickHouse uses HTTP API for queries
 */
export interface ClickHouseConnection {
  accountId: string
  apiToken: string
  databaseId: string
}

/**
 * ClickHouse Prepared Statement Implementation
 */
class ClickHousePreparedStatement implements PreparedStatement {
  private query: string
  private params: unknown[]
  private connection: ClickHouseConnection

  constructor(query: string, connection: ClickHouseConnection) {
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
    // ClickHouse uses {param:Type} syntax
    let query = this.query
    this.params.forEach((param, index) => {
      const placeholder = '?'
      const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param
      query = query.replace(placeholder, String(value))
    })

    // ClickHouse API endpoint
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.connection.accountId}/analytics_engine/sql`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.connection.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        database: this.connection.databaseId,
        format: 'JSONEachRow',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ClickHouse query failed: ${error}`)
    }

    const text = await response.text()
    // Parse JSONEachRow format (one JSON object per line)
    return text
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => JSON.parse(line))
  }
}

/**
 * ClickHouse Database Adapter
 */
export class ClickHouseDatabase implements ThingDatabase {
  private connection: ClickHouseConnection

  constructor(connection: ClickHouseConnection) {
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
    return new ClickHousePreparedStatement(query, this.connection)
  }
}

/**
 * Create ClickHouse database instance
 */
export function createClickHouseDatabase(
  accountId: string,
  apiToken: string,
  databaseId: string
): ClickHouseDatabase {
  return new ClickHouseDatabase({
    accountId,
    apiToken,
    databaseId,
  })
}

/**
 * Initialize ClickHouse database with graph schemas
 */
export async function initClickHouseSchemas(db: ClickHouseDatabase): Promise<void> {
  // Create Things table with MergeTree engine
  await db.execute(`
    CREATE TABLE IF NOT EXISTS things (
      ulid String,
      ns String,
      id String,
      type String,
      data String,
      content String,
      createdAt String,
      updatedAt String
    ) ENGINE = MergeTree()
    ORDER BY (ns, id)
    PRIMARY KEY (ns, id)
  `)

  // Create Relationships table optimized for inbound queries
  await db.execute(`
    CREATE TABLE IF NOT EXISTS relationships (
      ulid String,
      fromNs String,
      fromId String,
      fromType String,
      predicate String,
      toNs String,
      toId String,
      toType String,
      data String,
      createdAt String
    ) ENGINE = MergeTree()
    ORDER BY (toNs, toId, predicate)
    PRIMARY KEY (toNs, toId)
  `)

  // ClickHouse automatically creates secondary indexes for filtering
}
