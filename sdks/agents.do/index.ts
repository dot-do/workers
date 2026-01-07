/**
 * agents.do - What do you want agents to .do for you?
 *
 * Deploy, orchestrate, and manage autonomous agents.
 *
 * @see https://agents.do
 *
 * @example
 * ```typescript
 * import agents from 'agents.do'
 *
 * // Tagged template - deploy an agent with natural language
 * const agent = await agents.do`
 *   Create an agent that monitors our GitHub repos
 *   and summarizes new issues every morning
 * `
 *
 * // Orchestrate multiple agents
 * const result = await agents.orchestrate`
 *   Research ${topic}, write a report, then create a presentation
 * `
 *
 * // Standard function syntax also works
 * const agent = await agents.spawn('researcher', { task: 'Analyze competitors' })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface AgentConfig {
  /** Agent name */
  name?: string
  /** What the agent does */
  task: string
  /** Agent capabilities */
  capabilities?: string[]
  /** Tools the agent can use */
  tools?: string[]
  /** Schedule for recurring tasks */
  schedule?: string
  /** Webhook for notifications */
  webhook?: string
  /** Max execution time in seconds */
  timeout?: number
  /** Memory/context persistence */
  memory?: boolean
}

export interface Agent {
  id: string
  name: string
  task: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  capabilities: string[]
  tools: string[]
  createdAt: Date
  lastRunAt?: Date
  nextRunAt?: Date
  runs: number
}

export interface AgentRun {
  id: string
  agentId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  logs: AgentLog[]
  usage: { tokens: number; cost: number; duration: number }
  startedAt: Date
  completedAt?: Date
}

export interface AgentLog {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

export interface OrchestrationResult {
  id: string
  agents: Array<{ id: string; name: string; status: string }>
  result: Record<string, unknown>
  usage: { tokens: number; cost: number; duration: number }
}

// Client interface
export interface AgentsClient {
  /**
   * Create and deploy an agent from natural language
   *
   * @example
   * ```typescript
   * const agent = await agents.do`Monitor Hacker News for AI news`
   * ```
   */
  do: TaggedTemplate<Promise<Agent>>

  /**
   * Orchestrate multiple agents to accomplish a complex task
   *
   * @example
   * ```typescript
   * const result = await agents.orchestrate`
   *   Research ${company}, analyze their product, write competitive analysis
   * `
   * ```
   */
  orchestrate: TaggedTemplate<Promise<OrchestrationResult>>

  /**
   * Spawn a pre-defined agent type
   */
  spawn(type: string, config: Partial<AgentConfig>): Promise<Agent>

  /**
   * Create a custom agent
   */
  create(config: AgentConfig): Promise<Agent>

  /**
   * Get an agent by ID
   */
  get(agentId: string): Promise<Agent>

  /**
   * List all agents
   */
  list(options?: { status?: Agent['status']; limit?: number }): Promise<Agent[]>

  /**
   * Trigger an agent to run now
   */
  run(agentId: string, input?: Record<string, unknown>): Promise<AgentRun>

  /**
   * Get a specific run
   */
  getRun(runId: string): Promise<AgentRun>

  /**
   * List runs for an agent
   */
  runs(agentId: string, options?: { limit?: number }): Promise<AgentRun[]>

  /**
   * Stream logs from an agent run
   */
  logs(runId: string): AsyncIterable<AgentLog>

  /**
   * Pause an agent
   */
  pause(agentId: string): Promise<Agent>

  /**
   * Resume a paused agent
   */
  resume(agentId: string): Promise<Agent>

  /**
   * Stop and delete an agent
   */
  delete(agentId: string): Promise<void>

  /**
   * Update agent configuration
   */
  update(agentId: string, config: Partial<AgentConfig>): Promise<Agent>

  /**
   * List available agent types
   */
  types(): Promise<Array<{ type: string; description: string; capabilities: string[] }>>
}

/**
 * Create a configured agents client
 */
export function Agents(options?: ClientOptions): AgentsClient {
  return createClient<AgentsClient>('https://agents.do', options)
}

/**
 * Default agents client instance
 */
export const agents: AgentsClient = Agents()

export default agents

// Re-export types
export type { ClientOptions } from 'rpc.do'
