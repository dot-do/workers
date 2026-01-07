/**
 * fn.ts - Unified Function Types for workers.do Platform
 *
 * Core pattern: Fn<Out, In, Opts> with three calling styles:
 * 1. fn(input, opts?) - Direct call
 * 2. fn`${vals}` - Tagged template with interpolation
 * 3. fn`{name}`(params) - Tagged template with named params
 *
 * Generic order (most to least important):
 * - Out: Return type (like Promise<T>)
 * - In: Input type (void = no input, any = flexible)
 * - Opts: Options for behavior (model, timeout, etc.)
 *
 * Variants:
 * - Fn<Out, In, Opts> - Synchronous
 * - AsyncFn<Out, In, Opts> - Returns Promise<Out>
 * - RpcFn<Out, In, Opts> - Returns RpcPromise<Out> for pipelining
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
 * @typeParam TOpts - Options merged with params
 */
export type TaggedResult<TReturn, S extends string, TOpts = {}> =
  [ExtractParams<S>] extends [never]
    ? TReturn
    : (params: Record<ExtractParams<S>, unknown> & Partial<TOpts>) => TReturn

// =============================================================================
// Core Function Type - Fn<Out, In, Opts>
// =============================================================================

/**
 * A callable supporting three invocation styles.
 *
 * @typeParam Out - Return type (most important, like Promise<T>)
 * @typeParam In - Input type (default: any for flexible AI-style input)
 * @typeParam Opts - Options type (model, timeout, etc.)
 *
 * @example
 * ```ts
 * // AI function - flexible input, typed output and options
 * const ai: Fn<string, any, { model?: string; temperature?: number }>
 * ai("summarize this")
 * ai`Summarize ${text}`
 * ai`Summarize {content}`({ content: "...", model: "gpt-4" })
 *
 * // SQL function
 * const sql: Fn<User[], any, { timeout?: number }>
 * sql`SELECT * FROM users WHERE id = ${id}`
 *
 * // Typed input when needed
 * const getUser: Fn<User, { id: string }, { cache?: boolean }>
 * getUser({ id: "123" }, { cache: true })
 * ```
 */
export interface Fn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /**
   * Style 1: Direct call with input and optional options.
   *
   * @param input - The input (any serializable value for AI, typed for strict fns)
   * @param opts - Optional options (model, timeout, etc.)
   * @returns The result
   */
  (input: In, opts?: Opts): Out

  /**
   * Style 2: Tagged template with ${...} interpolation.
   *
   * Interpolated values are passed securely (not string-concatenated).
   *
   * @param strings - Template string parts
   * @param values - Interpolated values
   * @returns The result
   */
  (strings: TemplateStringsArray, ...values: unknown[]): Out

  /**
   * Style 3: Tagged template with {name} placeholders.
   *
   * If placeholders found, returns function accepting named params + opts.
   * If no placeholders, returns result directly.
   *
   * @param strings - Template string parts (with {name} placeholders)
   * @returns Function if has params, result otherwise
   */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<Out, S, Opts>
}

// =============================================================================
// Async Function Type - AsyncFn<Out, In, Opts>
// =============================================================================

/**
 * Async version of Fn - returns Promise<Out>.
 *
 * @typeParam Out - The resolved value type
 * @typeParam In - Input type (default: any)
 * @typeParam Opts - Options type
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
export interface AsyncFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Direct call returning Promise */
  (input: In, opts?: Opts): Promise<Out>

  /** Tagged template returning Promise */
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Out>

  /** Named params returning Promise (or function returning Promise) */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<Promise<Out>, S, Opts>
}

// =============================================================================
// RPC Function Type - RpcFn<Out, In, Opts>
// =============================================================================

/**
 * RPC version of Fn - returns RpcPromise<Out> for pipelining.
 *
 * RpcPromise enables calling methods on Out before awaiting,
 * batching multiple operations into a single round trip.
 *
 * @typeParam Out - The resolved value type
 * @typeParam In - Input type (default: any)
 * @typeParam Opts - Options type
 *
 * @example
 * ```ts
 * const sql: RpcFn<SqlResult, any, { timeout?: number }>
 *
 * // Pipelining - all in one round trip:
 * const user = sql`SELECT * FROM users WHERE id = ${id}`.first()
 * const posts = sql`SELECT * FROM posts WHERE user_id = ${id}`.all()
 *
 * // Methods called before await are batched
 * console.log(await user, await posts)
 * ```
 */
export interface RpcFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Direct call returning RpcPromise */
  (input: In, opts?: Opts): RpcPromise<Out>

  /** Tagged template returning RpcPromise */
  (strings: TemplateStringsArray, ...values: unknown[]): RpcPromise<Out>

  /** Named params returning RpcPromise (or function returning RpcPromise) */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<RpcPromise<Out>, S, Opts>
}

// =============================================================================
// Type Utilities for Function Transformation
// =============================================================================

/**
 * Convert Fn to AsyncFn (wrap return in Promise).
 */
export type ToAsync<F> = F extends Fn<infer Out, infer In, infer Opts>
  ? AsyncFn<Out, In, Opts>
  : never

/**
 * Convert Fn to RpcFn (wrap return in RpcPromise).
 */
export type ToRpc<F> = F extends Fn<infer Out, infer In, infer Opts>
  ? RpcFn<Out, In, Opts>
  : never

/**
 * Extract output type from any Fn variant.
 */
export type FnOut<F> = F extends Fn<infer Out, any, any>
  ? Out
  : F extends AsyncFn<infer Out, any, any>
  ? Out
  : F extends RpcFn<infer Out, any, any>
  ? Out
  : never

/**
 * Extract input type from any Fn variant.
 */
export type FnIn<F> = F extends Fn<any, infer In, any>
  ? In
  : F extends AsyncFn<any, infer In, any>
  ? In
  : F extends RpcFn<any, infer In, any>
  ? In
  : never

/**
 * Extract options type from any Fn variant.
 */
export type FnOpts<F> = F extends Fn<any, any, infer Opts>
  ? Opts
  : F extends AsyncFn<any, any, infer Opts>
  ? Opts
  : F extends RpcFn<any, any, infer Opts>
  ? Opts
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
export type MetaFn<Out, In = any, Opts extends Record<string, unknown> = {}> =
  Fn<Out, In, Opts> & { readonly meta: FnMeta }

/**
 * Async function with metadata.
 */
export type AsyncMetaFn<Out, In = any, Opts extends Record<string, unknown> = {}> =
  AsyncFn<Out, In, Opts> & { readonly meta: FnMeta }

/**
 * RPC function with metadata.
 */
export type RpcMetaFn<Out, In = any, Opts extends Record<string, unknown> = {}> =
  RpcFn<Out, In, Opts> & { readonly meta: FnMeta }

// =============================================================================
// Function Definition (for Registration)
// =============================================================================

/**
 * Define a function for registration with the platform.
 */
export interface FnDef<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Function name (unique identifier) */
  name: string
  /** Human-readable description */
  description?: string
  /** The implementation */
  handler: (input: In, opts?: Opts) => Out | Promise<Out>
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
  get<Out, In = any, Opts extends Record<string, unknown> = {}>(
    name: string
  ): RpcFn<Out, In, Opts> | undefined

  /** Check if function exists */
  has(name: string): boolean

  /** List all function names */
  list(): string[]

  /** Get function metadata */
  meta(name: string): FnMeta | undefined

  /** Call function by name */
  call<Out, In = any>(name: string, input: In): RpcPromise<Out>
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
export interface AIFn<Out, In = any> extends RpcFn<Out, In> {
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
export type ToAITool = <Out, In>(def: FnDef<Out, In>) => AITool

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
export interface FnProxy<Out, In = any, Opts extends Record<string, unknown> = {}>
  extends RpcFn<Out, In, Opts> {
  /** Proxy configuration */
  readonly _config: FnTransformOptions
  /** RPC endpoint */
  readonly _endpoint: string
}

/**
 * Create a function proxy for RPC.
 */
export type CreateFnProxy = <Out, In = any, Opts extends Record<string, unknown> = {}>(
  endpoint: string,
  method: string,
  options?: FnTransformOptions
) => FnProxy<Out, In, Opts>

// =============================================================================
// Builder Pattern
// =============================================================================

/**
 * Fluent builder for creating typed functions.
 */
export interface FnBuilder<Out = unknown, In = any, Opts extends Record<string, unknown> = {}> {
  /** Set function name */
  name(name: string): FnBuilder<Out, In, Opts>

  /** Set description */
  description(desc: string): FnBuilder<Out, In, Opts>

  /** Define input type/schema */
  input<I>(schema?: FnSchema): FnBuilder<Out, I, Opts>

  /** Define output type/schema */
  output<O>(schema?: FnSchema): FnBuilder<O, In, Opts>

  /** Define options type */
  opts<O extends Record<string, unknown>>(defaults?: O): FnBuilder<Out, In, O>

  /** Set function behavior options */
  options(opts: FnOptions): FnBuilder<Out, In, Opts>

  /** Set the handler and build */
  handler(fn: (input: In, opts?: Opts) => Out | Promise<Out>): FnDef<Out, In, Opts>
}

/**
 * Create a function builder.
 */
export type CreateFnBuilder = () => FnBuilder

// =============================================================================
// Streaming Types (for AI responses)
// =============================================================================

/**
 * A function that returns a stream of values.
 *
 * Critical for AI streaming responses where tokens arrive incrementally.
 *
 * @example
 * ```ts
 * const stream: StreamFn<string, any, { model?: string }>
 *
 * for await (const chunk of stream`Tell me a story`) {
 *   process.stdout.write(chunk)
 * }
 * ```
 */
export interface StreamFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Direct call returning async iterable */
  (input: In, opts?: Opts): AsyncIterable<Out>

  /** Tagged template returning async iterable */
  (strings: TemplateStringsArray, ...values: unknown[]): AsyncIterable<Out>

  /** Named params returning async iterable */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<AsyncIterable<Out>, S, Opts>
}

/**
 * RPC streaming function with pipelining support.
 */
export interface RpcStreamFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Direct call returning RPC stream */
  (input: In, opts?: Opts): RpcStream<Out>

  /** Tagged template returning RPC stream */
  (strings: TemplateStringsArray, ...values: unknown[]): RpcStream<Out>

  /** Named params returning RPC stream */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<RpcStream<Out>, S, Opts>
}

/**
 * RPC stream with pipelining and collection methods.
 */
export interface RpcStream<Out> extends AsyncIterable<Out> {
  /** Collect all chunks into array */
  collect(): RpcPromise<Out[]>

  /** Collect all chunks into single value (for strings) */
  text(): RpcPromise<string>

  /** Get first chunk */
  first(): RpcPromise<Out | undefined>

  /** Get last chunk */
  last(): RpcPromise<Out | undefined>

  /** Count chunks */
  count(): RpcPromise<number>

  /** Transform each chunk */
  map<T>(fn: (chunk: Out) => T): RpcStream<T>

  /** Filter chunks */
  filter(fn: (chunk: Out) => boolean): RpcStream<Out>

  /** Reduce chunks */
  reduce<T>(fn: (acc: T, chunk: Out) => T, initial: T): RpcPromise<T>
}

// =============================================================================
// Context Types (for request handling)
// =============================================================================

/**
 * Execution context passed through function chains.
 *
 * Contains request metadata, user info, and tracing data.
 */
export interface FnContext {
  /** Unique request ID for tracing */
  requestId?: string

  /** User ID (from auth) */
  userId?: string

  /** Organization ID */
  orgId?: string

  /** API key ID (if using API key auth) */
  apiKeyId?: string

  /** Request timestamp */
  timestamp?: number

  /** Timeout remaining (ms) */
  timeoutMs?: number

  /** Parent span ID for distributed tracing */
  traceId?: string
  spanId?: string
  parentSpanId?: string

  /** Custom metadata */
  metadata?: Record<string, unknown>

  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Function that receives context as first argument.
 */
export interface ContextFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Call with context */
  (ctx: FnContext, input: In, opts?: Opts): Out

  /** Bind context for subsequent calls */
  withContext(ctx: FnContext): Fn<Out, In, Opts>
}

/**
 * Async context-aware function.
 */
export interface AsyncContextFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  (ctx: FnContext, input: In, opts?: Opts): Promise<Out>
  withContext(ctx: FnContext): AsyncFn<Out, In, Opts>
}

/**
 * RPC context-aware function.
 */
export interface RpcContextFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  (ctx: FnContext, input: In, opts?: Opts): RpcPromise<Out>
  withContext(ctx: FnContext): RpcFn<Out, In, Opts>
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Standard function error structure.
 */
export interface FnError {
  /** Error code (e.g., 'VALIDATION_ERROR', 'TIMEOUT', 'RATE_LIMITED') */
  code: string

  /** Human-readable message */
  message: string

  /** Additional error details */
  details?: unknown

  /** Whether the operation can be retried */
  retryable?: boolean

  /** Suggested retry delay (ms) */
  retryAfter?: number

  /** Original error (if wrapped) */
  cause?: Error

  /** Stack trace */
  stack?: string
}

/**
 * Result type for functions that can fail.
 *
 * Provides explicit error handling without exceptions.
 */
export type FnResult<T, E = FnError> =
  | { ok: true; value: T; error?: never }
  | { ok: false; value?: never; error: E }

/**
 * Function that returns a Result instead of throwing.
 */
export interface SafeFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  (input: In, opts?: Opts): FnResult<Out>
  (strings: TemplateStringsArray, ...values: unknown[]): FnResult<Out>
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<FnResult<Out>, S, Opts>
}

/**
 * Async safe function.
 */
export interface AsyncSafeFn<Out, In = any, Opts extends Record<string, unknown> = {}> {
  (input: In, opts?: Opts): Promise<FnResult<Out>>
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<FnResult<Out>>
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] }
  ): TaggedResult<Promise<FnResult<Out>>, S, Opts>
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Middleware that wraps function execution.
 *
 * @example
 * ```ts
 * const loggingMiddleware: FnMiddleware = (next) => async (input, opts) => {
 *   console.log('Calling with:', input)
 *   const result = await next(input, opts)
 *   console.log('Result:', result)
 *   return result
 * }
 * ```
 */
export type FnMiddleware<Out = any, In = any, Opts extends Record<string, unknown> = {}> = (
  next: AsyncFn<Out, In, Opts>
) => AsyncFn<Out, In, Opts>

/**
 * Middleware with access to context.
 */
export type ContextMiddleware<Out = any, In = any, Opts extends Record<string, unknown> = {}> = (
  next: AsyncContextFn<Out, In, Opts>
) => AsyncContextFn<Out, In, Opts>

/**
 * Before/after hooks for function execution.
 */
export interface FnHooks<Out, In = any, Opts extends Record<string, unknown> = {}> {
  /** Called before execution */
  before?: (input: In, opts?: Opts) => void | Promise<void>

  /** Called after successful execution */
  after?: (result: Out, input: In, opts?: Opts) => void | Promise<void>

  /** Called on error */
  onError?: (error: Error, input: In, opts?: Opts) => void | Promise<void>

  /** Called after execution (success or error) */
  finally?: (input: In, opts?: Opts) => void | Promise<void>
}

/**
 * Apply hooks to a function.
 */
export type WithHooks = <Out, In, Opts extends Record<string, unknown>>(
  fn: AsyncFn<Out, In, Opts>,
  hooks: FnHooks<Out, In, Opts>
) => AsyncFn<Out, In, Opts>

// =============================================================================
// Batch & Parallel Execution
// =============================================================================

/**
 * Execute multiple function calls in parallel.
 *
 * @example
 * ```ts
 * const results = await batch([
 *   sql`SELECT * FROM users WHERE id = ${id1}`,
 *   sql`SELECT * FROM users WHERE id = ${id2}`,
 *   sql`SELECT * FROM posts WHERE user_id = ${id1}`,
 * ])
 * ```
 */
export type BatchFn = <T extends RpcPromise<unknown>[]>(
  calls: [...T]
) => RpcPromise<{ [K in keyof T]: Awaited<T[K]> }>

/**
 * Execute functions with controlled concurrency.
 */
export interface ConcurrentOptions {
  /** Max concurrent executions */
  limit?: number
  /** Stop on first error */
  stopOnError?: boolean
}

export type ConcurrentFn = <T, In>(
  fn: AsyncFn<T, In>,
  inputs: In[],
  options?: ConcurrentOptions
) => Promise<FnResult<T>[]>

// =============================================================================
// Partial Application & Currying
// =============================================================================

/**
 * Partially apply options to a function.
 *
 * @example
 * ```ts
 * const gpt4 = ai.withOpts({ model: 'gpt-4' })
 * const response = await gpt4`Summarize ${text}`
 * ```
 */
export type WithOpts<Out, In, Opts extends Record<string, unknown>> = (
  defaults: Partial<Opts>
) => Fn<Out, In, Opts>

/**
 * Function with partial application support.
 */
export interface PartialFn<Out, In = any, Opts extends Record<string, unknown> = {}>
  extends Fn<Out, In, Opts> {
  /** Apply default options */
  withOpts(defaults: Partial<Opts>): PartialFn<Out, In, Opts>

  /** Bind specific input */
  withInput(input: In): Fn<Out, void, Opts>
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validator function for input/output.
 */
export type Validator<T> = (value: unknown) => value is T

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean
  errors?: Array<{
    path: string
    message: string
    code?: string
  }>
}

/**
 * Schema validator (Zod-like interface).
 */
export interface SchemaValidator<T> {
  parse(value: unknown): T
  safeParse(value: unknown): FnResult<T, ValidationResult>
  optional(): SchemaValidator<T | undefined>
  nullable(): SchemaValidator<T | null>
}

/**
 * Function with runtime validation.
 */
export interface ValidatedFn<Out, In = any, Opts extends Record<string, unknown> = {}>
  extends AsyncFn<Out, In, Opts> {
  /** Input validator */
  readonly inputSchema: SchemaValidator<In>
  /** Output validator */
  readonly outputSchema: SchemaValidator<Out>
  /** Skip validation (for trusted internal calls) */
  unsafe: AsyncFn<Out, In, Opts>
}

// =============================================================================
// Type Guards & Utilities
// =============================================================================

/**
 * Check if value is a Fn type.
 */
export const isFn = <Out, In, Opts extends Record<string, unknown>>(
  value: unknown
): value is Fn<Out, In, Opts> =>
  typeof value === 'function'

/**
 * Check if value is an FnError.
 */
export const isFnError = (value: unknown): value is FnError =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value

/**
 * Check if result is successful.
 */
export const isOk = <T, E>(result: FnResult<T, E>): result is { ok: true; value: T } =>
  result.ok === true

/**
 * Check if result is an error.
 */
export const isErr = <T, E>(result: FnResult<T, E>): result is { ok: false; error: E } =>
  result.ok === false

// =============================================================================
// Common Option Types
// =============================================================================

/**
 * AI options - re-exported from AI SDK.
 *
 * Use the types from 'ai' package (Vercel AI SDK) for AI function options.
 * This ensures compatibility with the broader AI ecosystem.
 *
 * @example
 * ```ts
 * import type { GenerateTextOptions } from 'ai'
 *
 * const ai: RpcFn<string, any, GenerateTextOptions>
 * ```
 */
// AI options come from 'ai' package - see ai-functions primitive

/**
 * Common SQL options.
 */
export interface SQLOptions extends Record<string, unknown> {
  /** Query timeout (ms) */
  timeout?: number
  /** Use transaction */
  transaction?: boolean
  /** Return type hint */
  returnType?: 'all' | 'first' | 'one' | 'count'
}

/**
 * Common HTTP options.
 */
export interface HTTPOptions {
  /** Request headers */
  headers?: Record<string, string>
  /** Request timeout (ms) */
  timeout?: number
  /** Retry configuration */
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export type { RpcPromise } from './rpc.js'
