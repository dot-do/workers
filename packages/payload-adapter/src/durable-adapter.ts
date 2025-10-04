import { DatabaseAdapter } from 'payload'
import { drizzle } from 'drizzle-orm/durable-sqlite'
import { sql } from 'drizzle-orm'
import { customType, index } from 'drizzle-orm/sqlite-core'
import type { PayloadAdapterConfig } from './types'

/**
 * Custom Float32Array vector type for Durable Objects SQLite
 * Based on archive/platform/primitives/databases/sqlite.ts
 */
const float32Array = customType<{
  data: number[]
  config: { dimensions: number }
  configRequired: true
  driverData: Buffer
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer))
  },
  toDriver(value: number[]) {
    return sql`vector32(${JSON.stringify(value)})`
  },
})

/**
 * Durable Object class that provides SQLite storage for Payload
 *
 * Each Durable Object instance has its own SQLite database
 * Multiple instances can exist for different tenants/namespaces
 */
export class PayloadDurableObject {
  private sql: SqlStorage
  private db: ReturnType<typeof drizzle>

  constructor(state: DurableObjectState, env: any) {
    this.sql = state.storage.sql
    this.db = drizzle(this.sql)
  }

  /**
   * Execute a SQL query
   */
  async query(query: string, params?: any[]): Promise<any> {
    return await this.sql.exec(query, ...params || [])
  }

  /**
   * Execute multiple SQL queries in a transaction
   */
  async transaction(queries: Array<{ query: string; params?: any[] }>): Promise<any[]> {
    return await this.sql.batch(
      queries.map(({ query, params }) => this.sql.exec(query, ...params || []))
    )
  }

  /**
   * Get the Drizzle database instance
   */
  getDb() {
    return this.db
  }
}

/**
 * Create a Payload database adapter using Cloudflare Durable Objects SQLite
 *
 * This adapter uses Durable Objects for SQLite storage, providing:
 * - Cloudflare-native SQLite (no external services)
 * - Automatic replication and durability
 * - Vector embeddings support
 * - Per-tenant isolation via Durable Objects
 *
 * @example
 * ```typescript
 * import { createDurableAdapter } from '@dot-do/payload-adapter'
 *
 * export default buildConfig({
 *   db: createDurableAdapter({
 *     type: 'durable',
 *     durable: {
 *       binding: env.PAYLOAD_DO,
 *       namespace: 'default'
 *     },
 *     enableVectors: true,
 *     vectorDimensions: 768
 *   })
 * })
 * ```
 */
export function createDurableAdapter(config: PayloadAdapterConfig): DatabaseAdapter {
  const { durable, enableVectors, vectorDimensions } = config

  if (!durable) {
    throw new Error('Durable Objects configuration required for Durable Objects adapter')
  }

  // Get Durable Object stub
  const id = durable.binding.idFromName(durable.namespace || 'default')
  const stub = durable.binding.get(id)

  return {
    name: 'payload-durable-adapter',

    async init() {
      // Initialize schema if needed
      // The Durable Object will handle schema creation
      console.log('Durable Objects SQLite adapter initialized')
    },

    async connect() {
      // Connection is automatic with Durable Objects
      console.log('Connected to Durable Objects SQLite')
    },

    async destroy() {
      // No cleanup needed for Durable Objects
      console.log('Durable Objects SQLite adapter destroyed')
    },

    // Transaction methods
    async beginTransaction() {
      // Durable Objects handle transactions internally
      return 'durable-tx'
    },

    async commitTransaction(id: string) {
      // Auto-committed
    },

    async rollbackTransaction(id: string) {
      // Not supported in this version
      console.warn('Rollback not supported in Durable Objects adapter')
    },

    // CRUD operations
    async create({ collection, data, req }) {
      const result = await stub.query(
        `INSERT INTO ${collection} (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')}) RETURNING *`,
        Object.values(data)
      )
      return result[0]
    },

    async createVersion(args) {
      // TODO: Implement versioning
      throw new Error('Versioning not yet implemented for Durable Objects adapter')
    },

    async deleteMany({ collection, where, req }) {
      // TODO: Implement where clause parsing
      const result = await stub.query(`DELETE FROM ${collection}`)
      return []
    },

    async deleteOne({ collection, where, req }) {
      // TODO: Implement where clause parsing
      const result = await stub.query(`DELETE FROM ${collection} WHERE id = ?`, [where.id])
      return result[0]
    },

    async deleteVersions(args) {
      // TODO: Implement versioning
      throw new Error('Versioning not yet implemented for Durable Objects adapter')
    },

    async find({ collection, limit = 10, page = 1, pagination = true, where, req, sort }) {
      const offset = pagination ? (page - 1) * limit : 0

      // TODO: Implement proper where clause and sort parsing
      const results = await stub.query(
        `SELECT * FROM ${collection} LIMIT ? OFFSET ?`,
        [limit, offset]
      )

      const countResult = await stub.query(`SELECT COUNT(*) as total FROM ${collection}`)
      const total = countResult[0]?.total || 0

      return {
        docs: results,
        hasNextPage: pagination ? total > page * limit : false,
        hasPrevPage: pagination ? page > 1 : false,
        limit,
        nextPage: pagination && total > page * limit ? page + 1 : null,
        page: pagination ? page : null,
        pagingCounter: pagination ? offset + 1 : null,
        prevPage: pagination && page > 1 ? page - 1 : null,
        totalDocs: total,
        totalPages: pagination ? Math.ceil(total / limit) : 1,
      }
    },

    async findOne({ collection, where, req }) {
      // TODO: Implement proper where clause parsing
      const result = await stub.query(`SELECT * FROM ${collection} WHERE id = ?`, [where.id])
      return result[0] || null
    },

    async findVersions(args) {
      // TODO: Implement versioning
      throw new Error('Versioning not yet implemented for Durable Objects adapter')
    },

    async queryDrafts(args) {
      // TODO: Implement drafts
      return { docs: [], hasNextPage: false, hasPrevPage: false, limit: 10, page: 1, totalDocs: 0, totalPages: 0 }
    },

    async updateOne({ collection, data, where, req }) {
      const setClauses = Object.keys(data).map(key => `${key} = ?`).join(', ')
      const result = await stub.query(
        `UPDATE ${collection} SET ${setClauses} WHERE id = ? RETURNING *`,
        [...Object.values(data), where.id]
      )
      return result[0]
    },

    async updateVersion(args) {
      // TODO: Implement versioning
      throw new Error('Versioning not yet implemented for Durable Objects adapter')
    },

    async count({ collection, where, req }) {
      // TODO: Implement where clause parsing
      const result = await stub.query(`SELECT COUNT(*) as total FROM ${collection}`)
      return result[0]?.total || 0
    },
  } as DatabaseAdapter
}

/**
 * Helper to add vector support to Durable Objects tables
 *
 * @example
 * ```typescript
 * import { PayloadDurableObject } from '@dot-do/payload-adapter'
 *
 * export class MyPayloadDO extends PayloadDurableObject {
 *   async onInit() {
 *     await addVectorSupport(this.getDb(), 'posts', 768)
 *   }
 * }
 * ```
 */
export async function addVectorSupport(
  durableObject: PayloadDurableObject,
  tableName: string,
  dimensions: number = 768
) {
  // Add embedding column if it doesn't exist
  await durableObject.query(`
    ALTER TABLE ${tableName}
    ADD COLUMN embedding F32_BLOB(${dimensions})
  `)

  // Create index for vector search
  await durableObject.query(`
    CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
    ON ${tableName}(embedding)
  `)
}
