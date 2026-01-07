/**
 * verbs.do - Teach AI what to do. Watch it act.
 *
 * Define safe, executable actions (verbs) that AI agents can perform.
 * Each verb is a controlled operation with parameters, permissions, and audit trails.
 *
 * @see https://verbs.do
 *
 * @example
 * ```typescript
 * import verbs from 'verbs.do'
 *
 * // Tagged template - describe actions naturally
 * const action = await verbs.do`
 *   Send an email to the customer with their order confirmation
 * `
 *
 * // Define with full control
 * const sendEmail = await verbs.define({
 *   name: 'sendEmail',
 *   description: 'Send an email to a recipient',
 *   parameters: {
 *     to: { type: 'string', required: true },
 *     subject: { type: 'string', required: true },
 *     body: { type: 'string', required: true }
 *   },
 *   permissions: ['email:send']
 * })
 *
 * // Execute with AI or programmatically
 * await verbs.execute('sendEmail', {
 *   to: 'customer@example.com',
 *   subject: 'Order Confirmed',
 *   body: 'Your order #12345 has been confirmed.'
 * })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface Parameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  default?: unknown
  enum?: unknown[]
  items?: Parameter // For array types
  properties?: Record<string, Parameter> // For object types
}

export interface Permission {
  id: string
  name: string
  description?: string
  scope: string // e.g., 'email:send', 'database:write', 'api:call'
}

export interface Verb {
  id: string
  name: string
  description?: string
  parameters: Record<string, Parameter>
  permissions: string[] // Required permission scopes
  returns?: Parameter
  examples?: Array<{
    description?: string
    input: Record<string, unknown>
    output?: unknown
  }>
  timeout?: string // e.g., '30s', '5m'
  retries?: number
  rateLimit?: { requests: number; window: string }
  createdAt: Date
  updatedAt: Date
}

export interface Action {
  id: string
  verbId: string
  verbName: string
  input: Record<string, unknown>
  output?: unknown
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  startedAt: Date
  completedAt?: Date
  executedBy: {
    type: 'ai' | 'human' | 'system'
    id: string
    name?: string
  }
  permissions: string[]
  duration?: number // milliseconds
}

export interface Execution {
  id: string
  verbId: string
  verbName: string
  input: Record<string, unknown>
  output?: unknown
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  startedAt: Date
  completedAt?: Date
  executedBy: {
    type: 'ai' | 'human' | 'system'
    id: string
    name?: string
  }
}

export interface VerbDefinition {
  name: string
  description?: string
  parameters: Record<string, Parameter>
  permissions?: string[]
  returns?: Parameter
  examples?: Verb['examples']
  timeout?: string
  retries?: number
  rateLimit?: Verb['rateLimit']
}

export interface ComposedVerb {
  id: string
  name: string
  description?: string
  steps: Array<{
    verb: string
    input: Record<string, unknown> | ((context: Record<string, unknown>) => Record<string, unknown>)
    condition?: string
  }>
  createdAt: Date
  updatedAt: Date
}

// Client interface
export interface VerbsClient {
  /**
   * Create a verb from natural language
   *
   * @example
   * ```typescript
   * const action = await verbs.do`
   *   Send an email to the customer with their order details
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Verb>>

  /**
   * Define a verb with full control
   *
   * @example
   * ```typescript
   * const verb = await verbs.define({
   *   name: 'createUser',
   *   description: 'Create a new user account',
   *   parameters: {
   *     email: { type: 'string', required: true },
   *     name: { type: 'string', required: true },
   *     role: { type: 'string', enum: ['admin', 'user'] }
   *   },
   *   permissions: ['users:create']
   * })
   * ```
   */
  define(definition: VerbDefinition): Promise<Verb>

  /**
   * Get a verb by name or ID
   */
  get(nameOrId: string): Promise<Verb>

  /**
   * List all verbs
   */
  list(options?: {
    permission?: string
    limit?: number
    offset?: number
  }): Promise<Verb[]>

  /**
   * Update a verb
   */
  update(nameOrId: string, updates: Partial<VerbDefinition>): Promise<Verb>

  /**
   * Delete a verb
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Execute a verb
   *
   * @example
   * ```typescript
   * const result = await verbs.execute('sendEmail', {
   *   to: 'customer@example.com',
   *   subject: 'Welcome!',
   *   body: 'Thanks for signing up.'
   * })
   * ```
   */
  execute<T = unknown>(
    nameOrId: string,
    input: Record<string, unknown>,
    options?: { executedBy?: Execution['executedBy']; timeout?: string }
  ): Promise<T>

  /**
   * Manage permissions for verbs
   */
  permissions: {
    /**
     * List all available permissions
     */
    list(): Promise<Permission[]>

    /**
     * Get permissions for a verb
     */
    get(verbNameOrId: string): Promise<string[]>

    /**
     * Set permissions for a verb
     */
    set(verbNameOrId: string, permissions: string[]): Promise<Verb>

    /**
     * Add permissions to a verb
     */
    add(verbNameOrId: string, permissions: string[]): Promise<Verb>

    /**
     * Remove permissions from a verb
     */
    remove(verbNameOrId: string, permissions: string[]): Promise<Verb>

    /**
     * Check if a verb has a permission
     */
    check(verbNameOrId: string, permission: string): Promise<boolean>
  }

  /**
   * View execution history
   */
  history(options?: {
    verbId?: string
    status?: Execution['status']
    executedBy?: { type: 'ai' | 'human' | 'system'; id?: string }
    limit?: number
    since?: Date
  }): Promise<Execution[]>

  /**
   * Compose multiple verbs into a new compound action
   *
   * @example
   * ```typescript
   * const onboarding = await verbs.compose({
   *   name: 'onboardUser',
   *   description: 'Complete user onboarding flow',
   *   steps: [
   *     { verb: 'createUser', input: { email: '{{email}}', name: '{{name}}' } },
   *     { verb: 'sendWelcomeEmail', input: { to: '{{email}}' } },
   *     { verb: 'assignDefaultRole', input: { userId: '{{createUser.id}}' } }
   *   ]
   * })
   * ```
   */
  compose(definition: {
    name: string
    description?: string
    steps: ComposedVerb['steps']
  }): Promise<ComposedVerb>
}

/**
 * Create a configured Verbs client
 *
 * @example
 * ```typescript
 * import { Verbs } from 'verbs.do'
 * const verbs = Verbs({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Verbs(options?: ClientOptions): VerbsClient {
  return createClient<VerbsClient>('https://verbs.do', options)
}

/**
 * Default Verbs client instance
 *
 * For Workers environment, import 'rpc.do/env' first to configure API keys
 * from environment variables automatically.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { verbs } from 'verbs.do'
 *
 * await verbs.execute('sendEmail', { to: 'user@example.com' })
 * ```
 */
export const verbs: VerbsClient = Verbs()

// Named exports
export { Verbs, verbs }

// Default export = camelCase instance
export default verbs

export type { ClientOptions } from 'rpc.do'
