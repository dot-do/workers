/**
 * SQL Proxy - Tagged Template to RPC Transform for SQL
 *
 * Transforms tagged template SQL calls into serializable RPC format:
 *
 * ```ts
 * // User writes:
 * db.sql`SELECT * FROM users WHERE id = ${id}`
 *
 * // Proxy transforms to:
 * db.sql({ query: 'SELECT * FROM users WHERE id = ?', bindings: [id] })
 * ```
 *
 * This enables template literal syntax to work over CapnWeb RPC.
 *
 * @packageDocumentation
 */

import type {
  SerializableSqlQuery,
  SqlResult,
  SqlClientProxy,
  SqlTransformOptions,
  ParsedSqlTemplate,
} from '@dotdo/types/sql'
import type { RpcFn, SQLOptions } from '@dotdo/types/fn'
import type { RpcPromise } from '@dotdo/types/rpc'
import {
  isTemplateStringsArray,
  hasNamedParams,
  extractParamNames,
} from './fn-proxy.js'

// Re-export types for convenience
export type {
  SerializableSqlQuery,
  SqlResult,
  SqlClientProxy,
  SqlTransformOptions,
  ParsedSqlTemplate,
}

// =============================================================================
// SQL Template Parsing
// =============================================================================

/**
 * Parse a tagged template into SQL query with ? placeholders and bindings.
 *
 * Handles direct interpolation: sql`SELECT * FROM users WHERE id = ${id}`
 * → query: 'SELECT * FROM users WHERE id = ?', bindings: [id]
 */
function parseTemplateToSql(
  strings: TemplateStringsArray,
  values: unknown[]
): ParsedSqlTemplate {
  // Build query by joining strings with ? placeholders
  let query = strings[0] || ''
  for (let i = 0; i < values.length; i++) {
    query += '?'
    query += strings[i + 1] || ''
  }

  return {
    query: query.trim(),
    bindings: values,
    strings: strings.raw,
  }
}

/**
 * Parse a named parameter template: sql`SELECT * FROM {table} WHERE id = {id}`
 *
 * Returns a function that accepts the named parameters.
 */
function parseNamedSqlTemplate(
  strings: TemplateStringsArray
): { paramNames: string[]; buildQuery: (params: Record<string, unknown>) => ParsedSqlTemplate } {
  const paramNames = extractParamNames(strings)
  const raw = strings.raw.join('')

  // Build template with placeholders preserved
  const templateParts = raw.split(/\{\w+\}/)

  return {
    paramNames,
    buildQuery: (params: Record<string, unknown>) => {
      // Replace {param} with ? and collect bindings in order
      const bindings: unknown[] = []
      let query = templateParts[0] || ''

      for (let i = 0; i < paramNames.length; i++) {
        const paramName = paramNames[i]!
        if (!(paramName in params)) {
          throw new Error(`Missing parameter: ${paramName}`)
        }
        bindings.push(params[paramName])
        query += '?'
        query += templateParts[i + 1] || ''
      }

      return {
        query: query.trim(),
        bindings,
        strings: strings.raw,
        params: paramNames,
      }
    },
  }
}

// =============================================================================
// SQL Proxy Implementation
// =============================================================================

/**
 * Create a SQL proxy that transforms tagged templates to RPC-serializable format.
 *
 * Uses the Fn<Out, In, Opts> pattern:
 * - Out = SqlResult<T>
 * - In = any (accepts string query, template, or SerializableSqlQuery)
 * - Opts = SQLOptions
 *
 * @example
 * ```ts
 * const sql = createSqlProxy<User>(rpcCall)
 *
 * // All of these work:
 * await sql`SELECT * FROM users WHERE id = ${id}`
 * await sql('SELECT * FROM users WHERE id = ?', id)
 * await sql({ query: 'SELECT * FROM users WHERE id = ?', bindings: [id] })
 * await sql`SELECT * FROM {table}`({ table: 'users', timeout: 5000 })
 * ```
 */
export function createSqlProxy<T = Record<string, unknown>>(
  rpcCall: (query: SerializableSqlQuery) => RpcPromise<SqlResult<T>>,
  options: SqlTransformOptions = {}
): SqlClientProxy<T> {
  const { debug = false } = options

  // The actual handler function
  function sqlHandler<R = T>(
    queryOrStrings: string | TemplateStringsArray | SerializableSqlQuery,
    ...bindingsOrValues: unknown[]
  ): RpcPromise<SqlResult<R>> | ((params: Record<string, unknown>) => RpcPromise<SqlResult<R>>) {
    // Case 1: Already serializable format
    if (
      typeof queryOrStrings === 'object' &&
      !Array.isArray(queryOrStrings) &&
      'query' in queryOrStrings
    ) {
      if (debug) {
        console.log('[SQL] Direct query:', queryOrStrings)
      }
      return rpcCall(queryOrStrings as SerializableSqlQuery) as unknown as RpcPromise<SqlResult<R>>
    }

    // Case 2: Regular string query with bindings
    if (typeof queryOrStrings === 'string') {
      const serializable: SerializableSqlQuery = {
        query: queryOrStrings,
        bindings: bindingsOrValues.length > 0 ? bindingsOrValues : undefined,
      }
      if (debug) {
        console.log('[SQL] String query:', serializable)
      }
      return rpcCall(serializable) as unknown as RpcPromise<SqlResult<R>>
    }

    // Case 3: Tagged template literal
    if (isTemplateStringsArray(queryOrStrings)) {
      // Check for named parameters
      if (hasNamedParams(queryOrStrings)) {
        // Return a function that accepts the params
        const { paramNames, buildQuery } = parseNamedSqlTemplate(queryOrStrings)

        if (debug) {
          console.log('[SQL] Named template, params:', paramNames)
        }

        return (params: Record<string, unknown>) => {
          const parsed = buildQuery(params)
          // Extract SQLOptions from params
          const opts: SQLOptions = {}
          for (const [key, value] of Object.entries(params)) {
            if (!paramNames.includes(key)) {
              if (key === 'timeout' || key === 'transaction' || key === 'returnType') {
                (opts as Record<string, unknown>)[key] = value
              }
            }
          }
          const serializable: SerializableSqlQuery = {
            query: parsed.query,
            bindings: parsed.bindings,
            returnType: opts.returnType,
          }
          if (debug) {
            console.log('[SQL] Named query resolved:', serializable)
          }
          return rpcCall(serializable) as unknown as RpcPromise<SqlResult<R>>
        }
      }

      // Direct interpolation
      const parsed = parseTemplateToSql(queryOrStrings, bindingsOrValues)
      const serializable: SerializableSqlQuery = {
        query: parsed.query,
        bindings: parsed.bindings.length > 0 ? parsed.bindings : undefined,
      }
      if (debug) {
        console.log('[SQL] Template query:', serializable)
      }
      return rpcCall(serializable) as unknown as RpcPromise<SqlResult<R>>
    }

    throw new Error('Invalid SQL query format')
  }

  // Add config property
  ;(sqlHandler as unknown as { config: SqlTransformOptions }).config = options

  return sqlHandler as SqlClientProxy<T>
}

// =============================================================================
// Typed SQL Proxy (using Fn pattern)
// =============================================================================

/**
 * Create a typed SQL function using the Fn<Out, In, Opts> pattern.
 *
 * This is the recommended way to create SQL proxies as it integrates
 * with the broader Fn type system.
 *
 * @example
 * ```ts
 * const sql = createTypedSqlProxy<User[]>(rpcCall)
 *
 * // Fully typed
 * const users: User[] = await sql`SELECT * FROM users`.all()
 * ```
 */
export function createTypedSqlProxy<T = Record<string, unknown>>(
  rpcCall: (query: SerializableSqlQuery) => RpcPromise<SqlResult<T>>,
  options: SqlTransformOptions = {}
): RpcFn<SqlResult<T>, any, SQLOptions> {
  return createSqlProxy<T>(rpcCall, options) as unknown as RpcFn<SqlResult<T>, any, SQLOptions>
}

// =============================================================================
// Server-side Handler
// =============================================================================

/**
 * Create a server-side SQL handler that receives serialized queries.
 */
export function createSqlHandler<T = Record<string, unknown>>(
  storage: { exec: <R>(query: string, ...bindings: unknown[]) => { toArray: () => R[]; one: () => R | null } }
): (args: SerializableSqlQuery) => SqlResult<T> {
  return (args: SerializableSqlQuery): SqlResult<T> => {
    const { query, bindings = [] } = args

    const cursor = storage.exec<T>(query, ...bindings)

    // Create SqlResult wrapper
    const result: SqlResult<T> = {
      all: () => cursor.toArray(),
      first: () => {
        const arr = cursor.toArray()
        return arr[0] ?? null
      },
      one: () => {
        const arr = cursor.toArray()
        if (arr.length === 0) {
          throw new Error('Expected one row, got none')
        }
        if (arr.length > 1) {
          throw new Error(`Expected one row, got ${arr.length}`)
        }
        return arr[0]!
      },
      count: () => cursor.toArray().length,
      cursor: cursor as unknown as import('@dotdo/types/sql').SqlStorageCursor<T>,
      [Symbol.iterator]: function* () {
        yield* cursor.toArray()
      },
    }

    return result
  }
}

// =============================================================================
// Proxy Wrapper for Full Object Support
// =============================================================================

/**
 * Create a Proxy wrapper that adds SQL support to any RPC stub.
 *
 * This wraps an existing RPC object to intercept `.sql` property access
 * and return a SqlClientProxy.
 *
 * @example
 * ```ts
 * const dbStub = rpcConnection.getStub<DatabaseService>('db')
 * const db = withSqlProxy(dbStub, rpcCall)
 *
 * // Now db.sql works with tagged templates
 * await db.sql`SELECT * FROM users`
 * ```
 */
export function withSqlProxy<T extends object>(
  target: T,
  rpcCall: (query: SerializableSqlQuery) => RpcPromise<SqlResult>,
  options?: SqlTransformOptions
): T & { sql: SqlClientProxy } {
  const sqlProxy = createSqlProxy(rpcCall, options)

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'sql') {
        return sqlProxy
      }
      return Reflect.get(obj, prop)
    },
  }) as T & { sql: SqlClientProxy }
}

// =============================================================================
// Convenience Exports
// =============================================================================

export { isTemplateStringsArray, hasNamedParams, extractParamNames }
