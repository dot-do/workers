/**
 * actions.do - AI Actions SDK
 *
 * @example
 * ```typescript
 * import { actions } from 'actions.do'
 *
 * // Define an action
 * await actions.define('send_email', {
 *   description: 'Send an email to a user',
 *   parameters: { to: 'string', subject: 'string', body: 'string' },
 *   handler: 'email-worker'
 * })
 *
 * // Execute an action
 * await actions.execute('send_email', { to: 'alice@example.com', subject: 'Hello' })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

// Types
export interface ActionDefinition {
  name: string
  description: string
  parameters: Record<string, string | { type: string; description?: string; required?: boolean }>
  handler: string
  timeout?: number
}

export interface Action {
  id: string
  name: string
  description: string
  parameters: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: unknown
  error?: string
  createdAt: Date
  completedAt?: Date
}

// Client interface
export interface ActionsClient {
  define(name: string, definition: Omit<ActionDefinition, 'name'>): Promise<ActionDefinition>
  undefine(name: string): Promise<void>
  definitions(): Promise<ActionDefinition[]>
  get(name: string): Promise<ActionDefinition>

  execute(name: string, params: Record<string, unknown>): Promise<Action>
  executeAsync(name: string, params: Record<string, unknown>): Promise<{ actionId: string }>
  status(actionId: string): Promise<Action>
  cancel(actionId: string): Promise<void>

  history(options?: { name?: string; status?: string; limit?: number }): Promise<Action[]>
}

export function Actions(options?: ClientOptions): ActionsClient {
  return createClient<ActionsClient>('https://actions.do', options)
}

export const actions: ActionsClient = Actions({
  apiKey: typeof process !== 'undefined' ? process.env?.ACTIONS_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
