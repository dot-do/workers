/**
 * Core types for @dotdo/db
 *
 * Implements ai-database compatible interfaces:
 * - EntityOperations for per-collection CRUD
 * - DBClient for graph operations (Things + Relationships)
 */

// ============================================================================
// RpcTarget Types
// ============================================================================

/**
 * Method allowlist for RpcTarget
 */
export type AllowedMethods = Set<string>

/**
 * RPC request format
 */
export interface RpcRequest {
  id: string
  method: string
  params: unknown[]
}

/**
 * RPC response format
 */
export interface RpcResponse {
  id: string
  result?: unknown
  error?: string
}

// ============================================================================
// Entity Types (ai-database compatible)
// ============================================================================

/**
 * Entity identifier (URL-centric, from ai-database)
 */
export interface EntityId {
  /** Namespace (e.g., 'example.com', 'database.do') */
  ns: string
  /** Type of the entity (e.g., 'user', 'post') */
  type: string
  /** Unique identifier within the namespace and type */
  id: string
  /** Full URL for the entity */
  url?: string
}

/**
 * A Thing is a node in the database (linked data style)
 */
export interface Thing<T extends Record<string, unknown> = Record<string, unknown>>
  extends EntityId {
  /** When the thing was created */
  createdAt: Date
  /** When the thing was last updated */
  updatedAt: Date
  /** Arbitrary properties */
  data: T
  /** JSON-LD context (optional) */
  '@context'?: string | Record<string, unknown>
}

/**
 * Relationship between two things (graph edge)
 */
export interface Relationship<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the relationship */
  id: string
  /** Type of relationship (any string) */
  type: string
  /** Source thing URL */
  from: string
  /** Target thing URL */
  to: string
  /** When the relationship was created */
  createdAt: Date
  /** Optional relationship metadata */
  data?: T
}

// ============================================================================
// CRUD Types (ai-database compatible)
// ============================================================================

/**
 * Options for listing documents/things
 */
export interface ListOptions {
  limit?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  where?: Record<string, unknown>
  filter?: Record<string, unknown>
}

/**
 * Options for creating a thing
 */
export interface CreateOptions<T extends Record<string, unknown>> {
  ns: string
  type: string
  id?: string
  url?: string
  data: T
  '@context'?: string | Record<string, unknown>
}

/**
 * Options for updating a thing
 */
export interface UpdateOptions<T extends Record<string, unknown>> {
  data: Partial<T>
}

/**
 * Options for creating a relationship
 */
export interface RelateOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  type: string
  from: string
  to: string
  data?: T
}

/**
 * Document with ID (simple CRUD)
 */
export interface Document {
  id: string
  [key: string]: unknown
}

// ============================================================================
// EntityOperations Interface (ai-database compatible)
// ============================================================================

/**
 * Per-collection CRUD operations (from ai-database EntityOperations)
 */
export interface EntityOperations<T> {
  /** Get an entity by ID */
  get(id: string): Promise<T | null>

  /** List all entities */
  list(options?: ListOptions): Promise<T[]>

  /** Find entities matching criteria */
  find(where: Partial<T>): Promise<T[]>

  /** Search entities */
  search(query: string, options?: SearchOptions): Promise<T[]>

  /** Create a new entity */
  create(data: Omit<T, 'id'>): Promise<T>
  create(id: string, data: Omit<T, 'id'>): Promise<T>

  /** Update an entity */
  update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T | null>

  /** Upsert an entity */
  upsert(id: string, data: Omit<T, 'id'>): Promise<T>

  /** Delete an entity */
  delete(id: string): Promise<boolean>

  /** Iterate over entities */
  forEach(callback: (entity: T) => void | Promise<void>): Promise<void>
  forEach(
    options: ListOptions,
    callback: (entity: T) => void | Promise<void>
  ): Promise<void>
}

// ============================================================================
// DBClient Interface (ai-database graph operations)
// ============================================================================

/**
 * Database client interface for graph operations (from ai-database)
 */
export interface DBClient<TData extends Record<string, unknown> = Record<string, unknown>> {
  // Thing operations
  list(options?: ListOptions): Promise<Thing<TData>[]>
  find(options: ListOptions): Promise<Thing<TData>[]>
  search(options: ThingSearchOptions): Promise<Thing<TData>[]>
  get(url: string): Promise<Thing<TData> | null>
  getById(ns: string, type: string, id: string): Promise<Thing<TData> | null>
  set(url: string, data: TData): Promise<Thing<TData>>
  create(options: CreateOptions<TData>): Promise<Thing<TData>>
  update(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>>
  upsert(options: CreateOptions<TData>): Promise<Thing<TData>>
  delete(url: string): Promise<boolean>

  // Iteration
  forEach(
    options: ListOptions,
    callback: (thing: Thing<TData>) => void | Promise<void>
  ): Promise<void>

  // Relationship operations
  relate<T extends Record<string, unknown> = Record<string, unknown>>(
    options: RelateOptions<T>
  ): Promise<Relationship<T>>
  unrelate(from: string, type: string, to: string): Promise<boolean>
  related(
    url: string,
    relationshipType?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Thing<TData>[]>
  relationships(
    url: string,
    type?: string,
    direction?: 'from' | 'to' | 'both'
  ): Promise<Relationship[]>

  // Backlinks
  references(url: string, relationshipType?: string): Promise<Thing<TData>[]>
}

/**
 * Search options for things
 */
export interface ThingSearchOptions extends ListOptions {
  query: string
  fields?: string[]
  minScore?: number
}

// ============================================================================
// Events, Actions, Artifacts (from ai-database/ai-workflows)
// ============================================================================

/**
 * Action status for durable execution
 */
export type ActionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

/**
 * Immutable event record (from ai-database)
 */
export interface Event<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier */
  id: string
  /** Event type (e.g., 'Customer.created', 'Order.completed') */
  type: string
  /** When the event occurred */
  timestamp: Date
  /** Event source (workflow, user, system) */
  source: string
  /** Event data payload */
  data: T
  /** Optional correlation ID for tracing */
  correlationId?: string
  /** Optional causation ID (event that caused this) */
  causationId?: string
}

/**
 * Action record for durable execution (from ai-database/ai-workflows)
 */
export interface Action<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier */
  id: string
  /** Actor performing the action (user URL, agent ID, 'system') */
  actor: string
  /** Object being acted upon (thing URL) */
  object: string
  /** Action type (e.g., 'approve', 'process', 'review') */
  action: string
  /** Current status */
  status: ActionStatus
  /** When created */
  createdAt: Date
  /** When last updated */
  updatedAt: Date
  /** When started (status became 'active') */
  startedAt?: Date
  /** When completed or failed */
  completedAt?: Date
  /** Result (when completed) */
  result?: unknown
  /** Error message (when failed) */
  error?: string
  /** Additional metadata */
  metadata?: T
}

/**
 * Artifact type
 */
export type ArtifactType =
  | 'ast'
  | 'types'
  | 'esm'
  | 'cjs'
  | 'worker'
  | 'html'
  | 'markdown'
  | 'bundle'
  | 'sourcemap'
  | string

/**
 * Cached artifact (from ai-database)
 */
export interface Artifact<T = unknown> {
  /** Unique key (usually source URL + artifact type) */
  key: string
  /** Type of artifact */
  type: ArtifactType
  /** Source URL or identifier */
  source: string
  /** Hash of source content (for cache invalidation) */
  sourceHash: string
  /** When created */
  createdAt: Date
  /** When expires (optional TTL) */
  expiresAt?: Date
  /** The artifact content */
  content: T
  /** Content size in bytes */
  size?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Options for creating an event
 */
export interface CreateEventOptions<T extends Record<string, unknown>> {
  type: string
  source: string
  data: T
  correlationId?: string
  causationId?: string
}

/**
 * Options for creating an action
 */
export interface CreateActionOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  actor: string
  object: string
  action: string
  status?: ActionStatus
  metadata?: T
}

/**
 * Options for storing an artifact
 */
export interface StoreArtifactOptions<T = unknown> {
  key: string
  type: ArtifactType
  source: string
  sourceHash: string
  content: T
  ttl?: number
  metadata?: Record<string, unknown>
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  type?: string
  source?: string
  correlationId?: string
  after?: Date
  before?: Date
  limit?: number
  offset?: number
}

/**
 * Action query options
 */
export interface ActionQueryOptions {
  actor?: string
  object?: string
  action?: string
  status?: ActionStatus | ActionStatus[]
  limit?: number
  offset?: number
}

// ============================================================================
// DBClientExtended (Events + Actions + Artifacts)
// ============================================================================

/**
 * Extended DBClient with Events, Actions, and Artifacts (from ai-database)
 */
export interface DBClientExtended<TData extends Record<string, unknown> = Record<string, unknown>>
  extends DBClient<TData> {
  // Event operations (immutable, append-only)
  /** Track an event (analytics-style, append-only) */
  track<T extends Record<string, unknown>>(options: CreateEventOptions<T>): Promise<Event<T>>
  getEvent(id: string): Promise<Event | null>
  queryEvents(options?: EventQueryOptions): Promise<Event[]>

  // Action operations ($.do, $.try, $.send patterns)
  /** Send an action (fire-and-forget, creates in pending state) */
  send<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>>
  /** Do an action (create and immediately start, returns in active state) */
  do<T extends Record<string, unknown>>(options: CreateActionOptions<T>): Promise<Action<T>>
  /** Try an action (with built-in error handling) */
  try<T extends Record<string, unknown>>(
    options: CreateActionOptions<T>,
    fn: () => Promise<unknown>
  ): Promise<Action<T>>
  getAction(id: string): Promise<Action | null>
  queryActions(options?: ActionQueryOptions): Promise<Action[]>
  startAction(id: string): Promise<Action>
  completeAction(id: string, result?: unknown): Promise<Action>
  failAction(id: string, error: string): Promise<Action>
  cancelAction(id: string): Promise<Action>

  // Artifact operations (cached content)
  storeArtifact<T>(options: StoreArtifactOptions<T>): Promise<Artifact<T>>
  getArtifact<T = unknown>(key: string): Promise<Artifact<T> | null>
  getArtifactBySource(source: string, type: ArtifactType): Promise<Artifact | null>
  deleteArtifact(key: string): Promise<boolean>
  cleanExpiredArtifacts(): Promise<number>
}

// ============================================================================
// Workflow Context (from ai-workflows)
// ============================================================================

/**
 * Workflow context ($) for handlers
 */
export interface WorkflowContext {
  /** Send an event (fire and forget, durable) */
  send: <T = unknown>(event: string, data: T) => Promise<void>

  /** Do an action (durable, waits for result, retries on failure) */
  do: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>

  /** Try an action (non-durable, waits for result) */
  try: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>

  /** Workflow state - read/write context data */
  state: Record<string, unknown>

  /** Get workflow state */
  getState: () => WorkflowState

  /** Set a value in context */
  set: <T = unknown>(key: string, value: T) => void

  /** Get a value from context */
  get: <T = unknown>(key: string) => T | undefined

  /** Log message */
  log: (message: string, data?: unknown) => void

  /** Access to database */
  db?: DBClientExtended
}

/**
 * Workflow state
 */
export interface WorkflowState {
  /** Current state name (for state machines) */
  current?: string
  /** Context data */
  context: Record<string, unknown>
  /** Execution history */
  history: WorkflowHistoryEntry[]
}

/**
 * History entry for workflow execution
 */
export interface WorkflowHistoryEntry {
  timestamp: number
  type: 'event' | 'schedule' | 'transition' | 'action'
  name: string
  data?: unknown
}

/**
 * Schedule interval types
 */
export type ScheduleInterval =
  | { type: 'second'; value?: number }
  | { type: 'minute'; value?: number }
  | { type: 'hour'; value?: number }
  | { type: 'day'; value?: number }
  | { type: 'week'; value?: number }
  | { type: 'cron'; expression: string }
  | { type: 'natural'; description: string }

/**
 * Event handler function type
 */
export type EventHandler<T = unknown, R = unknown> = (
  data: T,
  $: WorkflowContext
) => R | void | Promise<R | void>

/**
 * Schedule handler function type
 */
export type ScheduleHandler = ($: WorkflowContext) => void | Promise<void>

// ============================================================================
// MCP Tool Types
// ============================================================================

/**
 * Options for search tool
 */
export interface SearchOptions {
  limit?: number
  collections?: string[]
  fuzzy?: boolean
}

/**
 * Search result
 */
export interface SearchResult {
  id: string
  collection: string
  score: number
  document: Document
}

/**
 * Options for fetch tool
 */
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

/**
 * Fetch result
 */
export interface FetchResult {
  status: number
  headers: Record<string, string>
  body: unknown
  url: string
}

/**
 * Options for do (execute) tool
 */
export interface DoOptions {
  timeout?: number
  memory?: number
  env?: Record<string, unknown>
}

/**
 * Do (execute) result
 */
export interface DoResult {
  success: boolean
  result?: unknown
  error?: string
  logs?: string[]
  duration: number
}

// ============================================================================
// Transport Types
// ============================================================================

/**
 * Transport type for multi-transport support
 */
export type TransportType = 'workers-rpc' | 'http' | 'websocket' | 'mcp'

/**
 * Transport context passed to handlers
 */
export interface TransportContext {
  type: TransportType
  request?: Request
  ws?: WebSocket
  metadata?: Record<string, unknown>
}

// ============================================================================
// Auth Types
// ============================================================================

/**
 * Auth context for authenticated requests
 */
export interface AuthContext {
  userId?: string
  organizationId?: string
  permissions?: string[]
  token?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// WebSocket Hibernation Types
// ============================================================================

/**
 * WebSocket message handler
 */
export type WebSocketMessageHandler = (
  ws: WebSocket,
  message: string | ArrayBuffer
) => Promise<void>

/**
 * WebSocket close handler
 */
export type WebSocketCloseHandler = (
  ws: WebSocket,
  code: number,
  reason: string,
  wasClean: boolean
) => Promise<void>

/**
 * WebSocket error handler
 */
export type WebSocketErrorHandler = (
  ws: WebSocket,
  error: unknown
) => Promise<void>
