/**
 * RED Tests: database.do Transaction Handling
 *
 * These tests define the contract for the database.do worker's transaction support.
 * The DatabaseDO must support atomic transactions with proper isolation.
 *
 * Per ARCHITECTURE.md:
 * - WAL Manager for durability (lines 1456-1465)
 * - Transaction support in storage (line 171-175)
 * - Durable execution with retry (lines 1749-1769)
 *
 * RED PHASE: These tests MUST FAIL because DatabaseDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-c00u).
 *
 * @see ARCHITECTURE.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockDatabaseEnv } from './helpers.js'

/**
 * Interface definition for DatabaseDO transaction operations
 */
interface DatabaseDOTransactionContract {
  // Core CRUD (inherited)
  get<T>(collection: string, id: string): Promise<T | null>
  create<T extends { _id?: string }>(collection: string, doc: T): Promise<T & { _id: string }>
  list<T>(collection: string, options?: ListOptions): Promise<T[]>
  delete(collection: string, id: string): Promise<boolean>

  // Transaction operations
  transaction<T>(callback: (txn: TransactionContext) => Promise<T>): Promise<T>

  // Batch operations
  createMany<T extends { _id?: string }>(collection: string, docs: T[]): Promise<Array<T & { _id: string }>>
  updateMany<T>(collection: string, filter: Record<string, unknown>, updates: Partial<T>): Promise<number>
  deleteMany(collection: string, ids: string[]): Promise<number>

  // Durable execution
  do<T>(action: string, params: unknown): Promise<T>
  getActionStatus(actionId: string): Promise<ActionStatus>

  // WAL operations
  wal: WALManager
}

interface ListOptions {
  limit?: number
  offset?: number
  where?: Record<string, unknown>
}

interface TransactionContext {
  get<T>(collection: string, id: string): Promise<T | null>
  create<T>(collection: string, doc: T): Promise<T>
  update<T>(collection: string, id: string, updates: Partial<T>): Promise<T | null>
  delete(collection: string, id: string): Promise<boolean>
  abort(): void
}

interface ActionStatus {
  status: 'pending' | 'active' | 'completed' | 'failed'
  result?: unknown
  error?: string
  createdAt: number
  completedAt?: number
}

interface WALManager {
  append(operation: string, data: Uint8Array): Promise<void>
  recover(): Promise<Array<{ operation: string; data: Uint8Array }>>
  createCheckpoint(name: string): Promise<void>
  flush(): Promise<void>
}

/**
 * Attempt to load DatabaseDO - this will fail in RED phase
 */
async function loadDatabaseDO(): Promise<new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOTransactionContract> {
  const module = await import('../src/database.js')
  return module.DatabaseDO
}

describe('DatabaseDO Transaction Handling', () => {
  let ctx: MockDOState
  let env: MockDatabaseEnv
  let DatabaseDO: new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOTransactionContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DatabaseDO = await loadDatabaseDO()
  })

  describe('Basic transactions', () => {
    it('should execute transaction atomically', async () => {
      const instance = new DatabaseDO(ctx, env)
      const result = await instance.transaction(async (txn) => {
        const user = await txn.create('users', { name: 'Alice' })
        await txn.create('profiles', { userId: user._id, bio: 'Hello' })
        return user
      })
      expect(result._id).toBeDefined()

      // Verify both documents were created
      const users = await instance.list('users')
      const profiles = await instance.list('profiles')
      expect(users).toHaveLength(1)
      expect(profiles).toHaveLength(1)
    })

    it('should rollback on error', async () => {
      const instance = new DatabaseDO(ctx, env)

      await expect(instance.transaction(async (txn) => {
        await txn.create('users', { name: 'Bob' })
        throw new Error('Intentional failure')
      })).rejects.toThrow('Intentional failure')

      // Verify rollback - no users should exist
      const users = await instance.list('users')
      expect(users).toHaveLength(0)
    })

    it('should support nested operations within transaction', async () => {
      const instance = new DatabaseDO(ctx, env)

      const result = await instance.transaction(async (txn) => {
        const user = await txn.create('users', { name: 'Charlie' })
        const profile = await txn.create('profiles', { userId: user._id })
        const settings = await txn.create('settings', { profileId: profile._id })
        return { user, profile, settings }
      })

      expect(result.user._id).toBeDefined()
      expect(result.profile._id).toBeDefined()
      expect(result.settings._id).toBeDefined()
    })

    it('should isolate transaction reads', async () => {
      const instance = new DatabaseDO(ctx, env)

      // Create initial user
      await instance.create('users', { _id: 'initial', name: 'Initial' })

      await instance.transaction(async (txn) => {
        // Create user in transaction
        await txn.create('users', { _id: 'txn-user', name: 'Transaction User' })

        // Read from transaction should see the new user
        const txnUser = await txn.get('users', 'txn-user')
        expect(txnUser).not.toBeNull()
      })
    })
  })

  describe('Transaction abort', () => {
    it('should support explicit abort', async () => {
      const instance = new DatabaseDO(ctx, env)

      await expect(instance.transaction(async (txn) => {
        await txn.create('users', { name: 'Charlie' })
        txn.abort()
        // After abort, nothing should be committed
      })).rejects.toThrow(/abort/i)

      const users = await instance.list('users')
      expect(users).toHaveLength(0)
    })

    it('should clean up resources on abort', async () => {
      const instance = new DatabaseDO(ctx, env)

      await expect(instance.transaction(async (txn) => {
        for (let i = 0; i < 10; i++) {
          await txn.create('temp', { value: i })
        }
        txn.abort()
      })).rejects.toThrow(/abort/i)

      const temp = await instance.list('temp')
      expect(temp).toHaveLength(0)
    })
  })

  describe('Concurrent transactions', () => {
    it('should block concurrent access via blockConcurrencyWhile', async () => {
      const instance = new DatabaseDO(ctx, env)

      // This test verifies that DO's blockConcurrencyWhile is used
      const result = await instance.transaction(async (txn) => {
        await txn.create('users', { name: 'Concurrent' })
        return 'done'
      })

      expect(result).toBe('done')
      expect(ctx.blockConcurrencyWhile).toHaveBeenCalled()
    })

    it('should queue transactions when DO is busy', async () => {
      const instance = new DatabaseDO(ctx, env)
      const results: number[] = []

      // Start multiple transactions - they should execute in order
      await Promise.all([
        instance.transaction(async (txn) => {
          results.push(1)
          await txn.create('users', { name: 'First' })
        }),
        instance.transaction(async (txn) => {
          results.push(2)
          await txn.create('users', { name: 'Second' })
        }),
      ])

      // Both should have completed
      const users = await instance.list('users')
      expect(users).toHaveLength(2)
    })
  })

  describe('WAL (Write-Ahead Log)', () => {
    it('should append operations to WAL', async () => {
      const instance = new DatabaseDO(ctx, env)

      await instance.wal.append('INSERT', new Uint8Array([1, 2, 3]))

      // WAL should have the entry
      const entries = await instance.wal.recover()
      expect(entries.length).toBeGreaterThan(0)
    })

    it('should support WAL recovery', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.wal.append('INSERT', new Uint8Array([1, 2, 3]))
      await instance.wal.append('UPDATE', new Uint8Array([4, 5, 6]))

      const entries = await instance.wal.recover()
      expect(entries.length).toBe(2)
      expect(entries[0]?.operation).toBe('INSERT')
      expect(entries[1]?.operation).toBe('UPDATE')
    })

    it('should create checkpoints', async () => {
      const instance = new DatabaseDO(ctx, env)

      await instance.create('users', { name: 'Test' })
      await expect(instance.wal.createCheckpoint('v1')).resolves.not.toThrow()
    })

    it('should flush WAL entries after commit', async () => {
      const instance = new DatabaseDO(ctx, env)

      await instance.transaction(async (txn) => {
        await txn.create('users', { name: 'Flush Test' })
      })

      // After commit, WAL should be flushed
      await expect(instance.wal.flush()).resolves.not.toThrow()
    })
  })

  describe('Durable execution', () => {
    it('should support durable do() with retry', async () => {
      const instance = new DatabaseDO(ctx, env)

      const result = await instance.do<{ _id: string }>('createUser', { name: 'David' })
      expect(result._id).toBeDefined()
    })

    it('should track action status (pending/active/completed/failed)', async () => {
      const instance = new DatabaseDO(ctx, env)

      // Start an action
      const actionId = 'test-action-id'
      await instance.do('createUser', { name: 'Test', actionId })

      const status = await instance.getActionStatus(actionId)
      expect(['pending', 'active', 'completed', 'failed']).toContain(status.status)
    })

    it('should record action result on completion', async () => {
      const instance = new DatabaseDO(ctx, env)

      const actionId = 'completed-action'
      const result = await instance.do('createUser', { name: 'Completed', actionId })

      const status = await instance.getActionStatus(actionId)
      expect(status.status).toBe('completed')
      expect(status.result).toBeDefined()
      expect(status.completedAt).toBeDefined()
    })

    it('should record error on failure', async () => {
      const instance = new DatabaseDO(ctx, env)

      const actionId = 'failed-action'
      await expect(instance.do('failingAction', { actionId })).rejects.toThrow()

      const status = await instance.getActionStatus(actionId)
      expect(status.status).toBe('failed')
      expect(status.error).toBeDefined()
    })
  })

  describe('Batch operations', () => {
    it('should support createMany in transaction', async () => {
      const instance = new DatabaseDO(ctx, env)
      const docs = [{ name: 'User1' }, { name: 'User2' }, { name: 'User3' }]

      const created = await instance.createMany('users', docs)
      expect(created).toHaveLength(3)
      expect(created[0]?._id).toBeDefined()
      expect(created[1]?._id).toBeDefined()
      expect(created[2]?._id).toBeDefined()
    })

    it('should support updateMany in transaction', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.createMany('users', [
        { _id: '1', name: 'User1', active: false },
        { _id: '2', name: 'User2', active: false },
        { _id: '3', name: 'User3', active: true },
      ])

      const count = await instance.updateMany('users', { active: false }, { active: true })
      expect(count).toBe(2)
    })

    it('should support deleteMany in transaction', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.createMany('users', [
        { _id: '1', name: 'User1' },
        { _id: '2', name: 'User2' },
        { _id: '3', name: 'User3' },
      ])

      const count = await instance.deleteMany('users', ['1', '2'])
      expect(count).toBe(2)

      const remaining = await instance.list('users')
      expect(remaining).toHaveLength(1)
    })

    it('should rollback batch on partial failure', async () => {
      const instance = new DatabaseDO(ctx, env)

      // Create with a document that will cause a constraint violation
      const docs = [
        { _id: '1', name: 'Valid' },
        { _id: '1', name: 'Duplicate ID - should fail' }, // Same ID
        { _id: '2', name: 'Never created' },
      ]

      await expect(instance.createMany('users', docs)).rejects.toThrow()

      // None should be created due to rollback
      const users = await instance.list('users')
      expect(users).toHaveLength(0)
    })
  })
})
