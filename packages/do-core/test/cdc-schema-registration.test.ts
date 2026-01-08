/**
 * RED Phase TDD: CDC Mixin Schema Registration Tests
 *
 * These tests verify that the CDC (Change Data Capture) mixin properly
 * registers the cdc_batches table during schema initialization.
 *
 * Issue: workers-e4d9
 * Parent Epic: workers-r99l - CDC Architecture - Remove Code Patching Anti-pattern
 *
 * The CDC mixin should:
 * - Register cdc_batches table when applied to a DO class
 * - Hook into initSchema correctly
 * - Create necessary indexes for efficient batch queries
 * - Support the standard mixin composition pattern
 *
 * RED PHASE: These tests should FAIL initially because the withCDC mixin
 * and schema registration mechanism are not yet implemented.
 *
 * @see workers-e4d9 - RED: Test CDC mixin registers cdc_batches table in schema
 * @see workers-es1c - GREEN: Implement mixin schema registration hook
 * @see workers-r99l - EPIC: CDC Architecture - Remove Code Patching Anti-pattern
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DOCore, type DOState, type DOEnv, type DOStorage, type SqlStorage, type SqlStorageCursor } from '../src/index.js'
import { createMockState, createMockStorage, createMockSqlCursor } from './helpers.js'

// ============================================================================
// Type Definitions for CDC Mixin
// ============================================================================

/**
 * CDC Batch record stored in cdc_batches table
 */
interface CDCBatchRecord {
  /** Unique batch identifier */
  id: string
  /** Source table/entity the changes came from */
  source_table: string
  /** Operation type: insert, update, delete, or mixed */
  operation: 'insert' | 'update' | 'delete' | 'mixed'
  /** JSON-encoded events in this batch */
  events: string
  /** Number of events in this batch */
  event_count: number
  /** Unix timestamp when batch was created */
  created_at: number
  /** Unix timestamp when batch was finalized (null if pending) */
  finalized_at: number | null
  /** Current batch status */
  status: 'pending' | 'finalized' | 'transformed' | 'output'
  /** JSON-encoded metadata about the batch */
  metadata: string | null
}

/**
 * CDC Mixin configuration options
 */
interface CDCMixinConfig {
  /** R2 bucket binding name for CDC output */
  r2Binding?: string
  /** Default compression for Parquet output */
  compression?: 'none' | 'snappy' | 'gzip' | 'zstd'
  /** Path prefix for R2 output */
  pathPrefix?: string
}

/**
 * Interface for classes that use the CDC mixin
 */
interface ICDCMixin {
  /** Create a new CDC batch */
  createCDCBatch(
    sourceTable: string,
    operation: CDCBatchRecord['operation'],
    events?: unknown[]
  ): Promise<CDCBatchRecord>

  /** Get a CDC batch by ID */
  getCDCBatch(batchId: string): Promise<CDCBatchRecord | null>

  /** Query CDC batches */
  queryCDCBatches(query?: {
    sourceTable?: string
    status?: CDCBatchRecord['status']
    limit?: number
  }): Promise<CDCBatchRecord[]>
}

/**
 * Type for classes that have schema registration capability
 */
interface ISchemaRegistry {
  /** Tables registered by mixins */
  readonly registeredTables: string[]
  /** Check if a table is registered */
  hasTable(tableName: string): boolean
  /** Get schema for a registered table */
  getTableSchema(tableName: string): TableSchema | undefined
}

/**
 * Table schema definition
 */
interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
    primaryKey?: boolean
    notNull?: boolean
  }>
  indexes?: Array<{
    name: string
    columns: string[]
    unique?: boolean
  }>
}

// ============================================================================
// Expected CDC Schema
// ============================================================================

/**
 * Expected cdc_batches table schema
 * This defines what the CDC mixin should register
 */
const CDC_BATCHES_TABLE_SCHEMA: TableSchema = {
  name: 'cdc_batches',
  columns: [
    { name: 'id', type: 'TEXT', primaryKey: true },
    { name: 'source_table', type: 'TEXT', notNull: true },
    { name: 'operation', type: 'TEXT', notNull: true },
    { name: 'events', type: 'TEXT', notNull: true },
    { name: 'event_count', type: 'INTEGER', notNull: true },
    { name: 'created_at', type: 'INTEGER', notNull: true },
    { name: 'finalized_at', type: 'INTEGER' },
    { name: 'status', type: 'TEXT', notNull: true },
    { name: 'metadata', type: 'TEXT' },
  ],
  indexes: [
    { name: 'idx_cdc_batches_source', columns: ['source_table'] },
    { name: 'idx_cdc_batches_status', columns: ['status'] },
    { name: 'idx_cdc_batches_created', columns: ['created_at'] },
    { name: 'idx_cdc_batches_source_status', columns: ['source_table', 'status'] },
  ],
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock SQL storage that tracks executed SQL statements
 */
function createTrackingSqlStorage(): SqlStorage & { executedStatements: string[] } {
  const executedStatements: string[] = []

  return {
    executedStatements,
    exec: vi.fn(<T>(_query: string, ..._bindings: unknown[]): SqlStorageCursor<T> => {
      executedStatements.push(_query)
      return createMockSqlCursor<T>([])
    }),
  }
}

/**
 * Create mock storage with SQL tracking
 */
function createMockStorageWithSqlTracking(): DOStorage & { sqlStatements: string[] } {
  const sqlStorage = createTrackingSqlStorage()
  const baseStorage = createMockStorage()

  return {
    ...baseStorage,
    sql: sqlStorage,
    sqlStatements: sqlStorage.executedStatements,
  }
}

// ============================================================================
// Placeholder for withCDC mixin (not yet implemented)
// ============================================================================

/**
 * This import will fail because the withCDC mixin doesn't exist yet.
 * This is intentional for the RED phase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

// Placeholder - this function doesn't exist yet
// The GREEN phase will implement this
function withCDC<TBase extends Constructor<DOCore>>(
  _Base: TBase,
  _config?: CDCMixinConfig
): TBase & Constructor<ICDCMixin> {
  throw new Error('withCDC mixin is not yet implemented - this is expected in RED phase')
}

// ============================================================================
// Tests
// ============================================================================

describe('CDC Mixin Schema Registration', () => {
  let ctx: DOState
  let env: DOEnv
  let storage: DOStorage & { sqlStatements: string[] }

  beforeEach(() => {
    storage = createMockStorageWithSqlTracking()
    ctx = createMockState({ storage })
    env = {}
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('withCDC Mixin Export', () => {
    it('should export withCDC function', async () => {
      // Attempt to dynamically import the CDC mixin module
      // This will fail until the module is created
      try {
        const cdcModule = await import('../src/cdc-mixin.js')
        expect(cdcModule.withCDC).toBeDefined()
        expect(typeof cdcModule.withCDC).toBe('function')
      } catch {
        // Expected to fail in RED phase
        expect.fail('withCDC mixin module does not exist yet - RED phase expected failure')
      }
    })

    it('should be exported from index.ts', async () => {
      try {
        const indexModule = await import('../src/index.js')
        expect((indexModule as Record<string, unknown>).withCDC).toBeDefined()
      } catch {
        expect.fail('withCDC should be exported from index.ts - RED phase expected failure')
      }
    })
  })

  describe('Schema Registration Hook', () => {
    it('should register cdc_batches table when withCDC is applied', () => {
      try {
        // Create a DO class with CDC mixin
        class TestDO extends withCDC(DOCore) {
          constructor(ctx: DOState, env: DOEnv) {
            super(ctx, env)
          }
        }

        const instance = new TestDO(ctx, env) as unknown as ISchemaRegistry

        // Check that cdc_batches table is registered
        expect(instance.hasTable('cdc_batches')).toBe(true)
        expect(instance.registeredTables).toContain('cdc_batches')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should create cdc_batches table during schema initialization', () => {
      try {
        class TestDO extends withCDC(DOCore) {
          async initializeSchema(): Promise<void> {
            // Trigger schema initialization
            await this.createCDCBatch('test', 'insert', [])
          }
        }

        const instance = new TestDO(ctx, env)

        // The CREATE TABLE statement should be in executed SQL
        const createTableStatements = storage.sqlStatements.filter((sql) =>
          sql.toLowerCase().includes('create table') &&
          sql.toLowerCase().includes('cdc_batches')
        )

        expect(createTableStatements.length).toBeGreaterThan(0)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should create cdc_batches table with correct schema', () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env) as unknown as ISchemaRegistry
        const schema = instance.getTableSchema('cdc_batches')

        expect(schema).toBeDefined()
        expect(schema?.name).toBe('cdc_batches')

        // Verify required columns exist
        const columnNames = schema?.columns.map((c) => c.name) ?? []
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('source_table')
        expect(columnNames).toContain('operation')
        expect(columnNames).toContain('events')
        expect(columnNames).toContain('event_count')
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('finalized_at')
        expect(columnNames).toContain('status')
        expect(columnNames).toContain('metadata')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should create indexes for cdc_batches table', () => {
      try {
        class TestDO extends withCDC(DOCore) {
          async triggerSchemaInit(): Promise<void> {
            await this.createCDCBatch('test', 'insert', [])
          }
        }

        new TestDO(ctx, env)

        // Check for CREATE INDEX statements
        const indexStatements = storage.sqlStatements.filter((sql) =>
          sql.toLowerCase().includes('create index') &&
          sql.toLowerCase().includes('cdc_batches')
        )

        // Should have at least the expected indexes
        expect(indexStatements.length).toBeGreaterThanOrEqual(CDC_BATCHES_TABLE_SCHEMA.indexes!.length)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })
  })

  describe('Lazy Schema Initialization', () => {
    it('should not create schema on DO construction', () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        new TestDO(ctx, env)

        // No SQL should have been executed yet
        const cdcTableCreates = storage.sqlStatements.filter((sql) =>
          sql.toLowerCase().includes('cdc_batches')
        )

        expect(cdcTableCreates).toHaveLength(0)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should initialize schema on first CDC operation', async () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env)

        // Before any operation - no schema
        expect(storage.sqlStatements.filter((s) => s.includes('cdc_batches'))).toHaveLength(0)

        // First CDC operation triggers schema init
        await instance.createCDCBatch('users', 'insert', [])

        // After operation - schema created
        const cdcStatements = storage.sqlStatements.filter((s) => s.includes('cdc_batches'))
        expect(cdcStatements.length).toBeGreaterThan(0)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should only initialize schema once', async () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env)

        // Multiple CDC operations
        await instance.createCDCBatch('users', 'insert', [])
        await instance.createCDCBatch('orders', 'update', [])
        await instance.createCDCBatch('products', 'delete', [])

        // Count CREATE TABLE statements for cdc_batches
        const createStatements = storage.sqlStatements.filter(
          (sql) =>
            sql.toLowerCase().includes('create table') &&
            sql.toLowerCase().includes('cdc_batches')
        )

        // Should only have one CREATE TABLE statement
        expect(createStatements).toHaveLength(1)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })
  })

  describe('Mixin Composition', () => {
    it('should work with DOCore as base class', () => {
      try {
        class CDCEnabledDO extends withCDC(DOCore) {}

        const instance = new CDCEnabledDO(ctx, env)

        // Should have both DOCore methods and CDC methods
        expect(typeof instance.fetch).toBe('function')
        expect(typeof instance.alarm).toBe('function')
        expect(typeof instance.createCDCBatch).toBe('function')
        expect(typeof instance.getCDCBatch).toBe('function')
        expect(typeof instance.queryCDCBatches).toBe('function')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should preserve base class methods', () => {
      try {
        class CustomDO extends DOCore {
          customMethod(): string {
            return 'custom'
          }
        }

        class CDCCustomDO extends withCDC(CustomDO) {}

        const instance = new CDCCustomDO(ctx, env) as unknown as {
          customMethod(): string
          createCDCBatch: ICDCMixin['createCDCBatch']
        }

        expect(typeof instance.customMethod).toBe('function')
        expect(instance.customMethod()).toBe('custom')
        expect(typeof instance.createCDCBatch).toBe('function')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should work with configuration options', () => {
      try {
        class ConfiguredCDCDO extends withCDC(DOCore, {
          r2Binding: 'CDC_BUCKET',
          compression: 'snappy',
          pathPrefix: 'cdc-data',
        }) {}

        const instance = new ConfiguredCDCDO(ctx, env)

        // Configuration should be stored and accessible
        expect(instance).toBeDefined()
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })
  })

  describe('CDC Operations', () => {
    it('should create a CDC batch', async () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env)

        const batch = await instance.createCDCBatch('users', 'insert', [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ])

        expect(batch).toBeDefined()
        expect(batch.id).toBeDefined()
        expect(batch.source_table).toBe('users')
        expect(batch.operation).toBe('insert')
        expect(batch.event_count).toBe(2)
        expect(batch.status).toBe('pending')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should get a CDC batch by ID', async () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env)

        const created = await instance.createCDCBatch('orders', 'update', [])
        const retrieved = await instance.getCDCBatch(created.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe(created.id)
        expect(retrieved?.source_table).toBe('orders')
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })

    it('should query CDC batches', async () => {
      try {
        class TestDO extends withCDC(DOCore) {}

        const instance = new TestDO(ctx, env)

        await instance.createCDCBatch('users', 'insert', [])
        await instance.createCDCBatch('users', 'update', [])
        await instance.createCDCBatch('orders', 'insert', [])

        const userBatches = await instance.queryCDCBatches({ sourceTable: 'users' })
        expect(userBatches).toHaveLength(2)

        const pendingBatches = await instance.queryCDCBatches({ status: 'pending' })
        expect(pendingBatches).toHaveLength(3)
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })
  })

  describe('Integration with LazySchemaManager', () => {
    it('should work with LazySchemaManager for schema initialization', async () => {
      try {
        // Import LazySchemaManager to verify integration
        const { LazySchemaManager } = await import('../src/schema.js')

        class TestDO extends withCDC(DOCore) {
          getSchemaManager(): InstanceType<typeof LazySchemaManager> | undefined {
            // The mixin should expose or use a LazySchemaManager internally
            return (this as unknown as { _schemaManager?: InstanceType<typeof LazySchemaManager> })._schemaManager
          }
        }

        const instance = new TestDO(ctx, env)
        const manager = instance.getSchemaManager()

        // The schema manager should exist and handle CDC table
        expect(manager).toBeDefined()
      } catch {
        expect.fail('withCDC mixin is not implemented - RED phase expected failure')
      }
    })
  })
})

describe('CDC Schema Definition', () => {
  describe('cdc_batches table structure', () => {
    it('should have expected columns', () => {
      const expectedColumns = [
        'id',
        'source_table',
        'operation',
        'events',
        'event_count',
        'created_at',
        'finalized_at',
        'status',
        'metadata',
      ]

      const actualColumns = CDC_BATCHES_TABLE_SCHEMA.columns.map((c) => c.name)

      for (const col of expectedColumns) {
        expect(actualColumns).toContain(col)
      }
    })

    it('should have id as primary key', () => {
      const idColumn = CDC_BATCHES_TABLE_SCHEMA.columns.find((c) => c.name === 'id')
      expect(idColumn?.primaryKey).toBe(true)
    })

    it('should have required NOT NULL columns', () => {
      const notNullColumns = ['id', 'source_table', 'operation', 'events', 'event_count', 'created_at', 'status']

      for (const colName of notNullColumns) {
        const column = CDC_BATCHES_TABLE_SCHEMA.columns.find((c) => c.name === colName)
        expect(column, `Column ${colName} should exist`).toBeDefined()
        // Primary key implies NOT NULL
        if (!column?.primaryKey) {
          expect(column?.notNull, `Column ${colName} should be NOT NULL`).toBe(true)
        }
      }
    })

    it('should have expected indexes', () => {
      const expectedIndexes = [
        'idx_cdc_batches_source',
        'idx_cdc_batches_status',
        'idx_cdc_batches_created',
        'idx_cdc_batches_source_status',
      ]

      const actualIndexNames = CDC_BATCHES_TABLE_SCHEMA.indexes?.map((i) => i.name) ?? []

      for (const indexName of expectedIndexes) {
        expect(actualIndexNames).toContain(indexName)
      }
    })
  })
})
