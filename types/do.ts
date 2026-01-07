/**
 * Durable Object Types
 *
 * Core type definitions for Cloudflare Durable Objects:
 * - DOState: The context object passed to DO constructor
 * - DOStorage: KV and SQL storage interface
 * - DOEnv: Environment bindings
 *
 * These types mirror the Cloudflare Workers runtime types but are
 * declared here for use without runtime dependencies.
 *
 * @packageDocumentation
 */

// =============================================================================
// Durable Object ID
// =============================================================================

/**
 * Unique identifier for a Durable Object instance.
 */
export interface DurableObjectId {
  /** Optional name if created with idFromName() */
  readonly name?: string

  /** String representation of the ID */
  toString(): string

  /** Check equality with another ID */
  equals(other: DurableObjectId): boolean
}

/**
 * Namespace for creating Durable Object IDs
 */
export interface DurableObjectNamespace<T = unknown> {
  /** Create a new unique ID */
  newUniqueId(options?: DurableObjectIdOptions): DurableObjectId

  /** Get or create an ID from a name */
  idFromName(name: string): DurableObjectId

  /** Parse an ID from its string representation */
  idFromString(id: string): DurableObjectId

  /** Get a stub for communicating with a DO instance */
  get(id: DurableObjectId): DurableObjectStub<T>
}

/**
 * Options for creating Durable Object IDs
 */
export interface DurableObjectIdOptions {
  /** Jurisdiction restriction for the DO */
  jurisdiction?: 'eu' | 'fedramp'
}

/**
 * Stub for communicating with a Durable Object
 */
export interface DurableObjectStub<T = unknown> {
  /** The ID of the DO this stub points to */
  readonly id: DurableObjectId

  /** Name of the DO (if available) */
  readonly name?: string

  /** Send an HTTP request to the DO */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>

  /** Connect via WebSocket */
  connect(): Promise<WebSocket>
}

// =============================================================================
// Durable Object State
// =============================================================================

/**
 * State object passed to Durable Object constructor.
 *
 * Provides access to storage, ID, and WebSocket management.
 */
export interface DOState {
  /** Unique ID of this DO instance */
  readonly id: DurableObjectId

  /** Storage interface for persisting data */
  readonly storage: DOStorage

  /** Block concurrent requests while callback executes */
  blockConcurrencyWhile(callback: () => Promise<void>): void

  /** Accept a WebSocket for hibernation */
  acceptWebSocket(ws: WebSocket, tags?: string[]): void

  /** Get WebSockets, optionally filtered by tag */
  getWebSockets(tag?: string): WebSocket[]

  /** Set auto-response for ping/pong during hibernation */
  setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void

  /** Get hibernation tags for a WebSocket */
  getTags(ws: WebSocket): string[]

  /** Set hibernatable WebSocket event handler */
  setHibernatableWebSocketEventTimeout(timeout: number): void
}

/**
 * WebSocket auto-response pair for hibernation
 */
export interface WebSocketRequestResponsePair {
  /** Request string to match */
  readonly request: string
  /** Response string to send */
  readonly response: string
}

// =============================================================================
// Durable Object Storage
// =============================================================================

/**
 * Storage interface for DO state persistence.
 *
 * Provides both KV-style operations and SQL access.
 */
export interface DOStorage {
  // -------------------------------------------------------------------------
  // KV-style operations
  // -------------------------------------------------------------------------

  /** Get a single value by key */
  get<T = unknown>(key: string): Promise<T | undefined>

  /** Get multiple values by keys */
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>

  /** Put a single key-value pair */
  put<T>(key: string, value: T): Promise<void>

  /** Put multiple key-value pairs */
  put<T>(entries: Record<string, T>): Promise<void>

  /** Delete a single key */
  delete(key: string): Promise<boolean>

  /** Delete multiple keys */
  delete(keys: string[]): Promise<number>

  /** Delete all data */
  deleteAll(): Promise<void>

  /** List entries with optional filtering */
  list<T = unknown>(options?: DOStorageListOptions): Promise<Map<string, T>>

  // -------------------------------------------------------------------------
  // Alarm operations
  // -------------------------------------------------------------------------

  /** Get the currently scheduled alarm time */
  getAlarm(): Promise<number | null>

  /** Set an alarm for the specified time */
  setAlarm(scheduledTime: number | Date): Promise<void>

  /** Delete the currently scheduled alarm */
  deleteAlarm(): Promise<void>

  // -------------------------------------------------------------------------
  // Transaction support
  // -------------------------------------------------------------------------

  /** Execute operations in a transaction */
  transaction<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>

  // -------------------------------------------------------------------------
  // SQL interface
  // -------------------------------------------------------------------------

  /** SQL storage for advanced queries */
  readonly sql: SqlStorage
}

/**
 * Options for listing storage entries
 */
export interface DOStorageListOptions {
  /** Start key (inclusive) */
  start?: string
  /** Start after this key (exclusive) */
  startAfter?: string
  /** End key (exclusive) */
  end?: string
  /** Key prefix to filter by */
  prefix?: string
  /** Reverse order */
  reverse?: boolean
  /** Maximum entries to return */
  limit?: number
}

// =============================================================================
// SQL Storage
// =============================================================================

/**
 * SQL storage interface for advanced queries.
 *
 * Uses SQLite syntax and supports parameterized queries.
 */
export interface SqlStorage {
  /**
   * Execute a SQL query with optional bindings.
   *
   * @param query - SQL query string with ? placeholders
   * @param bindings - Values to bind to placeholders
   * @returns Cursor for iterating results
   *
   * @example
   * ```ts
   * const results = sql.exec<User>(
   *   'SELECT * FROM users WHERE status = ?',
   *   'active'
   * ).toArray()
   * ```
   */
  exec<T = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): SqlStorageCursor<T>
}

/**
 * Cursor for iterating SQL query results.
 */
export interface SqlStorageCursor<T = Record<string, unknown>> {
  /** Column names from the query result */
  readonly columnNames: string[]

  /** Number of rows read */
  readonly rowsRead: number

  /** Number of rows written (for INSERT/UPDATE/DELETE) */
  readonly rowsWritten: number

  /** Get all rows as an array */
  toArray(): T[]

  /** Get a single row, or null if no results */
  one(): T | null

  /** Iterate raw row arrays (no object mapping) */
  raw<R extends unknown[] = unknown[]>(): IterableIterator<R>

  /** Iterate rows as objects */
  [Symbol.iterator](): IterableIterator<T>
}

// =============================================================================
// Environment Bindings
// =============================================================================

/**
 * Base environment bindings type.
 *
 * Extend this to define your worker's environment.
 *
 * @example
 * ```ts
 * interface MyEnv extends DOEnv {
 *   DATABASE: D1Database
 *   KV: KVNamespace
 *   USERS: DurableObjectNamespace<UserDO>
 * }
 * ```
 */
export interface DOEnv {
  [key: string]: unknown
}

// =============================================================================
// Durable Object Class Types
// =============================================================================

/**
 * Constructor signature for Durable Object classes.
 */
export interface DOConstructor<T = unknown, Env extends DOEnv = DOEnv> {
  new (state: DOState, env: Env): T
}

/**
 * Minimum interface a Durable Object must implement.
 */
export interface DurableObject {
  /** Handle incoming HTTP requests */
  fetch?(request: Request): Promise<Response>

  /** Handle scheduled alarms */
  alarm?(): Promise<void>

  /** Handle WebSocket messages (hibernation) */
  webSocketMessage?(ws: WebSocket, message: string | ArrayBuffer): Promise<void> | void

  /** Handle WebSocket close (hibernation) */
  webSocketClose?(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> | void

  /** Handle WebSocket errors (hibernation) */
  webSocketError?(ws: WebSocket, error: unknown): Promise<void> | void
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration options for Durable Object classes.
 */
export interface DOConfig {
  /** Enable SQL storage */
  sql?: boolean

  /** Schema to initialize */
  schema?: DOSchemaConfig

  /** Enable WebSocket hibernation */
  hibernation?: boolean

  /** Alarm configuration */
  alarm?: DOAlarmConfig
}

/**
 * Schema configuration for automatic table creation.
 */
export interface DOSchemaConfig {
  /** Tables to create */
  tables?: DOTableDefinition[]

  /** Indexes to create */
  indexes?: DOIndexDefinition[]

  /** Run migrations on startup */
  autoMigrate?: boolean
}

/**
 * Table definition for schema initialization.
 */
export interface DOTableDefinition {
  /** Table name */
  name: string

  /** Column definitions */
  columns: DOColumnDefinition[]

  /** Primary key column(s) */
  primaryKey?: string | string[]
}

/**
 * Column definition for schema initialization.
 */
export interface DOColumnDefinition {
  /** Column name */
  name: string

  /** SQLite column type */
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NULL'

  /** Whether the column can be null */
  nullable?: boolean

  /** Default value */
  default?: unknown

  /** Whether this column is unique */
  unique?: boolean
}

/**
 * Index definition for schema initialization.
 */
export interface DOIndexDefinition {
  /** Index name */
  name: string

  /** Table to index */
  table: string

  /** Columns to include in index */
  columns: string[]

  /** Whether the index is unique */
  unique?: boolean
}

/**
 * Alarm configuration.
 */
export interface DOAlarmConfig {
  /** Minimum interval between alarms in ms */
  minInterval?: number

  /** Retry failed alarms */
  retry?: boolean

  /** Maximum retry attempts */
  maxRetries?: number
}
