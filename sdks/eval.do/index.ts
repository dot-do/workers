/**
 * eval.do - Run code safely, anywhere.
 *
 * Secure sandboxed code execution for AI agents and user-submitted code.
 * Execute JavaScript/TypeScript in isolated environments with resource limits.
 *
 * @see https://eval.do
 *
 * @example
 * ```typescript
 * import evaluate from 'eval.do'
 *
 * // Simple expression evaluation
 * const result = await evaluate.do`2 + 2`
 * console.log(result.output) // 4
 *
 * // Execute user code safely
 * const code = await evaluate.run({
 *   code: 'return users.filter(u => u.active).length',
 *   context: { users: [...] },
 *   timeout: 5000
 * })
 *
 * // TypeScript with type checking
 * const ts = await evaluate.typescript({
 *   code: 'const x: number = "hello"', // Type error!
 *   typeCheck: true
 * })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate } from 'rpc.do'

// Types

/**
 * Execution result
 */
export interface EvalResult {
  /** Unique execution ID */
  id: string
  /** The evaluated output/return value */
  output: unknown
  /** Console output (logs, warns, errors) */
  console: Array<{
    level: 'log' | 'warn' | 'error' | 'info' | 'debug'
    args: unknown[]
    timestamp: number
  }>
  /** Execution time in milliseconds */
  duration: number
  /** Memory usage in bytes */
  memoryUsed?: number
  /** Whether execution completed successfully */
  success: boolean
  /** Error if execution failed */
  error?: {
    name: string
    message: string
    stack?: string
    line?: number
    column?: number
  }
  /** Metadata */
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * Type check result
 */
export interface TypeCheckResult {
  /** Whether types are valid */
  valid: boolean
  /** Type errors found */
  errors: Array<{
    message: string
    line: number
    column: number
    file?: string
  }>
  /** Inferred types */
  types?: Record<string, string>
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Maximum execution time (ms) */
  timeout?: number
  /** Maximum memory (bytes) */
  memoryLimit?: number
  /** Maximum console output lines */
  maxConsoleLines?: number
  /** Allow network access */
  allowNetwork?: boolean
  /** Allowed network domains (if allowNetwork is true) */
  allowedDomains?: string[]
  /** Allow file system access */
  allowFileSystem?: boolean
  /** Environment variables to expose */
  env?: Record<string, string>
}

/**
 * Run options
 */
export interface RunOptions {
  /** Code to execute */
  code: string
  /** Language (default: javascript) */
  language?: 'javascript' | 'typescript'
  /** Context variables available in code */
  context?: Record<string, unknown>
  /** Sandbox configuration */
  sandbox?: SandboxConfig
  /** Type check before execution (TypeScript only) */
  typeCheck?: boolean
  /** Transform/transpile options */
  transform?: {
    /** Target ES version */
    target?: 'es2020' | 'es2021' | 'es2022' | 'esnext'
    /** Enable JSX */
    jsx?: boolean
    /** Minify output */
    minify?: boolean
  }
  /** Metadata to attach */
  metadata?: Record<string, unknown>
}

/**
 * REPL session
 */
export interface Session {
  id: string
  /** Session state/context */
  context: Record<string, unknown>
  /** Execution history */
  history: Array<{
    input: string
    result: EvalResult
  }>
  createdAt: Date
  lastActiveAt: Date
}

/**
 * Eval client interface
 */
export interface EvalClient {
  /**
   * Quick eval via tagged template
   *
   * @example
   * ```typescript
   * const result = await evaluate.do`Math.sqrt(16)`
   * console.log(result.output) // 4
   *
   * const sum = await evaluate.do`${[1,2,3]}.reduce((a,b) => a+b, 0)`
   * console.log(sum.output) // 6
   * ```
   */
  do: TaggedTemplate<Promise<EvalResult>>

  /**
   * Execute code with full options
   *
   * @example
   * ```typescript
   * const result = await evaluate.run({
   *   code: `
   *     const filtered = data.filter(x => x > threshold)
   *     return { count: filtered.length, sum: filtered.reduce((a,b) => a+b, 0) }
   *   `,
   *   context: { data: [1, 5, 10, 15], threshold: 7 },
   *   sandbox: { timeout: 1000 }
   * })
   * ```
   */
  run(options: RunOptions): Promise<EvalResult>

  /**
   * Execute TypeScript with optional type checking
   *
   * @example
   * ```typescript
   * const result = await evaluate.typescript({
   *   code: `
   *     interface User { name: string; age: number }
   *     const user: User = { name: 'Alice', age: 30 }
   *     return user.name
   *   `,
   *   typeCheck: true
   * })
   * ```
   */
  typescript(options: Omit<RunOptions, 'language'> & { typeCheck?: boolean }): Promise<EvalResult & { typeCheck?: TypeCheckResult }>

  /**
   * Type check code without executing
   *
   * @example
   * ```typescript
   * const check = await evaluate.typeCheck(`
   *   const x: number = "hello"  // Error!
   * `)
   *
   * if (!check.valid) {
   *   console.log(check.errors)
   * }
   * ```
   */
  typeCheck(code: string, options?: { strict?: boolean }): Promise<TypeCheckResult>

  /**
   * Create or resume a REPL session
   *
   * @example
   * ```typescript
   * const session = await evaluate.session()
   *
   * await session.eval('const x = 10')
   * await session.eval('const y = 20')
   * const result = await session.eval('x + y')
   * console.log(result.output) // 30
   * ```
   */
  session(sessionId?: string): Promise<{
    id: string
    eval(code: string): Promise<EvalResult>
    context(): Promise<Record<string, unknown>>
    reset(): Promise<void>
    close(): Promise<void>
  }>

  /**
   * Transform/transpile code without executing
   *
   * @example
   * ```typescript
   * const result = await evaluate.transform({
   *   code: 'const x: number = 1',
   *   language: 'typescript',
   *   target: 'es2020'
   * })
   * console.log(result.code) // 'const x = 1'
   * ```
   */
  transform(options: {
    code: string
    language?: 'javascript' | 'typescript'
    target?: 'es2020' | 'es2021' | 'es2022' | 'esnext'
    jsx?: boolean
    minify?: boolean
  }): Promise<{
    code: string
    map?: string
  }>

  /**
   * Get execution history
   */
  history(options?: {
    limit?: number
    offset?: number
    sessionId?: string
  }): Promise<EvalResult[]>

  /**
   * Get a specific execution result
   */
  get(executionId: string): Promise<EvalResult>
}

/**
 * Create a configured eval client
 *
 * @example
 * ```typescript
 * import { Eval } from 'eval.do'
 *
 * const evaluate = Eval({
 *   baseURL: 'https://custom.example.com',
 *   sandbox: { timeout: 5000 }
 * })
 * ```
 */
export function Eval(options?: ClientOptions & { sandbox?: SandboxConfig }): EvalClient {
  return createClient<EvalClient>('https://eval.do', options)
}

/**
 * Default eval client instance
 *
 * @example
 * ```typescript
 * import evaluate from 'eval.do'
 *
 * const result = await evaluate.run({ code: '1 + 1' })
 * ```
 */
export const evaluate: EvalClient = Eval()

// Named exports
export { Eval, evaluate }

// Default export
export default evaluate

export type { ClientOptions } from 'rpc.do'
