/**
 * database.do - What do you want your database to .do for you?
 *
 * Schema-first database with natural language queries and promise pipelining.
 * Based on the ai-database API.
 *
 * @see https://database.do
 *
 * @example
 * ```typescript
 * import { db } from 'database.do'
 *
 * // Natural language queries with tagged templates
 * const leads = await db.Lead`who closed deals this month?`
 * const users = await db.User`active in the last 7 days`
 *
 * // Promise pipelining - chain without await
 * const qualified = await db.Lead.list()
 *   .filter(l => l.score > 80)
 *   .map(l => ({ name: l.name, company: l.company }))
 *
 * // Batch relationship loading
 * const posts = await db.Post.list()
 *   .map(p => ({
 *     title: p.title,
 *     author: p.author,  // Batch loaded!
 *     tags: p.tags,      // Also batch loaded!
 *   }))
 *
 * // Events, Actions, Artifacts
 * await db.track({ type: 'Lead.created', source: 'api', data: lead })
 * await db.send({ actor: 'user-1', object: 'lead-1', action: 'qualify' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Re-export core types from ai-database
export type {
  // Schema types
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,
  PrimitiveType,
  // Thing types
  ThingFlat,
  ThingExpanded,
  Thing,
  // Query types
  QueryOptions,
  ListOptions,
  SearchOptions,
  // Event/Action/Artifact types
  Event,
  Action,
  Artifact,
  ActionStatus,
  ArtifactType,
  // Noun & Verb types
  Noun,
  Verb,
  TypeMeta,
} from 'ai-database'

// Types
export interface DoOptions {
  context?: Record<string, unknown>
  timeout?: number
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

/**
 * Entity operations with promise pipelining
 */
export interface EntityOperations<T> {
  /** List all entities */
  list(options?: { limit?: number; offset?: number; orderBy?: string }): DBPromise<T[]>
  /** Find by query */
  find(where: Partial<T>): DBPromise<T[]>
  /** Search with natural language */
  search(query: string): DBPromise<T[]>
  /** Get by ID */
  get(id: string): Promise<T | null>
  /** Create new entity */
  create(data: Partial<T>): Promise<T>
  /** Update entity */
  update(id: string, data: Partial<T>): Promise<T>
  /** Upsert entity */
  upsert(data: Partial<T> & { id?: string }): Promise<T>
  /** Delete entity */
  delete(id: string): Promise<boolean>
  /** Natural language query */
  (strings: TemplateStringsArray, ...values: unknown[]): DBPromise<T[]>
}

/**
 * Promise with chainable operations
 */
export interface DBPromise<T> extends Promise<T> {
  /** Filter results */
  filter(predicate: (item: T extends (infer U)[] ? U : T) => boolean): DBPromise<T>
  /** Map results */
  map<R>(mapper: (item: T extends (infer U)[] ? U : T) => R): DBPromise<R[]>
  /** First N items */
  take(count: number): DBPromise<T>
  /** Skip N items */
  skip(count: number): DBPromise<T>
  /** Sort results */
  sort(field: string, order?: 'asc' | 'desc'): DBPromise<T>
  /** Get first item */
  first(): Promise<T extends (infer U)[] ? U | null : T | null>
  /** Count results */
  count(): Promise<number>
  /** Iterate with callback */
  forEach(callback: (item: T extends (infer U)[] ? U : T) => void | Promise<void>): Promise<void>
}

/**
 * Event tracking
 */
export interface TrackOptions<T = Record<string, unknown>> {
  type: string
  source: string
  data: T
  correlationId?: string
  causationId?: string
}

/**
 * Action options
 */
export interface ActionOptions<T = Record<string, unknown>> {
  actor: string
  object: string
  action: string
  metadata?: T
}

/**
 * Artifact options
 */
export interface ArtifactOptions<T = unknown> {
  key: string
  type: string
  source: string
  sourceHash: string
  content: T
  ttl?: number
  metadata?: Record<string, unknown>
}

/**
 * Database client with entity operations
 */
export interface DatabaseClient {
  /**
   * Query any entity type with natural language
   *
   * @example
   * ```typescript
   * const results = await db.do`find all active users created this week`
   * ```
   */
  do: TaggedTemplate<Promise<unknown[]>>

  /**
   * Access entity operations by type
   * Returns a proxy that creates EntityOperations for any entity name
   */
  [entityType: string]: EntityOperations<unknown>

  // Event operations

  /**
   * Track an event (analytics-style, append-only)
   */
  track<T = Record<string, unknown>>(options: TrackOptions<T>): Promise<{ id: string; timestamp: Date }>

  /**
   * Query events
   */
  events(options?: {
    type?: string
    source?: string
    correlationId?: string
    after?: Date
    before?: Date
    limit?: number
  }): Promise<Array<{ id: string; type: string; data: unknown; timestamp: Date }>>

  // Action operations ($.send, $.do, $.try patterns)

  /**
   * Send an action (fire-and-forget)
   */
  send<T = Record<string, unknown>>(options: ActionOptions<T>): Promise<{ id: string; status: 'pending' }>

  /**
   * Start an action and wait for completion
   */
  action<T = Record<string, unknown>>(options: ActionOptions<T>): Promise<{ id: string; status: string; result?: unknown }>

  /**
   * Query actions
   */
  actions(options?: {
    actor?: string
    object?: string
    action?: string
    status?: string | string[]
    limit?: number
  }): Promise<Array<{ id: string; actor: string; action: string; status: string }>>

  /**
   * Complete an action
   */
  completeAction(id: string, result?: unknown): Promise<void>

  /**
   * Fail an action
   */
  failAction(id: string, error: string): Promise<void>

  // Artifact operations

  /**
   * Store an artifact
   */
  storeArtifact<T = unknown>(options: ArtifactOptions<T>): Promise<{ key: string }>

  /**
   * Get an artifact
   */
  getArtifact<T = unknown>(key: string): Promise<{ content: T; metadata?: Record<string, unknown> } | null>

  /**
   * Delete an artifact
   */
  deleteArtifact(key: string): Promise<boolean>

  // Schema operations

  /**
   * Get database schema
   */
  schema(): Promise<Record<string, Record<string, string>>>

  /**
   * List entity types
   */
  types(): Promise<string[]>

  /**
   * Describe an entity type
   */
  describe(entityType: string): Promise<{
    name: string
    fields: Record<string, { type: string; required: boolean; relation?: string }>
  }>
}

/**
 * Create a configured database client
 */
export function Database(options?: ClientOptions): DatabaseClient {
  return createClient<DatabaseClient>('https://database.do', options)
}

/**
 * Default database client
 */
export const database: DatabaseClient = Database({
  apiKey: typeof process !== 'undefined' ? (process.env?.DATABASE_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Alias for shorter import
export const db = database

export default database

// Re-export the DB function for local schema definition
export { DB, setProvider, setNLQueryGenerator } from 'ai-database'

export type { ClientOptions } from 'rpc.do'
