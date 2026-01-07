/**
 * triggers.do - When this happens, do that. Automatically.
 *
 * Event-driven automation with unified triggers for webhooks,
 * schedules, events, and conditions.
 *
 * @see https://triggers.do
 *
 * @example
 * ```typescript
 * import triggers from 'triggers.do'
 *
 * // Tagged template - describe what you want
 * const trigger = await triggers.do`
 *   When a new order is placed over $100,
 *   notify the sales team on Slack
 * `
 *
 * // Programmatic definition
 * const orderAlert = await triggers.create({
 *   name: 'high-value-order',
 *   event: 'order.created',
 *   conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
 *   actions: [{ type: 'slack', channel: '#sales', message: 'New high-value order!' }]
 * })
 *
 * // Schedule-based triggers
 * const daily = await triggers.schedule({
 *   name: 'daily-report',
 *   cron: '0 9 * * *',
 *   action: { type: 'workflow', id: 'generate-report' }
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Trigger {
  id: string
  name: string
  description?: string
  event?: string
  webhook?: WebhookConfig
  schedule?: ScheduleConfig
  conditions?: Condition[]
  actions: Action[]
  enabled: boolean
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  lastTriggeredAt?: Date
  triggerCount: number
}

export interface Condition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'exists' | 'in'
  value: unknown
  negate?: boolean
}

export interface Action {
  type: 'webhook' | 'email' | 'slack' | 'workflow' | 'function' | 'event'
  id?: string
  url?: string
  channel?: string
  to?: string
  message?: string
  template?: string
  data?: Record<string, unknown>
  delay?: string
  retry?: { attempts: number; delay: string }
}

export interface ScheduleConfig {
  cron?: string
  interval?: string
  timezone?: string
  startAt?: Date
  endAt?: Date
}

export interface WebhookConfig {
  path?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  secret?: string
  headers?: Record<string, string>
  transform?: string
}

export interface Event {
  id: string
  triggerId: string
  triggerName: string
  source: 'event' | 'webhook' | 'schedule'
  payload: Record<string, unknown>
  matched: boolean
  conditionsEvaluated: Array<{ condition: Condition; result: boolean }>
  actionsExecuted: Array<{ action: Action; status: 'pending' | 'success' | 'failed'; error?: string }>
  timestamp: Date
}

export interface TriggerLog {
  id: string
  triggerId: string
  eventId?: string
  type: 'triggered' | 'condition_evaluated' | 'action_executed' | 'error'
  message: string
  data?: unknown
  timestamp: Date
}

export interface CreateTriggerInput {
  name: string
  description?: string
  event?: string
  webhook?: WebhookConfig
  schedule?: ScheduleConfig
  conditions?: Condition[]
  actions: Action[]
  enabled?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateTriggerInput {
  name?: string
  description?: string
  event?: string
  webhook?: WebhookConfig
  schedule?: ScheduleConfig
  conditions?: Condition[]
  actions?: Action[]
  metadata?: Record<string, unknown>
}

export interface DoOptions {
  context?: Record<string, unknown>
  enabled?: boolean
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
export interface TriggersClient {
  /**
   * Create a trigger from natural language
   *
   * @example
   * ```typescript
   * const trigger = await triggers.do`
   *   When a customer signs up from the enterprise plan,
   *   send a welcome email and notify the sales team
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Trigger>>

  /**
   * Create a new trigger
   *
   * @example
   * ```typescript
   * const trigger = await triggers.create({
   *   name: 'new-signup-alert',
   *   event: 'user.created',
   *   conditions: [{ field: 'plan', operator: 'eq', value: 'enterprise' }],
   *   actions: [
   *     { type: 'email', to: 'sales@company.com', template: 'new-enterprise-signup' },
   *     { type: 'slack', channel: '#sales', message: 'New enterprise signup!' }
   *   ]
   * })
   * ```
   */
  create(input: CreateTriggerInput): Promise<Trigger>

  /**
   * Get a trigger by ID or name
   */
  get(idOrName: string): Promise<Trigger>

  /**
   * List all triggers
   */
  list(options?: {
    enabled?: boolean
    event?: string
    limit?: number
    offset?: number
  }): Promise<Trigger[]>

  /**
   * Update a trigger
   */
  update(idOrName: string, updates: UpdateTriggerInput): Promise<Trigger>

  /**
   * Delete a trigger
   */
  delete(idOrName: string): Promise<void>

  /**
   * Enable a trigger
   */
  enable(idOrName: string): Promise<Trigger>

  /**
   * Disable a trigger
   */
  disable(idOrName: string): Promise<Trigger>

  /**
   * Test a trigger with sample data
   *
   * @example
   * ```typescript
   * const result = await triggers.test('new-signup-alert', {
   *   user: { email: 'test@example.com', plan: 'enterprise' }
   * })
   * // { matched: true, actionsWouldExecute: [...] }
   * ```
   */
  test(idOrName: string, payload: Record<string, unknown>): Promise<{
    matched: boolean
    conditionsEvaluated: Array<{ condition: Condition; result: boolean }>
    actionsWouldExecute: Action[]
  }>

  /**
   * Get logs for a trigger
   */
  logs(idOrName: string, options?: {
    limit?: number
    offset?: number
    type?: TriggerLog['type']
    since?: Date
  }): Promise<TriggerLog[]>

  /**
   * Create a scheduled trigger
   *
   * @example
   * ```typescript
   * const trigger = await triggers.schedule({
   *   name: 'daily-digest',
   *   cron: '0 9 * * *',
   *   timezone: 'America/New_York',
   *   action: { type: 'workflow', id: 'send-digest' }
   * })
   * ```
   */
  schedule(input: {
    name: string
    description?: string
    cron?: string
    interval?: string
    timezone?: string
    startAt?: Date
    endAt?: Date
    action: Action
    enabled?: boolean
  }): Promise<Trigger>

  /**
   * Create a webhook trigger
   *
   * @example
   * ```typescript
   * const trigger = await triggers.webhook({
   *   name: 'github-push',
   *   path: '/webhooks/github',
   *   secret: process.env.GITHUB_WEBHOOK_SECRET,
   *   actions: [{ type: 'workflow', id: 'ci-pipeline' }]
   * })
   * // Returns: { url: 'https://triggers.do/webhooks/github', ... }
   * ```
   */
  webhook(input: {
    name: string
    description?: string
    path?: string
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    secret?: string
    headers?: Record<string, string>
    transform?: string
    conditions?: Condition[]
    actions: Action[]
    enabled?: boolean
  }): Promise<Trigger & { url: string }>

  /**
   * Get recent events for a trigger
   */
  events(idOrName: string, options?: {
    limit?: number
    offset?: number
    matched?: boolean
    since?: Date
  }): Promise<Event[]>

  /**
   * Manually fire a trigger
   */
  fire(idOrName: string, payload?: Record<string, unknown>): Promise<Event>
}

/**
 * Create a configured triggers client
 *
 * @example
 * ```typescript
 * // With custom options
 * import { Triggers } from 'triggers.do'
 * const triggers = Triggers({ baseURL: 'https://custom.example.com' })
 *
 * // In Cloudflare Workers, import env adapter first
 * import 'rpc.do/env'
 * import { triggers } from 'triggers.do'
 * ```
 */
export function Triggers(options?: ClientOptions): TriggersClient {
  return createClient<TriggersClient>('https://triggers.do', options)
}

/**
 * Default triggers client instance
 *
 * Note: For Cloudflare Workers, import 'rpc.do/env' first to set up environment.
 * API key is read from TRIGGERS_API_KEY or DO_API_KEY environment variables.
 */
export const triggers: TriggersClient = Triggers()

// Named exports
export { Triggers, triggers }

// Default export = camelCase instance
export default triggers

export type { ClientOptions } from 'rpc.do'
