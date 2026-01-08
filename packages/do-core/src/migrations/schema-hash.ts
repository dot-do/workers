/**
 * Schema Hash Computation for Drift Detection
 *
 * Computes deterministic hashes of database schema for detecting
 * unexpected changes (drift) between migrations.
 *
 * @module migrations/schema-hash
 */

import type { SqlStorage } from '../core.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Schema information extracted from SQLite
 */
export interface SchemaInfo {
  /** Tables with their DDL */
  tables: TableInfo[]

  /** Indexes with their DDL */
  indexes: IndexInfo[]

  /** Triggers with their DDL */
  triggers: TriggerInfo[]
}

export interface TableInfo {
  name: string
  sql: string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: boolean
  dflt_value: string | null
  pk: boolean
}

export interface IndexInfo {
  name: string
  tableName: string
  sql: string | null
  unique: boolean
}

export interface TriggerInfo {
  name: string
  tableName: string
  sql: string
}

// ============================================================================
// Schema Extraction
// ============================================================================

/**
 * Extract schema information from SQLite database
 *
 * @param sql - SQL storage interface
 * @param excludeTables - Tables to exclude (e.g., internal tables)
 * @returns Schema information
 */
export function extractSchema(
  sql: SqlStorage,
  excludeTables: string[] = ['_migrations', '_cf_KV']
): SchemaInfo {
  const excludeSet = new Set(excludeTables)

  // Get all tables
  const tablesResult = sql.exec<{ name: string; sql: string }>(
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )

  const tables: TableInfo[] = []
  for (const row of tablesResult) {
    if (excludeSet.has(row.name)) continue

    // Get column info for this table
    const columnsResult = sql.exec<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>(`PRAGMA table_info('${row.name}')`)

    const columns: ColumnInfo[] = columnsResult.toArray().map((col) => ({
      cid: col.cid,
      name: col.name,
      type: col.type,
      notnull: col.notnull === 1,
      dflt_value: col.dflt_value,
      pk: col.pk === 1,
    }))

    tables.push({
      name: row.name,
      sql: normalizeSQL(row.sql),
      columns,
    })
  }

  // Get all indexes
  const indexesResult = sql.exec<{
    name: string
    tbl_name: string
    sql: string | null
    unique: number
  }>(
    `SELECT name, tbl_name, sql,
            (SELECT "unique" FROM pragma_index_list(tbl_name) WHERE name = sqlite_master.name) as "unique"
     FROM sqlite_master
     WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )

  const indexes: IndexInfo[] = []
  for (const row of indexesResult) {
    if (excludeSet.has(row.tbl_name)) continue
    indexes.push({
      name: row.name,
      tableName: row.tbl_name,
      sql: row.sql ? normalizeSQL(row.sql) : null,
      unique: row.unique === 1,
    })
  }

  // Get all triggers
  const triggersResult = sql.exec<{
    name: string
    tbl_name: string
    sql: string
  }>(
    `SELECT name, tbl_name, sql FROM sqlite_master
     WHERE type = 'trigger'
     ORDER BY name`
  )

  const triggers: TriggerInfo[] = []
  for (const row of triggersResult) {
    if (excludeSet.has(row.tbl_name)) continue
    triggers.push({
      name: row.name,
      tableName: row.tbl_name,
      sql: normalizeSQL(row.sql),
    })
  }

  return { tables, indexes, triggers }
}

/**
 * Normalize SQL for consistent hashing
 *
 * Removes whitespace variations and comments
 */
function normalizeSQL(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .toUpperCase()
}

// ============================================================================
// Hash Computation
// ============================================================================

/**
 * Compute a deterministic hash of the schema
 *
 * Uses a simple string-based hash that works in Cloudflare Workers.
 * The hash is computed from a canonical representation of the schema.
 *
 * @param schema - Schema information
 * @returns Hex-encoded hash string
 */
export function computeSchemaHash(schema: SchemaInfo): string {
  // Create canonical representation
  const canonical = createCanonicalRepresentation(schema)

  // Compute hash using djb2 algorithm (simple, fast, deterministic)
  const hash = djb2Hash(canonical)

  // Return as hex string (8 chars for 32-bit hash)
  return hash.toString(16).padStart(8, '0')
}

/**
 * Create canonical string representation of schema
 */
function createCanonicalRepresentation(schema: SchemaInfo): string {
  const parts: string[] = []

  // Add tables
  for (const table of schema.tables) {
    parts.push(`TABLE:${table.name}`)
    for (const col of table.columns) {
      parts.push(
        `  COL:${col.name}:${col.type}:${col.notnull}:${col.pk}:${col.dflt_value ?? 'NULL'}`
      )
    }
  }

  // Add indexes
  for (const index of schema.indexes) {
    parts.push(`INDEX:${index.name}:${index.tableName}:${index.unique}:${index.sql ?? 'AUTO'}`)
  }

  // Add triggers
  for (const trigger of schema.triggers) {
    parts.push(`TRIGGER:${trigger.name}:${trigger.tableName}:${trigger.sql}`)
  }

  return parts.join('\n')
}

/**
 * DJB2 hash algorithm
 *
 * A simple, fast hash algorithm suitable for schema comparison.
 * Not cryptographic, but consistent and collision-resistant enough.
 */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // Convert to unsigned 32-bit
  }
  return hash
}

/**
 * Compute hash directly from SQL storage
 *
 * Convenience function that extracts schema and computes hash.
 *
 * @param sql - SQL storage interface
 * @param excludeTables - Tables to exclude from hash
 * @returns Schema hash as hex string
 */
export function computeSchemaHashFromStorage(
  sql: SqlStorage,
  excludeTables?: string[]
): string {
  const schema = extractSchema(sql, excludeTables)
  return computeSchemaHash(schema)
}

/**
 * Compute a checksum for a migration's content
 *
 * Used to detect if a migration definition has changed.
 *
 * @param sql - SQL statements
 * @param hasUp - Whether migration has an up function
 * @returns Checksum string
 */
export function computeMigrationChecksum(
  sql: string[] | undefined,
  hasUp: boolean
): string {
  const content = [
    ...(sql ?? []).map(normalizeSQL),
    hasUp ? 'HAS_UP_FUNCTION' : 'NO_UP_FUNCTION',
  ].join('|')

  return djb2Hash(content).toString(16).padStart(8, '0')
}

// ============================================================================
// Comparison Functions
// ============================================================================

/**
 * Compare two schema hashes
 *
 * @param expected - Expected hash from migration
 * @param actual - Actual hash from database
 * @returns true if hashes match
 */
export function schemasMatch(expected: string, actual: string): boolean {
  return expected.toLowerCase() === actual.toLowerCase()
}

/**
 * Get detailed schema diff (for debugging)
 *
 * @param expected - Expected schema info
 * @param actual - Actual schema info
 * @returns Description of differences
 */
export function describeSchemaChanges(
  expected: SchemaInfo,
  actual: SchemaInfo
): string[] {
  const changes: string[] = []

  // Compare tables
  const expectedTables = new Map(expected.tables.map((t) => [t.name, t]))
  const actualTables = new Map(actual.tables.map((t) => [t.name, t]))

  for (const [name, table] of expectedTables) {
    if (!actualTables.has(name)) {
      changes.push(`Missing table: ${name}`)
    } else {
      const actualTable = actualTables.get(name)!
      if (table.sql !== actualTable.sql) {
        changes.push(`Table ${name} DDL differs`)
      }
    }
  }

  for (const name of actualTables.keys()) {
    if (!expectedTables.has(name)) {
      changes.push(`Unexpected table: ${name}`)
    }
  }

  // Compare indexes
  const expectedIndexes = new Map(expected.indexes.map((i) => [i.name, i]))
  const actualIndexes = new Map(actual.indexes.map((i) => [i.name, i]))

  for (const [name, index] of expectedIndexes) {
    if (!actualIndexes.has(name)) {
      changes.push(`Missing index: ${name}`)
    } else {
      const actualIndex = actualIndexes.get(name)!
      if (index.sql !== actualIndex.sql) {
        changes.push(`Index ${name} differs`)
      }
    }
  }

  for (const name of actualIndexes.keys()) {
    if (!expectedIndexes.has(name)) {
      changes.push(`Unexpected index: ${name}`)
    }
  }

  return changes
}
