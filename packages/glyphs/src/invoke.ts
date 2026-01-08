/**
 * 入 (invoke/fn) glyph - Function Invocation
 *
 * A visual programming glyph for function invocation via tagged templates.
 * The 入 character represents "enter" - an arrow entering a function.
 *
 * Usage:
 * - Tagged template invocation: 入`calculate fibonacci of ${42}`
 * - Chaining: 入`fetch data`.then(入`transform`).then(入`validate`)
 * - Direct call: 入.invoke('functionName', arg1, arg2)
 * - Function registration: 入.register('name', fn)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

interface RegisteredFunction {
  fn: AnyFunction
}

interface InvokeOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  backoff?: 'linear' | 'exponential'
  context?: unknown
}

type Middleware = (
  name: string,
  args: unknown[],
  next: (name: string, args: unknown[]) => Promise<unknown>
) => unknown | Promise<unknown>

// Registry for registered functions
const registry = new Map<string, RegisteredFunction>()

// Middleware stack
const middlewares: Middleware[] = []

/**
 * Parse the function name from the template string.
 * The first string segment contains the function name (trimmed).
 */
function parseFunctionName(strings: TemplateStringsArray): string {
  // The function name is in the first segment, before any interpolation
  const firstSegment = strings[0].trim()
  // Extract just the function name (stop at whitespace)
  const match = firstSegment.match(/^([^\s]+)/)
  return match ? match[1] : ''
}

/**
 * Execute a function with optional retry and timeout logic.
 */
async function executeWithOptions(
  fn: AnyFunction,
  args: unknown[],
  options: InvokeOptions = {}
): Promise<unknown> {
  const { timeout, retries = 1, retryDelay = 0, backoff, context } = options

  let lastError: Error | undefined
  let currentDelay = retryDelay

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0 && currentDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, currentDelay))
      if (backoff === 'exponential') {
        currentDelay *= 2
      }
    }

    try {
      const boundFn = context ? fn.bind(context) : fn
      const result = boundFn(...args)
      const promise = Promise.resolve(result)

      if (timeout) {
        let timeoutId: ReturnType<typeof setTimeout>
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout)
        })
        try {
          return await Promise.race([promise, timeoutPromise])
        } finally {
          clearTimeout(timeoutId!)
        }
      }

      return await promise
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt === retries - 1) {
        throw lastError
      }
    }
  }

  throw lastError
}

/**
 * Core invocation logic - executes a registered function by name.
 */
async function invokeFunction(name: string, args: unknown[], options: InvokeOptions = {}): Promise<unknown> {
  // Execute through middleware stack
  const executeCore = async (fnName: string, fnArgs: unknown[]): Promise<unknown> => {
    const registered = registry.get(fnName)
    if (!registered) {
      throw new Error(`Function "${fnName}" not found`)
    }
    return executeWithOptions(registered.fn, fnArgs, options)
  }

  // Build middleware chain
  let chain = executeCore
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i]
    const next = chain
    chain = (fnName: string, fnArgs: unknown[]) => {
      return Promise.resolve(middleware(fnName, fnArgs, next))
    }
  }

  return chain(name, args)
}

/**
 * Register one or more functions.
 */
function register(nameOrFns: string | Record<string, AnyFunction>, fn?: AnyFunction): (() => void) | void {
  if (typeof nameOrFns === 'string' && fn) {
    registry.set(nameOrFns, { fn })
    return () => {
      registry.delete(nameOrFns)
    }
  } else if (typeof nameOrFns === 'object') {
    for (const [name, func] of Object.entries(nameOrFns)) {
      registry.set(name, { fn: func })
    }
    return undefined
  }
}

/**
 * Unregister a function by name.
 */
function unregister(name: string): void {
  registry.delete(name)
}

/**
 * Check if a function is registered.
 */
function has(name: string): boolean {
  return registry.has(name)
}

/**
 * Get a registered function.
 */
function get(name: string): RegisteredFunction | undefined {
  return registry.get(name)
}

/**
 * List all registered function names.
 */
function list(): string[] {
  return Array.from(registry.keys())
}

/**
 * Clear all registered functions and middleware.
 */
function clear(): void {
  registry.clear()
  middlewares.length = 0
}

/**
 * Direct invocation by name.
 */
function invoke(name: string, ...argsOrOptions: unknown[]): Promise<unknown> {
  // Check if the last argument is an options object
  let args = argsOrOptions
  let options: InvokeOptions = {}

  if (argsOrOptions.length > 0) {
    const lastArg = argsOrOptions[argsOrOptions.length - 1]
    if (
      lastArg !== null &&
      typeof lastArg === 'object' &&
      !Array.isArray(lastArg) &&
      ('timeout' in lastArg || 'retries' in lastArg || 'retryDelay' in lastArg || 'context' in lastArg || 'backoff' in lastArg)
    ) {
      options = lastArg as InvokeOptions
      args = argsOrOptions.slice(0, -1)
    }
  }

  return invokeFunction(name, args, options)
}

/**
 * Create a pipeline of functions.
 */
function pipe(...fnsOrName: unknown[]): unknown {
  // If first argument is a string, it's a named pipeline
  if (typeof fnsOrName[0] === 'string') {
    const name = fnsOrName[0] as string
    const fns = fnsOrName.slice(1) as AnyFunction[]

    const pipelineFn = async (...args: unknown[]) => {
      if (fns.length === 0) {
        return args[0]
      }
      let result = await Promise.resolve(fns[0](...args))
      for (let i = 1; i < fns.length; i++) {
        result = await Promise.resolve(fns[i](result))
      }
      return result
    }

    register(name, pipelineFn)
    return undefined
  }

  // Anonymous pipeline
  const fns = fnsOrName as AnyFunction[]

  return async (...args: unknown[]) => {
    if (fns.length === 0) {
      return args[0] // Identity for empty pipeline
    }

    let result = await Promise.resolve(fns[0](...args))
    for (let i = 1; i < fns.length; i++) {
      result = await Promise.resolve(fns[i](result))
    }
    return result
  }
}

/**
 * Add middleware to the invocation chain.
 */
function use(middleware: Middleware): () => void {
  middlewares.push(middleware)
  return () => {
    const index = middlewares.indexOf(middleware)
    if (index >= 0) {
      middlewares.splice(index, 1)
    }
  }
}

/**
 * Create an enhanced promise that can also be used as a .then() handler.
 * When used in .then(), it acts as: (result) => invokeFunction(name, [result])
 *
 * This creates a lazy Promise that:
 * 1. `await result` works (Promise behavior) - invokes with original args
 * 2. `instanceof Promise` returns true
 * 3. `.then(result)` can use result as a function to pass previous value
 */
function createInvocationResult<T>(name: string, values: unknown[]): Promise<T> & ((previousResult: unknown) => Promise<T>) {
  // Lazy promise - only execute when actually needed
  let cachedPromise: Promise<T> | null = null
  const getPromise = (): Promise<T> => {
    if (!cachedPromise) {
      cachedPromise = invokeFunction(name, values) as Promise<T>
    }
    return cachedPromise
  }

  // Create a function that also acts as a Promise
  const handler = function (previousResult: unknown): Promise<T> {
    // When called as a function (in .then()), invoke with the previous result
    return invokeFunction(name, [previousResult]) as Promise<T>
  }

  // Create a proxy that makes the function look and act like a Promise
  const proxy = new Proxy(handler as unknown as Promise<T>, {
    // Make it callable - when used in .then(), accept the previous result
    apply(_target, _thisArg, argArray: unknown[]): Promise<T> {
      // When called as a function (in .then()), invoke with the previous result
      return invokeFunction(name, argArray) as Promise<T>
    },
    // Delegate promise-like property access to the lazy promise
    get(_target, prop, _receiver) {
      // Special handling for instanceof checks
      if (prop === Symbol.hasInstance) {
        return (instance: unknown) => instance instanceof Promise
      }
      // Handle Promise methods
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const promise = getPromise()
        const method = promise[prop as keyof Promise<T>] as (...args: unknown[]) => unknown
        return method.bind(promise)
      }
      if (prop === Symbol.toStringTag) {
        return 'Promise'
      }
      // For other properties, delegate to the promise
      const promise = getPromise()
      const value = Reflect.get(promise, prop, promise)
      if (typeof value === 'function') {
        return value.bind(promise)
      }
      return value
    },
    // Make it appear as a Promise for instanceof checks
    getPrototypeOf() {
      return Promise.prototype
    },
  }) as unknown as Promise<T> & ((previousResult: unknown) => Promise<T>)

  return proxy
}

/**
 * Create a rejected promise proxy for empty invocations.
 */
function createRejectedInvocationResult<T>(error: Error): Promise<T> & ((previousResult: unknown) => Promise<T>) {
  // Create a rejected promise
  const rejection = Promise.reject(error) as Promise<T>
  // Prevent unhandled rejection warning - the user will handle it
  rejection.catch(() => {})

  // Create a proxy that:
  // 1. Acts as a rejected Promise
  // 2. Is callable (returns rejection when called)
  const proxy = new Proxy(rejection, {
    apply(): Promise<T> {
      const rej = Promise.reject(error) as Promise<T>
      rej.catch(() => {})
      return rej
    },
    get(target, prop, receiver) {
      if (prop === Symbol.hasInstance) {
        return (instance: unknown) => instance instanceof Promise
      }
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    },
    getPrototypeOf() {
      return Promise.prototype
    },
  }) as unknown as Promise<T> & ((previousResult: unknown) => Promise<T>)

  return proxy
}

/**
 * The main invoke function - handles tagged template invocation.
 */
function invokeTaggedTemplate<T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> & ((previousResult: unknown) => Promise<T>) {
  const name = parseFunctionName(strings)

  if (!name) {
    return createRejectedInvocationResult<T>(new Error('Empty invocation'))
  }

  return createInvocationResult<T>(name, values)
}

/**
 * The invoke interface - callable as tagged template with additional methods.
 */
export interface InvokeInterface {
  // Tagged template invocation
  <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> & ((previousResult: unknown) => Promise<T>)

  // Registration methods
  register(name: string, fn: AnyFunction): () => void
  register(fns: Record<string, AnyFunction>): void
  unregister(name: string): void
  has(name: string): boolean
  get(name: string): RegisteredFunction | undefined
  list(): string[]
  clear(): void

  // Direct invocation
  invoke(name: string, ...argsOrOptions: unknown[]): Promise<unknown>

  // Pipeline composition
  pipe<T extends AnyFunction[]>(...fns: T): (...args: Parameters<T[0]>) => Promise<unknown>
  pipe<T extends AnyFunction[]>(name: string, ...fns: T): void

  // Middleware
  use(middleware: Middleware): () => void
}

// Create the invoke object with all methods attached
const invokeObject = Object.assign(invokeTaggedTemplate, {
  register,
  unregister,
  has,
  get,
  list,
  clear,
  invoke,
  pipe,
  use,
}) as InvokeInterface

// Export both the glyph and ASCII alias
export const 入 = invokeObject
export const fn = 入
