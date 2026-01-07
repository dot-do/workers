/**
 * actions.do - Define once. Execute anywhere.
 *
 * Unified action registry for AI and humans.
 * Based on the dotdo platform pattern.
 *
 * @see https://actions.do
 *
 * @example
 * ```typescript
 * import actions from 'actions.do'
 *
 * // Tagged template - describe what you want
 * const action = await actions.do`
 *   Send a welcome email to new customers
 *   with personalized onboarding content
 * `
 *
 * // Define with full control
 * await actions.define('send_email', {
 *   description: 'Send an email to a user',
 *   parameters: {
 *     to: { type: 'string', required: true },
 *     subject: { type: 'string', required: true },
 *     body: { type: 'string', required: true }
 *   },
 *   permissions: ['email:send'],
 *   handler: 'email-worker'
 * })
 *
 * // Execute an action
 * await actions.execute('send_email', {
 *   to: 'alice@example.com',
 *   subject: 'Welcome!',
 *   body: 'Thanks for signing up.'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types

export interface ActionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  default?: unknown
  enum?: unknown[]
}

export interface ActionSchema {
  parameters: Record<string, ActionParameter | string>
  returns?: ActionParameter | string
}

export interface ActionPermission {
  id: string
  name: string
  description?: string
  scope: 'user' | 'org' | 'global'
  grantedTo?: string[]
  grantedAt?: Date
}

export interface ActionDefinition {
  id: string
  name: string
  description: string
  parameters: Record<string, ActionParameter | string>
  returns?: ActionParameter | string
  permissions?: string[]
  handler: string
  timeout?: number
  retries?: { attempts: number; delay: string }
  rateLimit?: { requests: number; window: string }
  createdAt: Date
  updatedAt: Date
}

export interface Action {
  id: string
  name: string
  description: string
  schema: ActionSchema
  permissions: string[]
  handler: string
  status: 'active' | 'deprecated' | 'disabled'
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface Execution {
  id: string
  actionId: string
  actionName: string
  input: Record<string, unknown>
  output?: unknown
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  error?: string
  duration?: number
  executor: {
    type: 'user' | 'agent' | 'workflow' | 'schedule'
    id: string
    name?: string
  }
  startedAt: Date
  completedAt?: Date
}

export interface ExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  duration: number
  executionId: string
}

export interface HistoryEntry {
  timestamp: Date
  type: 'execution' | 'update' | 'permission' | 'error'
  actionName: string
  executionId?: string
  actor: { type: string; id: string }
  data?: unknown
}

export interface ValidationResult {
  valid: boolean
  errors?: Array<{
    path: string
    message: string
    expected?: string
    received?: string
  }>
}

export interface DoOptions {
  context?: Record<string, unknown>
  permissions?: string[]
  timeout?: string
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface ActionsClient {
  /**
   * Create an action from natural language
   *
   * @example
   * ```typescript
   * const action = await actions.do`
   *   Send a personalized welcome email
   *   with the customer's name and signup date
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Action>>

  /**
   * Define an action with full control
   *
   * @example
   * ```typescript
   * await actions.define('charge_customer', {
   *   description: 'Charge a customer payment method',
   *   parameters: {
   *     customerId: { type: 'string', required: true },
   *     amount: { type: 'number', required: true },
   *     currency: { type: 'string', default: 'usd' }
   *   },
   *   permissions: ['payments:charge'],
   *   handler: 'payments-worker'
   * })
   * ```
   */
  define(name: string, definition: Omit<ActionDefinition, 'id' | 'name' | 'createdAt' | 'updatedAt'>): Promise<Action>

  /**
   * Execute an action synchronously
   *
   * @example
   * ```typescript
   * const result = await actions.execute('send_email', {
   *   to: 'alice@example.com',
   *   subject: 'Hello!'
   * })
   * ```
   */
  execute(name: string, params: Record<string, unknown>, options?: {
    timeout?: number
    executor?: { type: string; id: string }
  }): Promise<ExecutionResult>

  /**
   * Get an action definition
   */
  get(nameOrId: string): Promise<Action>

  /**
   * List all actions
   */
  list(options?: {
    status?: Action['status']
    handler?: string
    limit?: number
  }): Promise<Action[]>

  /**
   * Update an action
   */
  update(nameOrId: string, updates: Partial<Omit<ActionDefinition, 'id' | 'name' | 'createdAt' | 'updatedAt'>>): Promise<Action>

  /**
   * Delete an action
   */
  delete(nameOrId: string): Promise<void>

  // Permissions

  /**
   * Manage action permissions
   *
   * @example
   * ```typescript
   * // List permissions for an action
   * const perms = await actions.permissions.list('send_email')
   *
   * // Grant permission
   * await actions.permissions.grant('send_email', 'email:send', {
   *   scope: 'org',
   *   grantTo: 'org_123'
   * })
   *
   * // Revoke permission
   * await actions.permissions.revoke('send_email', 'email:send', 'org_123')
   *
   * // Check if execution is allowed
   * const allowed = await actions.permissions.check('send_email', {
   *   executor: { type: 'agent', id: 'agent_456' }
   * })
   * ```
   */
  permissions: {
    list(actionName: string): Promise<ActionPermission[]>
    grant(actionName: string, permission: string, options: {
      scope: 'user' | 'org' | 'global'
      grantTo: string
    }): Promise<ActionPermission>
    revoke(actionName: string, permission: string, grantee: string): Promise<void>
    check(actionName: string, context: {
      executor: { type: string; id: string }
      params?: Record<string, unknown>
    }): Promise<{ allowed: boolean; reason?: string }>
  }

  // Execution history

  /**
   * Get execution history
   *
   * @example
   * ```typescript
   * // Get history for a specific action
   * const history = await actions.history('send_email', {
   *   status: 'failed',
   *   limit: 50
   * })
   *
   * // Get all recent executions
   * const recent = await actions.history(null, { limit: 100 })
   * ```
   */
  history(actionName: string | null, options?: {
    status?: Execution['status']
    executor?: { type: string; id: string }
    since?: Date
    limit?: number
  }): Promise<HistoryEntry[]>

  // Validation

  /**
   * Validate parameters against action schema
   *
   * @example
   * ```typescript
   * const result = await actions.validate('send_email', {
   *   to: 'not-an-email',
   *   subject: 123
   * })
   *
   * if (!result.valid) {
   *   console.log(result.errors)
   *   // [{ path: 'to', message: 'Invalid email format' }]
   * }
   * ```
   */
  validate(actionName: string, params: Record<string, unknown>): Promise<ValidationResult>

  // Execution management

  /**
   * Execute an action asynchronously
   */
  executeAsync(name: string, params: Record<string, unknown>): Promise<{ executionId: string }>

  /**
   * Get execution status
   */
  status(executionId: string): Promise<Execution>

  /**
   * Cancel a running execution
   */
  cancel(executionId: string): Promise<void>

  /**
   * Retry a failed execution
   */
  retry(executionId: string): Promise<Execution>

  /**
   * List executions
   */
  executions(options?: {
    actionName?: string
    status?: Execution['status']
    limit?: number
  }): Promise<Execution[]>

  /**
   * Stream execution events
   */
  stream(executionId: string): AsyncIterable<{
    type: 'started' | 'progress' | 'completed' | 'failed'
    data?: unknown
    timestamp: Date
  }>
}

/**
 * Create a configured actions client
 *
 * @example
 * ```typescript
 * // With custom options
 * import { Actions } from 'actions.do'
 * const actions = Actions({ baseURL: 'https://custom.example.com' })
 *
 * // In Cloudflare Workers, import env adapter first
 * import 'rpc.do/env'
 * import { actions } from 'actions.do'
 * ```
 */
export function Actions(options?: ClientOptions): ActionsClient {
  return createClient<ActionsClient>('https://actions.do', options)
}

/**
 * Default actions client instance
 *
 * Note: For Cloudflare Workers, import 'rpc.do/env' first to set up environment.
 * API key is read from ACTIONS_API_KEY or DO_API_KEY environment variables.
 */
export const actions: ActionsClient = Actions()

// Named exports
export { Actions, actions }

// Default export = camelCase instance
export default actions

export type { ClientOptions } from 'rpc.do'
