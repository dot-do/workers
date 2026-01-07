/**
 * Core DO types and base class
 *
 * Separated to avoid circular imports with agent.ts
 * This file has NO imports from other do-core modules.
 */

/**
 * Minimal Durable Object state interface
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
  setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void
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
 * Storage interface for DO state persistence
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

/**
 * WebSocket request/response pair for auto-response
 */
export interface WebSocketRequestResponsePair {
  readonly request: string
  readonly response: string
}

/**
 * Environment bindings type
 */
export interface DOEnv {
  [key: string]: unknown
}

/**
 * Base class for slim Durable Objects
 * Tests define what this class must implement
 */
export class DOCore<Env extends DOEnv = DOEnv> {
  protected readonly ctx: DOState
  protected readonly env: Env

  constructor(ctx: DOState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  /**
   * Handle incoming HTTP requests
   * This is the primary entry point for DO
   */
  async fetch(_request: Request): Promise<Response> {
    // Stub - implementation in GREEN phase
    throw new Error('DOCore.fetch() not implemented')
  }

  /**
   * Handle scheduled alarms
   */
  async alarm(): Promise<void> {
    // Stub - implementation in GREEN phase
    throw new Error('DOCore.alarm() not implemented')
  }

  /**
   * Handle WebSocket messages (hibernation-compatible)
   */
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
    // Stub - implementation in GREEN phase
    throw new Error('DOCore.webSocketMessage() not implemented')
  }

  /**
   * Handle WebSocket close events (hibernation-compatible)
   */
  async webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    // Stub - implementation in GREEN phase
    throw new Error('DOCore.webSocketClose() not implemented')
  }

  /**
   * Handle WebSocket errors (hibernation-compatible)
   */
  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    // Stub - implementation in GREEN phase
    throw new Error('DOCore.webSocketError() not implemented')
  }
}
