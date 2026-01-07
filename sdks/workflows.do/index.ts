/**
 * workflows.do - Durable Workflows SDK
 *
 * @example
 * ```typescript
 * import { workflows } from 'workflows.do'
 *
 * // Define a workflow
 * await workflows.define('onboarding', {
 *   steps: [
 *     { name: 'createUser', action: 'users.create' },
 *     { name: 'sendWelcome', action: 'email.send', wait: '5m' },
 *     { name: 'scheduleFollowup', action: 'email.schedule', wait: '7d' }
 *   ]
 * })
 *
 * // Start a workflow
 * const run = await workflows.start('onboarding', { email: 'alice@example.com' })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

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
  name: string
  steps: WorkflowStep[]
  timeout?: string
  onError?: 'fail' | 'continue' | 'retry'
}

export interface WorkflowRun {
  id: string
  workflowName: string
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  currentStep?: string
  output?: unknown
  error?: string
  startedAt: Date
  completedAt?: Date
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

// Client interface
export interface WorkflowsClient {
  define(name: string, definition: Omit<WorkflowDefinition, 'name'>): Promise<WorkflowDefinition>
  update(name: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>
  delete(name: string): Promise<void>
  get(name: string): Promise<WorkflowDefinition>
  list(): Promise<WorkflowDefinition[]>

  start(name: string, input?: Record<string, unknown>): Promise<WorkflowRun>
  status(runId: string): Promise<WorkflowRun>
  steps(runId: string): Promise<StepRun[]>
  pause(runId: string): Promise<WorkflowRun>
  resume(runId: string): Promise<WorkflowRun>
  cancel(runId: string): Promise<WorkflowRun>

  runs(options?: { workflowName?: string; status?: string; limit?: number }): Promise<WorkflowRun[]>
}

export function Workflows(options?: ClientOptions): WorkflowsClient {
  return createClient<WorkflowsClient>('https://workflows.do', options)
}

export const workflows: WorkflowsClient = Workflows({
  apiKey: typeof process !== 'undefined' ? process.env?.WORKFLOWS_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
