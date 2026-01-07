/**
 * SQL Types with Tagged Template and RPC Support
 *
 * Combines the Fn<T, Args, Config> pattern with RpcPromise for SQL queries:
 * - Template literal syntax: `db.sql\`SELECT * FROM users\``
 * - Named parameters: `db.sql\`SELECT * FROM {table}\`({ table: 'users' })`
 * - Promise pipelining: `db.users.get('123').sql\`...\``
 *
 * The Sql interface is designed to work through a Proxy wrapper around
 * CapnWeb, enabling transparent RPC with type-safe query building.
 *
 * @packageDocumentation
 */

import type { ExtractParams, Fn, RpcFn, TaggedResult, RpcPromise } from './fn.js'
import type { SqlStorage, SqlStorageCursor } from './do.js'

// =============================================================================
// SQL Result Types
// =============================================================================

/**
 * Result wrapper for SQL queries with convenience methods.
 *
 * @typeParam T - Row type for the query results
 */
export interface SqlResult<T = Record<string, unknown>> {
  /** Get all rows as an array */
  all(): T[]

  /** Get the first row, or null if no results */
  first(): T | null

  /**
   * Get exactly one row.
   * @throws If no results or more than one result
   */
  one(): T

  /** Get the count of rows */
  count(): number

  /** Iterate over rows */
  [Symbol.iterator](): IterableIterator<T>

  /** Access to underlying cursor */
  readonly cursor: SqlStorageCursor<T>
}

/**
 * Async SQL result for use with RpcPromise pipelining.
 */
export interface AsyncSqlResult<T = Record<string, unknown>> {
  /** Get all rows as an array */
  all(): RpcPromise<T[]>

  /** Get the first row, or null if no results */
  first(): RpcPromise<T | null>

  /** Get exactly one row */
  one(): RpcPromise<T>

  /** Get the count of rows */
  count(): RpcPromise<number>
}

// =============================================================================
// SQL Tagged Template Interface
// =============================================================================

/**
 * SQL tagged template function with three calling styles.
 *
 * Designed to work through a CapnWeb Proxy for RPC pipelining.
 *
 * @example
 * ```ts
 * // Style 1: Function call
 * db.sql('SELECT * FROM users')
 * db.sql('SELECT * FROM users WHERE id = ?', userId)
 *
 * // Style 2: Template literal with interpolation
 * db.sql`SELECT * FROM users WHERE id = ${userId}`
 *
 * // Style 3: Named parameters
 * db.sql`SELECT * FROM {table} WHERE {column} = {value}`({
 *   table: 'users',
 *   column: 'id',
 *   value: 123
 * })
 * ```
 */
export interface Sql<T = Record<string, unknown>> {
  /**
   * Function call with query string and optional bindings.
   * Values are passed as parameterized query bindings (safe from injection).
   */
  <R = T>(query: string, ...bindings: unknown[]): SqlResult<R>

  /**
   * Tagged template with direct ${...} interpolation.
   * Interpolated values become parameterized bindings.
   */
  <R = T>(strings: TemplateStringsArray, ...values: unknown[]): SqlResult<R>

  /**
   * Tagged template with {name} placeholders.
   * Returns a function that accepts named parameters.
   */
  <R = T, S extends string = string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): [ExtractParams<S>] extends [never]
    ? SqlResult<R>
    : (params: Record<ExtractParams<S>, unknown>) => SqlResult<R>
}

/**
 * Async SQL for RPC pipelining through CapnWeb Proxy.
 *
 * All methods return RpcPromise, enabling chained calls without await.
 */
export interface AsyncSql<T = Record<string, unknown>> {
  /** Function call returning async result */
  <R = T>(query: string, ...bindings: unknown[]): RpcPromise<SqlResult<R>>

  /** Template literal returning async result */
  <R = T>(strings: TemplateStringsArray, ...values: unknown[]): RpcPromise<SqlResult<R>>

  /** Named params returning async result */
  <R = T, S extends string = string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): [ExtractParams<S>] extends [never]
    ? RpcPromise<SqlResult<R>>
    : (params: Record<ExtractParams<S>, unknown>) => RpcPromise<SqlResult<R>>
}

// =============================================================================
// SQL Interface for Proxy Wrapper
// =============================================================================

/**
 * Full SQL interface exposed on DO instances.
 *
 * This is what you get from `this.sql` on a Durable Object:
 * - Tagged template support
 * - Named parameter support
 * - Low-level exec() access
 * - Transaction support
 *
 * @example
 * ```ts
 * class MyDO {
 *   sql!: SqlInterface
 *
 *   async getUser(id: string) {
 *     // Tagged template
 *     return this.sql`SELECT * FROM users WHERE id = ${id}`.first()
 *
 *     // Named params
 *     return this.sql`SELECT * FROM {table} WHERE id = {id}`({
 *       table: 'users',
 *       id
 *     }).first()
 *
 *     // Low-level
 *     return this.sql.exec<User>('SELECT * FROM users WHERE id = ?', id).one()
 *   }
 * }
 * ```
 */
export interface SqlInterface<T = Record<string, unknown>> extends Sql<T> {
  /**
   * Execute raw SQL with bindings.
   * Provides access to full cursor API.
   */
  exec<R = T>(query: string, ...bindings: unknown[]): SqlStorageCursor<R>

  /**
   * Execute SQL in a transaction.
   */
  transaction<R>(fn: (sql: SqlInterface<T>) => R): Promise<R>

  /**
   * Batch multiple queries for efficiency.
   */
  batch<R extends unknown[]>(
    queries: Array<{ query: string; bindings?: unknown[] }>
  ): R

  /**
   * Access to underlying SqlStorage.
   */
  readonly storage: SqlStorage
}

// =============================================================================
// SQL Proxy Handler Types
// =============================================================================

/**
 * Configuration for SQL Proxy wrapper.
 */
export interface SqlProxyConfig {
  /** Underlying SQL storage */
  storage: SqlStorage

  /** Enable query logging */
  debug?: boolean

  /** Query timeout in milliseconds */
  timeout?: number

  /** Transform query before execution */
  transformQuery?: (query: string, bindings: unknown[]) => [string, unknown[]]

  /** Transform results after execution */
  transformResult?: <T>(result: SqlStorageCursor<T>) => SqlResult<T>
}

/**
 * SQL Proxy handler for intercepting tagged template calls.
 *
 * This enables the CapnWeb integration by:
 * 1. Intercepting template literal calls
 * 2. Building parameterized queries
 * 3. Forwarding to underlying SqlStorage
 * 4. Returning RpcPromise-compatible results
 */
export interface SqlProxyHandler<T = Record<string, unknown>> {
  /**
   * Handle direct function calls: sql('query', ...bindings)
   */
  apply(target: unknown, thisArg: unknown, args: unknown[]): SqlResult<T>

  /**
   * Handle property access for method chaining
   */
  get(target: unknown, prop: string | symbol): unknown

  /**
   * Check if a property exists
   */
  has(target: unknown, prop: string | symbol): boolean
}

// =============================================================================
// RPC Serialization - Tagged Template → fn(args) Transform
// =============================================================================

/**
 * The RPC-serializable format for SQL queries.
 *
 * Tagged templates CANNOT be serialized over RPC. The client-side Proxy
 * must transform:
 *
 * ```ts
 * // User writes:
 * db.sql`SELECT * FROM users WHERE id = ${id}`
 *
 * // Proxy transforms to serializable format:
 * db.sql({ query: 'SELECT * FROM users WHERE id = ?', bindings: [id] })
 *
 * // This goes over RPC wire
 * ```
 *
 * Named parameters work similarly:
 * ```ts
 * // User writes:
 * db.sql`SELECT * FROM {table}`({ table: 'users' })
 *
 * // Proxy transforms to:
 * db.sql({ query: 'SELECT * FROM ?', bindings: ['users'] })
 * ```
 */
export interface SerializableSqlQuery {
  /** The SQL query string with ? placeholders */
  query: string

  /** Binding values (positional, matching ? placeholders) */
  bindings?: unknown[]

  /** Return type hint for deserialization */
  returnType?: 'all' | 'first' | 'one' | 'count' | 'cursor'
}

/**
 * The RPC-wire format for SQL calls.
 *
 * This is what actually gets serialized and sent over CapnWeb.
 */
export type SqlRpcCall = (args: SerializableSqlQuery) => RpcPromise<SqlResult>

/**
 * Transform options for tagged template → serializable conversion.
 */
export interface SqlTransformOptions {
  /** How to handle named {param} placeholders */
  namedParamStyle?: 'positional' | 'named'

  /** Validate SQL before sending */
  validate?: boolean

  /** Log transformed queries (debug) */
  debug?: boolean
}

/**
 * Client-side SQL Proxy that transforms tagged templates to RPC format.
 *
 * This is the magic that makes `db.sql\`...\`` work over RPC:
 *
 * 1. User calls with tagged template syntax
 * 2. Proxy intercepts via `apply` trap
 * 3. Transforms to SerializableSqlQuery
 * 4. Forwards as regular function call over RPC
 * 5. Server receives fn(args) format
 *
 * @example
 * ```ts
 * const sql = createSqlProxy(rpcConnection)
 *
 * // All these get transformed to the same RPC call:
 * sql`SELECT * FROM users WHERE id = ${id}`
 * sql('SELECT * FROM users WHERE id = ?', id)
 * sql({ query: 'SELECT * FROM users WHERE id = ?', bindings: [id] })
 * ```
 */
export interface SqlClientProxy<T = Record<string, unknown>> {
  /**
   * Transform and execute a SQL query.
   *
   * Accepts any of the three calling conventions and transforms
   * to SerializableSqlQuery before RPC.
   */
  <R = T>(
    queryOrStrings: string | TemplateStringsArray | SerializableSqlQuery,
    ...bindingsOrValues: unknown[]
  ): RpcPromise<SqlResult<R>>

  /**
   * Configuration for the proxy
   */
  readonly config: SqlTransformOptions
}

/**
 * Server-side SQL handler that receives serialized queries.
 *
 * Implements the actual SQL execution on the server.
 */
export interface SqlServerHandler<T = Record<string, unknown>> {
  /**
   * Handle a serialized SQL query.
   * This is what receives the RPC call on the server.
   */
  (args: SerializableSqlQuery): SqlResult<T>

  /**
   * Underlying SQL storage
   */
  readonly storage: SqlStorage
}

/**
 * Create a client-side SQL proxy that transforms tagged templates.
 */
export type CreateSqlProxy = <T = Record<string, unknown>>(
  rpc: SqlRpcCall,
  options?: SqlTransformOptions
) => SqlClientProxy<T>

/**
 * Create a server-side SQL handler.
 */
export type CreateSqlHandler = <T = Record<string, unknown>>(
  storage: SqlStorage
) => SqlServerHandler<T>

// =============================================================================
// Query Builder Types
// =============================================================================

/**
 * Parsed SQL template with query and bindings.
 */
export interface ParsedSqlTemplate {
  /** The SQL query with ? placeholders */
  query: string

  /** Binding values in order */
  bindings: unknown[]

  /** Original template strings */
  strings: readonly string[]

  /** Named parameter names (if any) */
  params?: string[]
}

/**
 * Parse a tagged template into SQL query and bindings.
 */
export type ParseSqlTemplate = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => ParsedSqlTemplate

/**
 * Parse a named parameter template.
 */
export type ParseNamedSqlTemplate = <S extends string>(
  strings: TemplateStringsArray & { raw: readonly S[] }
) => {
  query: string
  paramNames: ExtractParams<S>[]
  build: (params: Record<ExtractParams<S>, unknown>) => ParsedSqlTemplate
}

// =============================================================================
// Type-Safe Query Helpers
// =============================================================================

/**
 * Create a typed SQL query function for a specific table.
 *
 * @example
 * ```ts
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * const users = typedTable<User>('users', db.sql)
 *
 * // Type-safe queries:
 * users.select().where({ id: '123' })
 * users.insert({ id: '1', name: 'Alice', email: 'alice@example.com' })
 * users.update({ name: 'Bob' }).where({ id: '123' })
 * users.delete().where({ id: '123' })
 * ```
 */
export interface TypedTable<T extends Record<string, unknown>> {
  /** Select rows */
  select(columns?: (keyof T)[]): SelectQuery<T>

  /** Insert a row */
  insert(data: T): InsertQuery<T>

  /** Update rows */
  update(data: Partial<T>): UpdateQuery<T>

  /** Delete rows */
  delete(): DeleteQuery<T>

  /** Count rows */
  count(): RpcPromise<number>
}

/**
 * Select query builder
 */
export interface SelectQuery<T> {
  where(conditions: Partial<T>): SelectQuery<T>
  orderBy(column: keyof T, direction?: 'asc' | 'desc'): SelectQuery<T>
  limit(n: number): SelectQuery<T>
  offset(n: number): SelectQuery<T>
  first(): RpcPromise<T | null>
  all(): RpcPromise<T[]>
  one(): RpcPromise<T>
}

/**
 * Insert query builder
 */
export interface InsertQuery<T> {
  returning(): RpcPromise<T>
  execute(): RpcPromise<void>
}

/**
 * Update query builder
 */
export interface UpdateQuery<T> {
  where(conditions: Partial<T>): UpdateQuery<T>
  returning(): RpcPromise<T[]>
  execute(): RpcPromise<number>
}

/**
 * Delete query builder
 */
export interface DeleteQuery<T> {
  where(conditions: Partial<T>): DeleteQuery<T>
  returning(): RpcPromise<T[]>
  execute(): RpcPromise<number>
}

// =============================================================================
// Re-exports
// =============================================================================

// Re-export underlying types for convenience
export type { SqlStorage, SqlStorageCursor } from './do.js'
