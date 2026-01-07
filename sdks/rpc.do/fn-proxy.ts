/**
 * Fn Proxy - Generic Tagged Template to RPC Transform
 *
 * Creates proxy wrappers that transform Fn<Out, In, Opts> tagged templates
 * into serializable RPC format for CapnWeb transport.
 *
 * ```ts
 * // User writes:
 * fn`template ${value}`
 *
 * // Proxy transforms to:
 * fn({ template: '...', values: [...] })
 * ```
 *
 * @packageDocumentation
 */

import type {
  Fn,
  AsyncFn,
  RpcFn,
  StreamFn,
  RpcStreamFn,
  RpcStream,
  ExtractParams,
  TaggedResult,
  FnTransformOptions,
  SerializableFnCall,
  FnError,
  FnResult,
  FnContext,
} from '@dotdo/types/fn'
import type { RpcPromise } from '@dotdo/types/rpc'

// =============================================================================
// Re-exports from @dotdo/types/fn
// =============================================================================

export type {
  Fn,
  AsyncFn,
  RpcFn,
  StreamFn,
  RpcStreamFn,
  RpcStream,
  ExtractParams,
  TaggedResult,
  FnTransformOptions,
  SerializableFnCall,
  FnError,
  FnResult,
  FnContext,
}

// =============================================================================
// Template Parsing
// =============================================================================

/**
 * Check if an argument is a TemplateStringsArray (from tagged template call)
 */
function isTemplateStringsArray(arg: unknown): arg is TemplateStringsArray {
  return (
    Array.isArray(arg) &&
    'raw' in arg &&
    Array.isArray((arg as TemplateStringsArray).raw)
  )
}

/**
 * Check if template has named {param} placeholders
 */
function hasNamedParams(strings: TemplateStringsArray): boolean {
  return /\{\w+\}/.test(strings.raw.join(''))
}

/**
 * Extract {param} names from template
 */
function extractParamNames(strings: TemplateStringsArray): string[] {
  const paramNames: string[] = []
  const raw = strings.raw.join('')
  const paramRegex = /\{(\w+)\}/g
  let match
  while ((match = paramRegex.exec(raw)) !== null) {
    paramNames.push(match[1]!)
  }
  return paramNames
}

/**
 * Parsed template result
 */
export interface ParsedTemplate {
  /** Original template strings */
  strings: readonly string[]
  /** Interpolated values or named param values */
  values: unknown[]
  /** Named parameter names (if any) */
  paramNames?: string[]
  /** Whether this was a named params template */
  isNamedParams: boolean
}

/**
 * Parse a tagged template into a serializable format
 */
function parseTemplate(
  strings: TemplateStringsArray,
  values: unknown[]
): ParsedTemplate {
  return {
    strings: strings.raw,
    values,
    isNamedParams: false,
  }
}

/**
 * Parse a named parameter template
 */
function parseNamedTemplate(
  strings: TemplateStringsArray,
  params: Record<string, unknown>
): ParsedTemplate {
  const paramNames = extractParamNames(strings)
  const values = paramNames.map(name => {
    if (!(name in params)) {
      throw new Error(`Missing parameter: ${name}`)
    }
    return params[name]
  })

  return {
    strings: strings.raw,
    values,
    paramNames,
    isNamedParams: true,
  }
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Convert a function call to serializable format
 */
export function serializeFnCall<In>(
  method: string,
  input: In,
  opts?: Record<string, unknown>,
  template?: ParsedTemplate
): SerializableFnCall<In> {
  const call: SerializableFnCall<In> = { method }

  if (input !== undefined) {
    call.args = input
  }

  if (template) {
    call.template = {
      strings: [...template.strings],
      values: template.values,
    }
    if (template.paramNames) {
      call.params = Object.fromEntries(
        template.paramNames.map((name, i) => [name, template.values[i]])
      )
    }
  }

  if (opts && Object.keys(opts).length > 0) {
    call.config = opts
  }

  return call
}

// =============================================================================
// Generic Fn Proxy
// =============================================================================

/**
 * Create a proxy that transforms Fn calls to RPC format.
 *
 * @example
 * ```ts
 * const rpcCall = (call: SerializableFnCall) => fetch('/rpc', { body: JSON.stringify(call) })
 *
 * const ai = createFnProxy<string, any, AIOptions>('ai', rpcCall)
 *
 * // All styles work:
 * await ai("summarize this")
 * await ai`Summarize ${text}`
 * await ai`Summarize {content}`({ content: text, model: 'gpt-4' })
 * ```
 */
// Default known option keys (common across most Fn types)
const DEFAULT_KNOWN_OPTS = ['timeout', 'model', 'temperature', 'maxTokens', 'signal', 'cache']

export function createFnProxy<Out, In = any, Opts extends Record<string, unknown> = {}>(
  method: string,
  rpcCall: (call: SerializableFnCall<In>) => RpcPromise<Out>,
  options: FnTransformOptions = {}
): RpcFn<Out, In, Opts> {
  const { debug = false, strict = false, knownOpts = DEFAULT_KNOWN_OPTS } = options

  function handler(
    inputOrStrings: In | TemplateStringsArray,
    ...rest: unknown[]
  ): RpcPromise<Out> | ((params: Record<string, unknown> & Partial<Opts>) => RpcPromise<Out>) {
    // Case 1: Tagged template with named params {name}
    if (isTemplateStringsArray(inputOrStrings) && hasNamedParams(inputOrStrings)) {
      const strings = inputOrStrings
      const paramNames = extractParamNames(strings)

      if (debug) {
        console.log(`[${method}] Named template, params:`, paramNames)
      }

      // Return function that accepts params
      return (params: Record<string, unknown> & Partial<Opts>) => {
        const template = parseNamedTemplate(strings, params)

        // Extract opts from params (anything not in paramNames)
        const opts: Record<string, unknown> = {}
        const unknownKeys: string[] = []

        for (const [key, value] of Object.entries(params)) {
          if (!paramNames.includes(key)) {
            // Check if this is a known option key
            if (knownOpts.includes(key)) {
              opts[key] = value
            } else {
              // Unknown key - not a template param and not a known opt
              unknownKeys.push(key)
              opts[key] = value // Still include it, but warn/error
            }
          }
        }

        // Handle unknown keys
        if (unknownKeys.length > 0) {
          const msg = `Unknown parameter(s): ${unknownKeys.join(', ')}. ` +
            `Expected template params: [${paramNames.join(', ')}] or opts: [${knownOpts.join(', ')}]`

          if (strict) {
            throw new Error(msg)
          } else if (debug) {
            console.warn(`[${method}] ${msg}`)
          }
        }

        const call = serializeFnCall(method, undefined as In, opts, template)
        if (debug) {
          console.log(`[${method}] RPC call:`, call)
        }
        return rpcCall(call)
      }
    }

    // Case 2: Tagged template with interpolation ${value}
    if (isTemplateStringsArray(inputOrStrings)) {
      const template = parseTemplate(inputOrStrings, rest)
      const call = serializeFnCall(method, undefined as In, undefined, template)
      if (debug) {
        console.log(`[${method}] Template call:`, call)
      }
      return rpcCall(call)
    }

    // Case 3: Direct call
    const input = inputOrStrings as In
    const opts = rest[0] as Opts | undefined
    const call = serializeFnCall(method, input, opts)
    if (debug) {
      console.log(`[${method}] Direct call:`, call)
    }
    return rpcCall(call)
  }

  return handler as unknown as RpcFn<Out, In, Opts>
}

// =============================================================================
// Streaming Fn Proxy
// =============================================================================

/**
 * Create a streaming function proxy.
 *
 * @example
 * ```ts
 * const stream = createStreamFnProxy<string, any, AIOptions>('stream', rpcStream)
 *
 * for await (const chunk of stream`Tell me a story`) {
 *   process.stdout.write(chunk)
 * }
 * ```
 */
export function createStreamFnProxy<Out, In = any, Opts extends Record<string, unknown> = {}>(
  method: string,
  rpcStream: (call: SerializableFnCall<In>) => RpcStream<Out>,
  options: FnTransformOptions = {}
): RpcStreamFn<Out, In, Opts> {
  const { debug = false } = options

  function handler(
    inputOrStrings: In | TemplateStringsArray,
    ...rest: unknown[]
  ): RpcStream<Out> | ((params: Record<string, unknown> & Partial<Opts>) => RpcStream<Out>) {
    // Case 1: Tagged template with named params
    if (isTemplateStringsArray(inputOrStrings) && hasNamedParams(inputOrStrings)) {
      const strings = inputOrStrings
      const paramNames = extractParamNames(strings)

      if (debug) {
        console.log(`[${method}] Named template stream, params:`, paramNames)
      }

      return (params: Record<string, unknown> & Partial<Opts>) => {
        const template = parseNamedTemplate(strings, params)
        const opts: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(params)) {
          if (!paramNames.includes(key)) {
            opts[key] = value
          }
        }
        const call = serializeFnCall(method, undefined as In, opts, template)
        return rpcStream(call)
      }
    }

    // Case 2: Tagged template with interpolation
    if (isTemplateStringsArray(inputOrStrings)) {
      const template = parseTemplate(inputOrStrings, rest)
      const call = serializeFnCall(method, undefined as In, undefined, template)
      return rpcStream(call)
    }

    // Case 3: Direct call
    const input = inputOrStrings as In
    const opts = rest[0] as Opts | undefined
    const call = serializeFnCall(method, input, opts)
    return rpcStream(call)
  }

  return handler as unknown as RpcStreamFn<Out, In, Opts>
}

// =============================================================================
// With Context
// =============================================================================

/**
 * Create a context-aware function proxy.
 */
export function createContextFnProxy<Out, In = any, Opts extends Record<string, unknown> = {}>(
  method: string,
  rpcCall: (call: SerializableFnCall<In>, ctx: FnContext) => RpcPromise<Out>,
  options: FnTransformOptions = {}
): (ctx: FnContext) => RpcFn<Out, In, Opts> {
  return (ctx: FnContext) => {
    return createFnProxy<Out, In, Opts>(
      method,
      (call) => rpcCall(call, ctx),
      options
    )
  }
}

// =============================================================================
// Batch Execution
// =============================================================================

/**
 * @deprecated batchRpc has been removed - promises execute immediately when created,
 * making batching impossible with this API design.
 *
 * For batching, use one of these patterns instead:
 *
 * 1. Promise.all with concurrent calls:
 * ```ts
 * const [a, b, c] = await Promise.all([
 *   fn('input1'),
 *   fn('input2'),
 *   fn('input3'),
 * ])
 * ```
 *
 * 2. Create a batch context (future API):
 * ```ts
 * const batch = createBatchContext(rpcClient)
 * batch.add(fn`query 1`)
 * batch.add(fn`query 2`)
 * const results = await batch.execute()
 * ```
 */
export function batchRpc(): never {
  throw new Error(
    'batchRpc has been removed. Use Promise.all() for concurrent calls, ' +
    'or see documentation for proper batching patterns.'
  )
}

// =============================================================================
// Partial Application
// =============================================================================

/**
 * Create a function with default options.
 *
 * Supports all three calling styles:
 * - Direct call: `fn(input, opts)` - merges defaults with opts
 * - Named template: `fn\`{name}\`({ name, ...opts })` - merges defaults with opts
 * - Direct template: `fn\`${val}\`` - applies defaults (limited support)
 */
export function withDefaultOpts<Out, In, Opts extends Record<string, unknown>>(
  fn: RpcFn<Out, In, Opts>,
  defaults: Partial<Opts>
): RpcFn<Out, In, Opts> {
  // Store defaults on the function for access by the proxy
  const wrappedFn = Object.assign(
    function wrappedHandler(this: unknown, ...args: unknown[]) {
      return (fn as Function).apply(this, args)
    },
    { _defaults: defaults }
  )

  // Create a new proxy that merges defaults with provided opts
  return new Proxy(wrappedFn as unknown as RpcFn<Out, In, Opts>, {
    apply(target, thisArg, args) {
      // Case 1: Direct call with opts - fn(input, opts)
      if (args.length === 2 && typeof args[1] === 'object' && !isTemplateStringsArray(args[0])) {
        args[1] = { ...defaults, ...args[1] }
        return Reflect.apply(fn as Function, thisArg, args)
      }

      // Case 2: Direct call without opts - fn(input)
      if (args.length === 1 && !isTemplateStringsArray(args[0])) {
        args.push(defaults)
        return Reflect.apply(fn as Function, thisArg, args)
      }

      // Case 3: Template call - fn`template` or fn`{name}`
      if (isTemplateStringsArray(args[0])) {
        const result = Reflect.apply(fn as Function, thisArg, args)

        // Named template returns a function - wrap it to inject defaults
        if (typeof result === 'function') {
          return (params: Record<string, unknown>) => {
            // Merge defaults with provided params (params override defaults)
            const mergedParams = { ...defaults, ...params }
            return result(mergedParams)
          }
        }

        // Direct template returns a promise - can't inject opts here
        // The underlying proxy would need to capture defaults somehow
        // For now, this is a known limitation
        return result
      }

      // Fallback
      return Reflect.apply(fn as Function, thisArg, args)
    },
  }) as RpcFn<Out, In, Opts>
}

// =============================================================================
// Result Helpers
// =============================================================================

/**
 * Wrap a function to return FnResult instead of throwing.
 */
export function toSafe<Out, In, Opts extends Record<string, unknown>>(
  fn: RpcFn<Out, In, Opts>
): RpcFn<FnResult<Out>, In, Opts> {
  return new Proxy(fn, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target, thisArg, args) as RpcPromise<Out>
      return result
        .then((value) => ({ ok: true as const, value }))
        .catch((error) => ({
          ok: false as const,
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || String(error),
            details: error.data,
            retryable: error.retryable,
          },
        }))
    },
  }) as unknown as RpcFn<FnResult<Out>, In, Opts>
}

// =============================================================================
// Type Guards
// =============================================================================

export { isTemplateStringsArray, hasNamedParams, extractParamNames }
