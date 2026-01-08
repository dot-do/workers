/**
 * Test helpers for Cascade Queue Worker tests
 *
 * Provides mock implementations for CascadeQueueDO testing.
 */

import { vi } from 'vitest'
import type {
  CascadeOperation,
  CascadeOperator,
  CascadeAction,
  CascadePriority,
  CascadeStats,
  CascadeQueueConfig,
  EnqueueOptions,
} from '../src/cascade.js'

// ============================================================================
// Mock Types
// ============================================================================

/**
 * Mock DurableObjectId
 */
export interface MockDurableObjectId {
  name?: string
  toString(): string
  equals(other: MockDurableObjectId): boolean
}

/**
 * Create a mock DurableObjectId
 */
export function createMockId(name?: string): MockDurableObjectId {
  const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`
  return {
    name,
    toString: () => idString,
    equals: (other: MockDurableObjectId) => other.toString() === idString,
  }
}

/**
 * Mock DOStorage interface
 */
export interface MockDOStorage {
  get: <T>(keyOrKeys: string | string[]) => Promise<T | Map<string, T> | undefined>
  put: <T>(keyOrEntries: string | Record<string, T>, value?: T) => Promise<void>
  delete: (keyOrKeys: string | string[]) => Promise<boolean | number>
  deleteAll: () => Promise<void>
  list: <T>(options?: { prefix?: string; limit?: number; startAfter?: string }) => Promise<Map<string, T>>
  transaction: <T>(closure: (txn: MockDOStorage) => Promise<T>) => Promise<T>
  getAlarm: () => Promise<number | null>
  setAlarm: (scheduledTime: number | Date) => Promise<void>
  deleteAlarm: () => Promise<void>
}

/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData?: Record<string, unknown>): MockDOStorage {
  const store = new Map<string, unknown>()
  let alarm: number | null = null

  if (initialData) {
    for (const [key, value] of Object.entries(initialData)) {
      store.set(key, value)
    }
  }

  const getImpl = async <T>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined> => {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map<string, T>()
      for (const key of keyOrKeys) {
        const value = store.get(key) as T | undefined
        if (value !== undefined) result.set(key, value)
      }
      return result
    }
    return store.get(keyOrKeys) as T | undefined
  }

  const putImpl = async <T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> => {
    if (typeof keyOrEntries === 'string') {
      store.set(keyOrEntries, value)
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        store.set(k, v)
      }
    }
  }

  const deleteImpl = async (keyOrKeys: string | string[]): Promise<boolean | number> => {
    if (Array.isArray(keyOrKeys)) {
      let count = 0
      for (const key of keyOrKeys) {
        if (store.delete(key)) count++
      }
      return count
    }
    return store.delete(keyOrKeys)
  }

  const deleteAllImpl = async (): Promise<void> => {
    store.clear()
  }

  const listImpl = async <T>(options?: {
    prefix?: string
    limit?: number
    startAfter?: string
  }): Promise<Map<string, T>> => {
    let entries = Array.from(store.entries())

    if (options?.prefix) {
      entries = entries.filter(([key]) => key.startsWith(options.prefix!))
    }

    if (options?.startAfter) {
      entries = entries.filter(([key]) => key > options.startAfter!)
    }

    entries.sort(([a], [b]) => a.localeCompare(b))

    if (options?.limit !== undefined) {
      entries = entries.slice(0, options.limit)
    }

    return new Map(entries) as Map<string, T>
  }

  const storage: MockDOStorage = {
    get: vi.fn(getImpl) as MockDOStorage['get'],
    put: vi.fn(putImpl) as MockDOStorage['put'],
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl) as MockDOStorage['list'],
    transaction: vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>): Promise<T> => {
      return closure(storage)
    }) as MockDOStorage['transaction'],
    getAlarm: vi.fn(async () => alarm),
    setAlarm: vi.fn(async (scheduledTime: number | Date) => {
      alarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime()
    }),
    deleteAlarm: vi.fn(async () => {
      alarm = null
    }),
  }

  return storage
}

/**
 * Mock DOState
 */
export interface MockDOState {
  id: MockDurableObjectId
  storage: MockDOStorage
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>
}

/**
 * Create a mock DOState
 */
export function createMockState(options?: {
  id?: MockDurableObjectId
  storage?: MockDOStorage
  initialData?: Record<string, unknown>
}): MockDOState {
  const id = options?.id ?? createMockId()
  const storage = options?.storage ?? createMockStorage(options?.initialData)

  return {
    id,
    storage,
    blockConcurrencyWhile: vi.fn(async (callback) => callback()),
  }
}

/**
 * Mock DurableObjectNamespace
 */
export interface MockDurableObjectNamespace {
  idFromName: (name: string) => MockDurableObjectId
  idFromString: (id: string) => MockDurableObjectId
  get: (id: MockDurableObjectId) => MockDurableObjectStub
}

/**
 * Mock DurableObjectStub
 */
export interface MockDurableObjectStub {
  fetch: (request: Request | string, init?: RequestInit) => Promise<Response>
}

/**
 * Create a mock DurableObjectNamespace
 */
export function createMockNamespace(
  fetchHandler?: (request: Request) => Promise<Response>
): MockDurableObjectNamespace {
  const defaultFetchHandler = async (request: Request): Promise<Response> => {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const handler = fetchHandler ?? defaultFetchHandler

  return {
    idFromName: vi.fn((name: string) => createMockId(name)),
    idFromString: vi.fn((id: string) => createMockId(id)),
    get: vi.fn((_id: MockDurableObjectId): MockDurableObjectStub => ({
      fetch: vi.fn(async (request: Request | string, init?: RequestInit) => {
        const req = typeof request === 'string' ? new Request(request, init) : request
        return handler(req)
      }),
    })),
  }
}

/**
 * Mock Queue
 */
export interface MockQueue {
  send: (message: unknown, options?: { delaySeconds?: number }) => Promise<void>
  sendBatch: (messages: Array<{ body: unknown; options?: { delaySeconds?: number } }>) => Promise<void>
}

/**
 * Create a mock Queue
 */
export function createMockQueue(): MockQueue & { messages: unknown[] } {
  const messages: unknown[] = []

  return {
    messages,
    send: vi.fn(async (message: unknown): Promise<void> => {
      messages.push(message)
    }),
    sendBatch: vi.fn(async (batch: Array<{ body: unknown }>): Promise<void> => {
      for (const { body } of batch) {
        messages.push(body)
      }
    }),
  }
}

/**
 * Mock environment bindings
 */
export interface MockCascadeEnv {
  CASCADE_QUEUE: MockDurableObjectNamespace
  EXTERNAL_QUEUE?: MockQueue
  [key: string]: unknown
}

/**
 * Create mock environment
 */
export function createMockEnv(options?: {
  targetNamespaces?: Record<string, MockDurableObjectNamespace>
}): MockCascadeEnv {
  const env: MockCascadeEnv = {
    CASCADE_QUEUE: createMockNamespace(),
    EXTERNAL_QUEUE: createMockQueue(),
  }

  if (options?.targetNamespaces) {
    for (const [name, namespace] of Object.entries(options.targetNamespaces)) {
      env[name] = namespace
    }
  }

  return env
}

// ============================================================================
// Sample Data Generators
// ============================================================================

let operationIdCounter = 0

/**
 * Create a sample cascade operation
 */
export function createSampleOperation(
  overrides?: Partial<CascadeOperation>
): CascadeOperation {
  const uniqueId = operationIdCounter++
  const now = Date.now()

  return {
    id: `cop_test_${uniqueId}`,
    operator: '~>',
    action: 'update',
    source: {
      doClass: 'UserDO',
      doId: 'user-123',
      entityType: 'User',
      entityId: 'user-123',
    },
    target: {
      doClass: 'OrderDO',
      doId: 'order-456',
      entityType: 'Order',
      entityId: 'order-456',
      relationship: 'user_orders',
    },
    payload: {
      field: 'value',
      updated: true,
    },
    metadata: {
      priority: 'normal',
      correlationId: `ccor_test_${uniqueId}`,
    },
    status: 'pending',
    retry: {
      attempts: 0,
      maxRetries: 5,
    },
    timestamps: {
      createdAt: now,
      sequenceNumber: uniqueId,
    },
    ...overrides,
  }
}

/**
 * Create multiple sample operations
 */
export function createSampleOperations(
  count: number,
  overrides?: Partial<CascadeOperation>
): CascadeOperation[] {
  return Array.from({ length: count }, () => createSampleOperation(overrides))
}

/**
 * Create sample enqueue options
 */
export function createSampleEnqueueOptions(
  overrides?: Partial<EnqueueOptions>
): EnqueueOptions {
  return {
    priority: 'normal',
    correlationId: `ccor_test_${Date.now()}`,
    ...overrides,
  }
}

/**
 * Create sample stats
 */
export function createSampleStats(overrides?: Partial<CascadeStats>): CascadeStats {
  return {
    totalEnqueued: 100,
    totalCompleted: 80,
    totalFailed: 10,
    totalDeadLettered: 5,
    pendingCount: 5,
    processingCount: 0,
    avgProcessingTimeMs: 150,
    byOperator: {
      '~>': { enqueued: 60, completed: 50, failed: 5 },
      '<~': { enqueued: 40, completed: 30, failed: 5 },
    },
    byAction: {
      update: { enqueued: 50, completed: 40, failed: 5 },
      delete: { enqueued: 20, completed: 18, failed: 2 },
      notify: { enqueued: 15, completed: 12, failed: 2 },
      sync: { enqueued: 10, completed: 8, failed: 1 },
      custom: { enqueued: 5, completed: 2, failed: 0 },
    },
    updatedAt: Date.now(),
    ...overrides,
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: { timeout?: number; interval?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 5000
  const interval = options?.interval ?? 50
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('waitFor timeout')
}

/**
 * Create a deferred promise for async testing
 */
export function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

/**
 * Spy on storage operations for debugging
 */
export function spyOnStorage(storage: MockDOStorage): {
  gets: string[]
  puts: Array<{ key: string; value: unknown }>
  deletes: string[]
} {
  const gets: string[] = []
  const puts: Array<{ key: string; value: unknown }> = []
  const deletes: string[] = []

  const originalGet = storage.get
  storage.get = vi.fn(async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      gets.push(...keyOrKeys)
    } else {
      gets.push(keyOrKeys)
    }
    return originalGet(keyOrKeys)
  }) as MockDOStorage['get']

  const originalPut = storage.put
  storage.put = vi.fn(async <T>(keyOrEntries: string | Record<string, T>, value?: T) => {
    if (typeof keyOrEntries === 'string') {
      puts.push({ key: keyOrEntries, value })
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        puts.push({ key: k, value: v })
      }
    }
    return originalPut(keyOrEntries, value)
  }) as MockDOStorage['put']

  const originalDelete = storage.delete
  storage.delete = vi.fn(async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      deletes.push(...keyOrKeys)
    } else {
      deletes.push(keyOrKeys)
    }
    return originalDelete(keyOrKeys)
  })

  return { gets, puts, deletes }
}
