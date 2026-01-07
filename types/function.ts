/**
 * Function Types for workers.do Platform
 *
 * Provides types for callable functions that can be:
 * - Invoked locally or over RPC
 * - Called with tagged template syntax
 * - Composed with other functions
 * - Wrapped with AI capabilities
 *
 * @packageDocumentation
 */

import type { TaggedCallable, ExtractParams } from './template.js'
import type { RpcPromise } from './rpc.js'

// =============================================================================
// Base Function Types
// =============================================================================

/**
 * A function with typed input and output.
 */
export interface TypedFunction<TInput = unknown, TOutput = unknown> {
  (input: TInput): TOutput
}

/**
 * An async function with typed input and output.
 */
export interface AsyncTypedFunction<TInput = unknown, TOutput = unknown> {
  (input: TInput): Promise<TOutput>
}

/**
 * A function that returns an RpcPromise for pipelining.
 */
export interface RpcFunction<TInput = unknown, TOutput = unknown> {
  (input: TInput): RpcPromise<TOutput>
}

// =============================================================================
// Function with Schema
// =============================================================================

/**
 * Function input schema for validation and documentation.
 */
export interface FunctionInputSchema {
  /** JSON Schema or Zod-like schema */
  type?: string
  properties?: Record<string, unknown>
  required?: string[]
  /** Human-readable description */
  description?: string
  /** Example values */
  examples?: unknown[]
}

/**
 * Function output schema for validation and type inference.
 */
export interface FunctionOutputSchema {
  type?: string
  properties?: Record<string, unknown>
  /** Human-readable description */
  description?: string
}

/**
 * A function with associated schema information.
 */
export interface SchemaFunction<TInput = unknown, TOutput = unknown> {
  /** Execute the function */
  (input: TInput): TOutput | Promise<TOutput>

  /** Input schema */
  readonly input: FunctionInputSchema

  /** Output schema */
  readonly output: FunctionOutputSchema

  /** Function name */
  readonly name: string

  /** Function description */
  readonly description?: string
}

// =============================================================================
// Callable Function (Tagged Template Support)
// =============================================================================

/**
 * A function that supports tagged template invocation.
 *
 * @example
 * ```ts
 * // Define a callable function
 * const greet: CallableFunction<string, string> = createCallableFunction(
 *   ({ name }) => `Hello, ${name}!`
 * )
 *
 * // Call it multiple ways:
 * greet({ name: 'World' })           // Direct call
 * greet`Hello {name}!`({ name: 'World' }) // Tagged template
 * ```
 */
export interface CallableFunction<TInput = unknown, TOutput = unknown> {
  /** Direct invocation with input object */
  (input: TInput): TOutput | Promise<TOutput>

  /** Tagged template with named params */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): [ExtractParams<S>] extends [never]
    ? TOutput | Promise<TOutput>
    : (params: Record<ExtractParams<S>, unknown>) => TOutput | Promise<TOutput>
}

/**
 * An RPC-enabled callable function.
 */
export interface RpcCallableFunction<TInput = unknown, TOutput = unknown> {
  /** Direct invocation returning RpcPromise */
  (input: TInput): RpcPromise<TOutput>

  /** Tagged template returning RpcPromise */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): [ExtractParams<S>] extends [never]
    ? RpcPromise<TOutput>
    : (params: Record<ExtractParams<S>, unknown>) => RpcPromise<TOutput>
}

// =============================================================================
// Function Metadata
// =============================================================================

/**
 * Metadata attached to a function for documentation and tooling.
 */
export interface FunctionMetadata {
  /** Unique function name */
  name: string

  /** Human-readable description */
  description?: string

  /** Input schema */
  input?: FunctionInputSchema

  /** Output schema */
  output?: FunctionOutputSchema

  /** Tags for categorization */
  tags?: string[]

  /** Version string */
  version?: string

  /** Whether function is deprecated */
  deprecated?: boolean

  /** Deprecation message */
  deprecationMessage?: string

  /** Rate limit per minute */
  rateLimit?: number

  /** Timeout in milliseconds */
  timeout?: number

  /** Whether function is idempotent */
  idempotent?: boolean

  /** Whether function has side effects */
  sideEffects?: boolean
}

/**
 * A function with attached metadata.
 */
export interface MetadataFunction<TInput = unknown, TOutput = unknown>
  extends TypedFunction<TInput, TOutput | Promise<TOutput>> {
  /** Function metadata */
  readonly metadata: FunctionMetadata
}

// =============================================================================
// Function Definition (for Registration)
// =============================================================================

/**
 * Function definition for registering with the platform.
 */
export interface FunctionDefinition<TInput = unknown, TOutput = unknown> {
  /** Function name (unique identifier) */
  name: string

  /** Human-readable description */
  description?: string

  /** The implementation */
  handler: (input: TInput) => TOutput | Promise<TOutput>

  /** Input validation schema */
  input?: FunctionInputSchema

  /** Output schema */
  output?: FunctionOutputSchema

  /** Function options */
  options?: FunctionOptions
}

/**
 * Options for function registration.
 */
export interface FunctionOptions {
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
    /** TTL in seconds */
    ttl?: number
    /** Cache key function */
    key?: (input: unknown) => string
  }

  /** Rate limiting */
  rateLimit?: {
    /** Max requests per window */
    limit: number
    /** Window size in seconds */
    window: number
  }

  /** Whether to validate input against schema */
  validateInput?: boolean

  /** Whether to validate output against schema */
  validateOutput?: boolean
}

// =============================================================================
// Function Registry Types
// =============================================================================

/**
 * A registry of named functions.
 */
export interface FunctionRegistry {
  /** Get a function by name */
  get<TInput = unknown, TOutput = unknown>(
    name: string
  ): RpcCallableFunction<TInput, TOutput> | undefined

  /** Check if a function exists */
  has(name: string): boolean

  /** List all function names */
  list(): string[]

  /** Get function metadata */
  metadata(name: string): FunctionMetadata | undefined

  /** Call a function by name */
  call<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput
  ): RpcPromise<TOutput>
}

/**
 * RPC-enabled function registry.
 */
export interface RpcFunctionRegistry extends FunctionRegistry {
  /** All functions as a proxy object */
  readonly functions: Record<string, RpcCallableFunction>
}

// =============================================================================
// Function Composition Types
// =============================================================================

/**
 * Compose multiple functions into a pipeline.
 */
export type Pipeline<TInput, TOutput> = {
  /** The composed function */
  (input: TInput): RpcPromise<TOutput>

  /** Add another function to the pipeline */
  pipe<TNext>(fn: (output: TOutput) => TNext | Promise<TNext>): Pipeline<TInput, TNext>

  /** Add error handling */
  catch<TFallback>(fn: (error: Error) => TFallback | Promise<TFallback>): Pipeline<TInput, TOutput | TFallback>

  /** Add a tap for side effects */
  tap(fn: (output: TOutput) => void | Promise<void>): Pipeline<TInput, TOutput>
}

/**
 * Create a function pipeline.
 */
export type CreatePipeline = <TInput, TOutput>(
  fn: (input: TInput) => TOutput | Promise<TOutput>
) => Pipeline<TInput, TOutput>

// =============================================================================
// AI Function Types (extends ai-functions)
// =============================================================================

/**
 * A function that can be called by an AI model.
 */
export interface AIFunction<TInput = unknown, TOutput = unknown> {
  /** Execute the function */
  (input: TInput): RpcPromise<TOutput>

  /** Function name for AI */
  readonly name: string

  /** Description for AI */
  readonly description: string

  /** Parameters schema for AI */
  readonly parameters: FunctionInputSchema

  /** Return type for AI */
  readonly returns?: FunctionOutputSchema
}

/**
 * Tool definition for AI model consumption.
 */
export interface AIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: FunctionInputSchema
  }
}

/**
 * Convert a function definition to AI tool format.
 */
export type ToAITool = <TInput, TOutput>(
  fn: FunctionDefinition<TInput, TOutput>
) => AIToolDefinition

// =============================================================================
// Function Builder Types
// =============================================================================

/**
 * Builder for creating typed functions.
 */
export interface FunctionBuilder<TInput = unknown, TOutput = unknown> {
  /** Set the function name */
  name(name: string): FunctionBuilder<TInput, TOutput>

  /** Set the description */
  description(desc: string): FunctionBuilder<TInput, TOutput>

  /** Define input schema */
  input<T>(schema: FunctionInputSchema): FunctionBuilder<T, TOutput>

  /** Define output schema */
  output<T>(schema: FunctionOutputSchema): FunctionBuilder<TInput, T>

  /** Set options */
  options(opts: FunctionOptions): FunctionBuilder<TInput, TOutput>

  /** Set the handler */
  handler(fn: (input: TInput) => TOutput | Promise<TOutput>): FunctionDefinition<TInput, TOutput>
}

/**
 * Create a function builder.
 */
export type CreateFunctionBuilder = () => FunctionBuilder

// =============================================================================
// Re-exports
// =============================================================================

export type { TaggedCallable, ExtractParams } from './template.js'
export type { RpcPromise } from './rpc.js'
