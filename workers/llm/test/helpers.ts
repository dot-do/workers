/**
 * Test helpers for llm.do worker tests
 *
 * Provides mock implementations for LLMDO testing.
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
 * Mock DOStorage interface for llm.do
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
 * Mock DOState for llm.do
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
 * Mock AI Gateway binding
 */
export interface MockAIGateway {
  run: <T>(model: string, input: unknown, options?: { gateway?: string }) => Promise<T>
}

/**
 * Create a mock AI Gateway binding
 */
export function createMockAIGateway(responses?: Map<string, unknown>): MockAIGateway {
  const defaultResponses = new Map<string, unknown>([
    ['claude-3-opus', { content: 'Mock Claude response', usage: { prompt_tokens: 10, completion_tokens: 20 } }],
    ['claude-3-sonnet', { content: 'Mock Sonnet response', usage: { prompt_tokens: 10, completion_tokens: 15 } }],
    ['claude-3-haiku', { content: 'Mock Haiku response', usage: { prompt_tokens: 10, completion_tokens: 10 } }],
    ['gpt-4', { choices: [{ message: { content: 'Mock GPT-4 response' } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }],
    ['gpt-4-turbo', { choices: [{ message: { content: 'Mock GPT-4 Turbo response' } }], usage: { prompt_tokens: 10, completion_tokens: 18 } }],
    ['gpt-3.5-turbo', { choices: [{ message: { content: 'Mock GPT-3.5 response' } }], usage: { prompt_tokens: 8, completion_tokens: 12 } }],
    ['gemini-pro', { candidates: [{ content: { parts: [{ text: 'Mock Gemini response' }] } }] }],
    ['gemini-ultra', { candidates: [{ content: { parts: [{ text: 'Mock Gemini Ultra response' }] } }] }],
    ['@cf/meta/llama-3.1-8b-instruct', { response: 'Mock Llama response' }],
  ])

  const responseMap = responses ?? defaultResponses

  return {
    run: vi.fn(async <T>(model: string, _input: unknown, _options?: { gateway?: string }): Promise<T> => {
      const response = responseMap.get(model)
      if (response) return response as T
      // Return a generic response for unknown models
      return { content: `Mock response for ${model}` } as T
    }),
  }
}

/**
 * Mock Stripe binding for billing
 */
export interface MockStripeBinding {
  usageRecords: {
    create: (params: { subscription_item: string; quantity: number; timestamp: number }) => Promise<{ id: string }>
  }
  subscriptionItems: {
    retrieve: (id: string) => Promise<{ id: string; price: { id: string } }>
  }
  customers: {
    retrieve: (id: string) => Promise<{ id: string; email: string; metadata: Record<string, string> }>
  }
}

/**
 * Create a mock Stripe binding
 */
export function createMockStripe(): MockStripeBinding {
  return {
    usageRecords: {
      create: vi.fn(async (params) => ({ id: `ur_${Math.random().toString(36).slice(2, 10)}` })),
    },
    subscriptionItems: {
      retrieve: vi.fn(async (id) => ({ id, price: { id: 'price_llm_usage' } })),
    },
    customers: {
      retrieve: vi.fn(async (id) => ({ id, email: 'test@example.com', metadata: {} })),
    },
  }
}

/**
 * Mock Vault binding for BYOK key storage
 */
export interface MockVaultBinding {
  get: (orgId: string, key: string) => Promise<string | null>
  set: (orgId: string, key: string, value: string) => Promise<void>
  delete: (orgId: string, key: string) => Promise<boolean>
  list: (orgId: string) => Promise<string[]>
}

/**
 * Create a mock Vault binding
 */
export function createMockVault(secrets?: Map<string, Map<string, string>>): MockVaultBinding {
  const store = secrets ?? new Map<string, Map<string, string>>()

  return {
    get: vi.fn(async (orgId: string, key: string) => {
      return store.get(orgId)?.get(key) ?? null
    }),
    set: vi.fn(async (orgId: string, key: string, value: string) => {
      if (!store.has(orgId)) {
        store.set(orgId, new Map())
      }
      store.get(orgId)!.set(key, value)
    }),
    delete: vi.fn(async (orgId: string, key: string) => {
      return store.get(orgId)?.delete(key) ?? false
    }),
    list: vi.fn(async (orgId: string) => {
      return Array.from(store.get(orgId)?.keys() ?? [])
    }),
  }
}

/**
 * Mock Analytics binding for usage tracking
 */
export interface MockAnalyticsBinding {
  writeDataPoint: (data: {
    indexes: string[]
    blobs: string[]
    doubles: number[]
    timestamp?: number
  }) => void
  query: (sql: string, params?: unknown[]) => Promise<{ data: unknown[] }>
}

/**
 * Create a mock Analytics binding
 */
export function createMockAnalytics(): MockAnalyticsBinding {
  const dataPoints: Array<{
    indexes: string[]
    blobs: string[]
    doubles: number[]
    timestamp: number
  }> = []

  return {
    writeDataPoint: vi.fn((data) => {
      dataPoints.push({
        ...data,
        timestamp: data.timestamp ?? Date.now(),
      })
    }),
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      // Simple mock query response
      return {
        data: dataPoints.map((dp) => ({
          customerId: dp.indexes[0],
          model: dp.indexes[1],
          tokens: dp.doubles[0],
          cost: dp.doubles[1],
          timestamp: dp.timestamp,
        })),
      }
    }),
  }
}

/**
 * Mock environment bindings for llm.do
 */
export interface MockLLMEnv {
  LLM_DO: {
    get: (id: MockDurableObjectId) => unknown
    idFromName: (name: string) => MockDurableObjectId
  }
  AI_GATEWAY: MockAIGateway
  STRIPE: MockStripeBinding
  VAULT: MockVaultBinding
  ANALYTICS: MockAnalyticsBinding
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  GOOGLE_AI_API_KEY: string
  AI_GATEWAY_ACCOUNT_ID: string
  AI_GATEWAY_NAME: string
}

/**
 * Create mock environment
 */
export function createMockEnv(options?: {
  aiResponses?: Map<string, unknown>
  vaultSecrets?: Map<string, Map<string, string>>
}): MockLLMEnv {
  return {
    LLM_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    AI_GATEWAY: createMockAIGateway(options?.aiResponses),
    STRIPE: createMockStripe(),
    VAULT: createMockVault(options?.vaultSecrets),
    ANALYTICS: createMockAnalytics(),
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
    OPENAI_API_KEY: 'sk-test-key',
    GOOGLE_AI_API_KEY: 'test-google-key',
    AI_GATEWAY_ACCOUNT_ID: 'test-account-id',
    AI_GATEWAY_NAME: 'llm-gateway',
  }
}

/**
 * Model pricing configuration (per 1M tokens)
 */
export const MODEL_PRICING = {
  // Anthropic Claude
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  // OpenAI GPT
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Google Gemini
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-ultra': { input: 5.0, output: 15.0 },
  // Workers AI (free tier)
  '@cf/meta/llama-3.1-8b-instruct': { input: 0, output: 0 },
} as const

/**
 * Calculate cost for token usage
 */
export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (!pricing) return 0

  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}
