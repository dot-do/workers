/**
 * Test helpers for eval.do worker tests
 *
 * Provides mock implementations for EvalDO testing.
 */

import { vi } from 'vitest'

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
 * Mock DOStorage interface for eval.do
 */
export interface MockDOStorage {
  get: <T>(keyOrKeys: string | string[]) => Promise<T | Map<string, T> | undefined>
  put: <T>(keyOrEntries: string | Record<string, T>, value?: T) => Promise<void>
  delete: (keyOrKeys: string | string[]) => Promise<boolean | number>
  deleteAll: () => Promise<void>
  list: <T>(options?: { prefix?: string; limit?: number }) => Promise<Map<string, T>>
  transaction: <T>(closure: (txn: MockDOStorage) => Promise<T>) => Promise<T>
}

/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData?: Record<string, unknown>): MockDOStorage {
  const store = new Map<string, unknown>()

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

  const listImpl = async <T>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>> => {
    let entries = Array.from(store.entries())

    if (options?.prefix) {
      entries = entries.filter(([key]) => key.startsWith(options.prefix!))
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
    transaction: null as unknown as MockDOStorage['transaction'],
  }

  storage.transaction = vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>): Promise<T> => {
    return closure(storage)
  }) as MockDOStorage['transaction']

  return storage
}

/**
 * Mock DOState for eval.do
 */
export interface MockDOState {
  id: MockDurableObjectId
  storage: MockDOStorage
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>
  acceptWebSocket: (ws: WebSocket, tags?: string[]) => void
  getWebSockets: (tag?: string) => WebSocket[]
  setWebSocketAutoResponse: (pair: unknown) => void
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
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => []),
    setWebSocketAutoResponse: vi.fn(),
  }
}

/**
 * Mock environment bindings for eval.do
 */
export interface MockEvalEnv {
  EVAL_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
}

/**
 * Create mock environment
 */
export function createMockEnv(): MockEvalEnv {
  return {
    EVAL_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
  }
}

/**
 * Execution result interface
 */
export interface ExecutionResult {
  success: boolean
  result?: unknown
  error?: string
  logs?: string[]
  duration?: number
  memoryUsed?: number
}

/**
 * Code evaluation options
 */
export interface EvalOptions {
  timeout?: number
  memoryLimit?: number
  allowedGlobals?: string[]
  runtime?: 'javascript' | 'typescript'
}
