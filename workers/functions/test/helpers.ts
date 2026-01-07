/**
 * Test helpers for functions.do worker tests
 *
 * Provides mock implementations for FunctionsDO testing.
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
 * Mock DOStorage interface for functions.do
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
 * Mock DOState for functions.do
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
 * Mock AI binding for Workers AI
 */
export interface MockAIBinding {
  run: <T>(model: string, input: unknown) => Promise<T>
}

/**
 * Create a mock AI binding
 */
export function createMockAI(responses?: Map<string, unknown>): MockAIBinding {
  const defaultResponses = new Map<string, unknown>([
    ['@cf/meta/llama-3.1-8b-instruct', { response: 'Mock AI response' }],
    ['@cf/baai/bge-small-en-v1.5', { data: [[0.1, 0.2, 0.3]] }],
  ])

  const responseMap = responses ?? defaultResponses

  return {
    run: vi.fn(async <T>(model: string, _input: unknown): Promise<T> => {
      const response = responseMap.get(model)
      if (response) return response as T
      return { response: `Mock response for ${model}` } as T
    }),
  }
}

/**
 * Mock environment bindings for functions.do
 */
export interface MockFunctionsEnv {
  FUNCTIONS_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  AI: MockAIBinding
}

/**
 * Create mock environment
 */
export function createMockEnv(options?: { aiResponses?: Map<string, unknown> }): MockFunctionsEnv {
  return {
    FUNCTIONS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI: createMockAI(options?.aiResponses),
  }
}

/**
 * Mock function definition for testing
 */
export interface MockFunctionDefinition {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  handler?: (params: unknown) => Promise<unknown>
}

/**
 * Create a mock function definition
 */
export function createMockFunction(overrides?: Partial<MockFunctionDefinition>): MockFunctionDefinition {
  return {
    name: 'testFunction',
    description: 'A test function',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      }
    },
    handler: async (params: unknown) => ({ result: params }),
    ...overrides,
  }
}
