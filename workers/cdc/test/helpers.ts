/**
 * Test helpers for cdc.do worker tests
 *
 * Provides mock implementations for CDCDO testing.
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
 * Mock DOStorage interface for cdc.do
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

  // Implementation functions with proper behavior
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

  // Create storage object first without transaction to avoid circular reference
  const storage: MockDOStorage = {
    get: vi.fn(getImpl) as MockDOStorage['get'],
    put: vi.fn(putImpl) as MockDOStorage['put'],
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl) as MockDOStorage['list'],
    transaction: null as unknown as MockDOStorage['transaction'],
  }

  // Add transaction with access to storage
  storage.transaction = vi.fn(async <T>(closure: (txn: MockDOStorage) => Promise<T>): Promise<T> => {
    return closure(storage)
  }) as MockDOStorage['transaction']

  return storage
}

/**
 * Mock DOState for cdc.do
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
 * Mock R2 bucket for storing Parquet files
 */
export interface MockR2Bucket {
  put: (key: string, value: ArrayBuffer | ReadableStream | string, options?: R2PutOptions) => Promise<MockR2Object>
  get: (key: string) => Promise<MockR2Object | null>
  delete: (keys: string | string[]) => Promise<void>
  list: (options?: R2ListOptions) => Promise<MockR2Objects>
  head: (key: string) => Promise<MockR2Object | null>
}

export interface R2PutOptions {
  httpMetadata?: {
    contentType?: string
    contentEncoding?: string
  }
  customMetadata?: Record<string, string>
}

export interface R2ListOptions {
  prefix?: string
  limit?: number
  cursor?: string
}

export interface MockR2Object {
  key: string
  size: number
  etag: string
  uploaded: Date
  httpMetadata?: { contentType?: string }
  customMetadata?: Record<string, string>
  body?: ReadableStream
  arrayBuffer: () => Promise<ArrayBuffer>
  text: () => Promise<string>
  json: <T>() => Promise<T>
}

export interface MockR2Objects {
  objects: MockR2Object[]
  truncated: boolean
  cursor?: string
}

/**
 * Create a mock R2 bucket
 */
export function createMockR2Bucket(): MockR2Bucket {
  const store = new Map<string, { data: ArrayBuffer; metadata?: R2PutOptions }>()

  return {
    put: vi.fn(async (key: string, value: ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<MockR2Object> => {
      let data: ArrayBuffer
      if (typeof value === 'string') {
        data = new TextEncoder().encode(value).buffer as ArrayBuffer
      } else if (value instanceof ArrayBuffer) {
        data = value
      } else {
        // ReadableStream - consume it
        const reader = value.getReader()
        const chunks: Uint8Array[] = []
        let done = false
        while (!done) {
          const result = await reader.read()
          if (result.value) chunks.push(result.value)
          done = result.done
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          combined.set(chunk, offset)
          offset += chunk.length
        }
        data = combined.buffer as ArrayBuffer
      }

      store.set(key, { data, metadata: options })

      return {
        key,
        size: data.byteLength,
        etag: `etag-${Date.now()}`,
        uploaded: new Date(),
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
        arrayBuffer: async () => data,
        text: async () => new TextDecoder().decode(data),
        json: async <T>() => JSON.parse(new TextDecoder().decode(data)) as T,
      }
    }),

    get: vi.fn(async (key: string): Promise<MockR2Object | null> => {
      const entry = store.get(key)
      if (!entry) return null

      return {
        key,
        size: entry.data.byteLength,
        etag: `etag-${Date.now()}`,
        uploaded: new Date(),
        httpMetadata: entry.metadata?.httpMetadata,
        customMetadata: entry.metadata?.customMetadata,
        arrayBuffer: async () => entry.data,
        text: async () => new TextDecoder().decode(entry.data),
        json: async <T>() => JSON.parse(new TextDecoder().decode(entry.data)) as T,
      }
    }),

    delete: vi.fn(async (keys: string | string[]): Promise<void> => {
      const keyList = Array.isArray(keys) ? keys : [keys]
      for (const key of keyList) {
        store.delete(key)
      }
    }),

    list: vi.fn(async (options?: R2ListOptions): Promise<MockR2Objects> => {
      let entries = Array.from(store.entries())

      if (options?.prefix) {
        entries = entries.filter(([key]) => key.startsWith(options.prefix!))
      }

      entries.sort(([a], [b]) => a.localeCompare(b))

      const limit = options?.limit ?? 1000
      const truncated = entries.length > limit
      entries = entries.slice(0, limit)

      return {
        objects: entries.map(([key, { data, metadata }]) => ({
          key,
          size: data.byteLength,
          etag: `etag-${Date.now()}`,
          uploaded: new Date(),
          httpMetadata: metadata?.httpMetadata,
          customMetadata: metadata?.customMetadata,
          arrayBuffer: async () => data,
          text: async () => new TextDecoder().decode(data),
          json: async <T>() => JSON.parse(new TextDecoder().decode(data)) as T,
        })),
        truncated,
        cursor: truncated ? 'next-cursor' : undefined,
      }
    }),

    head: vi.fn(async (key: string): Promise<MockR2Object | null> => {
      const entry = store.get(key)
      if (!entry) return null

      return {
        key,
        size: entry.data.byteLength,
        etag: `etag-${Date.now()}`,
        uploaded: new Date(),
        httpMetadata: entry.metadata?.httpMetadata,
        customMetadata: entry.metadata?.customMetadata,
        arrayBuffer: async () => entry.data,
        text: async () => new TextDecoder().decode(entry.data),
        json: async <T>() => JSON.parse(new TextDecoder().decode(entry.data)) as T,
      }
    }),
  }
}

/**
 * Mock Queue for event delivery
 */
export interface MockQueue {
  send: (message: unknown, options?: QueueSendOptions) => Promise<void>
  sendBatch: (messages: Array<{ body: unknown; options?: QueueSendOptions }>) => Promise<void>
}

export interface QueueSendOptions {
  contentType?: string
  delaySeconds?: number
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
 * Mock environment bindings for cdc.do
 */
export interface MockCDCEnv {
  CDC_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  CDC_BUCKET?: MockR2Bucket
  CDC_QUEUE?: MockQueue
  DATABASE_DO?: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
}

/**
 * Create mock environment
 */
export function createMockEnv(): MockCDCEnv {
  return {
    CDC_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    CDC_BUCKET: createMockR2Bucket(),
    CDC_QUEUE: createMockQueue(),
  }
}

/**
 * Create a sample CDC event for testing
 */
export function createSampleEvent(overrides?: Partial<CDCEvent>): CDCEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    source: 'test-source',
    type: 'test.event',
    data: { key: 'value' },
    metadata: {},
    ...overrides,
  }
}

/**
 * CDC Event structure
 */
export interface CDCEvent {
  /** Unique event identifier */
  id: string
  /** Event timestamp (Unix ms) */
  timestamp: number
  /** Source system/service */
  source: string
  /** Event type (e.g., "user.created", "order.updated") */
  type: string
  /** Event payload */
  data: Record<string, unknown>
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Sequence number for ordering */
  sequenceNumber?: number
  /** Partition key for routing */
  partitionKey?: string
}

/**
 * Create multiple sample events
 */
export function createSampleEvents(count: number, source?: string): CDCEvent[] {
  return Array.from({ length: count }, (_, i) =>
    createSampleEvent({
      id: `evt-${Date.now()}-${i}`,
      sequenceNumber: i + 1,
      source: source ?? 'test-source',
      type: i % 2 === 0 ? 'user.created' : 'user.updated',
    })
  )
}
