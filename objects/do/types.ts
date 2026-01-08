/**
 * Core Type Definitions for dotdo
 *
 * This module provides the foundational type definitions for the dotdo package,
 * including DO state, storage, environment bindings, and configuration types.
 *
 * These types are designed to be compatible with Cloudflare Durable Objects API
 * while providing enhanced type safety for the workers.do platform.
 */

// ============================================================================
// Durable Object Core Types
// ============================================================================

/**
 * Durable Object state interface
 *
 * Provides access to the DO's unique ID, storage, and concurrency controls.
 */
export interface DOState {
  /** Unique ID of this DO instance */
  readonly id: DurableObjectId
  /** Storage interface for persisting data */
  readonly storage: DOStorage
  /** Block concurrent requests while initializing */
  blockConcurrencyWhile(callback: () => Promise<void>): void
  /** Accept a WebSocket for hibernation */
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  /** Get WebSockets by tag */
  getWebSockets(tag?: string): WebSocket[]
  /** Set auto-response for hibernated WebSockets */
  setWebSocketAutoResponse?(pair: WebSocketRequestResponsePair): void
  /** Fire-and-forget promise tracking */
  waitUntil?(promise: Promise<unknown>): void
}

/**
 * Durable Object ID interface
 */
export interface DurableObjectId {
  readonly name?: string
  toString(): string
  equals(other: DurableObjectId): boolean
}

/**
 * WebSocket request/response pair for auto-response
 */
export interface WebSocketRequestResponsePair {
  readonly request: string
  readonly response: string
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage interface for DO state persistence
 *
 * Provides KV-style operations, alarm scheduling, transactions, and SQL access.
 */
export interface DOStorage {
  // KV-style operations
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: ListOptions): Promise<Map<string, T>>

  // Alarm operations
  getAlarm(): Promise<number | null>
  setAlarm(scheduledTime: number | Date): Promise<void>
  deleteAlarm(): Promise<void>

  // Transaction support
  transaction<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>

  // SQL interface (advanced)
  readonly sql: SqlStorage
}

/**
 * List options for storage enumeration
 */
export interface ListOptions {
  start?: string
  startAfter?: string
  end?: string
  prefix?: string
  reverse?: boolean
  limit?: number
}

/**
 * SQL storage interface for advanced queries
 */
export interface SqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>
}

/**
 * SQL cursor for iterating results
 */
export interface SqlStorageCursor<T = Record<string, unknown>> {
  readonly columnNames: string[]
  readonly rowsRead: number
  readonly rowsWritten: number
  toArray(): T[]
  one(): T | null
  raw<R extends unknown[] = unknown[]>(): IterableIterator<R>
  [Symbol.iterator](): IterableIterator<T>
}

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Base environment bindings type
 *
 * Extended by specific DO implementations to include their required bindings.
 */
export interface DOEnv {
  [key: string]: unknown
}

/**
 * RPC environment bindings
 *
 * Conventional binding names for heavy dependencies accessed via Worker RPC.
 */
export interface DOEnvRPC extends DOEnv {
  /** JWT operations (sign, verify, decode) */
  JOSE?: JoseBinding
  /** ESBuild compilation */
  ESBUILD?: EsbuildBinding
  /** MDX compilation */
  MDX?: MdxBinding
  /** Stripe payment processing */
  STRIPE?: StripeBinding
  /** Auth for AI and Humans (id.org.ai / WorkOS) */
  ORG?: WorkosBinding
  /** Cloudflare API operations */
  CLOUDFLARE?: CloudflareBinding
  /** AI/LLM gateway */
  LLM?: LlmBinding
  /** Free domains for builders */
  DOMAINS?: DomainsBinding
}

/**
 * Auth environment bindings
 */
export interface DOEnvAuth extends DOEnvRPC {
  /** Better Auth session */
  AUTH_SESSION?: unknown
}

// ============================================================================
// RPC Binding Types
// ============================================================================

/** JOSE Worker RPC binding */
export interface JoseBinding {
  sign(payload: Record<string, unknown>, options?: Record<string, unknown>): Promise<string>
  verify(token: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>
  decode(token: string): Promise<Record<string, unknown>>
}

/** ESBuild Worker RPC binding */
export interface EsbuildBinding {
  build(options: Record<string, unknown>): Promise<Record<string, unknown>>
  transform(code: string, options?: Record<string, unknown>): Promise<{ code: string; map?: string }>
}

/** MDX Worker RPC binding */
export interface MdxBinding {
  compile(source: string, options?: Record<string, unknown>): Promise<{ code: string }>
}

/** Stripe Worker RPC binding */
export interface StripeBinding {
  charges: {
    create(params: Record<string, unknown>): Promise<Record<string, unknown>>
    retrieve(id: string): Promise<Record<string, unknown>>
  }
  subscriptions: {
    create(params: Record<string, unknown>): Promise<Record<string, unknown>>
    update(id: string, params: Record<string, unknown>): Promise<Record<string, unknown>>
    cancel(id: string): Promise<Record<string, unknown>>
  }
  customers: {
    create(params: Record<string, unknown>): Promise<Record<string, unknown>>
    retrieve(id: string): Promise<Record<string, unknown>>
  }
}

/** WorkOS Worker RPC binding */
export interface WorkosBinding {
  sso: {
    getAuthorizationUrl(params: Record<string, unknown>): Promise<string>
    getProfile(code: string): Promise<Record<string, unknown>>
  }
  vault: {
    store(orgId: string, key: string, value: string): Promise<void>
    retrieve(orgId: string, key: string): Promise<string | null>
  }
}

/** Cloudflare Worker RPC binding */
export interface CloudflareBinding {
  zones: {
    list(): Promise<Record<string, unknown>[]>
    get(id: string): Promise<Record<string, unknown>>
  }
  dns: {
    create(zoneId: string, record: Record<string, unknown>): Promise<Record<string, unknown>>
    delete(zoneId: string, recordId: string): Promise<void>
  }
}

/** LLM Worker RPC binding */
export interface LlmBinding {
  complete(params: { model: string; prompt: string; messages?: unknown[] }): Promise<{ content: string }>
  stream(params: { model: string; messages: unknown[] }): ReadableStream
}

/** Domains Worker RPC binding */
export interface DomainsBinding {
  claim(domain: string): Promise<{ success: boolean; domain: string }>
  route(domain: string, target: { worker?: string; zone?: string }): Promise<void>
  verify(domain: string): Promise<{ verified: boolean }>
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * DO configuration options
 */
export interface DOConfig {
  /** Human-readable name for this DO type */
  name?: string
  /** Version identifier */
  version?: string
  /** Enable debug logging */
  debug?: boolean
  /** Custom configuration */
  [key: string]: unknown
}

/**
 * Schema configuration for lazy initialization
 */
export interface SchemaConfig {
  /** Tables to create */
  tables?: TableDefinition[]
  /** Schema version for migrations */
  version?: number
  /** Cache strategy */
  cacheStrategy?: 'strong' | 'weak'
}

/**
 * Table definition for schema initialization
 */
export interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
  indexes?: IndexDefinition[]
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  name: string
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
  primaryKey?: boolean
  notNull?: boolean
  unique?: boolean
  defaultValue?: unknown
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string
  columns: string[]
  unique?: boolean
}

// ============================================================================
// Auth Types
// ============================================================================

/**
 * Authentication context available in auth-enabled DOs
 */
export interface AuthContext {
  /** Current authenticated user */
  user: AuthUser | null
  /** Current session */
  session: AuthSession | null
  /** Check if user is authenticated */
  isAuthenticated(): boolean
  /** Require authentication (throws if not authenticated) */
  requireAuth(): AuthUser
  /** Check if user has a specific permission */
  hasPermission(permission: string): boolean
  /** Check if user has a specific role */
  hasRole(role: string): boolean
}

/**
 * Authenticated user
 */
export interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string
  role?: string
  permissions?: string[]
  metadata?: Record<string, unknown>
  createdAt?: Date
  updatedAt?: Date
}

/**
 * User session
 */
export interface AuthSession {
  id: string
  userId: string
  expiresAt: Date
  token?: string
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

// ============================================================================
// Transport Types
// ============================================================================

/**
 * RPC method handler
 */
export type RPCHandler<TParams = unknown, TResult = unknown> = (
  params: TParams
) => Promise<TResult>

/**
 * RPC method registry
 */
export interface RPCRegistry {
  [method: string]: RPCHandler
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: 'rpc'; method: string; params?: unknown; id?: string | number }
  | { type: 'event'; event: string; data?: unknown }
  | { type: 'ping' }
  | { type: 'pong' }

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Document with standard fields
 */
export interface Document {
  id: string
  createdAt?: string | number
  updatedAt?: string | number
  [key: string]: unknown
}

/**
 * Storage provider interface for CRUD operations
 */
export interface StorageProvider {
  getStorage(): DOStorage
}

/**
 * Constructor type helper for mixins
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T
