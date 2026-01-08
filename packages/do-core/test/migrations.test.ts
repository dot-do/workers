/**
 * Schema Migration System Tests
 *
 * Tests for the forward-only schema migration system including:
 * - Migration registry
 * - Migration runner with single-flight execution
 * - Schema hash computation and drift detection
 * - Migration mixin for DOCore
 *
 * @module migrations.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DOState, DOStorage, SqlStorage, SqlStorageCursor } from '../src/index.js'
import { createMockState, createMockStorage, createMockSqlCursor } from './helpers.js'

// Import migration system
import {
  registerMigrations,
  getMigrations,
  getRegisteredTypes,
  hasMigrations,
  getLatestVersion,
  getPendingMigrations,
  clearRegistry,
  unregisterMigrations,
  migrations,
  MigrationBuilder,
  MigrationRunner,
  createMigrationRunner,
  MigrationMixin,
  MigratableDO,
  defineMigrations,
  isMigratableType,
  computeSchemaHash,
  computeMigrationChecksum,
  schemasMatch,
  MigrationError,
  InvalidMigrationVersionError,
  SchemaDriftError,
} from '../src/migrations/index.js'
import type {
  Migration,
  MigrationDefinition,
  SchemaInfo,
} from '../src/migrations/index.js'

// ============================================================================
// Enhanced Mock Helpers
// ============================================================================

interface MockSqlData {
  queries: Array<{ sql: string; bindings: unknown[] }>
  tables: Map<string, unknown[]>
  migrations: Map<number, { version: number; name: string; applied_at: number; duration_ms: number; schema_hash: string; migration_checksum: string }>
}

function createMockSqlStorageWithTracking(): SqlStorage & { _data: MockSqlData } {
  const data: MockSqlData = {
    queries: [],
    tables: new Map(),
    migrations: new Map(),
  }

  const exec = vi.fn(<T>(query: string, ...bindings: unknown[]): SqlStorageCursor<T> => {
    data.queries.push({ sql: query, bindings })

    const lowerQuery = query.toLowerCase().trim()

    // Handle CREATE TABLE
    if (lowerQuery.startsWith('create table')) {
      const match = query.match(/create table (?:if not exists )?(\w+)/i)
      if (match) {
        data.tables.set(match[1]!, [])
      }
      return createMockSqlCursor<T>([])
    }

    // Handle CREATE INDEX
    if (lowerQuery.startsWith('create index') || lowerQuery.startsWith('create unique index')) {
      return createMockSqlCursor<T>([])
    }

    // Handle INSERT into _migrations
    if (lowerQuery.includes('insert into _migrations')) {
      const [version, name, applied_at, duration_ms, schema_hash, migration_checksum] = bindings as [number, string, number, number, string, string]
      data.migrations.set(version, { version, name, applied_at, duration_ms, schema_hash, migration_checksum })
      return createMockSqlCursor<T>([])
    }

    // Handle SELECT MAX(version) from _migrations
    if (lowerQuery.includes('max(version)') && lowerQuery.includes('_migrations')) {
      const versions = Array.from(data.migrations.keys())
      const maxVersion = versions.length > 0 ? Math.max(...versions) : null
      return createMockSqlCursor<T>([{ version: maxVersion } as T])
    }

    // Handle SELECT * from _migrations ORDER BY version DESC LIMIT 1
    if (lowerQuery.includes('from _migrations') && lowerQuery.includes('order by version desc')) {
      const sorted = Array.from(data.migrations.values()).sort((a, b) => b.version - a.version)
      return createMockSqlCursor<T>(sorted.slice(0, 1) as T[])
    }

    // Handle SELECT * from _migrations ORDER BY version ASC
    if (lowerQuery.includes('from _migrations') && lowerQuery.includes('order by version asc')) {
      const sorted = Array.from(data.migrations.values()).sort((a, b) => a.version - b.version)
      return createMockSqlCursor<T>(sorted as T[])
    }

    // Handle SELECT from sqlite_master (for schema extraction)
    if (lowerQuery.includes('sqlite_master')) {
      // Return empty for mock
      return createMockSqlCursor<T>([])
    }

    // Handle PRAGMA
    if (lowerQuery.startsWith('pragma')) {
      return createMockSqlCursor<T>([])
    }

    return createMockSqlCursor<T>([])
  })

  return {
    exec,
    _data: data,
  }
}

function createMockStateWithSqlTracking(): DOState & { _sqlData: MockSqlData } {
  const sqlStorage = createMockSqlStorageWithTracking()
  const storage = createMockStorage()
  ;(storage as DOStorage & { sql: SqlStorage }).sql = sqlStorage

  const state = createMockState()
  ;(state as DOState).storage = storage as DOStorage

  return {
    ...state,
    storage: storage as DOStorage,
    _sqlData: sqlStorage._data,
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Migration Registry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  afterEach(() => {
    clearRegistry()
  })

  describe('registerMigrations', () => {
    it('should register migrations for a DO type', () => {
      const defs: MigrationDefinition[] = [
        { name: 'initial', sql: ['CREATE TABLE test (id TEXT PRIMARY KEY)'] },
      ]

      registerMigrations('TestDO', defs)

      expect(hasMigrations('TestDO')).toBe(true)
    })

    it('should assign version numbers automatically', () => {
      registerMigrations('TestDO', [
        { name: 'first', sql: ['CREATE TABLE a (id TEXT PRIMARY KEY)'] },
        { name: 'second', sql: ['CREATE TABLE b (id TEXT PRIMARY KEY)'] },
        { name: 'third', sql: ['CREATE TABLE c (id TEXT PRIMARY KEY)'] },
      ])

      const registered = getMigrations('TestDO')
      expect(registered?.migrations[0]?.version).toBe(1)
      expect(registered?.migrations[1]?.version).toBe(2)
      expect(registered?.migrations[2]?.version).toBe(3)
    })

    it('should reject empty DO type', () => {
      expect(() => registerMigrations('', [{ name: 'test', sql: ['SELECT 1'] }]))
        .toThrow('DO type cannot be empty')
    })

    it('should reject empty migration name', () => {
      expect(() => registerMigrations('TestDO', [{ name: '', sql: ['SELECT 1'] }]))
        .toThrow('must have a name')
    })

    it('should reject migration without sql or up function', () => {
      expect(() => registerMigrations('TestDO', [{ name: 'empty' }]))
        .toThrow('must have sql or up function')
    })

    it('should reject non-sequential versions', () => {
      expect(() => registerMigrations('TestDO', [
        { version: 1, name: 'first', sql: ['SELECT 1'] },
        { version: 3, name: 'third', sql: ['SELECT 1'] }, // Skipped v2
      ])).toThrow('must be sequential')
    })

    it('should reject duplicate versions', () => {
      expect(() => registerMigrations('TestDO', [
        { version: 1, name: 'first', sql: ['SELECT 1'] },
        { version: 1, name: 'duplicate', sql: ['SELECT 2'] },
      ])).toThrow('Duplicate migration version')
    })

    it('should reject negative versions', () => {
      expect(() => registerMigrations('TestDO', [
        { version: -1, name: 'negative', sql: ['SELECT 1'] },
      ])).toThrow('must be positive')
    })
  })

  describe('getMigrations', () => {
    it('should return registered migrations', () => {
      registerMigrations('TestDO', [
        { name: 'initial', sql: ['CREATE TABLE test (id TEXT)'] },
      ])

      const registered = getMigrations('TestDO')
      expect(registered).toBeDefined()
      expect(registered?.doType).toBe('TestDO')
      expect(registered?.migrations).toHaveLength(1)
    })

    it('should return undefined for unregistered type', () => {
      expect(getMigrations('UnknownDO')).toBeUndefined()
    })
  })

  describe('getRegisteredTypes', () => {
    it('should return all registered DO types', () => {
      registerMigrations('DO1', [{ name: 'a', sql: ['SELECT 1'] }])
      registerMigrations('DO2', [{ name: 'b', sql: ['SELECT 2'] }])

      const types = getRegisteredTypes()
      expect(types).toContain('DO1')
      expect(types).toContain('DO2')
      expect(types).toHaveLength(2)
    })

    it('should return empty array when no registrations', () => {
      expect(getRegisteredTypes()).toEqual([])
    })
  })

  describe('getLatestVersion', () => {
    it('should return latest version number', () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
        { name: 'v3', sql: ['SELECT 3'] },
      ])

      expect(getLatestVersion('TestDO')).toBe(3)
    })

    it('should return 0 for unregistered type', () => {
      expect(getLatestVersion('Unknown')).toBe(0)
    })
  })

  describe('getPendingMigrations', () => {
    it('should return all migrations when fromVersion is 0', () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
      ])

      const pending = getPendingMigrations('TestDO', 0)
      expect(pending).toHaveLength(2)
    })

    it('should return only pending migrations', () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
        { name: 'v3', sql: ['SELECT 3'] },
      ])

      const pending = getPendingMigrations('TestDO', 2)
      expect(pending).toHaveLength(1)
      expect(pending[0]?.version).toBe(3)
    })

    it('should return empty array when all applied', () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
      ])

      expect(getPendingMigrations('TestDO', 1)).toEqual([])
    })
  })

  describe('clearRegistry / unregisterMigrations', () => {
    it('should clear all registrations', () => {
      registerMigrations('DO1', [{ name: 'a', sql: ['SELECT 1'] }])
      registerMigrations('DO2', [{ name: 'b', sql: ['SELECT 2'] }])

      clearRegistry()

      expect(getRegisteredTypes()).toEqual([])
    })

    it('should unregister specific DO type', () => {
      registerMigrations('DO1', [{ name: 'a', sql: ['SELECT 1'] }])
      registerMigrations('DO2', [{ name: 'b', sql: ['SELECT 2'] }])

      const result = unregisterMigrations('DO1')

      expect(result).toBe(true)
      expect(hasMigrations('DO1')).toBe(false)
      expect(hasMigrations('DO2')).toBe(true)
    })
  })

  describe('MigrationBuilder', () => {
    it('should provide fluent API for registration', () => {
      migrations('FluentDO')
        .sql('create_users', ['CREATE TABLE users (id TEXT PRIMARY KEY)'])
        .sql('create_posts', ['CREATE TABLE posts (id TEXT PRIMARY KEY)'])
        .register()

      expect(hasMigrations('FluentDO')).toBe(true)
      expect(getLatestVersion('FluentDO')).toBe(2)
    })

    it('should support programmatic migrations', () => {
      const upFn = vi.fn()

      migrations('ProgrammaticDO')
        .up('seed_data', upFn)
        .register()

      expect(hasMigrations('ProgrammaticDO')).toBe(true)
      const registered = getMigrations('ProgrammaticDO')
      expect(registered?.migrations[0]?.up).toBe(upFn)
    })

    it('should support config overrides', () => {
      migrations('ConfigDO')
        .sql('initial', ['SELECT 1'])
        .withConfig({ migrationsTable: '_custom_migrations' })
        .register()

      const registered = getMigrations('ConfigDO')
      expect(registered?.config?.migrationsTable).toBe('_custom_migrations')
    })
  })
})

describe('Migration Runner', () => {
  let ctx: DOState & { _sqlData: MockSqlData }

  beforeEach(() => {
    clearRegistry()
    ctx = createMockStateWithSqlTracking()
  })

  afterEach(() => {
    clearRegistry()
  })

  describe('Basic Execution', () => {
    it('should run pending migrations', async () => {
      registerMigrations('TestDO', [
        { name: 'create_users', sql: ['CREATE TABLE users (id TEXT PRIMARY KEY)'] },
        { name: 'create_posts', sql: ['CREATE TABLE posts (id TEXT PRIMARY KEY)'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      const result = await runner.run()

      expect(result.applied).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]?.success).toBe(true)
      expect(result.results[1]?.success).toBe(true)
    })

    it('should create _migrations table', async () => {
      registerMigrations('TestDO', [
        { name: 'initial', sql: ['SELECT 1'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      await runner.run()

      const createTableQuery = ctx._sqlData.queries.find(q =>
        q.sql.toLowerCase().includes('create table') &&
        q.sql.toLowerCase().includes('_migrations')
      )
      expect(createTableQuery).toBeDefined()
    })

    it('should record applied migrations', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      await runner.run()

      expect(ctx._sqlData.migrations.size).toBe(2)
      expect(ctx._sqlData.migrations.has(1)).toBe(true)
      expect(ctx._sqlData.migrations.has(2)).toBe(true)
    })

    it('should track current version', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      await runner.run()

      const version = await runner.getCurrentVersion()
      expect(version).toBe(2)
    })
  })

  describe('Idempotency', () => {
    it('should not re-run applied migrations', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['CREATE TABLE test (id TEXT)'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      // First run
      const result1 = await runner.run()
      expect(result1.applied).toBe(1)

      // Second run (no cache invalidation)
      const result2 = await runner.run()
      expect(result2.applied).toBe(0)
    })
  })

  describe('Single-Flight Execution', () => {
    it('should share promise for concurrent calls', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      // Start multiple concurrent runs
      const promises = [
        runner.run(),
        runner.run(),
        runner.run(),
      ]

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.failed).toBe(0)
      })
    })
  })

  describe('Status Tracking', () => {
    it('should report migration status', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
        { name: 'v3', sql: ['SELECT 3'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      // Apply first migration manually by running and checking
      const result = await runner.run()
      expect(result.applied).toBe(3)

      const status = await runner.getStatus()

      expect(status.doType).toBe('TestDO')
      expect(status.currentVersion).toBe(3)
      expect(status.latestVersion).toBe(3)
      expect(status.pendingCount).toBe(0)
      expect(status.pendingVersions).toEqual([])
    })

    it('should detect pending migrations', async () => {
      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      const hasPending = await runner.hasPendingMigrations()
      expect(hasPending).toBe(true)
    })
  })

  describe('Programmatic Migrations', () => {
    it('should execute up function', async () => {
      const upFn = vi.fn()

      registerMigrations('TestDO', [
        {
          name: 'programmatic',
          up: upFn,
        },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      await runner.run()

      expect(upFn).toHaveBeenCalled()
      expect(upFn).toHaveBeenCalledWith(
        ctx.storage.sql,
        expect.objectContaining({
          version: 1,
          doType: 'TestDO',
        })
      )
    })

    it('should execute SQL before up function', async () => {
      const callOrder: string[] = []

      registerMigrations('TestDO', [
        {
          name: 'combined',
          sql: ['SELECT 1'],
          up: () => { callOrder.push('up') },
        },
      ])

      // Spy on exec to track SQL execution order
      const originalExec = ctx.storage.sql.exec
      ctx.storage.sql.exec = vi.fn((...args: unknown[]) => {
        const sql = args[0] as string
        if (sql.includes('SELECT 1')) {
          callOrder.push('sql')
        }
        return (originalExec as typeof ctx.storage.sql.exec)(...args as Parameters<typeof originalExec>)
      })

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      await runner.run()

      expect(callOrder).toEqual(['sql', 'up'])
    })
  })

  describe('Hooks', () => {
    it('should call onBeforeMigration hook', async () => {
      const beforeHook = vi.fn()

      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
        config: { onBeforeMigration: beforeHook },
      })

      await runner.run()

      expect(beforeHook).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'v1', version: 1 })
      )
    })

    it('should call onAfterMigration hook', async () => {
      const afterHook = vi.fn()

      registerMigrations('TestDO', [
        { name: 'v1', sql: ['SELECT 1'] },
      ])

      const runner = createMigrationRunner({
        doType: 'TestDO',
        sql: ctx.storage.sql,
        state: ctx,
        config: { onAfterMigration: afterHook },
      })

      await runner.run()

      expect(afterHook).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          name: 'v1',
          success: true,
        })
      )
    })
  })
})

describe('Schema Hash', () => {
  describe('computeSchemaHash', () => {
    it('should compute consistent hash for same schema', () => {
      const schema: SchemaInfo = {
        tables: [
          {
            name: 'users',
            sql: 'CREATE TABLE users (id TEXT PRIMARY KEY)',
            columns: [
              { cid: 0, name: 'id', type: 'TEXT', notnull: false, dflt_value: null, pk: true },
            ],
          },
        ],
        indexes: [],
        triggers: [],
      }

      const hash1 = computeSchemaHash(schema)
      const hash2 = computeSchemaHash(schema)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should produce different hash for different schemas', () => {
      const schema1: SchemaInfo = {
        tables: [
          {
            name: 'users',
            sql: 'CREATE TABLE users (id TEXT)',
            columns: [{ cid: 0, name: 'id', type: 'TEXT', notnull: false, dflt_value: null, pk: false }],
          },
        ],
        indexes: [],
        triggers: [],
      }

      const schema2: SchemaInfo = {
        tables: [
          {
            name: 'posts',
            sql: 'CREATE TABLE posts (id TEXT)',
            columns: [{ cid: 0, name: 'id', type: 'TEXT', notnull: false, dflt_value: null, pk: false }],
          },
        ],
        indexes: [],
        triggers: [],
      }

      expect(computeSchemaHash(schema1)).not.toBe(computeSchemaHash(schema2))
    })
  })

  describe('computeMigrationChecksum', () => {
    it('should compute checksum for SQL migrations', () => {
      const checksum = computeMigrationChecksum(
        ['CREATE TABLE users (id TEXT PRIMARY KEY)'],
        false
      )

      expect(checksum).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should include up function presence in checksum', () => {
      const withUp = computeMigrationChecksum(['SELECT 1'], true)
      const withoutUp = computeMigrationChecksum(['SELECT 1'], false)

      expect(withUp).not.toBe(withoutUp)
    })

    it('should be consistent for same content', () => {
      const sql = ['CREATE TABLE test (id TEXT)']
      const c1 = computeMigrationChecksum(sql, false)
      const c2 = computeMigrationChecksum(sql, false)

      expect(c1).toBe(c2)
    })
  })

  describe('schemasMatch', () => {
    it('should match identical hashes', () => {
      expect(schemasMatch('abc123', 'abc123')).toBe(true)
    })

    it('should match case-insensitively', () => {
      expect(schemasMatch('ABC123', 'abc123')).toBe(true)
    })

    it('should not match different hashes', () => {
      expect(schemasMatch('abc123', 'def456')).toBe(false)
    })
  })
})

describe('Migration Mixin', () => {
  let ctx: DOState & { _sqlData: MockSqlData }

  beforeEach(() => {
    clearRegistry()
    ctx = createMockStateWithSqlTracking()
  })

  afterEach(() => {
    clearRegistry()
  })

  describe('MigratableDO', () => {
    it('should provide migration methods', async () => {
      registerMigrations('TestMigratableDO', [
        { name: 'initial', sql: ['CREATE TABLE test (id TEXT)'] },
      ])

      class TestDO extends MigratableDO {
        getDoType() { return 'TestMigratableDO' }
      }

      const instance = new TestDO(ctx, {})

      expect(instance.isMigrated()).toBe(false)

      await instance.ensureMigrated()

      expect(instance.isMigrated()).toBe(true)
    })

    it('should run migrations only once', async () => {
      let migrationCount = 0

      registerMigrations('CountingDO', [
        {
          name: 'count',
          sql: ['SELECT 1'],
          up: () => { migrationCount++ },
        },
      ])

      class CountingTestDO extends MigratableDO {
        getDoType() { return 'CountingDO' }
      }

      const instance = new CountingTestDO(ctx, {})

      await instance.ensureMigrated()
      await instance.ensureMigrated()
      await instance.ensureMigrated()

      expect(migrationCount).toBe(1)
    })

    it('should provide migration status', async () => {
      registerMigrations('StatusDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2', sql: ['SELECT 2'] },
      ])

      class StatusTestDO extends MigratableDO {
        getDoType() { return 'StatusDO' }
      }

      const instance = new StatusTestDO(ctx, {})
      await instance.ensureMigrated()

      const status = await instance.getMigrationStatus()

      expect(status.currentVersion).toBe(2)
      expect(status.latestVersion).toBe(2)
      expect(status.pendingCount).toBe(0)
    })
  })

  describe('defineMigrations', () => {
    it('should register migrations', () => {
      defineMigrations('DefinedDO', [
        { name: 'initial', sql: ['SELECT 1'] },
      ])

      expect(isMigratableType('DefinedDO')).toBe(true)
    })
  })
})

describe('Error Handling', () => {
  let ctx: DOState & { _sqlData: MockSqlData }

  beforeEach(() => {
    clearRegistry()
    ctx = createMockStateWithSqlTracking()
  })

  afterEach(() => {
    clearRegistry()
  })

  describe('Migration Errors', () => {
    it('should report SQL errors in result', async () => {
      registerMigrations('ErrorDO', [
        { name: 'bad_sql', sql: ['INVALID SQL SYNTAX'] },
      ])

      // Make exec throw for invalid SQL
      const originalExec = ctx.storage.sql.exec
      ctx.storage.sql.exec = vi.fn((...args: unknown[]) => {
        const sql = args[0] as string
        if (sql.includes('INVALID SQL')) {
          throw new Error('SQL syntax error')
        }
        return (originalExec as typeof ctx.storage.sql.exec)(...args as Parameters<typeof originalExec>)
      })

      const runner = createMigrationRunner({
        doType: 'ErrorDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      const result = await runner.run()

      expect(result.failed).toBe(1)
      expect(result.results[0]?.success).toBe(false)
      expect(result.results[0]?.error).toBeDefined()
      expect(result.results[0]?.error?.message).toContain('SQL')
    })

    it('should stop on first failure', async () => {
      registerMigrations('StopOnErrorDO', [
        { name: 'v1', sql: ['SELECT 1'] },
        { name: 'v2_fails', sql: ['INVALID'] },
        { name: 'v3', sql: ['SELECT 3'] },
      ])

      const originalExec = ctx.storage.sql.exec
      ctx.storage.sql.exec = vi.fn((...args: unknown[]) => {
        const sql = args[0] as string
        if (sql.includes('INVALID')) {
          throw new Error('SQL error')
        }
        return (originalExec as typeof ctx.storage.sql.exec)(...args as Parameters<typeof originalExec>)
      })

      const runner = createMigrationRunner({
        doType: 'StopOnErrorDO',
        sql: ctx.storage.sql,
        state: ctx,
      })

      const result = await runner.run()

      expect(result.applied).toBe(1) // Only v1 succeeded
      expect(result.failed).toBe(1) // v2 failed
      expect(result.results).toHaveLength(2) // v3 never attempted
    })
  })

  describe('Error Classes', () => {
    it('should create MigrationError', () => {
      const error = new MigrationError('test error', 5)
      expect(error.message).toBe('test error')
      expect(error.version).toBe(5)
      expect(error.name).toBe('MigrationError')
    })

    it('should create InvalidMigrationVersionError', () => {
      const error = new InvalidMigrationVersionError(3, 'bad version')
      expect(error.message).toBe('bad version')
      expect(error.version).toBe(3)
      expect(error.name).toBe('InvalidMigrationVersionError')
    })

    it('should create SchemaDriftError', () => {
      const drift = {
        expected: 'abc123',
        actual: 'def456',
        detectedAtVersion: 2,
        description: 'Schema changed',
      }
      const error = new SchemaDriftError(drift)
      expect(error.drift).toBe(drift)
      expect(error.message).toContain('abc123')
      expect(error.message).toContain('def456')
      expect(error.name).toBe('SchemaDriftError')
    })
  })
})

describe('Integration Tests', () => {
  let ctx: DOState & { _sqlData: MockSqlData }

  beforeEach(() => {
    clearRegistry()
    ctx = createMockStateWithSqlTracking()
  })

  afterEach(() => {
    clearRegistry()
  })

  it('should handle complete migration workflow', async () => {
    // Define migrations
    defineMigrations('WorkflowDO', [
      {
        name: 'create_tables',
        sql: [
          'CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL)',
          'CREATE TABLE posts (id TEXT PRIMARY KEY, user_id TEXT, title TEXT)',
        ],
      },
      {
        name: 'add_indexes',
        sql: [
          'CREATE INDEX idx_posts_user ON posts (user_id)',
        ],
      },
      {
        name: 'seed_data',
        up: (sql) => {
          sql.exec("INSERT INTO users (id, email) VALUES ('1', 'test@example.com')")
        },
      },
    ])

    // Create DO instance
    class WorkflowTestDO extends MigratableDO {
      getDoType() { return 'WorkflowDO' }
    }

    const instance = new WorkflowTestDO(ctx, {})

    // Check initial state
    expect(instance.isMigrated()).toBe(false)
    expect(await instance.hasPendingMigrations()).toBe(true)

    // Run migrations
    const result = await instance.ensureMigrated()

    // Verify results
    expect(result.applied).toBe(3)
    expect(result.failed).toBe(0)
    expect(instance.isMigrated()).toBe(true)

    // Check final status
    const status = await instance.getMigrationStatus()
    expect(status.currentVersion).toBe(3)
    expect(status.pendingCount).toBe(0)

    // Verify tables were created
    expect(ctx._sqlData.tables.has('users')).toBe(true)
    expect(ctx._sqlData.tables.has('posts')).toBe(true)
  })

  it('should handle multiple DO types independently', async () => {
    defineMigrations('UserDO', [
      { name: 'create_users', sql: ['CREATE TABLE users (id TEXT)'] },
    ])

    defineMigrations('PostDO', [
      { name: 'create_posts', sql: ['CREATE TABLE posts (id TEXT)'] },
      { name: 'add_content', sql: ['ALTER TABLE posts ADD COLUMN content TEXT'] },
    ])

    class UserTestDO extends MigratableDO {
      getDoType() { return 'UserDO' }
    }

    class PostTestDO extends MigratableDO {
      getDoType() { return 'PostDO' }
    }

    const userCtx = createMockStateWithSqlTracking()
    const postCtx = createMockStateWithSqlTracking()

    const userDO = new UserTestDO(userCtx, {})
    const postDO = new PostTestDO(postCtx, {})

    await userDO.ensureMigrated()
    await postDO.ensureMigrated()

    const userStatus = await userDO.getMigrationStatus()
    const postStatus = await postDO.getMigrationStatus()

    expect(userStatus.currentVersion).toBe(1)
    expect(postStatus.currentVersion).toBe(2)
  })
})
