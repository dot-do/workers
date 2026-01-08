/**
 * Tests for Saga Pattern - Cross-DO Transaction Support
 *
 * Tests cover:
 * - Saga execution with multiple steps
 * - Two-phase commit protocol
 * - Compensation handlers for rollback
 * - Timeout and failure handling
 * - Distributed lock management
 * - Retry policies with backoff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SagaExecutor,
  applySagaMixin,
  generateTransactionId,
  calculateRetryDelay,
  TransactionState,
  CompensationStrategy,
  LockMode,
  SagaStepError,
  SagaTimeoutError,
  DEFAULT_RETRY_POLICY,
  type SagaDefinition,
  type SagaStep,
  type ParticipantStub,
  type ParticipantId,
  type RetryPolicy,
} from '../src/saga.js'
import { DOCore } from '../src/core.js'
import { createMockState, createMockId } from './helpers.js'

// ============================================================================
// Enhanced Mock SQL Storage for Saga Tests
// ============================================================================

interface SqlRow {
  [key: string]: unknown
}

/**
 * Create an in-memory SQL storage mock that actually stores and queries data
 */
function createInMemorySqlStorage() {
  const tables: Map<string, SqlRow[]> = new Map()
  const indexes: Map<string, Set<string>> = new Map()

  const sql = {
    exec: vi.fn(<T extends SqlRow>(query: string, ...bindings: unknown[]) => {
      const queryLower = query.toLowerCase().trim()
      let rowsWritten = 0
      let results: T[] = []

      // CREATE TABLE
      if (queryLower.startsWith('create table')) {
        const match = query.match(/create table if not exists (\w+)/i)
        if (match && match[1]) {
          if (!tables.has(match[1])) {
            tables.set(match[1], [])
          }
        }
        return {
          columnNames: [],
          rowsRead: 0,
          rowsWritten: 0,
          toArray: () => [],
          one: () => null,
          raw: function* () {},
          [Symbol.iterator]: function* () {},
        }
      }

      // CREATE INDEX
      if (queryLower.startsWith('create index') || queryLower.startsWith('create unique index')) {
        const match = query.match(/create (?:unique )?index if not exists (\w+)/i)
        if (match && match[1]) {
          indexes.set(match[1], new Set())
        }
        return {
          columnNames: [],
          rowsRead: 0,
          rowsWritten: 0,
          toArray: () => [],
          one: () => null,
          raw: function* () {},
          [Symbol.iterator]: function* () {},
        }
      }

      // INSERT
      if (queryLower.startsWith('insert')) {
        const tableMatch = query.match(/insert (?:or replace )?into (\w+)/i)
        const columnsMatch = query.match(/\(([^)]+)\)\s*values/i)
        const tableName = tableMatch?.[1]
        const columns = columnsMatch?.[1]?.split(',').map((c) => c.trim()) ?? []

        if (tableName) {
          // Auto-create table if needed
          if (!tables.has(tableName)) {
            tables.set(tableName, [])
          }

          const row: SqlRow = {}
          columns.forEach((col, i) => {
            row[col] = bindings[i]
          })

          const tableRows = tables.get(tableName)!

          // Handle OR REPLACE by checking for composite primary key or id
          if (queryLower.includes('or replace')) {
            // For saga_step_results, use composite key (transaction_id, step_id, is_compensation)
            if (tableName === 'saga_step_results') {
              const existingIdx = tableRows.findIndex(
                (r) =>
                  r['transaction_id'] === row['transaction_id'] &&
                  r['step_id'] === row['step_id'] &&
                  r['is_compensation'] === row['is_compensation']
              )
              if (existingIdx >= 0) {
                tableRows[existingIdx] = row
              } else {
                tableRows.push(row)
              }
            } else if (row['id']) {
              const existingIdx = tableRows.findIndex((r) => r['id'] === row['id'])
              if (existingIdx >= 0) {
                tableRows[existingIdx] = row
              } else {
                tableRows.push(row)
              }
            } else if (row['lock_id']) {
              const existingIdx = tableRows.findIndex((r) => r['lock_id'] === row['lock_id'])
              if (existingIdx >= 0) {
                tableRows[existingIdx] = row
              } else {
                tableRows.push(row)
              }
            } else {
              tableRows.push(row)
            }
          } else {
            tableRows.push(row)
          }
          rowsWritten = 1
        }

        return {
          columnNames: [],
          rowsRead: 0,
          rowsWritten,
          toArray: () => [],
          one: () => null,
          raw: function* () {},
          [Symbol.iterator]: function* () {},
        }
      }

      // SELECT
      if (queryLower.startsWith('select')) {
        const tableMatch = query.match(/from (\w+)/i)
        const tableName = tableMatch?.[1]

        if (tableName && tables.has(tableName)) {
          let tableRows = [...tables.get(tableName)!]

          // Handle WHERE clause
          const whereMatch = query.match(/where (.+?)(?:\s+order\s+by|\s+limit|$)/i)
          if (whereMatch && whereMatch[1]) {
            const conditions = whereMatch[1].trim()

            // Parse conditions with proper binding index tracking
            tableRows = tableRows.filter((row) => {
              // Split by AND
              const andParts = conditions.split(/\s+and\s+/i)
              let bindingIdx = 0

              for (const part of andParts) {
                const trimmed = part.trim()

                // Handle "column = ?"
                const eqMatch = trimmed.match(/^(\w+)\s*=\s*\?$/)
                if (eqMatch && eqMatch[1]) {
                  if (row[eqMatch[1]] !== bindings[bindingIdx]) {
                    return false
                  }
                  bindingIdx++
                  continue
                }

                // Handle "column > ?"
                const gtMatch = trimmed.match(/^(\w+)\s*>\s*\?$/)
                if (gtMatch && gtMatch[1]) {
                  const value = row[gtMatch[1]]
                  const binding = bindings[bindingIdx]
                  if (typeof value === 'number' && typeof binding === 'number') {
                    if (value <= binding) return false
                  }
                  bindingIdx++
                  continue
                }

                // Handle "column < ?"
                const ltMatch = trimmed.match(/^(\w+)\s*<\s*\?$/)
                if (ltMatch && ltMatch[1]) {
                  const value = row[ltMatch[1]]
                  const binding = bindings[bindingIdx]
                  if (typeof value === 'number' && typeof binding === 'number') {
                    if (value >= binding) return false
                  }
                  bindingIdx++
                  continue
                }
              }

              return true
            })
          }

          // Handle ORDER BY
          const orderMatch = query.match(/order\s+by\s+(\w+)\s*(asc|desc)?/i)
          if (orderMatch && orderMatch[1]) {
            const column = orderMatch[1]
            const desc = orderMatch[2]?.toLowerCase() === 'desc'
            tableRows.sort((a, b) => {
              const aVal = a[column]
              const bVal = b[column]
              if (aVal === bVal) return 0
              if (aVal === undefined || aVal === null) return 1
              if (bVal === undefined || bVal === null) return -1
              const result = aVal < bVal ? -1 : 1
              return desc ? -result : result
            })
          }

          // Handle LIMIT - must count ? in WHERE clause first to get right binding
          const limitMatch = query.match(/limit\s+(\d+|\?)/i)
          if (limitMatch) {
            let limit: number
            if (limitMatch[1] === '?') {
              // Count placeholders before LIMIT
              const beforeLimit = query.substring(0, query.toLowerCase().indexOf('limit'))
              const placeholderCount = (beforeLimit.match(/\?/g) || []).length
              limit = bindings[placeholderCount] as number
            } else {
              limit = parseInt(limitMatch[1])
            }
            tableRows = tableRows.slice(0, limit)
          }

          // Handle MAX aggregation
          if (queryLower.includes('max(')) {
            const maxMatch = query.match(/max\((\w+)\)\s*as\s*(\w+)/i)
            if (maxMatch && maxMatch[1] && maxMatch[2]) {
              const column = maxMatch[1]
              const alias = maxMatch[2]
              const maxVal = tableRows.reduce((max, row) => {
                const val = row[column]
                if (typeof val === 'number' && (max === null || val > max)) {
                  return val
                }
                return max
              }, null as number | null)
              results = [{ [alias]: maxVal } as unknown as T]
            }
          } else {
            results = tableRows as unknown as T[]
          }
        }

        return {
          columnNames: results.length > 0 ? Object.keys(results[0] as object) : [],
          rowsRead: results.length,
          rowsWritten: 0,
          toArray: () => [...results],
          one: () => results[0] ?? null,
          raw: function* () {
            for (const row of results) {
              yield Object.values(row as object)
            }
          },
          [Symbol.iterator]: function* () {
            for (const row of results) {
              yield row
            }
          },
        }
      }

      // UPDATE
      if (queryLower.startsWith('update')) {
        const tableMatch = query.match(/update (\w+)/i)
        const tableName = tableMatch?.[1]

        if (tableName && tables.has(tableName)) {
          const tableRows = tables.get(tableName)!

          // Parse SET clause and WHERE clause
          const setMatch = query.match(/set\s+(.+?)\s+where/i)
          const whereMatch = query.match(/where\s+(.+?)$/i)

          if (setMatch && whereMatch) {
            const setClause = setMatch[1]
            const whereClause = whereMatch[1]

            // Parse SET columns and count bindings
            const setParts = setClause.split(',').map((s) => s.trim())
            const setColumns: string[] = []
            for (const part of setParts) {
              const colMatch = part.match(/^(\w+)\s*=/)
              if (colMatch && colMatch[1]) {
                setColumns.push(colMatch[1])
              }
            }

            // Parse WHERE condition
            const whereColumn = whereClause.match(/(\w+)\s*=\s*\?/)?.[1]
            const whereBindingIdx = setColumns.length
            const whereValue = bindings[whereBindingIdx]

            tableRows.forEach((row) => {
              if (whereColumn && row[whereColumn] === whereValue) {
                setColumns.forEach((col, i) => {
                  if (bindings[i] !== undefined) {
                    row[col] = bindings[i]
                  }
                })
                rowsWritten++
              }
            })
          }
        }

        return {
          columnNames: [],
          rowsRead: 0,
          rowsWritten,
          toArray: () => [],
          one: () => null,
          raw: function* () {},
          [Symbol.iterator]: function* () {},
        }
      }

      // DELETE
      if (queryLower.startsWith('delete')) {
        const tableMatch = query.match(/from (\w+)/i)
        const tableName = tableMatch?.[1]

        if (tableName && tables.has(tableName)) {
          const tableRows = tables.get(tableName)!
          const whereMatch = query.match(/where\s+(.+?)$/i)

          if (whereMatch) {
            const whereClause = whereMatch[1]
            const columnMatch = whereClause.match(/(\w+)\s*[=<>]/)?.[1]
            const whereValue = bindings[0]

            const initialLength = tableRows.length
            const filtered = tableRows.filter((row) => {
              if (columnMatch) {
                if (whereClause.includes('<')) {
                  return !((row[columnMatch] as number) < (whereValue as number))
                }
                return row[columnMatch] !== whereValue
              }
              return true
            })
            tables.set(tableName, filtered)
            rowsWritten = initialLength - filtered.length
          }
        }

        return {
          columnNames: [],
          rowsRead: 0,
          rowsWritten,
          toArray: () => [],
          one: () => null,
          raw: function* () {},
          [Symbol.iterator]: function* () {},
        }
      }

      // Default fallback
      return {
        columnNames: [],
        rowsRead: 0,
        rowsWritten: 0,
        toArray: () => [],
        one: () => null,
        raw: function* () {},
        [Symbol.iterator]: function* () {},
      }
    }),
  }

  return sql
}

// ============================================================================
// Mock Participant Stub
// ============================================================================

interface MockParticipantOptions {
  id: ParticipantId
  methods?: Record<string, (params: unknown) => Promise<unknown>>
  failMethods?: Set<string>
  delayMs?: number
}

function createMockParticipant(options: MockParticipantOptions): ParticipantStub {
  const { id, methods = {}, failMethods = new Set(), delayMs = 0 } = options

  return {
    call: async <TParams, TResult>(method: string, params?: TParams): Promise<TResult> => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs))
      }

      if (failMethods.has(method)) {
        throw new SagaStepError(method, 'STEP_FAILED', `Method ${method} failed`, true)
      }

      const handler = methods[method]
      if (handler) {
        return (await handler(params)) as TResult
      }

      return { success: true } as TResult
    },
    getId: () => id,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Saga Pattern - Cross-DO Transaction Support', () => {
  describe('generateTransactionId', () => {
    it('should generate unique transaction IDs', () => {
      const id1 = generateTransactionId()
      const id2 = generateTransactionId()

      expect(id1).toMatch(/^saga_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^saga_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
        jitter: 0, // Disable jitter for predictable test
      }

      const delay0 = calculateRetryDelay(0, policy)
      const delay1 = calculateRetryDelay(1, policy)
      const delay2 = calculateRetryDelay(2, policy)

      expect(delay0).toBe(100) // 100 * 2^0 = 100
      expect(delay1).toBe(200) // 100 * 2^1 = 200
      expect(delay2).toBe(400) // 100 * 2^2 = 400
    })

    it('should respect max delay', () => {
      const policy: RetryPolicy = {
        maxAttempts: 10,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 5000,
        jitter: 0,
      }

      const delay5 = calculateRetryDelay(5, policy)
      expect(delay5).toBe(5000) // Capped at max
    })

    it('should add jitter when configured', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 1,
        maxDelayMs: 10000,
        jitter: 0.5, // 50% jitter
      }

      // Run multiple times to verify jitter adds variance
      const delays = new Set<number>()
      for (let i = 0; i < 10; i++) {
        delays.add(calculateRetryDelay(0, policy))
      }

      // With 50% jitter, we should see variance in the delays
      // Base is 1000, jitter range is +/- 500
      expect(delays.size).toBeGreaterThan(1)
    })
  })

  describe('SagaExecutor', () => {
    let sql: ReturnType<typeof createInMemorySqlStorage>
    let participants: Map<ParticipantId, ParticipantStub>
    let executor: SagaExecutor

    beforeEach(() => {
      sql = createInMemorySqlStorage()
      participants = new Map()
      executor = new SagaExecutor({
        sql,
        resolveParticipant: (id) => {
          const participant = participants.get(id)
          if (!participant) {
            throw new Error(`Participant not found: ${id}`)
          }
          return participant
        },
      })
    })

    describe('execute', () => {
      it('should execute a simple saga with one step', async () => {
        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            doWork: async (params) => ({ result: 'done', params }),
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'test-saga',
          name: 'Test Saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'doWork',
              params: { value: 42 },
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(true)
        expect(result.state).toBe(TransactionState.Committed)
        expect(result.stepResults.size).toBe(1)
        expect(result.stepResults.get('step-1')?.success).toBe(true)
        expect(result.stepResults.get('step-1')?.data).toEqual({
          result: 'done',
          params: { value: 42 },
        })
      })

      it('should execute a saga with multiple steps in sequence', async () => {
        const executionOrder: string[] = []

        const participant1 = createMockParticipant({
          id: 'participant-1',
          methods: {
            step1: async () => {
              executionOrder.push('step1')
              return { step: 1 }
            },
          },
        })

        const participant2 = createMockParticipant({
          id: 'participant-2',
          methods: {
            step2: async () => {
              executionOrder.push('step2')
              return { step: 2 }
            },
          },
        })

        participants.set('participant-1', participant1)
        participants.set('participant-2', participant2)

        const saga: SagaDefinition = {
          id: 'multi-step-saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'step1',
            },
            {
              id: 'step-2',
              participantId: 'participant-2',
              method: 'step2',
              dependsOn: ['step-1'],
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(true)
        expect(executionOrder).toEqual(['step1', 'step2'])
        expect(result.stepResults.size).toBe(2)
      })

      it('should respect step dependencies', async () => {
        const executionOrder: string[] = []

        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            a: async () => {
              executionOrder.push('a')
            },
            b: async () => {
              executionOrder.push('b')
            },
            c: async () => {
              executionOrder.push('c')
            },
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'dependency-saga',
          steps: [
            { id: 'c', participantId: 'participant-1', method: 'c', dependsOn: ['a', 'b'] },
            { id: 'a', participantId: 'participant-1', method: 'a' },
            { id: 'b', participantId: 'participant-1', method: 'b', dependsOn: ['a'] },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(true)
        // a must come before b, and both must come before c
        expect(executionOrder.indexOf('a')).toBeLessThan(executionOrder.indexOf('b'))
        expect(executionOrder.indexOf('b')).toBeLessThan(executionOrder.indexOf('c'))
      })

      it('should run compensations when a step fails', async () => {
        const compensated: string[] = []

        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            step1: async () => ({ success: true }),
            step2: async () => ({ success: true }),
            step3: async () => {
              throw new SagaStepError('step3', 'FAILED', 'Step 3 failed', false)
            },
            compensate1: async () => {
              compensated.push('compensate1')
            },
            compensate2: async () => {
              compensated.push('compensate2')
            },
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'compensation-saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'step1',
              compensationMethod: 'compensate1',
            },
            {
              id: 'step-2',
              participantId: 'participant-1',
              method: 'step2',
              compensationMethod: 'compensate2',
              dependsOn: ['step-1'],
            },
            {
              id: 'step-3',
              participantId: 'participant-1',
              method: 'step3',
              dependsOn: ['step-2'],
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(false)
        expect(result.state).toBe(TransactionState.Aborted)
        expect(result.error).toContain('Step 3 failed')
        // Compensations should run in reverse order
        expect(compensated).toEqual(['compensate2', 'compensate1'])
      })

      it('should retry failed steps according to retry policy', async () => {
        let attemptCount = 0

        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            flaky: async () => {
              attemptCount++
              if (attemptCount < 3) {
                throw new SagaStepError('flaky', 'TEMPORARY', 'Temporary failure', true)
              }
              return { success: true }
            },
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'retry-saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'flaky',
              retryPolicy: {
                maxAttempts: 5,
                baseDelayMs: 10,
                backoffMultiplier: 1,
              },
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(true)
        expect(attemptCount).toBe(3)
        expect(result.stepResults.get('step-1')?.retryCount).toBe(2)
      })

      it('should fail after exhausting retries', async () => {
        const participant = createMockParticipant({
          id: 'participant-1',
          failMethods: new Set(['alwaysFails']),
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'always-fail-saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'alwaysFails',
              retryPolicy: {
                maxAttempts: 2,
                baseDelayMs: 10,
              },
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(false)
        expect(result.stepResults.get('step-1')?.retryCount).toBe(2)
      })

      it('should support parallel compensation strategy', async () => {
        const compensated: string[] = []
        const startTimes: Map<string, number> = new Map()

        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            step1: async () => ({ success: true }),
            step2: async () => ({ success: true }),
            step3: async () => {
              throw new Error('Fail')
            },
            compensate1: async () => {
              startTimes.set('compensate1', Date.now())
              await new Promise((r) => setTimeout(r, 50))
              compensated.push('compensate1')
            },
            compensate2: async () => {
              startTimes.set('compensate2', Date.now())
              await new Promise((r) => setTimeout(r, 50))
              compensated.push('compensate2')
            },
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'parallel-compensation-saga',
          compensationStrategy: CompensationStrategy.Parallel,
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'step1',
              compensationMethod: 'compensate1',
            },
            {
              id: 'step-2',
              participantId: 'participant-1',
              method: 'step2',
              compensationMethod: 'compensate2',
            },
            {
              id: 'step-3',
              participantId: 'participant-1',
              method: 'step3',
            },
          ],
        }

        const result = await executor.execute(saga)

        expect(result.success).toBe(false)
        expect(compensated).toContain('compensate1')
        expect(compensated).toContain('compensate2')

        // In parallel mode, compensations should start at approximately the same time
        const time1 = startTimes.get('compensate1')!
        const time2 = startTimes.get('compensate2')!
        expect(Math.abs(time1 - time2)).toBeLessThan(30) // Within 30ms of each other
      })
    })

    describe('getTransaction', () => {
      it('should retrieve a completed transaction', async () => {
        const participant = createMockParticipant({
          id: 'participant-1',
          methods: {
            work: async () => ({ done: true }),
          },
        })
        participants.set('participant-1', participant)

        const saga: SagaDefinition = {
          id: 'persist-saga',
          steps: [
            {
              id: 'step-1',
              participantId: 'participant-1',
              method: 'work',
            },
          ],
        }

        const result = await executor.execute(saga)
        const retrieved = await executor.getTransaction(result.transactionId)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.state).toBe(TransactionState.Committed)
        expect(retrieved?.stepResults.size).toBe(1)
      })

      it('should return null for non-existent transaction', async () => {
        const result = await executor.getTransaction('non-existent')
        expect(result).toBeNull()
      })
    })

    describe('Distributed Locks', () => {
      it('should acquire and release a lock', async () => {
        const lock = await executor.acquireLock('resource-1', 'owner-1')

        expect(lock).not.toBeNull()
        expect(lock?.resource).toBe('resource-1')
        expect(lock?.owner).toBe('owner-1')
        expect(lock?.mode).toBe(LockMode.Exclusive)

        const released = await executor.releaseLock(lock!.lockId)
        expect(released).toBe(true)
      })

      it('should not allow acquiring exclusive lock when already held', async () => {
        const lock1 = await executor.acquireLock('resource-1', 'owner-1', {
          duration: 10000,
        })
        expect(lock1).not.toBeNull()

        const lock2 = await executor.acquireLock('resource-1', 'owner-2', {
          timeout: 100, // Short timeout to fail fast
        })
        expect(lock2).toBeNull()
      })

      it('should allow multiple shared locks', async () => {
        const lock1 = await executor.acquireLock('resource-1', 'owner-1', {
          mode: LockMode.Shared,
        })
        expect(lock1).not.toBeNull()

        const lock2 = await executor.acquireLock('resource-1', 'owner-2', {
          mode: LockMode.Shared,
        })
        expect(lock2).not.toBeNull()
      })

      it('should extend a lock', async () => {
        const lock = await executor.acquireLock('resource-1', 'owner-1', {
          duration: 1000,
        })
        expect(lock).not.toBeNull()

        const originalExpiry = lock!.expiresAt
        const extended = await executor.extendLock(lock!.lockId, 5000)
        expect(extended).toBe(true)
      })
    })
  })

  describe('SagaMixin', () => {
    it('should apply saga capabilities to a DO class', () => {
      const state = createMockState()
      state.storage.sql = createInMemorySqlStorage()

      class TestDO extends applySagaMixin(DOCore) {
        protected resolveParticipant(id: ParticipantId): ParticipantStub {
          return createMockParticipant({ id })
        }
      }

      const instance = new TestDO(state, {})

      expect(typeof instance.executeSaga).toBe('function')
      expect(typeof instance.sagaPrepare).toBe('function')
      expect(typeof instance.sagaCommit).toBe('function')
      expect(typeof instance.sagaAbort).toBe('function')
      expect(typeof instance.acquireLock).toBe('function')
      expect(typeof instance.releaseLock).toBe('function')
    })

    it('should handle 2PC prepare/commit/abort lifecycle', async () => {
      const state = createMockState()
      state.storage.sql = createInMemorySqlStorage()

      let workExecuted = false

      class TestDO extends applySagaMixin(DOCore) {
        protected resolveParticipant(id: ParticipantId): ParticipantStub {
          return createMockParticipant({ id })
        }

        async doWork(params: unknown) {
          workExecuted = true
          return { params }
        }
      }

      const instance = new TestDO(state, {})

      // Prepare phase
      const prepared = await instance.sagaPrepare('tx-1', 'doWork', { value: 42 })
      expect(prepared).toBe(true)
      expect(workExecuted).toBe(false) // Work not executed yet

      // Commit phase
      await instance.sagaCommit('tx-1')
      expect(workExecuted).toBe(true)
    })

    it('should handle abort after prepare', async () => {
      const state = createMockState()
      state.storage.sql = createInMemorySqlStorage()

      let workExecuted = false

      class TestDO extends applySagaMixin(DOCore) {
        protected resolveParticipant(id: ParticipantId): ParticipantStub {
          return createMockParticipant({ id })
        }

        async doWork() {
          workExecuted = true
        }
      }

      const instance = new TestDO(state, {})

      // Prepare phase
      await instance.sagaPrepare('tx-1', 'doWork', {})
      expect(workExecuted).toBe(false)

      // Abort instead of commit
      await instance.sagaAbort('tx-1')
      expect(workExecuted).toBe(false)

      // Trying to commit after abort should fail
      await expect(instance.sagaCommit('tx-1')).rejects.toThrow('No pending transaction')
    })
  })

  describe('Error Classes', () => {
    it('SagaStepError should contain step details', () => {
      const error = new SagaStepError('step-1', 'VALIDATION', 'Invalid input', true)

      expect(error.name).toBe('SagaStepError')
      expect(error.stepId).toBe('step-1')
      expect(error.code).toBe('VALIDATION')
      expect(error.message).toBe('Invalid input')
      expect(error.retryable).toBe(true)
    })

    it('SagaTimeoutError should contain transaction details', () => {
      const error = new SagaTimeoutError('tx-123', 'step-5')

      expect(error.name).toBe('SagaTimeoutError')
      expect(error.transactionId).toBe('tx-123')
      expect(error.stepId).toBe('step-5')
      expect(error.message).toContain('tx-123')
      expect(error.message).toContain('step-5')
    })
  })
})
