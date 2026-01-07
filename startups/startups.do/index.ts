/**
 * startups.do - Build businesses that run on AI.
 *
 * The complete SDK for Autonomous Startups - businesses defined in code
 * that run on AI with human oversight.
 *
 * @see https://startups.do
 *
 * @example
 * ```typescript
 * import startups from 'startups.do'
 *
 * // Define your startup
 * const startup = await startups.do`
 *   A SaaS that helps developers ship faster
 *   with AI-powered code review and testing.
 * `
 *
 * // Launch it
 * await startups.launch(startup.id)
 *
 * // Monitor and iterate
 * const metrics = await startups.metrics(startup.id)
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate } from 'rpc.do'

// Types

/**
 * Startup definition
 */
export interface Startup {
  id: string
  name: string
  description: string
  /** Business model */
  model: 'saas' | 'marketplace' | 'api' | 'agency' | 'platform'
  /** Current stage */
  stage: 'idea' | 'building' | 'launched' | 'growing' | 'scaling'
  /** Domain configuration */
  domains?: string[]
  /** Services enabled */
  services: string[]
  /** Team configuration */
  team?: {
    agents: string[]
    humans: string[]
  }
  /** Metrics */
  metrics?: StartupMetrics
  createdAt: Date
  updatedAt: Date
}

/**
 * Startup metrics
 */
export interface StartupMetrics {
  /** Monthly Recurring Revenue */
  mrr?: number
  /** Active users */
  users?: number
  /** Customer count */
  customers?: number
  /** Churn rate */
  churn?: number
  /** Net Promoter Score */
  nps?: number
  /** Custom KPIs */
  kpis?: Record<string, number>
}

/**
 * Launch configuration
 */
export interface LaunchOptions {
  /** Custom domain */
  domain?: string
  /** Pricing tiers */
  pricing?: Array<{
    name: string
    price: number
    interval: 'month' | 'year'
    features: string[]
  }>
  /** Beta/waitlist mode */
  beta?: boolean
  /** Region */
  region?: string
}

/**
 * Startups client interface
 */
export interface StartupsClient {
  /**
   * Create a startup from natural language
   */
  do: TaggedTemplate<Promise<Startup>>

  /**
   * Create a startup with full configuration
   */
  create(options: {
    name: string
    description: string
    model?: Startup['model']
    services?: string[]
  }): Promise<Startup>

  /**
   * Get a startup by ID or name
   */
  get(idOrName: string): Promise<Startup>

  /**
   * List all startups
   */
  list(options?: {
    stage?: Startup['stage']
    model?: Startup['model']
    limit?: number
  }): Promise<Startup[]>

  /**
   * Launch a startup
   */
  launch(idOrName: string, options?: LaunchOptions): Promise<Startup>

  /**
   * Get startup metrics
   */
  metrics(idOrName: string, options?: {
    period?: 'day' | 'week' | 'month' | 'year'
  }): Promise<StartupMetrics>

  /**
   * Update a startup
   */
  update(idOrName: string, updates: Partial<Startup>): Promise<Startup>

  /**
   * Delete a startup
   */
  delete(idOrName: string): Promise<void>
}

/**
 * Create a configured startups client
 */
export function Startups(options?: ClientOptions): StartupsClient {
  return createClient<StartupsClient>('https://startups.do', options)
}

/**
 * Default startups client instance
 */
export const startups: StartupsClient = Startups()

export { Startups, startups }
export default startups
export type { ClientOptions } from 'rpc.do'
