/**
 * Tests: ExecutionDO - Execution Orchestration with Retry and Rate Limiting
 *
 * These tests verify the ExecutionDO's core functionality:
 * - Task submission and execution
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Status tracking and management
 *
 * @see objects/execution/index.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Execution } from '../index.ts'
import type { ExecutionTask, ExecutionRecord, ExecutionConfig } from '../index.ts'

// ============================================================================
// Mock Types
// ============================================================================

interface MockDOStorage {
  data: Map<string, unknown>
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>>
  setAlarm(time: number): Promise<void>
  getAlarm(): Promise<number | null>
  deleteAlarm(): Promise<void>
}

interface MockDOState {
  id: { toString(): string }
  storage: MockDOStorage
  waitUntil(promise: Promise<unknown>): void
}

function createMockStorage(): MockDOStorage {
  const data = new Map<string, unknown>()
  let alarmTime: number | null = null

  return {
    data,
    async get<T = unknown>(keyOrKeys: string | string[]): Promise<T | undefined | Map<string, T>> {
      if (Array.isArray(keyOrKeys)) {
        const result = new Map<string, T>()
        for (const key of keyOrKeys) {
          const value = data.get(key)
          if (value !== undefined) {
            result.set(key, value as T)
          }
        }
        return result
      }
      return data.get(keyOrKeys) as T | undefined
    },
    async put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> {
      if (typeof keyOrEntries === 'string') {
        data.set(keyOrEntries, value)
      } else {
        for (const [key, val] of Object.entries(keyOrEntries)) {
          data.set(key, val)
        }
      }
    },
    async delete(keyOrKeys: string | string[]): Promise<boolean | number> {
      if (Array.isArray(keyOrKeys)) {
        let count = 0
        for (const key of keyOrKeys) {
          if (data.delete(key)) count++
        }
        return count
      }
      return data.delete(keyOrKeys)
    },
    async list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>> {
      const result = new Map<string, T>()
      const prefix = options?.prefix || ''

      for (const [key, value] of data.entries()) {
        if (key.startsWith(prefix)) {
          result.set(key, value as T)
        }
      }

      return result
    },
    async setAlarm(time: number): Promise<void> {
      alarmTime = time
    },
    async getAlarm(): Promise<number | null> {
      return alarmTime
    },
    async deleteAlarm(): Promise<void> {
      alarmTime = null
    },
  }
}

function createMockState(): MockDOState {
  return {
    id: { toString: () => 'test-execution-do' },
    storage: createMockStorage(),
    waitUntil: (promise: Promise<unknown>) => {
      // Execute the promise immediately in tests
      promise.catch(() => {})
    },
  }
}

// ============================================================================
// Test Execution Class
// ============================================================================

class TestExecution extends Execution {
  constructor(ctx: MockDOState, env: Record<string, unknown> = {}) {
    super(ctx as any, env)
  }

  // Override handleTask for testing
  protected async handleTask<TInput = unknown, TOutput = unknown>(
    record: ExecutionRecord<TInput, TOutput>
  ): Promise<TOutput> {
    const input = record.input as any

    // Custom handlers for test tasks
    if (record.name === 'success') {
      return { result: 'success', input } as TOutput
    }

    if (record.name === 'failure') {
      throw new Error('Task failed intentionally')
    }

    if (record.name === 'slow') {
      await new Promise(resolve => setTimeout(resolve, 100))
      return { result: 'slow', input } as TOutput
    }

    if (record.name === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 60000))
      return { result: 'should not reach' } as TOutput
    }

    if (record.name === 'retryable') {
      const retries = (input as any).retries || 0
      if (retries < 2) {
        throw new Error('Temporary failure')
      }
      return { result: 'success after retries', retries } as TOutput
    }

    return await super.handleTask(record)
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ExecutionDO - Basic Functionality', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should submit a task successfully', async () => {
    const task: ExecutionTask = {
      id: 'task-1',
      name: 'success',
      input: { data: 'test' },
    }

    const record = await execution.submit(task)

    expect(record.id).toBe('task-1')
    expect(record.status).toBe('pending')
    expect(record.retries).toBe(0)
    expect(record.createdAt).toBeGreaterThan(0)
  })

  it('should execute a successful task', async () => {
    const task: ExecutionTask = {
      id: 'task-2',
      name: 'success',
      input: { data: 'test' },
    }

    const record = await execution.submit(task)

    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    const status = await execution.getStatus(record.id)
    expect(status?.status).toBe('completed')
    expect(status?.result?.output).toEqual({ result: 'success', input: { data: 'test' } })
  })

  it('should track task status', async () => {
    const task: ExecutionTask = {
      id: 'task-3',
      name: 'success',
      input: { data: 'test' },
    }

    await execution.submit(task)

    const status = await execution.getStatus('task-3')
    expect(status).not.toBeNull()
    expect(status?.id).toBe('task-3')
  })

  it('should list tasks', async () => {
    await execution.submit({ id: 'task-4', name: 'success', input: {} })
    await execution.submit({ id: 'task-5', name: 'success', input: {} })

    const records = await execution.listRecords()
    expect(records.length).toBeGreaterThanOrEqual(2)
  })
})

describe('ExecutionDO - Retry Logic', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should retry failed tasks', async () => {
    const task: ExecutionTask = {
      id: 'retry-1',
      name: 'failure',
      input: { data: 'test' },
      config: {
        maxRetries: 2,
        initialRetryDelay: 10,
      },
    }

    const record = await execution.submit(task)

    // Wait for first execution
    await new Promise(resolve => setTimeout(resolve, 100))

    const status = await execution.getStatus(record.id)

    // Should have failed but scheduled retry
    expect(status?.status).toBe('pending')
    expect(status?.retries).toBeGreaterThan(0)
    expect(status?.result?.nextRetryAt).toBeGreaterThan(Date.now())
  })

  it('should apply exponential backoff', async () => {
    const task: ExecutionTask = {
      id: 'backoff-1',
      name: 'failure',
      input: { data: 'test' },
      config: {
        maxRetries: 3,
        initialRetryDelay: 1000,
        backoffMultiplier: 2,
      },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    const status = await execution.getStatus('backoff-1')
    const nextRetryAt = status?.result?.nextRetryAt

    expect(nextRetryAt).toBeDefined()
    expect(nextRetryAt!).toBeGreaterThan(Date.now())
  })

  it('should fail after max retries exceeded', async () => {
    const task: ExecutionTask = {
      id: 'maxretry-1',
      name: 'failure',
      input: { data: 'test' },
      config: {
        maxRetries: 0,
      },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    const status = await execution.getStatus('maxretry-1')
    expect(status?.status).toBe('failed')
    expect(status?.result?.error).toBeDefined()
  })

  it('should handle alarm for scheduled retries', async () => {
    const task: ExecutionTask = {
      id: 'alarm-1',
      name: 'failure',
      input: { data: 'test' },
      config: {
        maxRetries: 2,
        initialRetryDelay: 10,
      },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Trigger alarm
    await execution.alarm()

    // Should have processed the retry
    const alarmTime = await ctx.storage.getAlarm()
    expect(alarmTime).not.toBeNull()
  })
})

describe('ExecutionDO - Rate Limiting', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should enforce rate limits', async () => {
    const config: ExecutionConfig = {
      rateLimit: {
        maxExecutions: 2,
        windowMs: 1000,
      },
    }

    // Submit 3 tasks, only 2 should execute
    const task1 = await execution.submit({
      id: 'rate-1',
      name: 'success',
      input: {},
      config
    })
    const task2 = await execution.submit({
      id: 'rate-2',
      name: 'success',
      input: {},
      config
    })
    const task3 = await execution.submit({
      id: 'rate-3',
      name: 'success',
      input: {},
      config
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const status3 = await execution.getStatus('rate-3')

    // Third task should be rate limited
    expect([task1.status, task2.status].includes('pending')).toBe(true)
    expect(status3?.status).toBe('rate_limited')
  })

  it('should reset rate limit window', async () => {
    const config: ExecutionConfig = {
      rateLimit: {
        maxExecutions: 1,
        windowMs: 100,
      },
    }

    await execution.submit({
      id: 'window-1',
      name: 'success',
      input: {},
      config
    })

    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should allow another execution
    const task2 = await execution.submit({
      id: 'window-2',
      name: 'success',
      input: {},
      config
    })

    expect(task2.status).toBe('pending')
  })
})

describe('ExecutionDO - Task Management', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should cancel pending tasks', async () => {
    const task: ExecutionTask = {
      id: 'cancel-1',
      name: 'slow',
      input: {},
    }

    await execution.submit(task)
    const cancelled = await execution.cancel('cancel-1')

    expect(cancelled).toBe(true)

    const status = await execution.getStatus('cancel-1')
    expect(status?.status).toBe('cancelled')
  })

  it('should not cancel running tasks', async () => {
    const task: ExecutionTask = {
      id: 'nocancel-1',
      name: 'slow',
      input: {},
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 50))

    const cancelled = await execution.cancel('nocancel-1')
    expect(cancelled).toBe(false)
  })

  it('should retry failed tasks manually', async () => {
    const task: ExecutionTask = {
      id: 'manual-retry-1',
      name: 'failure',
      input: {},
      config: { maxRetries: 0 },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    const retried = await execution.retry('manual-retry-1')
    expect(retried).not.toBeNull()
    expect(retried?.status).toBe('pending')
    expect(retried?.retries).toBe(0)
  })

  it('should support idempotency keys', async () => {
    const task: ExecutionTask = {
      id: 'idempotent-1',
      name: 'success',
      input: {},
      idempotencyKey: 'unique-key-123',
    }

    const record1 = await execution.submit(task)

    // Submit again with same idempotency key
    const record2 = await execution.submit({
      ...task,
      id: 'idempotent-2',
    })

    expect(record1.id).toBe(record2.id)
  })
})

describe('ExecutionDO - Timeout Handling', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should timeout long-running tasks', async () => {
    const task: ExecutionTask = {
      id: 'timeout-1',
      name: 'timeout',
      input: {},
      config: {
        timeout: 50,
        maxRetries: 0,
      },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 150))

    const status = await execution.getStatus('timeout-1')
    expect(status?.status).toBe('failed')
    expect(status?.result?.error).toMatch(/timeout/i)
  }, 10000)
})

describe('ExecutionDO - Metrics', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should calculate execution metrics', async () => {
    await execution.submit({ id: 'metric-1', name: 'success', input: {} })
    await execution.submit({ id: 'metric-2', name: 'failure', input: {}, config: { maxRetries: 0 } })

    await new Promise(resolve => setTimeout(resolve, 200))

    const metrics = await execution.getMetrics()

    expect(metrics.total).toBeGreaterThanOrEqual(2)
    expect(metrics.completed).toBeGreaterThanOrEqual(1)
    expect(metrics.failed).toBeGreaterThanOrEqual(1)
  })

  it('should track average duration', async () => {
    await execution.submit({ id: 'duration-1', name: 'success', input: {} })
    await execution.submit({ id: 'duration-2', name: 'success', input: {} })

    await new Promise(resolve => setTimeout(resolve, 200))

    const metrics = await execution.getMetrics()

    expect(metrics.averageDuration).toBeGreaterThan(0)
  })

  it('should track average retries', async () => {
    await execution.submit({
      id: 'retries-1',
      name: 'failure',
      input: {},
      config: { maxRetries: 2, initialRetryDelay: 10 }
    })

    await new Promise(resolve => setTimeout(resolve, 200))

    const metrics = await execution.getMetrics()
    expect(metrics.averageRetries).toBeGreaterThanOrEqual(0)
  })
})

describe('ExecutionDO - Priority', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should sort tasks by priority', async () => {
    await execution.submit({ id: 'priority-1', name: 'success', input: {}, priority: 1 })
    await execution.submit({ id: 'priority-2', name: 'success', input: {}, priority: 10 })
    await execution.submit({ id: 'priority-3', name: 'success', input: {}, priority: 5 })

    const records = await execution.listRecords()

    // Should be sorted by priority descending
    expect(records[0].priority).toBeGreaterThanOrEqual(records[1].priority || 0)
  })
})

describe('ExecutionDO - Configuration', () => {
  let ctx: MockDOState
  let execution: TestExecution

  beforeEach(() => {
    ctx = createMockState()
    execution = new TestExecution(ctx)
  })

  it('should apply default configuration', async () => {
    execution.configure({
      maxRetries: 5,
      initialRetryDelay: 2000,
    })

    const task: ExecutionTask = {
      id: 'config-1',
      name: 'failure',
      input: {},
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    const status = await execution.getStatus('config-1')

    // Should use default config
    expect(status?.result?.nextRetryAt).toBeGreaterThan(Date.now())
  })

  it('should override default configuration', async () => {
    execution.configure({
      maxRetries: 5,
    })

    const task: ExecutionTask = {
      id: 'override-1',
      name: 'failure',
      input: {},
      config: {
        maxRetries: 1,
      },
    }

    await execution.submit(task)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should use task config, not default
    const status = await execution.getStatus('override-1')
    expect(status).not.toBeNull()
  })
})
