/**
 * workflow.as - What do you want your workflow to be?
 *
 * Define workflow templates, patterns, and behaviors.
 * workflow.as/approval, workflow.as/onboarding, workflow.as/pipeline
 *
 * @see https://workflow.as
 *
 * @example
 * ```typescript
 * import { workflow } from 'workflow.as'
 *
 * // Define with tagged template
 * const approval = await workflow.as`
 *   A multi-stage approval workflow that requires
 *   manager approval, then finance approval,
 *   with escalation after 48 hours
 * `
 *
 * // Use pre-built patterns
 * const onboarding = workflow.onboarding({
 *   steps: ['welcome', 'profile', 'team-intro', 'training']
 * })
 *
 * const pipeline = workflow.pipeline({
 *   stages: ['build', 'test', 'deploy']
 * })
 *
 * // Define with $ context
 * const custom = workflow.define($ => {
 *   $.on.Request.submitted(async (req, $) => {
 *     $.state.request = req
 *     await $.send('Approval.request', { approver: req.manager })
 *   })
 *
 *   $.on.Approval.granted(async (approval, $) => {
 *     await $.send('Request.fulfilled', $.state.request)
 *   })
 *
 *   $.every('48 hours after submission')(async ($) => {
 *     if ($.state.status === 'pending') {
 *       await $.send('Escalation.trigger', $.state.request)
 *     }
 *   })
 * })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  pattern: 'sequential' | 'parallel' | 'approval' | 'saga' | 'pipeline' | 'state-machine' | 'custom'
  definition: WorkflowTemplateDefinition
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowTemplateDefinition {
  /** Steps/stages */
  steps?: Array<{
    name: string
    action?: string
    wait?: string
    condition?: string
    onError?: 'fail' | 'retry' | 'skip'
  }>
  /** State machine states */
  states?: Record<string, {
    on?: Record<string, string>
    entry?: string
    exit?: string
  }>
  /** Events this workflow responds to */
  events?: string[]
  /** Schedules */
  schedules?: string[]
  /** Timeout */
  timeout?: string
  /** Retry policy */
  retry?: { attempts: number; delay: string }
}

// Workflow context for definition
export interface WorkflowContext {
  send: <T = unknown>(event: string, data: T) => Promise<void>
  do: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  try: <TData = unknown, TResult = unknown>(event: string, data: TData) => Promise<TResult>
  on: OnProxy
  every: EveryProxy
  state: Record<string, unknown>
  log: (message: string, data?: unknown) => void
  set: <T = unknown>(key: string, value: T) => void
  get: <T = unknown>(key: string) => T | undefined
  /** Transition to a state (for state machines) */
  transition: (state: string) => void
}

type OnProxy = { [noun: string]: { [event: string]: (handler: (data: unknown, $: WorkflowContext) => void | Promise<void>) => void } }
type EveryProxy = {
  (description: string, handler: ($: WorkflowContext) => void | Promise<void>): void
} & { [key: string]: unknown }

// Pre-built workflow pattern interfaces
export interface ApprovalWorkflow {
  template: WorkflowTemplate
  /** Configure approvers */
  approvers(list: string[]): ApprovalWorkflow
  /** Set escalation */
  escalation(after: string, to: string): ApprovalWorkflow
  /** Set timeout */
  timeout(duration: string): ApprovalWorkflow
  /** Deploy the workflow */
  deploy(): Promise<WorkflowTemplate>
}

export interface OnboardingWorkflow {
  template: WorkflowTemplate
  /** Add a step */
  step(name: string, action?: string): OnboardingWorkflow
  /** Set timing between steps */
  spacing(duration: string): OnboardingWorkflow
  /** Deploy */
  deploy(): Promise<WorkflowTemplate>
}

export interface PipelineWorkflow {
  template: WorkflowTemplate
  /** Add a stage */
  stage(name: string, config?: { parallel?: boolean; retry?: number }): PipelineWorkflow
  /** Set failure behavior */
  onFailure(behavior: 'stop' | 'continue' | 'rollback'): PipelineWorkflow
  /** Deploy */
  deploy(): Promise<WorkflowTemplate>
}

export interface SagaWorkflow {
  template: WorkflowTemplate
  /** Add a step with compensation */
  step(name: string, action: string, compensate: string): SagaWorkflow
  /** Deploy */
  deploy(): Promise<WorkflowTemplate>
}

export interface StateMachineWorkflow {
  template: WorkflowTemplate
  /** Add a state */
  state(name: string, config: { on?: Record<string, string>; entry?: string; exit?: string }): StateMachineWorkflow
  /** Set initial state */
  initial(state: string): StateMachineWorkflow
  /** Deploy */
  deploy(): Promise<WorkflowTemplate>
}

// Client interface
export interface WorkflowAsClient {
  /**
   * Create a workflow from natural language
   *
   * @example
   * ```typescript
   * const flow = await workflow.as`
   *   An expense approval workflow with manager
   *   and finance approval, auto-approve under $100
   * `
   * ```
   */
  as: TaggedTemplate<Promise<WorkflowTemplate>>

  /**
   * Define with $ context
   *
   * @example
   * ```typescript
   * const flow = workflow.define($ => {
   *   $.on.Document.uploaded(async (doc, $) => {
   *     await $.do('OCR.extract', doc)
   *     await $.send('Review.request', doc)
   *   })
   * })
   * ```
   */
  define(setup: ($: WorkflowContext) => void, options?: { name?: string }): Promise<WorkflowTemplate>

  // Pre-built patterns

  /**
   * Approval workflow pattern
   */
  approval(options?: {
    name?: string
    approvers?: string[]
    escalation?: { after: string; to: string }
  }): ApprovalWorkflow

  /**
   * Onboarding workflow pattern
   */
  onboarding(options?: {
    name?: string
    steps?: string[]
    spacing?: string
  }): OnboardingWorkflow

  /**
   * Pipeline workflow pattern
   */
  pipeline(options?: {
    name?: string
    stages?: string[]
    parallel?: boolean
  }): PipelineWorkflow

  /**
   * Saga workflow pattern (with compensation)
   */
  saga(options?: {
    name?: string
  }): SagaWorkflow

  /**
   * State machine workflow pattern
   */
  stateMachine(options?: {
    name?: string
    initial?: string
  }): StateMachineWorkflow

  // Management

  /**
   * Get a workflow template
   */
  get(nameOrId: string): Promise<WorkflowTemplate>

  /**
   * List templates
   */
  list(options?: { pattern?: string }): Promise<WorkflowTemplate[]>

  /**
   * Update a template
   */
  update(nameOrId: string, updates: Partial<WorkflowTemplateDefinition>): Promise<WorkflowTemplate>

  /**
   * Delete a template
   */
  delete(nameOrId: string): Promise<void>

  /**
   * Clone a template
   */
  clone(nameOrId: string, newName: string): Promise<WorkflowTemplate>

  /**
   * List available patterns
   */
  patterns(): Promise<Array<{ pattern: string; description: string; example: string }>>

  /**
   * Validate a workflow definition
   */
  validate(definition: WorkflowTemplateDefinition): Promise<{ valid: boolean; errors?: string[] }>
}

/**
 * Create a configured workflow.as client
 */
export function WorkflowAs(options?: ClientOptions): WorkflowAsClient {
  return createClient<WorkflowAsClient>('https://workflow.as', options)
}

/**
 * Default workflow.as client
 */
export const workflow: WorkflowAsClient = WorkflowAs()

// Convenience exports
export const approval = (opts?: Parameters<WorkflowAsClient['approval']>[0]) => workflow.approval(opts)
export const onboarding = (opts?: Parameters<WorkflowAsClient['onboarding']>[0]) => workflow.onboarding(opts)
export const pipeline = (opts?: Parameters<WorkflowAsClient['pipeline']>[0]) => workflow.pipeline(opts)
export const saga = (opts?: Parameters<WorkflowAsClient['saga']>[0]) => workflow.saga(opts)
export const stateMachine = (opts?: Parameters<WorkflowAsClient['stateMachine']>[0]) => workflow.stateMachine(opts)

export default workflow

export type { ClientOptions } from 'rpc.do'
