/**
 * Test helpers for deployer worker tests
 *
 * Provides mock implementations for DeployerDO testing.
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
 * Mock DOStorage interface for deployer
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
 * Mock DOState for deployer
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
 * Mock Cloudflare API responses
 */
export interface MockCloudflareAPI {
  workers: {
    scripts: {
      create: (params: { accountId: string; scriptName: string }) => Promise<MockWorkerScript>
      get: (params: { accountId: string; scriptName: string }) => Promise<MockWorkerScript | null>
      delete: (params: { accountId: string; scriptName: string }) => Promise<void>
      list: (params: { accountId: string }) => Promise<MockWorkerScript[]>
    }
    deployments: {
      create: (params: DeploymentCreateParams) => Promise<MockDeployment>
      get: (params: { accountId: string; scriptName: string; deploymentId: string }) => Promise<MockDeployment | null>
      list: (params: { accountId: string; scriptName: string }) => Promise<MockDeployment[]>
    }
  }
  versions: {
    create: (params: VersionCreateParams) => Promise<MockVersion>
    get: (params: { accountId: string; scriptName: string; versionId: string }) => Promise<MockVersion | null>
    list: (params: { accountId: string; scriptName: string }) => Promise<MockVersion[]>
    rollback: (params: { accountId: string; scriptName: string; versionId: string }) => Promise<MockDeployment>
  }
}

export interface DeploymentCreateParams {
  accountId: string
  scriptName: string
  versionId: string
  annotations?: {
    workerTag?: string
    message?: string
  }
}

export interface VersionCreateParams {
  accountId: string
  scriptName: string
  content: string | ArrayBuffer
  metadata?: Record<string, unknown>
}

export interface MockWorkerScript {
  id: string
  etag: string
  script: string
  size: number
  modified_on: string
  created_on: string
  usage_model: string
  handlers: string[]
}

export interface MockDeployment {
  id: string
  source: 'api' | 'wrangler' | 'dashboard'
  strategy: 'percentage' | 'immediate'
  author_email: string
  annotations?: {
    workers_tag?: string
    workers_message?: string
  }
  versions: Array<{
    version_id: string
    percentage: number
  }>
  created_on: string
}

export interface MockVersion {
  id: string
  number: number
  metadata: Record<string, unknown>
  resources: {
    script: string
    bindings: unknown[]
    script_runtime: {
      usage_model: string
      limits: Record<string, number>
    }
  }
  created_on: string
}

/**
 * Create a mock Cloudflare API
 */
export function createMockCloudflareAPI(): MockCloudflareAPI {
  const scripts = new Map<string, MockWorkerScript>()
  const deployments = new Map<string, MockDeployment[]>()
  const versions = new Map<string, MockVersion[]>()

  return {
    workers: {
      scripts: {
        create: vi.fn(async ({ accountId, scriptName }) => {
          const script: MockWorkerScript = {
            id: scriptName,
            etag: `etag-${Date.now()}`,
            script: '',
            size: 0,
            modified_on: new Date().toISOString(),
            created_on: new Date().toISOString(),
            usage_model: 'standard',
            handlers: ['fetch'],
          }
          scripts.set(`${accountId}:${scriptName}`, script)
          return script
        }),
        get: vi.fn(async ({ accountId, scriptName }) => {
          return scripts.get(`${accountId}:${scriptName}`) ?? null
        }),
        delete: vi.fn(async ({ accountId, scriptName }) => {
          scripts.delete(`${accountId}:${scriptName}`)
        }),
        list: vi.fn(async ({ accountId }) => {
          return Array.from(scripts.entries())
            .filter(([key]) => key.startsWith(`${accountId}:`))
            .map(([, script]) => script)
        }),
      },
      deployments: {
        create: vi.fn(async ({ accountId, scriptName, versionId, annotations }) => {
          const deployment: MockDeployment = {
            id: `deploy-${Date.now()}`,
            source: 'api',
            strategy: 'immediate',
            author_email: 'test@example.com',
            annotations: {
              workers_tag: annotations?.workerTag,
              workers_message: annotations?.message,
            },
            versions: [{ version_id: versionId, percentage: 100 }],
            created_on: new Date().toISOString(),
          }
          const key = `${accountId}:${scriptName}`
          const existing = deployments.get(key) ?? []
          existing.push(deployment)
          deployments.set(key, existing)
          return deployment
        }),
        get: vi.fn(async ({ accountId, scriptName, deploymentId }) => {
          const key = `${accountId}:${scriptName}`
          const scriptDeployments = deployments.get(key) ?? []
          return scriptDeployments.find(d => d.id === deploymentId) ?? null
        }),
        list: vi.fn(async ({ accountId, scriptName }) => {
          const key = `${accountId}:${scriptName}`
          return deployments.get(key) ?? []
        }),
      },
    },
    versions: {
      create: vi.fn(async ({ accountId, scriptName, content, metadata }) => {
        const key = `${accountId}:${scriptName}`
        const existing = versions.get(key) ?? []
        const version: MockVersion = {
          id: `version-${Date.now()}`,
          number: existing.length + 1,
          metadata: metadata ?? {},
          resources: {
            script: typeof content === 'string' ? content : '[binary]',
            bindings: [],
            script_runtime: {
              usage_model: 'standard',
              limits: {},
            },
          },
          created_on: new Date().toISOString(),
        }
        existing.push(version)
        versions.set(key, existing)
        return version
      }),
      get: vi.fn(async ({ accountId, scriptName, versionId }) => {
        const key = `${accountId}:${scriptName}`
        const scriptVersions = versions.get(key) ?? []
        return scriptVersions.find(v => v.id === versionId) ?? null
      }),
      list: vi.fn(async ({ accountId, scriptName }) => {
        const key = `${accountId}:${scriptName}`
        return versions.get(key) ?? []
      }),
      rollback: vi.fn(async ({ accountId, scriptName, versionId }) => {
        const deployment: MockDeployment = {
          id: `deploy-rollback-${Date.now()}`,
          source: 'api',
          strategy: 'immediate',
          author_email: 'test@example.com',
          annotations: {
            workers_message: `Rollback to version ${versionId}`,
          },
          versions: [{ version_id: versionId, percentage: 100 }],
          created_on: new Date().toISOString(),
        }
        const key = `${accountId}:${scriptName}`
        const existing = deployments.get(key) ?? []
        existing.push(deployment)
        deployments.set(key, existing)
        return deployment
      }),
    },
  }
}

/**
 * Mock environment bindings for deployer
 */
export interface MockDeployerEnv {
  DEPLOYER_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE?: MockCloudflareAPI
}

/**
 * Create mock environment
 */
export function createMockEnv(options?: {
  apiToken?: string
  accountId?: string
  cloudflareApi?: MockCloudflareAPI
}): MockDeployerEnv {
  return {
    DEPLOYER_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    CLOUDFLARE_API_TOKEN: options?.apiToken ?? 'mock-api-token',
    CLOUDFLARE_ACCOUNT_ID: options?.accountId ?? 'mock-account-id',
    CLOUDFLARE: options?.cloudflareApi ?? createMockCloudflareAPI(),
  }
}
