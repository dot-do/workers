/**
 * fn.ts - Unified Function Types for workers.do Platform
 *
 * Core pattern: Fn<T, Args, Config> with three calling styles:
 * 1. fn(args, config?) - Direct call
 * 2. fn`${vals}` - Tagged template with interpolation
 * 3. fn`{name}`(params) - Tagged template with named params
 *
 * Variants:
 * - Fn<T, Args, Config> - Synchronous
 * - AsyncFn<T, Args, Config> - Returns Promise<T>
 * - RpcFn<T, Args, Config> - Returns RpcPromise<T> for pipelining
 *
 * @packageDocumentation
 */

import type { RpcPromise } from './rpc.js'

// =============================================================================
// Parameter Extraction from Template Strings
// =============================================================================

/**
 * Extract {param} names from a template string at compile time.
 *
 * @example
 * ```ts
 * type Params = ExtractParams<'SELECT * FROM {table} WHERE id = {id}'>
 * // => 'table' | 'id'
 *
 * type None = ExtractParams<'SELECT * FROM users'>
 * // => never
 * ```
 */
export type ExtractParams<S extends string> =
  S extends `${infer _}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never

/**
 * Check if a string contains any {param} placeholders.
 */
export type HasNamedParams<S extends string> =
  S extends `${infer _}{${infer _Param}}${infer _Rest}` ? true : false

/**
 * Get the parameter record type for a template string.
 */
export type ParamsRecord<S extends string, TValue = unknown> =
  [ExtractParams<S>] extends [never]
    ? Record<string, never>
    : Record<ExtractParams<S>, TValue>

// =============================================================================
// Tagged Template Result Type
// =============================================================================

/**
 * Conditional result type for tagged template calls.
 *
 * If template has {params}, returns a function accepting those params.
 * Otherwise returns the result directly.
 *
 * @typeParam TReturn - The ultimate return type
 * @typeParam S - The template string literal type
 * @typeParam TConfig - Additional config merged with params
 */
export type TaggedResult<TReturn, S extends string, TConfig = {}> =
  [ExtractParams<S>] extends [never]
    ? TReturn
    : (params: Record<ExtractParams<S>, unknown> & Partial<TConfig>) => TReturn

// =============================================================================
// Core Function Type - Fn<T, Args, Config>
// =============================================================================

/**
 * A callable supporting three invocation styles.
 *
 * @typeParam T - Return type
 * @typeParam Args - Input type for direct calls (default: void)
 * @typeParam Config - Optional configuration type (default: {})
 *
 * @example
 * ```ts
 * // Define a SQL function
 * type SqlArgs = { query: string; bindings?: unknown[] }
 * type SqlConfig = { timeout?: number }
 * const sql: Fn<SqlResult, SqlArgs, SqlConfig>
 *
 * // Use all three styles:
 * sql({ query: 'SELECT * FROM users' })           // Direct
 * sql`SELECT * FROM users WHERE id = ${id}`       // Interpolation
 * sql`SELECT * FROM {table}`({ table: 'users' })  // Named params
 * ```
 */
export interface Fn<T, Args = void, Config extends Record<string, unknown> = {}> {
  /**
   * Style 1: Direct call with typed arguments.
   *
   * @param input - The input arguments
   * @param config - Optional configuration
   * @returns The result
   */
  (input: Args, config?: Config): T

  /**
   * Style 2: Tagged template with ${...} interpolation.
   *
   * Interpolated values are passed securely (not string-concatenated).
   *
   * @param strings - Template string parts
   * @param values - Interpolated values
   * @returns The result
   */
  (strings: TemplateStringsArray, ...values: unknown[]): T

  /**
   * Style 3: Tagged template with {name} placeholders.
   *
   * If placeholders found, returns function accepting named params.
   * If no placeholders, returns result directly.
   *
   * @param strings - Template string parts (with {name} placeholders)
   * @returns Function if has params, result otherwise
   */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<T, S, Config>
}

// =============================================================================
// Async Function Type - AsyncFn<T, Args, Config>
// =============================================================================

/**
 * Async version of Fn - returns Promise<T>.
 *
 * @typeParam T - The resolved value type
 * @typeParam Args - Input type for direct calls
 * @typeParam Config - Optional configuration type
 *
 * @example
 * ```ts
 * const fetchUser: AsyncFn<User, { id: string }>
 *
 * await fetchUser({ id: '123' })
 * await fetchUser`/users/${id}`
 * await fetchUser`/users/{id}`({ id: '123' })
 * ```
 */
export interface AsyncFn<T, Args = void, Config extends Record<string, unknown> = {}> {
  /** Direct call returning Promise */
  (input: Args, config?: Config): Promise<T>

  /** Tagged template returning Promise */
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<T>

  /** Named params returning Promise (or function returning Promise) */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<Promise<T>, S, Config>
}

// =============================================================================
// RPC Function Type - RpcFn<T, Args, Config>
// =============================================================================

/**
 * RPC version of Fn - returns RpcPromise<T> for pipelining.
 *
 * RpcPromise enables calling methods on T before awaiting,
 * batching multiple operations into a single round trip.
 *
 * @typeParam T - The resolved value type
 * @typeParam Args - Input type for direct calls
 * @typeParam Config - Optional configuration type
 *
 * @example
 * ```ts
 * const sql: RpcFn<SqlResult, SqlArgs>
 *
 * // Pipelining - all in one round trip:
 * const user = sql`SELECT * FROM users WHERE id = ${id}`.first()
 * const posts = sql`SELECT * FROM posts WHERE user_id = ${id}`.all()
 *
 * // Methods called before await are batched
 * console.log(await user, await posts)
 * ```
 */
export interface RpcFn<T, Args = void, Config extends Record<string, unknown> = {}> {
  /** Direct call returning RpcPromise */
  (input: Args, config?: Config): RpcPromise<T>

  /** Tagged template returning RpcPromise */
  (strings: TemplateStringsArray, ...values: unknown[]): RpcPromise<T>

  /** Named params returning RpcPromise (or function returning RpcPromise) */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<RpcPromise<T>, S, Config>
}

// =============================================================================
// Type Utilities for Function Transformation
// =============================================================================

/**
 * Convert Fn to AsyncFn (wrap return in Promise).
 */
export type ToAsync<F> = F extends Fn<infer T, infer A, infer C>
  ? AsyncFn<T, A, C>
  : never

/**
 * Convert Fn to RpcFn (wrap return in RpcPromise).
 */
export type ToRpc<F> = F extends Fn<infer T, infer A, infer C>
  ? RpcFn<T, A, C>
  : never

/**
 * Extract return type from any Fn variant.
 */
export type FnReturn<F> = F extends Fn<infer T, any, any>
  ? T
  : F extends AsyncFn<infer T, any, any>
  ? T
  : F extends RpcFn<infer T, any, any>
  ? T
  : never

/**
 * Extract args type from any Fn variant.
 */
export type FnArgs<F> = F extends Fn<any, infer A, any>
  ? A
  : F extends AsyncFn<any, infer A, any>
  ? A
  : F extends RpcFn<any, infer A, any>
  ? A
  : never

/**
 * Extract config type from any Fn variant.
 */
export type FnConfig<F> = F extends Fn<any, any, infer C>
  ? C
  : F extends AsyncFn<any, any, infer C>
  ? C
  : F extends RpcFn<any, any, infer C>
  ? C
  : never

// =============================================================================
// Function with Metadata
// =============================================================================

/**
 * Metadata attached to a function.
 */
export interface FnMeta {
  /** Function name */
  name: string
  /** Human-readable description */
  description?: string
  /** Input schema (JSON Schema or similar) */
  input?: FnSchema
  /** Output schema */
  output?: FnSchema
  /** Tags for categorization */
  tags?: string[]
  /** Version */
  version?: string
  /** Deprecation info */
  deprecated?: boolean | string
}

/**
 * Schema for function input/output.
 */
export interface FnSchema {
  type?: string
  properties?: Record<string, unknown>
  required?: string[]
  description?: string
  examples?: unknown[]
}

/**
 * A function with attached metadata.
 */
export type MetaFn<T, Args = void, Config extends Record<string, unknown> = {}> =
  Fn<T, Args, Config> & { readonly meta: FnMeta }

/**
 * Async function with metadata.
 */
export type AsyncMetaFn<T, Args = void, Config extends Record<string, unknown> = {}> =
  AsyncFn<T, Args, Config> & { readonly meta: FnMeta }

/**
 * RPC function with metadata.
 */
export type RpcMetaFn<T, Args = void, Config extends Record<string, unknown> = {}> =
  RpcFn<T, Args, Config> & { readonly meta: FnMeta }

// =============================================================================
// Function Definition (for Registration)
// =============================================================================

/**
 * Define a function for registration with the platform.
 */
export interface FnDef<T, Args = void, Config extends Record<string, unknown> = {}> {
  /** Function name (unique identifier) */
  name: string
  /** Human-readable description */
  description?: string
  /** The implementation */
  handler: (input: Args, config?: Config) => T | Promise<T>
  /** Input validation schema */
  input?: FnSchema
  /** Output schema */
  output?: FnSchema
  /** Function options */
  options?: FnOptions
}

/**
 * Options for function behavior.
 */
export interface FnOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Retry configuration */
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
  /** Caching configuration */
  cache?: {
    ttl?: number
    key?: (input: unknown) => string
  }
  /** Rate limiting */
  rateLimit?: {
    limit: number
    window: number
  }
  /** Whether function is idempotent */
  idempotent?: boolean
  /** Whether function has side effects */
  sideEffects?: boolean
}

// =============================================================================
// Function Registry
// =============================================================================

/**
 * Registry of named functions.
 */
export interface FnRegistry {
  /** Get function by name */
  get<T, Args = void, Config extends Record<string, unknown> = {}>(
    name: string
  ): RpcFn<T, Args, Config> | undefined

  /** Check if function exists */
  has(name: string): boolean

  /** List all function names */
  list(): string[]

  /** Get function metadata */
  meta(name: string): FnMeta | undefined

  /** Call function by name */
  call<T, Args = void>(name: string, input: Args): RpcPromise<T>
}

// =============================================================================
// Function Composition
// =============================================================================

/**
 * Compose functions into a pipeline.
 */
export interface Pipeline<TInput, TOutput> {
  /** Execute the pipeline */
  (input: TInput): RpcPromise<TOutput>

  /** Add transformation step */
  pipe<TNext>(fn: (output: TOutput) => TNext | Promise<TNext>): Pipeline<TInput, TNext>

  /** Add error handler */
  catch<TFallback>(fn: (error: Error) => TFallback): Pipeline<TInput, TOutput | TFallback>

  /** Add side-effect tap */
  tap(fn: (output: TOutput) => void | Promise<void>): Pipeline<TInput, TOutput>

  /** Add conditional branch */
  branch<TTrue, TFalse>(
    condition: (output: TOutput) => boolean,
    onTrue: (output: TOutput) => TTrue,
    onFalse: (output: TOutput) => TFalse
  ): Pipeline<TInput, TTrue | TFalse>
}

/**
 * Create a new pipeline from a function.
 */
export type CreatePipeline = <TInput, TOutput>(
  fn: Fn<TOutput, TInput> | AsyncFn<TOutput, TInput> | RpcFn<TOutput, TInput>
) => Pipeline<TInput, TOutput>

// =============================================================================
// AI Function Types
// =============================================================================

/**
 * A function callable by AI models.
 */
export interface AIFn<T, Args = void> extends RpcFn<T, Args> {
  /** Name for AI model */
  readonly name: string
  /** Description for AI model */
  readonly description: string
  /** Parameters schema for AI */
  readonly parameters: FnSchema
}

/**
 * Tool definition for AI model consumption (OpenAI format).
 */
export interface AITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: FnSchema
  }
}

/**
 * Convert function definition to AI tool format.
 */
export type ToAITool = <T, Args>(def: FnDef<T, Args>) => AITool

// =============================================================================
// Serialization Types (for RPC wire format)
// =============================================================================

/**
 * Serializable representation of a function call.
 *
 * Tagged templates are transformed to this format before RPC:
 *
 * ```ts
 * // User writes:
 * fn`template ${val}`
 *
 * // Proxy transforms to:
 * { method: 'fn', args: [...], template: { strings: [...], values: [...] } }
 * ```
 */
export interface SerializableFnCall<Args = unknown> {
  /** Function/method name */
  method: string
  /** Direct arguments */
  args?: Args
  /** Template data (if called as tagged template) */
  template?: {
    strings: string[]
    values: unknown[]
  }
  /** Named params (if called as fn`{name}`(params)) */
  params?: Record<string, unknown>
  /** Configuration */
  config?: Record<string, unknown>
}

/**
 * Transform options for tagged template → serializable conversion.
 */
export interface FnTransformOptions {
  /** How to serialize templates */
  templateMode?: 'expand' | 'preserve'
  /** Validate before sending */
  validate?: boolean
  /** Debug logging */
  debug?: boolean
}

// =============================================================================
// Proxy Types (for RPC client implementation)
// =============================================================================

/**
 * Client-side proxy that transforms tagged templates to RPC format.
 */
export interface FnProxy<T, Args = void, Config extends Record<string, unknown> = {}>
  extends RpcFn<T, Args, Config> {
  /** Proxy configuration */
  readonly _config: FnTransformOptions
  /** RPC endpoint */
  readonly _endpoint: string
}

/**
 * Create a function proxy for RPC.
 */
export type CreateFnProxy = <T, Args = void, Config extends Record<string, unknown> = {}>(
  endpoint: string,
  method: string,
  options?: FnTransformOptions
) => FnProxy<T, Args, Config>

// =============================================================================
// Builder Pattern
// =============================================================================

/**
 * Fluent builder for creating typed functions.
 */
export interface FnBuilder<T = unknown, Args = void, Config extends Record<string, unknown> = {}> {
  /** Set function name */
  name(name: string): FnBuilder<T, Args, Config>

  /** Set description */
  description(desc: string): FnBuilder<T, Args, Config>

  /** Define input type/schema */
  input<A>(schema?: FnSchema): FnBuilder<T, A, Config>

  /** Define output type/schema */
  output<R>(schema?: FnSchema): FnBuilder<R, Args, Config>

  /** Define config type */
  config<C extends Record<string, unknown>>(defaults?: C): FnBuilder<T, Args, C>

  /** Set options */
  options(opts: FnOptions): FnBuilder<T, Args, Config>

  /** Set the handler and build */
  handler(fn: (input: Args, config?: Config) => T | Promise<T>): FnDef<T, Args, Config>
}

/**
 * Create a function builder.
 */
export type CreateFnBuilder = () => FnBuilder

// =============================================================================
// Re-exports
// =============================================================================

export type { RpcPromise } from './rpc.js'
