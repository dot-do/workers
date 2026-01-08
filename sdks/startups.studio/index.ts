/**
 * startups.studio - Autonomous Startup Portfolio Management
 *
 * Build, deploy, and manage a portfolio of AI-powered startups.
 * Business-as-Code meets Services-as-Software.
 *
 * @see https://startups.studio
 *
 * @example
 * ```typescript
 * import startups from 'startups.studio'
 *
 * // Tagged template - describe your startup
 * const startup = await startups.do`
 *   Create an AI-powered resume builder SaaS
 *   with Stripe payments and user authentication
 * `
 *
 * // Create with full control
 * const myStartup = await startups.create({
 *   name: 'ResumeAI',
 *   description: 'AI-powered resume builder',
 *   domain: 'resumeai.co'
 * })
 *
 * // Deploy to production
 * await startups.deploy(myStartup.id, { environment: 'production' })
 *
 * // Monitor health
 * const health = await startups.health.check(myStartup.id)
 * console.log(`Health score: ${health.score}/100`)
 *
 * // View analytics
 * const revenue = await startups.analytics.revenue(myStartup.id, { period: 'month' })
 * console.log(`MRR: $${revenue.mrr}`)
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate } from 'rpc.do'

// Re-export all types
export * from './types.js'

import type {
  Startup,
  StartupStatus,
  StartupPriority,
  Deployment,
  DeploymentStatus,
  HealthCheck,
  HealthStatus,
  Incident,
  IncidentSeverity,
  RevenueAnalytics,
  TrafficAnalytics,
  PerformanceAnalytics,
  StartupConfig,
  EnvVar,
  LogEntry,
  LogQueryOptions,
  TeamMember,
  TeamRole,
  TeamInvite,
  PortfolioOverview,
  PortfolioStats,
} from './types.js'

// =============================================================================
// Client Interface
// =============================================================================

/**
 * Startups Studio client interface
 */
export interface StartupsClient {
  // ===========================================================================
  // Tagged Template - Natural Language Interface
  // ===========================================================================

  /**
   * Create a startup from natural language description
   *
   * @example
   * ```typescript
   * const startup = await startups.do`
   *   Launch an e-commerce platform for handmade crafts
   *   with Stripe payments, user reviews, and seller dashboards
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Startup>>

  // ===========================================================================
  // Portfolio Overview
  // ===========================================================================

  /**
   * Get portfolio overview with key metrics
   */
  overview(): Promise<PortfolioOverview>

  /**
   * Get detailed portfolio statistics
   */
  stats(): Promise<PortfolioStats>

  // ===========================================================================
  // Startup CRUD
  // ===========================================================================

  /**
   * Create a new startup
   *
   * @example
   * ```typescript
   * const startup = await startups.create({
   *   name: 'My SaaS',
   *   description: 'A productivity tool for teams',
   *   priority: 'high',
   *   tags: ['saas', 'productivity']
   * })
   * ```
   */
  create(startup: {
    name: string
    description?: string
    slug?: string
    priority?: StartupPriority
    domain?: string
    repository?: string
    tags?: string[]
    metadata?: Record<string, unknown>
  }): Promise<Startup>

  /**
   * Get a startup by ID or slug
   */
  get(idOrSlug: string): Promise<Startup>

  /**
   * List all startups in the portfolio
   */
  list(options?: {
    status?: StartupStatus
    priority?: StartupPriority
    tag?: string
    limit?: number
    offset?: number
  }): Promise<Startup[]>

  /**
   * Update a startup
   */
  update(idOrSlug: string, updates: Partial<Omit<Startup, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>>): Promise<Startup>

  /**
   * Delete a startup permanently
   */
  delete(idOrSlug: string): Promise<void>

  // ===========================================================================
  // Deployment Management
  // ===========================================================================

  /**
   * Deploy a startup
   *
   * @example
   * ```typescript
   * // Deploy to staging
   * const deployment = await startups.deploy('my-saas', {
   *   environment: 'staging'
   * })
   *
   * // Deploy specific branch to production
   * const prodDeploy = await startups.deploy('my-saas', {
   *   environment: 'production',
   *   branch: 'release-1.0'
   * })
   * ```
   */
  deploy(idOrSlug: string, options?: {
    environment?: 'staging' | 'production'
    branch?: string
    commitSha?: string
  }): Promise<Deployment>

  /**
   * Rollback to a previous deployment
   */
  rollback(idOrSlug: string, options?: {
    deploymentId?: string
    steps?: number
  }): Promise<Deployment>

  /**
   * Get deployment status
   */
  deploymentStatus(deploymentId: string): Promise<Deployment>

  /**
   * List deployments for a startup
   */
  deployments: {
    /**
     * List all deployments for a startup
     */
    list(startupIdOrSlug: string, options?: {
      environment?: 'staging' | 'production'
      status?: DeploymentStatus
      limit?: number
    }): Promise<Deployment[]>

    /**
     * Get a specific deployment
     */
    get(deploymentId: string): Promise<Deployment>

    /**
     * Cancel a pending/in-progress deployment
     */
    cancel(deploymentId: string): Promise<Deployment>
  }

  // ===========================================================================
  // Health Monitoring
  // ===========================================================================

  health: {
    /**
     * Run health check for a startup
     */
    check(startupIdOrSlug: string): Promise<HealthCheck>

    /**
     * Get health history
     */
    history(startupIdOrSlug: string, options?: {
      startTime?: Date
      endTime?: Date
      limit?: number
    }): Promise<HealthCheck[]>

    /**
     * Get current health status across portfolio
     */
    portfolio(): Promise<{
      healthy: number
      degraded: number
      unhealthy: number
      unknown: number
      startups: Array<{ id: string; name: string; status: HealthStatus; score: number }>
    }>
  }

  // ===========================================================================
  // Incident Management
  // ===========================================================================

  incidents: {
    /**
     * List incidents for a startup
     */
    list(startupIdOrSlug: string, options?: {
      resolved?: boolean
      severity?: IncidentSeverity
      limit?: number
    }): Promise<Incident[]>

    /**
     * Get a specific incident
     */
    get(incidentId: string): Promise<Incident>

    /**
     * Create a new incident
     */
    create(startupIdOrSlug: string, incident: {
      title: string
      description?: string
      severity: IncidentSeverity
      impact?: string
    }): Promise<Incident>

    /**
     * Acknowledge an incident
     */
    acknowledge(incidentId: string): Promise<Incident>

    /**
     * Resolve an incident
     */
    resolve(incidentId: string, resolution?: {
      rootCause?: string
      resolution?: string
    }): Promise<Incident>

    /**
     * Get active incidents across portfolio
     */
    active(): Promise<Incident[]>
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  analytics: {
    /**
     * Get revenue analytics
     *
     * @example
     * ```typescript
     * const revenue = await startups.analytics.revenue('my-saas', { period: 'month' })
     * console.log(`MRR: $${revenue.mrr}, Growth: ${revenue.growthRate}%`)
     * ```
     */
    revenue(startupIdOrSlug: string, options?: {
      period?: 'day' | 'week' | 'month' | 'year'
    }): Promise<RevenueAnalytics>

    /**
     * Get traffic analytics
     */
    traffic(startupIdOrSlug: string, options?: {
      period?: 'day' | 'week' | 'month' | 'year'
    }): Promise<TrafficAnalytics>

    /**
     * Get performance analytics
     */
    performance(startupIdOrSlug: string, options?: {
      period?: 'day' | 'week' | 'month' | 'year'
    }): Promise<PerformanceAnalytics>

    /**
     * Get aggregated analytics across portfolio
     */
    portfolio(options?: {
      period?: 'day' | 'week' | 'month' | 'year'
    }): Promise<{
      totalRevenue: number
      totalRequests: number
      avgUptime: number
      avgResponseTime: number
      topPerformers: Array<{ id: string; name: string; revenue: number; traffic: number }>
    }>
  }

  // ===========================================================================
  // Configuration Management
  // ===========================================================================

  config: {
    /**
     * Get startup configuration
     */
    get(startupIdOrSlug: string): Promise<StartupConfig>

    /**
     * Update startup configuration
     */
    update(startupIdOrSlug: string, config: Partial<Omit<StartupConfig, 'startupId' | 'envVars'>>): Promise<StartupConfig>

    /**
     * Environment variable management
     */
    env: {
      /**
       * List environment variables (names only, values are secured)
       */
      list(startupIdOrSlug: string): Promise<StartupConfig['envVars']>

      /**
       * Set environment variables
       *
       * @example
       * ```typescript
       * await startups.config.env.set('my-saas', [
       *   { name: 'STRIPE_KEY', value: 'sk_live_xxx', isSecret: true },
       *   { name: 'API_URL', value: 'https://api.example.com' }
       * ])
       * ```
       */
      set(startupIdOrSlug: string, vars: EnvVar[]): Promise<void>

      /**
       * Delete environment variables
       */
      delete(startupIdOrSlug: string, names: string[]): Promise<void>
    }

    /**
     * Domain management
     */
    domains: {
      /**
       * List domains for a startup
       */
      list(startupIdOrSlug: string): Promise<NonNullable<StartupConfig['domains']>>

      /**
       * Add a domain
       */
      add(startupIdOrSlug: string, domain: string): Promise<{ domain: string; verified: boolean; ssl: boolean }>

      /**
       * Verify domain ownership
       */
      verify(startupIdOrSlug: string, domain: string): Promise<{ domain: string; verified: boolean }>

      /**
       * Set primary domain
       */
      setPrimary(startupIdOrSlug: string, domain: string): Promise<void>

      /**
       * Remove a domain
       */
      remove(startupIdOrSlug: string, domain: string): Promise<void>
    }
  }

  // ===========================================================================
  // Logs & Debugging
  // ===========================================================================

  logs: {
    /**
     * Query logs
     *
     * @example
     * ```typescript
     * const errorLogs = await startups.logs.query('my-saas', {
     *   level: 'error',
     *   startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
     *   limit: 100
     * })
     * ```
     */
    query(startupIdOrSlug: string, options?: LogQueryOptions): Promise<{
      entries: LogEntry[]
      cursor?: string
      hasMore: boolean
    }>

    /**
     * Stream logs in real-time
     * Returns a function to stop streaming
     */
    stream(startupIdOrSlug: string, options?: {
      level?: LogEntry['level'] | LogEntry['level'][]
      onLog: (log: LogEntry) => void
      onError?: (error: Error) => void
    }): Promise<{ stop: () => void }>

    /**
     * Get recent errors
     */
    errors(startupIdOrSlug: string, options?: {
      limit?: number
    }): Promise<LogEntry[]>
  }

  // ===========================================================================
  // Team Management
  // ===========================================================================

  team: {
    /**
     * List team members for a startup
     */
    list(startupIdOrSlug: string): Promise<TeamMember[]>

    /**
     * Invite a team member
     *
     * @example
     * ```typescript
     * await startups.team.invite('my-saas', {
     *   email: 'developer@example.com',
     *   role: 'developer'
     * })
     * ```
     */
    invite(startupIdOrSlug: string, invite: {
      email: string
      role: TeamRole
    }): Promise<TeamInvite>

    /**
     * Update team member role
     */
    updateRole(startupIdOrSlug: string, userId: string, role: TeamRole): Promise<TeamMember>

    /**
     * Remove team member
     */
    remove(startupIdOrSlug: string, userId: string): Promise<void>

    /**
     * List pending invitations
     */
    invitations(startupIdOrSlug: string): Promise<TeamInvite[]>

    /**
     * Cancel an invitation
     */
    cancelInvite(inviteId: string): Promise<void>

    /**
     * Transfer ownership
     */
    transfer(startupIdOrSlug: string, newOwnerId: string): Promise<Startup>
  }

  // ===========================================================================
  // Lifecycle Management
  // ===========================================================================

  /**
   * Pause a startup (stops billing, keeps data)
   */
  pause(idOrSlug: string): Promise<Startup>

  /**
   * Resume a paused startup
   */
  resume(idOrSlug: string): Promise<Startup>

  /**
   * Archive a startup (soft delete, can be restored)
   */
  archive(idOrSlug: string): Promise<Startup>

  /**
   * Restore an archived startup
   */
  restore(idOrSlug: string): Promise<Startup>

  /**
   * Clone a startup
   */
  clone(idOrSlug: string, options: {
    name: string
    slug?: string
    includeConfig?: boolean
    includeEnvVars?: boolean
  }): Promise<Startup>
}

// =============================================================================
// Client Factory
// =============================================================================

/**
 * Create a configured Startups Studio client
 *
 * @example
 * ```typescript
 * import { Startups } from 'startups.studio'
 *
 * // Default configuration
 * const startups = Startups()
 *
 * // Custom configuration
 * const startups = Startups({
 *   apiKey: 'your-api-key',
 *   baseURL: 'https://custom.startups.studio'
 * })
 * ```
 */
export function Startups(options?: ClientOptions): StartupsClient {
  return createClient<StartupsClient>('https://startups.studio', options)
}

/**
 * Default Startups Studio client instance
 *
 * Uses global env from rpc.do for authentication.
 * In Workers, import 'rpc.do/env' before using this instance.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { startups } from 'startups.studio'
 *
 * const myStartup = await startups.create({ name: 'My SaaS', ... })
 * ```
 */
export const startups: StartupsClient = Startups()

// Default export
export default startups

// Re-export ClientOptions for convenience
export type { ClientOptions } from 'rpc.do'
