/**
 * RED Phase TDD: Storage Migrations Tests
 *
 * These tests define the contract for storage data migration system.
 * Tests are written first - implementation comes in GREEN phase.
 *
 * The storage migration system provides:
 * - Version tracking in storage metadata
 * - Sequential migration execution
 * - Rollback support
 * - Partial failure recovery
 * - Dry-run capability
 *
 * @module storage-migrations.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// Mock Durable Object Storage Interface
// ============================================================================

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  list<T = unknown>(options?: {
    start?: string
    end?: string
    prefix?: string
    reverse?: boolean
    limit?: number
  }): Promise<Map<string, T>>
}

function createMockStorage(): DurableObjectStorage {
  const store = new Map<string, unknown>()

  return {
    async get<T = unknown>(keyOrKeys: string | string[]): Promise<T | undefined | Map<string, T>> {
      if (Array.isArray(keyOrKeys)) {
        const result = new Map<string, T>()
        for (const key of keyOrKeys) {
          const value = store.get(key)
          if (value !== undefined) {
            result.set(key, value as T)
          }
        }
        return result
      }
      return store.get(keyOrKeys) as T | undefined
    },

    async put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> {
      if (typeof keyOrEntries === 'string') {
        store.set(keyOrEntries, value)
      } else {
        for (const [key, val] of Object.entries(keyOrEntries)) {
          store.set(key, val)
        }
      }
    },

    async delete(keyOrKeys: string | string[]): Promise<boolean | number> {
      if (Array.isArray(keyOrKeys)) {
        let count = 0
        for (const key of keyOrKeys) {
          if (store.delete(key)) count++
        }
        return count
      }
      return store.delete(keyOrKeys)
    },

    async list<T = unknown>(options?: {
      start?: string
      end?: string
      prefix?: string
      reverse?: boolean
      limit?: number
    }): Promise<Map<string, T>> {
      const result = new Map<string, T>()
      const entries = Array.from(store.entries())

      let filtered = entries
      if (options?.prefix) {
        filtered = filtered.filter(([key]) => key.startsWith(options.prefix!))
      }
      if (options?.start) {
        filtered = filtered.filter(([key]) => key >= options.start!)
      }
      if (options?.end) {
        filtered = filtered.filter(([key]) => key < options.end!)
      }

      filtered.sort((a, b) => a[0].localeCompare(b[0]))
      if (options?.reverse) {
        filtered.reverse()
      }

      if (options?.limit) {
        filtered = filtered.slice(0, options.limit)
      }

      for (const [key, value] of filtered) {
        result.set(key, value as T)
      }

      return result
    },
  }
}

// Import types that will be implemented
import type {
  StorageMigration,
  MigrationConfig,
  MigrationResult,
  MigrationStatus,
  StorageMigrationManager,
} from '../src/migrations.js'

// ============================================================================
// Test Suites
// ============================================================================

describe('Storage Migrations', () => {
  let storage: DurableObjectStorage

  beforeEach(() => {
    storage = createMockStorage()
    vi.clearAllMocks()
  })

  describe('Version Tracking', () => {
    it('should get current version from storage', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const version = await manager.getCurrentVersion()
      expect(version).toBe(null) // No version initially
    })

    it('should track schema version after migration', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'initial',
        up: async (storage) => {
          await storage.put('users:count', 0)
        },
        down: async (storage) => {
          await storage.delete('users:count')
        },
      }

      manager.register(migration)
      await manager.migrate()

      const version = await manager.getCurrentVersion()
      expect(version).toBe('2024.01.001')
    })

    it('should handle version format YYYY.MM.NNN', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.03.042',
        name: 'add_feature',
        up: async () => {},
        down: async () => {},
      }

      // Should not throw when registering a valid version format
      expect(() => manager.register(migration)).not.toThrow()
    })
  })

  describe('Migration Registration', () => {
    it('should register migrations', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'initial',
        up: async () => {},
        down: async () => {},
      }

      manager.register(migration)

      const status = await manager.getStatus()
      expect(status).toHaveLength(1)
      expect(status[0].version).toBe('2024.01.001')
    })

    it('should reject duplicate versions', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'initial',
        up: async () => {},
        down: async () => {},
      }

      manager.register(migration)
      expect(() => manager.register(migration)).toThrow('duplicate')
    })

    it('should sort migrations by version', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migrations: StorageMigration[] = [
        { version: '2024.03.001', name: 'third', up: async () => {}, down: async () => {} },
        { version: '2024.01.001', name: 'first', up: async () => {}, down: async () => {} },
        { version: '2024.02.001', name: 'second', up: async () => {}, down: async () => {} },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      const status = await manager.getStatus()
      expect(status[0].version).toBe('2024.01.001')
      expect(status[1].version).toBe('2024.02.001')
      expect(status[2].version).toBe('2024.03.001')
    })
  })

  describe('Migration Execution', () => {
    it('should run pending migrations', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const upSpy = vi.fn()

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'initial',
        up: async (storage) => {
          upSpy()
          await storage.put('initialized', true)
        },
        down: async () => {},
      }

      manager.register(migration)
      const results = await manager.migrate()

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(upSpy).toHaveBeenCalled()
      expect(await storage.get('initialized')).toBe(true)
    })

    it('should run migrations in order', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const order: string[] = []

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.002',
          name: 'second',
          up: async () => {
            order.push('second')
          },
          down: async () => {},
        },
        {
          version: '2024.01.001',
          name: 'first',
          up: async () => {
            order.push('first')
          },
          down: async () => {},
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      await manager.migrate()

      expect(order).toEqual(['first', 'second'])
    })

    it('should skip already applied migrations', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'initial',
        up: async () => {},
        down: async () => {},
      }

      manager.register(migration)

      // Apply once
      await manager.migrate()

      // Apply again - should skip
      const results = await manager.migrate()
      expect(results).toHaveLength(0)
    })

    it('should stop on migration failure', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const secondSpy = vi.fn()

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'failing',
          up: async () => {
            throw new Error('Migration failed')
          },
          down: async () => {},
        },
        {
          version: '2024.01.002',
          name: 'should_not_run',
          up: async () => {
            secondSpy()
          },
          down: async () => {},
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      const results = await manager.migrate()

      expect(results[0].success).toBe(false)
      expect(results[0].error).toBeDefined()
      expect(results).toHaveLength(1) // Only first migration attempted
      expect(secondSpy).not.toHaveBeenCalled()
    })

    it('should record migration duration', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'timed',
        up: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        },
        down: async () => {},
      }

      manager.register(migration)
      const results = await manager.migrate()

      expect(results[0].durationMs).toBeGreaterThan(0)
    })
  })

  describe('Rollback Support', () => {
    it('should rollback last migration', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const downSpy = vi.fn()

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'reversible',
        up: async (storage) => {
          await storage.put('data', 'value')
        },
        down: async (storage) => {
          downSpy()
          await storage.delete('data')
        },
      }

      manager.register(migration)
      await manager.migrate()

      expect(await storage.get('data')).toBe('value')

      await manager.rollback()

      expect(downSpy).toHaveBeenCalled()
      expect(await storage.get('data')).toBeUndefined()
    })

    it('should rollback multiple migrations', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'first',
          up: async (storage) => {
            await storage.put('key1', 'value1')
          },
          down: async (storage) => {
            await storage.delete('key1')
          },
        },
        {
          version: '2024.01.002',
          name: 'second',
          up: async (storage) => {
            await storage.put('key2', 'value2')
          },
          down: async (storage) => {
            await storage.delete('key2')
          },
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      await manager.migrate()

      await manager.rollback(2)

      expect(await storage.get('key1')).toBeUndefined()
      expect(await storage.get('key2')).toBeUndefined()
    })

    it('should rollback to specific version', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'first',
          up: async (storage) => {
            await storage.put('key1', 'value1')
          },
          down: async (storage) => {
            await storage.delete('key1')
          },
        },
        {
          version: '2024.01.002',
          name: 'second',
          up: async (storage) => {
            await storage.put('key2', 'value2')
          },
          down: async (storage) => {
            await storage.delete('key2')
          },
        },
        {
          version: '2024.01.003',
          name: 'third',
          up: async (storage) => {
            await storage.put('key3', 'value3')
          },
          down: async (storage) => {
            await storage.delete('key3')
          },
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      await manager.migrate()

      // Rollback to version 2024.01.001 (keep first, remove second and third)
      await manager.rollbackTo('2024.01.001')

      expect(await storage.get('key1')).toBe('value1')
      expect(await storage.get('key2')).toBeUndefined()
      expect(await storage.get('key3')).toBeUndefined()
    })

    it('should rollback in reverse order', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const order: string[] = []

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'first',
          up: async () => {},
          down: async () => {
            order.push('first')
          },
        },
        {
          version: '2024.01.002',
          name: 'second',
          up: async () => {},
          down: async () => {
            order.push('second')
          },
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      await manager.migrate()
      await manager.rollback(2)

      expect(order).toEqual(['second', 'first'])
    })

    it('should reject rollback when no migrations applied', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      await expect(manager.rollback()).rejects.toThrow('No migrations')
    })
  })

  describe('Dry Run Mode', () => {
    it('should support dry-run without applying changes', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage, { dryRun: true })

      const upSpy = vi.fn()

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'test',
        up: async (storage) => {
          upSpy()
          await storage.put('key', 'value')
        },
        down: async () => {},
      }

      manager.register(migration)
      const results = await manager.migrate()

      expect(results[0].success).toBe(true)
      expect(upSpy).not.toHaveBeenCalled() // Should not execute
      expect(await storage.get('key')).toBeUndefined() // Should not modify storage
    })

    it('should list pending migrations in dry-run', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage, { dryRun: true })

      const migrations: StorageMigration[] = [
        { version: '2024.01.001', name: 'first', up: async () => {}, down: async () => {} },
        { version: '2024.01.002', name: 'second', up: async () => {}, down: async () => {} },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      const results = await manager.migrate()

      expect(results).toHaveLength(2)
      expect(results[0].version).toBe('2024.01.001')
      expect(results[1].version).toBe('2024.01.002')
    })
  })

  describe('Partial Failure Recovery', () => {
    it('should track which migrations succeeded before failure', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'success',
          up: async (storage) => {
            await storage.put('key1', 'value1')
          },
          down: async () => {},
        },
        {
          version: '2024.01.002',
          name: 'failure',
          up: async () => {
            throw new Error('Failed')
          },
          down: async () => {},
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      const results = await manager.migrate()

      // First migration should succeed
      expect(results[0].success).toBe(true)
      expect(await storage.get('key1')).toBe('value1')

      // Second should fail
      expect(results[1].success).toBe(false)

      // Check that first migration is marked as applied
      const status = await manager.getStatus()
      expect(status[0].applied).toBe(true)
      expect(status[1].applied).toBe(false)
    })

    it('should resume from last successful migration', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      // First attempt with failure
      const migrations: StorageMigration[] = [
        {
          version: '2024.01.001',
          name: 'success',
          up: async (storage) => {
            await storage.put('key1', 'value1')
          },
          down: async () => {},
        },
        {
          version: '2024.01.002',
          name: 'initially_fails',
          up: async (storage) => {
            const attempt = (await storage.get<number>('attempt')) || 0
            if (attempt === 0) {
              await storage.put('attempt', 1)
              throw new Error('First attempt fails')
            }
            await storage.put('key2', 'value2')
          },
          down: async () => {},
        },
      ]

      for (const migration of migrations) {
        manager.register(migration)
      }

      // First attempt - second migration fails
      await manager.migrate()

      // Second attempt - should skip first and retry second
      const results = await manager.migrate()

      expect(results).toHaveLength(1) // Only one pending migration
      expect(results[0].version).toBe('2024.01.002')
      expect(results[0].success).toBe(true)
      expect(await storage.get('key2')).toBe('value2')
    })
  })

  describe('Migration Status', () => {
    it('should get status of all migrations', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migrations: StorageMigration[] = [
        { version: '2024.01.001', name: 'applied', up: async () => {}, down: async () => {} },
        { version: '2024.01.002', name: 'pending', up: async () => {}, down: async () => {} },
      ]

      // Register only the first migration initially
      manager.register(migrations[0])

      // Apply the first migration
      await manager.migrate()

      // Now register the second migration (which will be pending)
      manager.register(migrations[1])

      const status = await manager.getStatus()

      expect(status).toHaveLength(2)
      expect(status[0].applied).toBe(true)
      expect(status[0].appliedAt).toBeDefined()
      expect(status[1].applied).toBe(false)
      expect(status[1].appliedAt).toBeUndefined()
    })

    it('should include migration metadata in status', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'with_metadata',
        up: async () => {},
        down: async () => {},
      }

      manager.register(migration)

      const status = await manager.getStatus()

      expect(status[0].version).toBe('2024.01.001')
      expect(status[0].name).toBe('with_metadata')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty migration list', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const results = await manager.migrate()
      expect(results).toHaveLength(0)
    })

    it('should handle migration with no-op up function', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const migration: StorageMigration = {
        version: '2024.01.001',
        name: 'noop',
        up: async () => {},
        down: async () => {},
      }

      manager.register(migration)
      const results = await manager.migrate()

      expect(results[0].success).toBe(true)
    })

    it('should validate version format', async () => {
      const { StorageMigrationManager } = await import('../src/migrations.js')
      const manager = new StorageMigrationManager(storage)

      const invalidMigration: StorageMigration = {
        version: 'invalid',
        name: 'bad',
        up: async () => {},
        down: async () => {},
      }

      expect(() => manager.register(invalidMigration)).toThrow('version format')
    })
  })
})
