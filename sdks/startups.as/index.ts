/**
 * startups.as - Define and launch startups as code
 *
 * Create autonomous startups that run on AI with human oversight.
 * startups.as/my-startup, startups.as/saas, startups.as/marketplace
 *
 * @see https://startups.as
 *
 * @example
 * ```typescript
 * import { startups } from 'startups.as'
 *
 * // Define a startup
 * const startup = await startups.create({
 *   name: 'acme',
 *   vision: 'Democratize AI for small businesses',
 *   model: 'saas',
 *   services: ['llm.do', 'payments.do'],
 *   agents: ['sales', 'support', 'marketing']
 * })
 *
 * // Launch the startup
 * await startups.launch('acme')
 *
 * // Get startup metrics
 * const metrics = await startups.metrics('acme')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface StartupConfig {
  /** Startup name/slug */
  name: string
  /** Display name */
  displayName?: string
  /** Vision/mission statement */
  vision?: string
  /** Business model */
  model?: 'saas' | 'marketplace' | 'api' | 'service' | 'product'
  /** Target market */
  market?: string
  /** Value proposition */
  valueProposition?: string
  /** Platform services to use */
  services?: string[]
  /** AI agents to deploy */
  agents?: string[]
  /** Team members */
  team?: Array<{ role: string; email?: string }>
  /** Initial funding/budget */
  budget?: number
  /** Custom domain */
  domain?: string
}

export interface Startup {
  id: string
  name: string
  displayName?: string
  vision?: string
  model?: string
  status: 'draft' | 'launching' | 'active' | 'paused' | 'archived'
  url: string
  domain?: string
  services: string[]
  agents: string[]
  createdAt: Date
  launchedAt?: Date
}

export interface StartupMetrics {
  revenue: number
  customers: number
  mrr: number
  churn: number
  nps: number
  activeAgents: number
  tasksCompleted: number
  period: string
}

export interface Agent {
  id: string
  role: string
  status: 'active' | 'paused' | 'error'
  tasksCompleted: number
  lastActive: Date
}

export interface Service {
  name: string
  status: 'connected' | 'disconnected' | 'error'
  usage: number
  cost: number
}

export interface LaunchOptions {
  /** Go live immediately */
  immediate?: boolean
  /** Beta/invite only */
  beta?: boolean
  /** Waitlist enabled */
  waitlist?: boolean
  /** Custom launch date */
  launchDate?: Date
}

// Client interface
export interface StartupsAsClient {
  /**
   * Create a startup definition
   */
  create(config: StartupConfig): Promise<Startup>

  /**
   * Get startup details
   */
  get(name: string): Promise<Startup>

  /**
   * List all startups
   */
  list(options?: { status?: Startup['status']; limit?: number }): Promise<Startup[]>

  /**
   * Update startup configuration
   */
  update(name: string, config: Partial<StartupConfig>): Promise<Startup>

  /**
   * Launch a startup
   */
  launch(name: string, options?: LaunchOptions): Promise<Startup>

  /**
   * Pause a running startup
   */
  pause(name: string): Promise<Startup>

  /**
   * Resume a paused startup
   */
  resume(name: string): Promise<Startup>

  /**
   * Archive a startup
   */
  archive(name: string): Promise<Startup>

  /**
   * Delete a startup
   */
  delete(name: string): Promise<void>

  /**
   * Get startup metrics
   */
  metrics(name: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<StartupMetrics>

  /**
   * List startup agents
   */
  agents(name: string): Promise<Agent[]>

  /**
   * Add an agent to the startup
   */
  addAgent(name: string, agentRole: string): Promise<Agent>

  /**
   * Remove an agent
   */
  removeAgent(name: string, agentId: string): Promise<void>

  /**
   * List connected services
   */
  services(name: string): Promise<Service[]>

  /**
   * Connect a service
   */
  connectService(name: string, service: string): Promise<Service>

  /**
   * Disconnect a service
   */
  disconnectService(name: string, service: string): Promise<void>

  /**
   * Clone a startup
   */
  clone(name: string, newName: string): Promise<Startup>

  /**
   * Export startup configuration
   */
  export(name: string): Promise<StartupConfig>
}

/**
 * Create a configured startups.as client
 */
export function Startups(options?: ClientOptions): StartupsAsClient {
  return createClient<StartupsAsClient>('https://startups.as', options)
}

/**
 * Default startups.as client instance
 */
export const startups: StartupsAsClient = Startups({
  apiKey: typeof process !== 'undefined' ? (process.env?.STARTUPS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: StartupConfig) => startups.create(config)
export const launch = (name: string, options?: LaunchOptions) => startups.launch(name, options)
export const list = (options?: { status?: Startup['status']; limit?: number }) => startups.list(options)

export default startups

// Re-export types
export type { ClientOptions } from 'rpc.do'
