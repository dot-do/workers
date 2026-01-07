/**
 * agi.do - What do you want AGI to .do for you?
 *
 * The universal AGI interface. Ask anything, get it done.
 *
 * @see https://agi.do
 *
 * @example
 * ```typescript
 * import agi from 'agi.do'
 *
 * // Tagged template - the magic ✨
 * const result = await agi.do`Build me a landing page for my SaaS`
 *
 * // With interpolation
 * const competitor = 'Stripe'
 * const analysis = await agi.do`Analyze ${competitor} and create a go-to-market strategy`
 *
 * // Standard function syntax also works
 * const result = await agi.do('Build me a landing page')
 *
 * // Stream with tagged template
 * for await (const chunk of agi.stream`Write a business plan`) {
 *   process.stdout.write(chunk)
 * }
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface DoResult {
  /** Unique result ID */
  id: string
  /** The response content */
  content: string
  /** Structured data if format was 'json' */
  data?: Record<string, unknown>
  /** Actions that were taken */
  actions?: Action[]
  /** Artifacts produced (files, deployments, etc.) */
  artifacts?: Artifact[]
  /** Usage information */
  usage: {
    tokens: number
    cost: number
    duration: number
  }
  /** Status of the request */
  status: 'completed' | 'partial' | 'failed'
  /** Error message if failed */
  error?: string
}

export interface Action {
  type: string
  description: string
  status: 'pending' | 'completed' | 'failed'
  result?: unknown
}

export interface Artifact {
  type: 'file' | 'deployment' | 'database' | 'api' | 'url'
  name: string
  url?: string
  content?: string
}

export interface Task {
  id: string
  prompt: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  result?: DoResult
  createdAt: Date
  completedAt?: Date
}

export interface Capability {
  id: string
  name: string
  description: string
  examples: string[]
}

// Client interface
export interface AGIClient {
  /**
   * Ask AGI to do something
   *
   * @example
   * ```typescript
   * // Tagged template (preferred)
   * const result = await agi.do`Create a REST API for a todo app`
   *
   * // With interpolation
   * const lang = 'TypeScript'
   * const result = await agi.do`Write a ${lang} function that sorts an array`
   *
   * // Standard function call
   * const result = await agi.do('Create a REST API', { format: 'code' })
   * ```
   */
  do: TaggedTemplate<Promise<DoResult>>

  /**
   * Stream a response from AGI
   *
   * @example
   * ```typescript
   * // Tagged template
   * for await (const chunk of agi.stream`Explain quantum computing`) {
   *   process.stdout.write(chunk)
   * }
   *
   * // Standard function call
   * for await (const chunk of agi.stream('Explain it', { format: 'markdown' })) {
   *   process.stdout.write(chunk)
   * }
   * ```
   */
  stream: TaggedTemplate<AsyncIterable<string>>

  /**
   * Queue a task for background execution
   *
   * @example
   * ```typescript
   * // Tagged template
   * const task = await agi.queue`Build and deploy a complete e-commerce site`
   *
   * // Check back later
   * const result = await agi.task(task.id)
   * ```
   */
  queue: TaggedTemplate<Promise<Task>>

  /**
   * Get task status and result
   */
  task(taskId: string): Promise<Task>

  /**
   * List recent tasks
   */
  tasks(options?: { status?: Task['status']; limit?: number }): Promise<Task[]>

  /**
   * Cancel a running task
   */
  cancel(taskId: string): Promise<void>

  /**
   * List available capabilities
   */
  capabilities(): Promise<Capability[]>

  /**
   * Check what AGI can do for a given prompt (without executing)
   *
   * @example
   * ```typescript
   * // Tagged template
   * const plan = await agi.plan`Build a marketplace`
   * console.log(plan.actions) // What AGI would do
   * ```
   */
  plan: TaggedTemplate<Promise<{
    actions: Action[]
    estimate: { tokens: number; cost: number; duration: number }
  }>>
}

/**
 * Create a configured AGI client
 *
 * @example
 * ```typescript
 * import { AGI } from 'agi.do'
 * const myAGI = AGI({ apiKey: 'xxx' })
 * const result = await myAGI.do('...')
 * ```
 */
export function AGI(options?: ClientOptions): AGIClient {
  return createClient<AGIClient>('https://agi.do', options)
}

/**
 * Default AGI client instance
 * Uses environment variable AGI_API_KEY or DO_API_KEY if available
 *
 * @example
 * ```typescript
 * import { agi } from 'agi.do'
 * const result = await agi.do('What can you do for me?')
 * ```
 */
export const agi: AGIClient = AGI()

// Legacy alias
export const createAGI = AGI

// Re-export types
export type { ClientOptions } from 'rpc.do'
