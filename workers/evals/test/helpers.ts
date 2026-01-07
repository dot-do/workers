/**
 * Test helpers for evals.do worker tests
 *
 * Provides mock implementations for EvalsDO testing.
 */
import { vi } from 'vitest'

/**
 * Mock DurableObjectId
 */
export interface MockDOId {
  name?: string
  toString: () => string
  equals: (other: MockDOId) => boolean
}

/**
 * Mock DOStorage with optional initial data
 */
export interface MockDOStorage {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  deleteAll: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
  sql: MockSqlStorage
  transaction: ReturnType<typeof vi.fn>
}

/**
 * Mock SQL storage
 */
export interface MockSqlStorage {
  exec: ReturnType<typeof vi.fn>
}

/**
 * Mock DOState
 */
export interface MockDOState {
  id: MockDOId
  storage: MockDOStorage
  blockConcurrencyWhile: ReturnType<typeof vi.fn>
  acceptWebSocket: ReturnType<typeof vi.fn>
  getWebSockets: ReturnType<typeof vi.fn>
  setWebSocketAutoResponse: ReturnType<typeof vi.fn>
}

/**
 * Mock environment for evals worker
 */
export interface MockEvalsEnv {
  EVALS_DO: {
    get: ReturnType<typeof vi.fn>
    idFromName: ReturnType<typeof vi.fn>
  }
  AI?: {
    run: ReturnType<typeof vi.fn>
  }
}

/**
 * Create a mock SQL cursor with test data
 */
export function createMockSqlCursor(data: Record<string, unknown>[] = []) {
  return {
    columnNames: data.length > 0 ? Object.keys(data[0] as object) : [],
    rowsRead: data.length,
    rowsWritten: 0,
    toArray: () => [...data],
    one: () => data[0] ?? null,
    raw: function* () {
      for (const row of data) {
        yield Object.values(row)
      }
    },
    [Symbol.iterator]: function* () {
      for (const row of data) {
        yield row
      }
    },
  }
}

/**
 * Create a mock SQL storage
 */
export function createMockSqlStorage(): MockSqlStorage {
  return {
    exec: vi.fn(() => createMockSqlCursor([])),
  }
}

/**
 * Create a mock DurableObjectId
 */
export function createMockId(name?: string): MockDOId {
  const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`
  return {
    name,
    toString: () => idString,
    equals: (other: MockDOId) => other.toString() === idString,
  }
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

  // Implementation functions with proper behavior
  const getImpl = async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map<string, unknown>()
      for (const key of keyOrKeys) {
        const value = store.get(key)
        if (value !== undefined) result.set(key, value)
      }
      return result
    }
    return store.get(keyOrKeys)
  }

  const putImpl = async (keyOrEntries: string | Record<string, unknown>, value?: unknown) => {
    if (typeof keyOrEntries === 'string') {
      store.set(keyOrEntries, value)
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        store.set(k, v)
      }
    }
  }

  const deleteImpl = async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      let count = 0
      for (const key of keyOrKeys) {
        if (store.delete(key)) count++
      }
      return count
    }
    return store.delete(keyOrKeys)
  }

  const deleteAllImpl = async () => {
    store.clear()
  }

  const listImpl = async (options?: { prefix?: string; limit?: number }) => {
    let entries = Array.from(store.entries())
    if (options?.prefix) {
      entries = entries.filter(([key]) => key.startsWith(options.prefix!))
    }
    entries.sort(([a], [b]) => a.localeCompare(b))
    if (options?.limit !== undefined) {
      entries = entries.slice(0, options.limit)
    }
    return new Map(entries)
  }

  // Create storage object first without transaction to avoid circular reference
  const storage: MockDOStorage = {
    get: vi.fn(getImpl),
    put: vi.fn(putImpl),
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl),
    sql: createMockSqlStorage(),
    transaction: null as unknown as ReturnType<typeof vi.fn>,
  }

  // Add transaction with access to storage
  storage.transaction = vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>) => {
    return closure(storage)
  })

  return storage
}

/**
 * Create a mock DOState
 */
export function createMockState(options?: {
  id?: MockDOId
  storage?: MockDOStorage
  initialData?: Record<string, unknown>
}): MockDOState {
  const id = options?.id ?? createMockId()
  const storage = options?.storage ?? createMockStorage(options?.initialData)
  return {
    id,
    storage,
    blockConcurrencyWhile: vi.fn(async <T>(callback: () => Promise<T>) => callback()),
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => []),
    setWebSocketAutoResponse: vi.fn(),
  }
}

/**
 * Create mock environment for evals worker
 */
export function createMockEnv(): MockEvalsEnv {
  return {
    EVALS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI: {
      run: vi.fn(async () => ({ response: 'mock AI response' })),
    },
  }
}

/**
 * Create a mock AI model response for evaluation
 */
export function createMockModelResponse(options: {
  content?: string
  usage?: { input_tokens: number; output_tokens: number }
  latency?: number
} = {}): ModelResponse {
  return {
    content: options.content ?? 'Test response',
    usage: options.usage ?? { input_tokens: 10, output_tokens: 20 },
    latency: options.latency ?? 100,
  }
}

/**
 * Model response interface
 */
export interface ModelResponse {
  content: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
  latency: number
}
