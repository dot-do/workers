/**
 * Tagged Template Utility Types
 *
 * Provides generic patterns for functions that can be called in multiple ways:
 * 1. fn(args, opts) - Regular function call
 * 2. fn`${args}` - Tagged template literal with interpolation
 * 3. fn`{name}`(params) - Tagged template with named params returning function
 *
 * This pattern is used across the platform for:
 * - SQL queries: db.sql`SELECT * FROM {table}`({ table: 'users' })
 * - AI prompts: ai`Summarize {text} in {tone} tone`({ text, tone })
 * - Templates: html`<div class="{cls}">{content}</div>`({ cls, content })
 * - i18n: t`Hello {name}, you have {count} messages`({ name, count })
 *
 * @packageDocumentation
 */

// =============================================================================
// Parameter Extraction from Template Strings
// =============================================================================

/**
 * Extract {param} names from a template string at compile time.
 *
 * Uses TypeScript template literal types to parse placeholders.
 *
 * @example
 * ```ts
 * type Params = ExtractParams<'SELECT * FROM {table} WHERE id = {id}'>
 * // => 'table' | 'id'
 * ```
 */
export type ExtractParams<S extends string> =
  S extends `${infer _}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never

/**
 * Extract ${expr} interpolation positions from a template string.
 * Used internally for counting interpolation slots.
 */
export type ExtractInterpolations<S extends string> =
  S extends `${infer _}\${${infer _Expr}}${infer Rest}`
    ? 1 | ExtractInterpolations<Rest>
    : never

// =============================================================================
// Tagged Callable Interface
// =============================================================================

/**
 * A callable that supports three invocation styles:
 *
 * 1. **Function call**: `fn(query, ...args)`
 * 2. **Tagged template with interpolation**: `fn\`...${val}...\``
 * 3. **Tagged template with named params**: `fn\`...{name}...\`(params)`
 *
 * @typeParam TResult - The return type of the callable
 * @typeParam TOptions - Additional options type (merged with named params)
 *
 * @example
 * ```ts
 * // Define a SQL callable
 * type Sql = TaggedCallable<SqlResult>
 *
 * // Use it three ways:
 * sql('SELECT * FROM users')                    // Function call
 * sql`SELECT * FROM users WHERE id = ${id}`     // Template interpolation
 * sql`SELECT * FROM {table}`({ table: 'users' }) // Named params
 * ```
 */
export interface TaggedCallable<TResult, TOptions extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Style 1: Regular function call
   *
   * @example
   * ```ts
   * sql('SELECT * FROM users')
   * sql('SELECT * FROM users WHERE id = ?', userId)
   * ```
   */
  <T = TResult>(query: string, ...bindings: unknown[]): T

  /**
   * Style 2: Tagged template with direct interpolation (${...})
   *
   * Values are securely passed as parameters, not string-concatenated.
   *
   * @example
   * ```ts
   * sql`SELECT * FROM users WHERE id = ${userId}`
   * sql`SELECT * FROM users WHERE name = ${name} AND status = ${status}`
   * ```
   */
  <T = TResult>(strings: TemplateStringsArray, ...values: unknown[]): T

  /**
   * Style 3: Tagged template with named parameters ({...})
   *
   * Returns a function that accepts an object with the named params.
   * If no {params} are found, returns the result directly.
   *
   * @example
   * ```ts
   * // With named params - returns function
   * sql`SELECT * FROM {table} WHERE {column} = {value}`({
   *   table: 'users',
   *   column: 'id',
   *   value: 123
   * })
   *
   * // No named params - returns result directly
   * sql`SELECT * FROM users` // => SqlResult
   * ```
   */
  <T = TResult, S extends string = string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): [ExtractParams<S>] extends [never]
    ? T // No {params} found, return result directly
    : (params: Record<ExtractParams<S>, unknown> & TOptions) => T
}

// =============================================================================
// Typed Template Callable
// =============================================================================

/**
 * A more strictly typed version of TaggedCallable that enforces
 * argument types based on the template string.
 *
 * @typeParam TArgSchema - Schema describing expected argument types
 * @typeParam TResult - The return type
 */
export interface TypedTaggedCallable<
  TArgSchema extends Record<string, unknown>,
  TResult
> {
  /** Function call with typed args */
  (query: string, args: TArgSchema): TResult

  /** Tagged template - types extracted from template */
  <S extends string>(
    strings: TemplateStringsArray & { raw: readonly S[] },
  ): (params: Pick<TArgSchema, ExtractParams<S> & keyof TArgSchema>) => TResult
}

// =============================================================================
// Template Parser Types
// =============================================================================

/**
 * Parsed template with separated static parts and parameter placeholders.
 */
export interface ParsedTemplate {
  /** Static string parts between placeholders */
  parts: string[]
  /** Named parameter placeholders in order */
  params: string[]
  /** Original template string */
  source: string
}

/**
 * Template parsing options
 */
export interface TemplateParseOptions {
  /** Placeholder syntax: 'braces' = {name}, 'dollar' = ${name} */
  syntax?: 'braces' | 'dollar' | 'both'
  /** Whether to allow nested placeholders */
  allowNested?: boolean
  /** Custom placeholder pattern */
  pattern?: RegExp
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Makes all properties in T required and non-nullable
 */
export type RequiredParams<T> = {
  [P in keyof T]-?: NonNullable<T[P]>
}

/**
 * Checks if a string contains any {param} placeholders
 */
export type HasNamedParams<S extends string> =
  S extends `${infer _}{${infer _Param}}${infer _Rest}` ? true : false

/**
 * Get the parameter record type for a template string
 */
export type ParamsRecord<S extends string> =
  [ExtractParams<S>] extends [never]
    ? Record<string, never>
    : Record<ExtractParams<S>, unknown>
