/**
 * workflows.do - What do you want workflows to .do for you?
 *
 * Durable, event-driven workflows with natural scheduling.
 * Based on the ai-workflows API pattern.
 *
 * @see https://workflows.do
 *
 * @example
 * ```typescript
 * import workflows from 'workflows.do'
 *
 * // Tagged template - describe what you want
 * const flow = await workflows.do`
 *   When a customer signs up, send a welcome email,
 *   wait 3 days, then send onboarding tips
 * `
 *
 * // Event-driven with $ context
 * const onboarding = workflows.define($ => {
 *   $.on.Customer.created(async (customer, $) => {
 *     await $.send('Email.welcome', { to: customer.email })
 *   })
 *
 *   $.every('3 days after signup')(async ($) => {
 *     await $.send('Email.onboardingTips', { to: $.state.email })
 *   })
 * })
 *
 * // Start and manage
 * await workflows.start('onboarding', { email: 'alice@example.com' })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Re-export core types from ai-workflows pattern
export type {
  EventHandler,
  ScheduleHandler,
  WorkflowContext,
  WorkflowState,
  OnProxy,
  EveryProxy,
} from 'ai-workflows'

// Types
export interface WorkflowStep {
  name: string
  action: string
  input?: Record<string, unknown>
  wait?: string // Duration like '5m', '1h', '7d'
  condition?: string // Expression to evaluate
  retry?: { attempts: number; delay: string }
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  /** Step-based workflow */
  steps?: WorkflowStep[]
  /** Event handlers ($.on.Noun.event) */
  events?: Array<{ pattern: string; handler: string }>
  /** Schedules ($.every) */
  schedules?: Array<{ interval: string; handler: string }>
  timeout?: string
  onError?: 'fail' | 'continue' | 'retry'
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowRun {
  id: string
  workflowId: string
  workflowName: string
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed'
  currentStep?: string
  state: Record<string, unknown>
  output?: unknown
  error?: string
  history: WorkflowHistoryEntry[]
  startedAt: Date
  completedAt?: Date
}

export interface WorkflowHistoryEntry {
  timestamp: Date
  type: 'event' | 'schedule' | 'step' | 'action'
  name: string
  data?: unknown
}

export interface StepRun {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input?: unknown
  output?: unknown
  error?: string
  startedAt?: Date
  completedAt?: Date
}

// Re-export DoOptions and TaggedTemplate from rpc.do for SDK consumers
export type { DoOptions, TaggedTemplate }

/**
 * Workflow context ($) for defining workflows
 */
export interface WorkflowContext {
  /** Send an event (fire and forget, durable) */
  send: <T = unknown>(event: string, data: T) => Promise<void>
  /** Do an action (durable, waits for result) */
  do: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  /** Try an action (non-durable) */
  try: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  /** Register event handler ($.on.Noun.event) */
  on: OnProxy
  /** Register schedule ($.every.hour, $.every.Monday.at9am) */
  every: EveryProxy
  /** Workflow state */
  state: Record<string, unknown>
  /** Log message */
  log: (message: string, data?: unknown) => void
  /** Set state value */
  set: <T = unknown>(key: string, value: T) => void
  /** Get state value */
  get: <T = unknown>(key: string) => T | undefined
}

type OnProxy = { [noun: string]: { [event: string]: (handler: (data: unknown, $: WorkflowContext) => void | Promise<void>) => void } }
type EveryProxy = {
  (description: string, handler: ($: WorkflowContext) => void | Promise<void>): void
} & {
  hour: (handler: ($: WorkflowContext) => void | Promise<void>) => void
  day: (handler: ($: WorkflowContext) => void | Promise<void>) => void
  week: (handler: ($: WorkflowContext) => void | Promise<void>) => void
  Monday: { at9am: (handler: ($: WorkflowContext) => void | Promise<void>) => void }
  [key: string]: unknown
}

// Client interface
export interface WorkflowsClient {
  /**
   * Create a workflow from natural language
   *
   * @example
   * ```typescript
   * const flow = await workflows.do`
   *   When an order is placed, validate payment,
   *   reserve inventory, then send confirmation
   * `
   * ```
   */
  do: TaggedTemplate<Promise<WorkflowDefinition>>

  /**
   * Define a workflow with $ context (ai-workflows style)
   *
   * @example
   * ```typescript
   * const flow = workflows.define($ => {
   *   $.on.Order.placed(async (order, $) => {
   *     await $.do('Payment.validate', order)
   *     await $.do('Inventory.reserve', order.items)
   *     await $.send('Email.confirmation', { orderId: order.id })
   *   })
   * })
   * ```
   */
  define(setup: ($: WorkflowContext) => void, options?: { name?: string }): Promise<WorkflowDefinition>

  /**
   * Define a step-based workflow
   */
  steps(name: string, definition: { steps: WorkflowStep[]; timeout?: string }): Promise<WorkflowDefinition>

  /**
   * Get a workflow definition
   */
  get(nameOrId: string): Promise<WorkflowDefinition>

  /**
   * List all workflows
   */
  list(): Promise<WorkflowDefinition[]>

  /**
   * Update a workflow
   */
  update(nameOrId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>

  /**
   * Delete a workflow
   */
  delete(nameOrId: string): Promise<void>

  // Execution

  /**
   * Start a workflow run
   */
  start(nameOrId: string, input?: Record<string, unknown>): Promise<WorkflowRun>

  /**
   * Send an event to trigger workflows
   */
  send(event: string, data: unknown): Promise<void>

  /**
   * Get run status
   */
  status(runId: string): Promise<WorkflowRun>

  /**
   * Get steps for a run
   */
  history(runId: string): Promise<WorkflowHistoryEntry[]>

  /**
   * Pause a run
   */
  pause(runId: string): Promise<WorkflowRun>

  /**
   * Resume a paused run
   */
  resume(runId: string): Promise<WorkflowRun>

  /**
   * Cancel a run
   */
  cancel(runId: string): Promise<WorkflowRun>

  /**
   * Retry a failed run
   */
  retry(runId: string): Promise<WorkflowRun>

  /**
   * List runs
   */
  runs(options?: {
    workflowId?: string
    status?: WorkflowRun['status']
    limit?: number
  }): Promise<WorkflowRun[]>

  /**
   * Stream run events
   */
  stream(runId: string): AsyncIterable<WorkflowHistoryEntry>
}

/**
 * Create a configured workflows client
 *
 * @example
 * ```typescript
 * import { Workflows } from 'workflows.do'
 * const workflows = Workflows({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Workflows(options?: ClientOptions): WorkflowsClient {
  return createClient<WorkflowsClient>('https://workflows.do', options)
}

/**
 * Default workflows client
 *
 * Authentication: Set DO_API_KEY or WORKFLOWS_API_KEY in environment.
 * For Cloudflare Workers, use `import 'rpc.do/env'` to enable env-based config.
 */
export const workflows: WorkflowsClient = Workflows()

// Default export = camelCase instance
export default workflows

// Re-export the Workflow function for local usage
export { Workflow, on, every, send } from 'ai-workflows'

export type { ClientOptions } from 'rpc.do'
