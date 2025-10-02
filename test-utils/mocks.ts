/**
 * Mock Factories
 *
 * Provides mock implementations of services and resources for testing
 */

import { vi } from 'vitest'

/**
 * Mock Database Service
 */
export function mockDatabaseService() {
  return {
    getThing: vi.fn(async (ns: string, id: string) => ({
      ns,
      id,
      slug: `test-${id}`,
      name: `Test Thing ${id}`,
      description: 'Test description',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    createThing: vi.fn(async (ns: string, data: any) => ({
      ns,
      id: `test-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    updateThing: vi.fn(async (ns: string, id: string, data: any) => ({
      ns,
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    })),
    deleteThing: vi.fn(async (ns: string, id: string) => ({ success: true })),
    listThings: vi.fn(async (ns: string, options?: any) => ({
      items: [],
      total: 0,
      page: 1,
      perPage: 10,
    })),
    searchThings: vi.fn(async (query: string, options?: any) => ({
      items: [],
      total: 0,
    })),
  }
}

/**
 * Mock Auth Service
 */
export function mockAuthService() {
  return {
    verifyToken: vi.fn(async (token: string) => ({
      valid: true,
      userId: 'test-user-123',
      email: 'test@example.com',
      claims: {},
    })),
    createToken: vi.fn(async (userId: string, claims?: any) => ({
      token: 'mock-jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    refreshToken: vi.fn(async (refreshToken: string) => ({
      token: 'mock-new-jwt-token',
      refreshToken: 'mock-new-refresh-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })),
    revokeToken: vi.fn(async (token: string) => ({ success: true })),
  }
}

/**
 * Mock AI Service
 */
export function mockAIService() {
  return {
    generateText: vi.fn(async (prompt: string, options?: any) => ({
      text: 'Mock AI generated text',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    })),
    generateEmbedding: vi.fn(async (text: string) => ({
      embedding: Array(768).fill(0.1),
      dimensions: 768,
    })),
    chat: vi.fn(async (messages: any[], options?: any) => ({
      message: { role: 'assistant', content: 'Mock AI response' },
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    })),
  }
}

/**
 * Mock Search Service
 */
export function mockSearchService() {
  return {
    index: vi.fn(async (id: string, content: string, metadata?: any) => ({ success: true })),
    search: vi.fn(async (query: string, options?: any) => ({
      results: [],
      total: 0,
    })),
    delete: vi.fn(async (id: string) => ({ success: true })),
  }
}

/**
 * Mock Queue Service
 */
export function mockQueueService() {
  return {
    send: vi.fn(async (message: any) => ({ id: 'mock-message-id', timestamp: Date.now() })),
    sendBatch: vi.fn(async (messages: any[]) => ({
      successful: messages.length,
      failed: 0,
    })),
  }
}

/**
 * Mock Events Service
 */
export function mockEventsService() {
  return {
    emit: vi.fn(async (event: string, data: any) => ({ success: true })),
    subscribe: vi.fn((event: string, handler: Function) => ({ unsubscribe: vi.fn() })),
  }
}

/**
 * Mock KV Store
 */
export function mockKVNamespace() {
  const store = new Map<string, string>()

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    list: vi.fn(async (options?: any) => ({
      keys: Array.from(store.keys()).map((name) => ({ name })),
      list_complete: true,
      cursor: '',
    })),
  }
}

/**
 * Mock R2 Bucket
 */
export function mockR2Bucket() {
  const store = new Map<string, ArrayBuffer>()

  return {
    get: vi.fn(async (key: string) => {
      const value = store.get(key)
      return value ? { body: value, arrayBuffer: async () => value } : null
    }),
    put: vi.fn(async (key: string, value: ArrayBuffer) => {
      store.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    list: vi.fn(async (options?: any) => ({
      objects: Array.from(store.keys()).map((key) => ({ key })),
      truncated: false,
    })),
  }
}

/**
 * Mock D1 Database
 */
export function mockD1Database() {
  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: any[]) => ({
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [], success: true })),
        run: vi.fn(async () => ({ success: true, meta: {} })),
      })),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [], success: true })),
      run: vi.fn(async () => ({ success: true, meta: {} })),
    })),
    batch: vi.fn(async (statements: any[]) => statements.map(() => ({ success: true }))),
    exec: vi.fn(async (query: string) => ({ count: 0, duration: 0 })),
  }
}

/**
 * Mock Durable Object
 */
export function mockDurableObject() {
  return {
    fetch: vi.fn(async (request: Request) => new Response('Mock DO response')),
    alarm: vi.fn(async () => {}),
  }
}

/**
 * Mock Environment with all bindings
 */
export function mockEnvironment(overrides: Record<string, any> = {}) {
  return {
    // Environment variables
    ENVIRONMENT: 'test',
    DATABASE_URL: 'http://localhost:5432',
    API_KEY: 'test-api-key',

    // Service bindings (RPC)
    DB: mockDatabaseService(),
    AUTH: mockAuthService(),
    AI: mockAIService(),
    SEARCH: mockSearchService(),
    QUEUE: mockQueueService(),
    EVENTS: mockEventsService(),

    // Resource bindings
    KV: mockKVNamespace(),
    R2: mockR2Bucket(),
    D1: mockD1Database(),

    // Override with custom values
    ...overrides,
  }
}

/**
 * Mock RPC call helper
 */
export function mockRPCCall<T = any>(serviceName: string, method: string, result: T) {
  return vi.fn(async (...args: any[]) => result)
}

/**
 * Mock fetch for external APIs
 */
export function mockFetch(responseBody?: any, responseInit?: ResponseInit) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...responseInit,
    })
  })
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  vi.resetAllMocks()
}
