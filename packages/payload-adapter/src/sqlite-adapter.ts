import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { sql } from '@payloadcms/db-sqlite/drizzle'
import { customType, index } from '@payloadcms/db-sqlite/drizzle/sqlite-core'
import type { PayloadAdapterConfig } from './types'

/**
 * Custom Float32Array vector type for SQLite
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
 * Create a Payload database adapter using SQLite (libsql/Turso)
 * with optional vector embeddings support
 */
export function createSqliteAdapter(config: PayloadAdapterConfig) {
  const { sqlite, enableVectors, vectorDimensions } = config

  if (!sqlite) {
    throw new Error('SQLite configuration required for SQLite adapter')
  }

  const adapter = sqliteAdapter({
    idType: 'uuid',
    client: {
      url: sqlite.url || 'file:./payload.db',
      syncUrl: sqlite.syncUrl,
      authToken: sqlite.authToken,
    },
    afterSchemaInit:
      enableVectors && vectorDimensions
        ? [
            ({ schema, extendTable }) => {
              // Add vector columns to all collections
              // Collections are determined at runtime from MDX files
              // This will be called for each collection's table
              for (const [tableName, table] of Object.entries(schema.tables)) {
                // Skip internal Payload tables
                if (tableName.startsWith('payload_') || tableName.includes('_rels')) {
                  continue
                }

                extendTable({
                  table: table as any,
                  columns: {
                    embedding: float32Array('embedding', {
                      dimensions: vectorDimensions,
                    }),
                  },
                  extraConfig: (t: any) => ({
                    embedding_index: index(`${tableName}_embedding_idx`).on(t.embedding),
                  }),
                })
              }

              return schema
            },
          ]
        : undefined,
  })

  return adapter
}

/**
 * Helper to add vector support to specific collections
 */
export function addVectorToCollection(collectionSlug: string, dimensions: number = 768) {
  return ({ schema, extendTable }: any) => {
    const table = schema.tables[collectionSlug]
    if (!table) {
      console.warn(`Collection ${collectionSlug} not found for vector support`)
      return schema
    }

    extendTable({
      table,
      columns: {
        embedding: float32Array('embedding', { dimensions }),
      },
      extraConfig: (t: any) => ({
        embedding_index: index(`${collectionSlug}_embedding_idx`).on(t.embedding),
      }),
    })

    return schema
  }
}
