/**
 * Test helpers for domains worker tests
 *
 * Provides mock implementations for DomainsDO testing.
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
 * Mock DOStorage interface for domains worker
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
 * Mock DOState for domains worker
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
 * Mock Cloudflare API for domains worker
 */
export interface MockCloudflareAPI {
  zones: {
    addDomain: (domain: string) => Promise<{ success: boolean; zone_id: string }>
    removeDomain: (zoneId: string) => Promise<{ success: boolean }>
    createDNSRecord: (zoneId: string, record: { type: string; name: string; content: string }) => Promise<{ success: boolean; id: string }>
  }
  workers: {
    createRoute: (zoneId: string, pattern: string, workerId: string) => Promise<{ success: boolean }>
    deleteRoute: (zoneId: string, routeId: string) => Promise<{ success: boolean }>
  }
}

/**
 * Create mock Cloudflare API
 */
export function createMockCloudflareAPI(): MockCloudflareAPI {
  return {
    zones: {
      addDomain: vi.fn(async (domain: string) => ({
        success: true,
        zone_id: `zone-${domain.replace(/\./g, '-')}`,
      })),
      removeDomain: vi.fn(async () => ({ success: true })),
      createDNSRecord: vi.fn(async () => ({
        success: true,
        id: `dns-${Math.random().toString(36).slice(2, 10)}`,
      })),
    },
    workers: {
      createRoute: vi.fn(async () => ({ success: true })),
      deleteRoute: vi.fn(async () => ({ success: true })),
    },
  }
}

/**
 * Mock environment bindings for domains worker
 */
export interface MockDomainsEnv {
  DOMAINS_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  CLOUDFLARE?: MockCloudflareAPI
}

/**
 * Create mock environment
 */
export function createMockEnv(): MockDomainsEnv {
  return {
    DOMAINS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    CLOUDFLARE: createMockCloudflareAPI(),
  }
}

/**
 * Free TLDs supported by builder.domains
 */
export const FREE_TLDS = [
  'hq.com.ai',
  'app.net.ai',
  'api.net.ai',
  'hq.sb',
  'io.sb',
  'llc.st',
] as const

export type FreeTLD = typeof FREE_TLDS[number]

/**
 * Domain record interface
 */
export interface DomainRecord {
  id: string
  name: string
  orgId: string
  tld: string
  zoneId?: string
  workerId?: string
  routeId?: string
  status: 'pending' | 'active' | 'error'
  createdAt: number
  updatedAt: number
}

/**
 * Route configuration interface
 */
export interface RouteConfig {
  worker?: string
  workerScript?: string
  customOrigin?: string
}
