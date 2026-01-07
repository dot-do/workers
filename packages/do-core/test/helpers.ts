/**
 * Shared test helpers for do-core tests
 *
 * Provides mock implementations for DOState, DOStorage, and related types.
 * Extracted to reduce duplication across test files.
 */

import { vi } from 'vitest'
import type { DOState, DOStorage, DurableObjectId, SqlStorage, SqlStorageCursor } from '../src/index.js'

/**
 * Create a mock DurableObjectId
 */
export function createMockId(name?: string): DurableObjectId {
  const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`
  return {
    name,
    toString: () => idString,
    equals: (other: DurableObjectId) => other.toString() === idString,
  }
}

/**
 * Create a mock SQL cursor with optional data
 */
export function createMockSqlCursor<T>(data: T[] = []): SqlStorageCursor<T> {
  let index = 0
  return {
    columnNames: data.length > 0 ? Object.keys(data[0] as object) : [],
    rowsRead: data.length,
    rowsWritten: 0,
    toArray: () => [...data],
    one: () => data[0] ?? null,
    raw: function* () {
      for (const row of data) {
        yield Object.values(row as object) as unknown[]
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
 * Create a mock SQL storage interface
 */
export function createMockSqlStorage(): SqlStorage {
  return {
    exec: <T>() => createMockSqlCursor<T>([]),
  }
}

export interface CreateMockStorageOptions {
  /** Initial data to seed the storage with */
  initialData?: Record<string, unknown>
  /** Initial alarm time */
  initialAlarm?: number | null
}

/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(options: CreateMockStorageOptions = {}): DOStorage {
  const store = new Map<string, unknown>()
  let alarmTime: number | null = options.initialAlarm ?? null

  // Seed initial data
  if (options.initialData) {
    for (const [key, value] of Object.entries(options.initialData)) {
      store.set(key, value)
    }
  }

  const storage: DOStorage = {
    get: vi.fn(async <T>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined> => {
      if (Array.isArray(keyOrKeys)) {
        const result = new Map<string, T>()
        for (const key of keyOrKeys) {
          const value = store.get(key) as T | undefined
          if (value !== undefined) result.set(key, value)
        }
        return result as Map<string, T>
      }
      return store.get(keyOrKeys) as T | undefined
    }),

    put: vi.fn(async <T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> => {
      if (typeof keyOrEntries === 'string') {
        store.set(keyOrEntries, value)
      } else {
        for (const [k, v] of Object.entries(keyOrEntries)) {
          store.set(k, v)
        }
      }
    }),

    delete: vi.fn(async (keyOrKeys: string | string[]): Promise<boolean | number> => {
      if (Array.isArray(keyOrKeys)) {
        let count = 0
        for (const key of keyOrKeys) {
          if (store.delete(key)) count++
        }
        return count
      }
      return store.delete(keyOrKeys)
    }),

    deleteAll: vi.fn(async () => {
      store.clear()
    }),

    list: vi.fn(async <T>(options?: {
      prefix?: string
      start?: string
      startAfter?: string
      end?: string
      reverse?: boolean
      limit?: number
    }): Promise<Map<string, T>> => {
      let entries = Array.from(store.entries())

      // Apply prefix filter
      if (options?.prefix) {
        entries = entries.filter(([key]) => key.startsWith(options.prefix!))
      }

      // Apply start filter (inclusive)
      if (options?.start) {
        entries = entries.filter(([key]) => key >= options.start!)
      }

      // Apply startAfter filter (exclusive)
      if (options?.startAfter) {
        entries = entries.filter(([key]) => key > options.startAfter!)
      }

      // Apply end filter (exclusive)
      if (options?.end) {
        entries = entries.filter(([key]) => key < options.end!)
      }

      // Sort alphabetically (ascending by default)
      entries.sort(([a], [b]) => a.localeCompare(b))

      // Apply reverse
      if (options?.reverse) {
        entries.reverse()
      }

      // Apply limit
      if (options?.limit !== undefined) {
        entries = entries.slice(0, options.limit)
      }

      return new Map(entries) as Map<string, T>
    }),

    getAlarm: vi.fn(async () => alarmTime),

    setAlarm: vi.fn(async (time: number | Date) => {
      alarmTime = time instanceof Date ? time.getTime() : time
    }),

    deleteAlarm: vi.fn(async () => {
      alarmTime = null
    }),

    transaction: vi.fn(async <T>(closure: (txn: DOStorage) => Promise<T>): Promise<T> => {
      // Create a fresh mock storage for the transaction
      return closure(createMockStorage())
    }),

    sql: createMockSqlStorage(),
  }

  return storage
}

export interface CreateMockStateOptions {
  /** Custom ID for the state */
  id?: DurableObjectId
  /** Custom storage for the state */
  storage?: DOStorage
  /** Initial data for auto-created storage */
  initialData?: Record<string, unknown>
}

/**
 * Create a mock DOState
 * @param idOrOptions - Either a DurableObjectId directly or an options object
 */
export function createMockState(idOrOptions?: DurableObjectId | CreateMockStateOptions): DOState {
  // Support both: createMockState(id) and createMockState({ id, storage })
  const options: CreateMockStateOptions = idOrOptions && 'toString' in idOrOptions
    ? { id: idOrOptions }
    : (idOrOptions ?? {})

  const id = options.id ?? createMockId()
  const storage = options.storage ?? createMockStorage({
    initialData: options.initialData,
  })

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
 * Create a mock DOState with WebSocket tracking
 * Returns state with additional helper to track accepted WebSockets
 */
export function createMockStateWithWebSockets(
  options: CreateMockStateOptions = {}
): DOState & { _acceptedWebSockets: Array<{ ws: WebSocket; tags: string[] }> } {
  const id = options.id ?? createMockId()
  const storage = options.storage ?? createMockStorage({
    initialData: options.initialData,
  })
  const acceptedWebSockets: Array<{ ws: WebSocket; tags: string[] }> = []

  return {
    id,
    storage,
    _acceptedWebSockets: acceptedWebSockets,
    blockConcurrencyWhile: vi.fn(async (callback) => callback()),
    acceptWebSocket: vi.fn((ws: WebSocket, tags?: string[]) => {
      acceptedWebSockets.push({ ws, tags: tags ?? [] })
    }),
    getWebSockets: vi.fn((tag?: string) => {
      if (tag) {
        return acceptedWebSockets
          .filter(s => s.tags.includes(tag))
          .map(s => s.ws)
      }
      return acceptedWebSockets.map(s => s.ws)
    }),
    setWebSocketAutoResponse: vi.fn(),
  }
}

