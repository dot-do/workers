/**
 * Mock factory functions for Cloudflare Workers runtime objects.
 *
 * These functions create mock implementations of Request, Response,
 * Durable Objects, KV Namespaces, and other Cloudflare runtime primitives.
 */

// ============================================================================
// Request/Response Mocks
// ============================================================================

export interface MockRequestOptions {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  json?: unknown
  params?: Record<string, string>
  cf?: Record<string, unknown>
}

export function createMockRequest(options: MockRequestOptions = {}): Request {
  let {
    url = 'https://example.com/',
    method = 'GET',
    headers = {},
    body,
    json,
    params,
    cf,
  } = options

  // Add query params to URL
  if (params && Object.keys(params).length > 0) {
    const urlObj = new URL(url)
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value)
    }
    url = urlObj.toString()
  }

  const requestHeaders = new Headers(headers)

  let requestBody: BodyInit | null = body ?? null
  if (json !== undefined) {
    requestBody = JSON.stringify(json)
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  }

  const request = new Request(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  })

  // Add cf property
  if (cf) {
    Object.defineProperty(request, 'cf', {
      value: cf,
      writable: false,
      enumerable: true,
    })
  }

  return request
}

export interface MockResponseOptions {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  json?: unknown
}

export function createMockResponse(options: MockResponseOptions = {}): Response {
  const {
    status = 200,
    statusText,
    headers = {},
    body,
    json,
  } = options

  const responseHeaders = new Headers(headers)

  let responseBody: BodyInit | null = body ?? null
  if (json !== undefined) {
    responseBody = JSON.stringify(json)
    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'application/json')
    }
  }

  return new Response(responseBody, {
    status,
    statusText,
    headers: responseHeaders,
  })
}

// ============================================================================
// Durable Object Mocks
// ============================================================================

export interface MockDurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number; start?: string; end?: string; reverse?: boolean }): Promise<Map<string, T>>
  getAlarm(): Promise<number | null>
  setAlarm(scheduledTime: number | Date): Promise<void>
  deleteAlarm(): Promise<void>
  sync(): Promise<void>
  transaction<T>(closure: (txn: MockDurableObjectStorage) => Promise<T>): Promise<T>
}

export interface MockDurableObjectStorageOptions {
  initialData?: Record<string, unknown>
}

export function createMockDurableObjectStorage(options?: MockDurableObjectStorageOptions): MockDurableObjectStorage {
  const store = new Map<string, unknown>()
  let alarm: number | null = null

  // Seed initial data
  if (options?.initialData) {
    for (const [key, value] of Object.entries(options.initialData)) {
      store.set(key, value)
    }
  }

  const storage: MockDurableObjectStorage = {
    async get<T = unknown>(keyOrKeys: string | string[]): Promise<T | undefined | Map<string, T>> {
      if (Array.isArray(keyOrKeys)) {
        const result = new Map<string, T>()
        for (const key of keyOrKeys) {
          const value = store.get(key)
          if (value !== undefined) {
            result.set(key, value as T)
          }
        }
        return result
      }
      return store.get(keyOrKeys) as T | undefined
    },

    async put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void> {
      if (typeof keyOrEntries === 'string') {
        store.set(keyOrEntries, value)
      } else {
        for (const [k, v] of Object.entries(keyOrEntries)) {
          store.set(k, v)
        }
      }
    },

    async delete(keyOrKeys: string | string[]): Promise<boolean | number> {
      if (Array.isArray(keyOrKeys)) {
        let count = 0
        for (const key of keyOrKeys) {
          if (store.delete(key)) {
            count++
          }
        }
        return count
      }
      return store.delete(keyOrKeys)
    },

    async deleteAll(): Promise<void> {
      store.clear()
    },

    async list<T = unknown>(options?: { prefix?: string; limit?: number; start?: string; end?: string; reverse?: boolean }): Promise<Map<string, T>> {
      const result = new Map<string, T>()
      let entries = Array.from(store.entries())

      if (options?.prefix) {
        entries = entries.filter(([key]) => key.startsWith(options.prefix!))
      }

      if (options?.start) {
        entries = entries.filter(([key]) => key >= options.start!)
      }

      if (options?.end) {
        entries = entries.filter(([key]) => key < options.end!)
      }

      entries.sort((a, b) => a[0].localeCompare(b[0]))

      if (options?.reverse) {
        entries.reverse()
      }

      if (options?.limit) {
        entries = entries.slice(0, options.limit)
      }

      for (const [key, value] of entries) {
        result.set(key, value as T)
      }

      return result
    },

    async getAlarm(): Promise<number | null> {
      return alarm
    },

    async setAlarm(scheduledTime: number | Date): Promise<void> {
      alarm = typeof scheduledTime === 'number' ? scheduledTime : scheduledTime.getTime()
    },

    async deleteAlarm(): Promise<void> {
      alarm = null
    },

    async sync(): Promise<void> {
      // No-op for mock
    },

    async transaction<T>(closure: (txn: MockDurableObjectStorage) => Promise<T>): Promise<T> {
      // For simplicity, just run the closure with self - no real transactional semantics
      return closure(storage)
    },
  }

  return storage
}

export interface MockDurableObjectId extends DurableObjectId {
  name?: string
}

export interface MockDurableObjectIdOptions {
  name?: string
  id?: string
}

export function createMockDurableObjectId(options?: MockDurableObjectIdOptions | string): MockDurableObjectId {
  // Handle legacy string argument
  const opts = typeof options === 'string' ? { name: options } : options

  const name = opts?.name
  const idString = opts?.id ?? name ?? `id-${Math.random().toString(36).slice(2)}`

  return {
    name,
    toString(): string {
      return idString
    },
    equals(other: DurableObjectId): boolean {
      return this.toString() === other.toString()
    },
  }
}

export interface MockDurableObjectState {
  id: DurableObjectId
  storage: MockDurableObjectStorage
  waitUntil(promise: Promise<unknown>): void
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getWebSockets(tag?: string): WebSocket[]
}

export interface MockDurableObjectStateOptions {
  id?: DurableObjectId
  storage?: MockDurableObjectStorage
}

export function createMockDurableObjectState(options?: MockDurableObjectStateOptions): MockDurableObjectState {
  const id = options?.id ?? createMockDurableObjectId()
  const storage = options?.storage ?? createMockDurableObjectStorage()
  const waitUntilPromises: Promise<unknown>[] = []
  const webSockets: Array<{ ws: WebSocket; tags: string[] }> = []

  return {
    id,
    storage,
    waitUntil(promise: Promise<unknown>): void {
      waitUntilPromises.push(promise)
    },
    async blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
      return callback()
    },
    acceptWebSocket(ws: WebSocket, tags?: string[]): void {
      webSockets.push({ ws, tags: tags ?? [] })
    },
    getWebSockets(tag?: string): WebSocket[] {
      if (tag) {
        return webSockets.filter(s => s.tags.includes(tag)).map(s => s.ws)
      }
      return webSockets.map(s => s.ws)
    },
  }
}

export interface MockDurableObjectStub {
  id: DurableObjectId
  name?: string
  fetch(request: Request | string, init?: RequestInit): Promise<Response>
}

export interface MockDurableObjectStubOptions {
  id?: DurableObjectId
  name?: string
  handler?: (request: Request) => Promise<Response>
  fetchHandler?: (request: Request) => Promise<Response>
}

export function createMockDurableObjectStub(options?: MockDurableObjectStubOptions): MockDurableObjectStub {
  const id = options?.id ?? createMockDurableObjectId(options?.name ? { name: options.name } : undefined)
  const handler = options?.handler ?? options?.fetchHandler

  return {
    id,
    name: options?.name,
    async fetch(requestOrUrl: Request | string, init?: RequestInit): Promise<Response> {
      const request = typeof requestOrUrl === 'string'
        ? new Request(requestOrUrl, init)
        : requestOrUrl

      if (!handler) {
        throw new Error('No handler defined for DurableObjectStub. Provide a handler in options.')
      }

      return handler(request)
    },
  }
}

// ============================================================================
// KV Namespace Mocks
// ============================================================================

export interface MockKVNamespace {
  get(key: string, options?: { type?: 'text' }): Promise<string | null>
  get(key: string, options: { type: 'json' }): Promise<unknown | null>
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>
  getWithMetadata<Metadata = unknown>(key: string, options?: { type?: 'text' }): Promise<{ value: string | null; metadata: Metadata | null }>
  getWithMetadata<Metadata = unknown>(key: string, options: { type: 'json' }): Promise<{ value: unknown | null; metadata: Metadata | null }>
  put(key: string, value: string | ArrayBuffer | ReadableStream | ArrayBufferView, options?: { expirationTtl?: number; expiration?: number; metadata?: unknown }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: unknown }[]; list_complete: boolean; cursor?: string }>
}

export interface MockKVNamespaceOptions {
  initialData?: Record<string, unknown>
  simulateExpiration?: boolean
}

export function createMockKVNamespace(options?: MockKVNamespaceOptions): MockKVNamespace {
  const store = new Map<string, { value: string; metadata?: unknown; expiration?: number }>()
  const simulateExpiration = options?.simulateExpiration ?? true

  // Seed initial data
  if (options?.initialData) {
    for (const [key, value] of Object.entries(options.initialData)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      store.set(key, { value: stringValue })
    }
  }

  const isExpired = (entry: { expiration?: number }): boolean => {
    if (!simulateExpiration) return false
    if (!entry.expiration) return false
    return entry.expiration < Date.now() / 1000
  }

  return {
    async get(key: string, getOptions?: { type?: string }): Promise<unknown> {
      const entry = store.get(key)
      if (!entry) return null

      // Check expiration
      if (isExpired(entry)) {
        store.delete(key)
        return null
      }

      const type = getOptions?.type ?? 'text'
      switch (type) {
        case 'json':
          return JSON.parse(entry.value)
        case 'arrayBuffer':
          return new TextEncoder().encode(entry.value).buffer
        case 'stream':
          return new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(entry.value))
              controller.close()
            },
          })
        case 'text':
        default:
          return entry.value
      }
    },

    async getWithMetadata<Metadata = unknown>(key: string, getOptions?: { type?: string }): Promise<{ value: unknown; metadata: Metadata | null }> {
      const entry = store.get(key)
      if (!entry) return { value: null, metadata: null }

      // Check expiration
      if (isExpired(entry)) {
        store.delete(key)
        return { value: null, metadata: null }
      }

      const type = getOptions?.type ?? 'text'
      let value: unknown
      switch (type) {
        case 'json':
          value = JSON.parse(entry.value)
          break
        case 'text':
        default:
          value = entry.value
      }

      return { value, metadata: (entry.metadata as Metadata) ?? null }
    },

    async put(key: string, value: string | ArrayBuffer | ReadableStream | ArrayBufferView, putOptions?: { expirationTtl?: number; expiration?: number; metadata?: unknown }): Promise<void> {
      let stringValue: string
      if (typeof value === 'string') {
        stringValue = value
      } else if (value instanceof ArrayBuffer) {
        stringValue = new TextDecoder().decode(value)
      } else if (ArrayBuffer.isView(value)) {
        stringValue = new TextDecoder().decode(value)
      } else {
        // ReadableStream - consume it
        const reader = value.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value: chunk } = await reader.read()
          if (done) break
          chunks.push(chunk)
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          combined.set(chunk, offset)
          offset += chunk.length
        }
        stringValue = new TextDecoder().decode(combined)
      }

      let expiration: number | undefined
      if (putOptions?.expiration) {
        expiration = putOptions.expiration
      } else if (putOptions?.expirationTtl) {
        expiration = Math.floor(Date.now() / 1000) + putOptions.expirationTtl
      }

      store.set(key, { value: stringValue, metadata: putOptions?.metadata, expiration })
    },

    async delete(key: string): Promise<void> {
      store.delete(key)
    },

    async list(listOptions?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: unknown }[]; list_complete: boolean; cursor?: string }> {
      const prefix = listOptions?.prefix ?? ''
      const limit = listOptions?.limit ?? 1000
      const startIndex = listOptions?.cursor ? parseInt(listOptions.cursor, 10) : 0

      const allKeys = Array.from(store.entries())
        .filter(([key, entry]) => {
          if (!key.startsWith(prefix)) return false
          if (isExpired(entry)) {
            store.delete(key)
            return false
          }
          return true
        })
        .map(([name, entry]) => ({ name, expiration: entry.expiration, metadata: entry.metadata }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const keys = allKeys.slice(startIndex, startIndex + limit)
      const list_complete = startIndex + limit >= allKeys.length

      return {
        keys,
        list_complete,
        cursor: list_complete ? undefined : String(startIndex + limit),
      }
    },
  }
}

// ============================================================================
// R2 Bucket Mocks
// ============================================================================

export interface MockR2Bucket {
  get(key: string): Promise<MockR2Object | null>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: Record<string, unknown>): Promise<MockR2Object>
  delete(key: string | string[]): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ objects: MockR2Object[]; truncated: boolean; cursor?: string }>
  head(key: string): Promise<MockR2Object | null>
}

export interface MockR2Object {
  key: string
  size: number
  etag: string
  httpMetadata?: Record<string, string>
  customMetadata?: Record<string, string>
  body?: ReadableStream
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
  arrayBuffer(): Promise<ArrayBuffer>
}

export function createMockR2Bucket(): MockR2Bucket {
  const store = new Map<string, { value: string; metadata?: Record<string, unknown> }>()

  const createR2Object = (key: string, value: string): MockR2Object => ({
    key,
    size: new TextEncoder().encode(value).length,
    etag: `"${Math.random().toString(36).slice(2)}"`,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(value))
        controller.close()
      },
    }),
    async text() { return value },
    async json<T = unknown>() { return JSON.parse(value) as T },
    async arrayBuffer() { return new TextEncoder().encode(value).buffer },
  })

  return {
    async get(key: string) {
      const entry = store.get(key)
      if (!entry) return null
      return createR2Object(key, entry.value)
    },
    async put(key: string, value: string | ArrayBuffer | ReadableStream) {
      let stringValue: string
      if (typeof value === 'string') {
        stringValue = value
      } else if (value instanceof ArrayBuffer) {
        stringValue = new TextDecoder().decode(value)
      } else {
        const reader = value.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value: chunk } = await reader.read()
          if (done) break
          chunks.push(chunk)
        }
        stringValue = new TextDecoder().decode(new Uint8Array(chunks.flatMap(c => Array.from(c))))
      }
      store.set(key, { value: stringValue })
      return createR2Object(key, stringValue)
    },
    async delete(keyOrKeys: string | string[]) {
      const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]
      for (const key of keys) {
        store.delete(key)
      }
    },
    async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
      const prefix = options?.prefix ?? ''
      const limit = options?.limit ?? 1000
      const entries = Array.from(store.entries())
        .filter(([key]) => key.startsWith(prefix))
        .slice(0, limit)
        .map(([key, entry]) => createR2Object(key, entry.value))
      return { objects: entries, truncated: false }
    },
    async head(key: string) {
      const entry = store.get(key)
      if (!entry) return null
      const obj = createR2Object(key, entry.value)
      delete (obj as any).body
      return obj
    },
  }
}

// ============================================================================
// D1 Database Mocks
// ============================================================================

export interface MockD1Database {
  prepare(query: string): MockD1PreparedStatement
  batch<T = unknown>(statements: MockD1PreparedStatement[]): Promise<MockD1Result<T>[]>
  exec(query: string): Promise<MockD1ExecResult>
}

export interface MockD1PreparedStatement {
  bind(...values: unknown[]): MockD1PreparedStatement
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<MockD1Result<T>>
  run(): Promise<MockD1Result<unknown>>
  raw<T = unknown[]>(): Promise<T[]>
}

export interface MockD1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: { duration: number; changes?: number; last_row_id?: number }
}

export interface MockD1ExecResult {
  count: number
  duration: number
}

export function createMockD1Database(): MockD1Database {
  return {
    prepare(query: string): MockD1PreparedStatement {
      let boundValues: unknown[] = []

      const statement: MockD1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values
          return statement
        },
        async first<T = Record<string, unknown>>(_column?: string): Promise<T | null> {
          return null
        },
        async all<T = Record<string, unknown>>(): Promise<MockD1Result<T>> {
          return { results: [], success: true, meta: { duration: 0 } }
        },
        async run(): Promise<MockD1Result<unknown>> {
          return { results: [], success: true, meta: { duration: 0, changes: 0 } }
        },
        async raw<T = unknown[]>(): Promise<T[]> {
          return []
        },
      }

      return statement
    },
    async batch<T = unknown>(statements: MockD1PreparedStatement[]): Promise<MockD1Result<T>[]> {
      return statements.map(() => ({ results: [], success: true, meta: { duration: 0 } }))
    },
    async exec(_query: string): Promise<MockD1ExecResult> {
      return { count: 0, duration: 0 }
    },
  }
}

// ============================================================================
// Queue Mocks
// ============================================================================

export interface MockQueue<T = unknown> {
  send(message: T, options?: { contentType?: string }): Promise<void>
  sendBatch(messages: Array<{ body: T; contentType?: string }>): Promise<void>
}

export function createMockQueue<T = unknown>(): MockQueue<T> {
  const messages: T[] = []

  return {
    async send(message: T) {
      messages.push(message)
    },
    async sendBatch(batch: Array<{ body: T }>) {
      for (const msg of batch) {
        messages.push(msg.body)
      }
    },
  }
}

// ============================================================================
// Durable Object Namespace Mocks
// ============================================================================

export interface MockDurableObjectNamespace {
  get(id: DurableObjectId): MockDurableObjectStub
  idFromName(name: string): MockDurableObjectId
  idFromString(id: string): MockDurableObjectId
  newUniqueId(): MockDurableObjectId
}

export interface MockDurableObjectNamespaceOptions {
  handler?: (request: Request) => Promise<Response>
}

export function createMockDurableObjectNamespace(options?: MockDurableObjectNamespaceOptions): MockDurableObjectNamespace {
  const stubs = new Map<string, MockDurableObjectStub>()

  return {
    get(id: DurableObjectId): MockDurableObjectStub {
      const idStr = id.toString()
      if (!stubs.has(idStr)) {
        stubs.set(idStr, createMockDurableObjectStub({
          id: id as MockDurableObjectId,
          handler: options?.handler,
        }))
      }
      return stubs.get(idStr)!
    },
    idFromName(name: string): MockDurableObjectId {
      return createMockDurableObjectId({ name, id: `name:${name}` })
    },
    idFromString(id: string): MockDurableObjectId {
      return createMockDurableObjectId({ id })
    },
    newUniqueId(): MockDurableObjectId {
      return createMockDurableObjectId()
    },
  }
}

// ============================================================================
// Environment Mocks
// ============================================================================

export interface BindingConfig {
  type?: 'kv' | 'durable_object' | 'r2' | 'd1' | 'queue'
  handler?: (request: Request) => Promise<Response>
  [key: string]: unknown
}

export interface MockEnvOptions {
  bindings?: Record<string, string | number | boolean | BindingConfig | unknown>
}

export function createMockEnv<T extends Record<string, unknown> = Record<string, unknown>>(options?: MockEnvOptions): T {
  if (!options?.bindings) {
    return {} as T
  }

  const env: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(options.bindings)) {
    if (value === null || value === undefined) {
      env[key] = value
      continue
    }

    // Check if it's a binding config with type
    if (typeof value === 'object' && !Array.isArray(value) && 'type' in value) {
      const config = value as BindingConfig
      switch (config.type) {
        case 'kv':
          env[key] = createMockKVNamespace()
          break
        case 'durable_object':
          env[key] = createMockDurableObjectNamespace({ handler: config.handler })
          break
        case 'r2':
          env[key] = createMockR2Bucket()
          break
        case 'd1':
          env[key] = createMockD1Database()
          break
        case 'queue':
          env[key] = createMockQueue()
          break
        default:
          env[key] = value
      }
    } else {
      // Plain value or pre-created mock
      env[key] = value
    }
  }

  return env as T
}

// ============================================================================
// ExecutionContext Mocks
// ============================================================================

export interface MockExecutionContext extends ExecutionContext {
  _waitUntilPromises: Promise<unknown>[]
  _passThroughOnException: boolean
  getWaitUntilPromises(): Promise<unknown>[]
  didPassThroughOnException(): boolean
  flushWaitUntil(): Promise<void>
  abortController: AbortController
  dispose(): void
}

export interface MockExecutionContextOptions {
  throwOnWaitUntilReject?: boolean
}

export function createMockExecutionContext(options?: MockExecutionContextOptions): MockExecutionContext {
  const waitUntilPromises: Promise<unknown>[] = []
  let passThroughOnException = false
  const abortController = new AbortController()
  const throwOnReject = options?.throwOnWaitUntilReject ?? false

  const ctx: MockExecutionContext = {
    _waitUntilPromises: waitUntilPromises,
    _passThroughOnException: passThroughOnException,
    abortController,

    waitUntil(promise: Promise<unknown>): void {
      waitUntilPromises.push(promise)
    },

    passThroughOnException(): void {
      passThroughOnException = true
      ctx._passThroughOnException = true
    },

    getWaitUntilPromises(): Promise<unknown>[] {
      return waitUntilPromises
    },

    didPassThroughOnException(): boolean {
      return ctx._passThroughOnException
    },

    async flushWaitUntil(): Promise<void> {
      if (throwOnReject) {
        await Promise.all(waitUntilPromises)
      } else {
        await Promise.allSettled(waitUntilPromises)
      }
    },

    dispose(): void {
      abortController.abort()
    },
  }

  return ctx
}
