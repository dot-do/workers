/**
 * startups.studio SDK
 *
 * Build and manage your Autonomous Startup portfolio.
 * The venture studio for Business-as-Code.
 *
 * @example
 * ```typescript
 * import { studio } from 'startups.studio'
 *
 * // Get your startup portfolio
 * const portfolio = await studio.portfolio()
 *
 * // Deploy updates to a startup
 * await studio.deploy('my-startup', {
 *   code: updatedWorkerCode,
 *   message: 'Add new feature'
 * })
 *
 * // Monitor all startups
 * const health = await studio.health()
 * ```
 */

import { createClient, getDefaultApiKeySync, type ClientOptions } from '@dotdo/rpc-client'

// =============================================================================
// Types
// =============================================================================

export interface Portfolio {
  startups: StartupSummary[]
  stats: PortfolioStats
  recentActivity: Activity[]
}

export interface StartupSummary {
  id: string
  name: string
  slug: string
  domain: string
  status: 'active' | 'paused' | 'archived'
  metrics: StartupMetrics
  lastDeployed: Date
  health: 'healthy' | 'degraded' | 'down'
}

export interface PortfolioStats {
  totalStartups: number
  activeStartups: number
  totalMRR: number
  totalCustomers: number
  totalRequests: number
  avgUptime: number
}

export interface StartupMetrics {
  mrr: number
  customers: number
  requests24h: number
  errorRate: number
  p99Latency: number
}

export interface Activity {
  id: string
  startupId: string
  startupName: string
  type: 'deploy' | 'config' | 'incident' | 'milestone'
  description: string
  timestamp: Date
  actor?: string
}

export interface DeployConfig {
  code?: string
  config?: Record<string, unknown>
  message?: string
  env?: Record<string, string>
  secrets?: Record<string, string>
  rollback?: string // deployment ID to rollback to
}

export interface Deployment {
  id: string
  startupId: string
  version: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'rolled-back'
  message?: string
  createdAt: Date
  completedAt?: Date
  changes: DeploymentChange[]
}

export interface DeploymentChange {
  type: 'code' | 'config' | 'env' | 'secret'
  path?: string
  action: 'added' | 'modified' | 'removed'
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'down'
  startups: StartupHealth[]
  incidents: Incident[]
}

export interface StartupHealth {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'down'
  uptime: number
  latency: { p50: number; p95: number; p99: number }
  errorRate: number
  checks: HealthCheck[]
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
  lastChecked: Date
}

export interface Incident {
  id: string
  startupId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  status: 'open' | 'investigating' | 'resolved'
  createdAt: Date
  resolvedAt?: Date
}

export interface AnalyticsSummary {
  period: { start: Date; end: Date }
  revenue: {
    total: number
    byStartup: Record<string, number>
    growth: number
  }
  traffic: {
    requests: number
    uniqueVisitors: number
    byStartup: Record<string, number>
  }
  performance: {
    avgLatency: number
    errorRate: number
    uptime: number
  }
}

export interface StartupConfig {
  name?: string
  domain?: string
  env?: Record<string, string>
  secrets?: string[] // secret names (values set separately)
  services?: ServiceBinding[]
  scaling?: ScalingConfig
  alerting?: AlertConfig[]
}

export interface ServiceBinding {
  name: string
  service: string
  config?: Record<string, unknown>
}

export interface ScalingConfig {
  minInstances?: number
  maxInstances?: number
  targetCPU?: number
  targetMemory?: number
}

export interface AlertConfig {
  name: string
  condition: string
  threshold: number
  channels: ('email' | 'slack' | 'webhook')[]
}

export interface Log {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  startupId: string
  requestId?: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// Client Interface
// =============================================================================

export interface StudioClient {
  /**
   * Get your startup portfolio overview
   */
  portfolio(): Promise<Portfolio>

  /**
   * Get a specific startup's details
   */
  startup(idOrSlug: string): Promise<StartupSummary & {
    config: StartupConfig
    deployments: Deployment[]
  }>

  /**
   * Deploy updates to a startup
   */
  deploy(startupId: string, config: DeployConfig): Promise<Deployment>

  /**
   * Get deployment status
   */
  deployment(deploymentId: string): Promise<Deployment>

  /**
   * List deployments for a startup
   */
  deployments(startupId: string, options?: {
    limit?: number
    status?: Deployment['status']
  }): Promise<Deployment[]>

  /**
   * Rollback to a previous deployment
   */
  rollback(startupId: string, deploymentId: string): Promise<Deployment>

  /**
   * Get health report for all startups
   */
  health(): Promise<HealthReport>

  /**
   * Get health for a specific startup
   */
  startupHealth(startupId: string): Promise<StartupHealth>

  /**
   * Get analytics summary
   */
  analytics(options?: {
    startupId?: string
    period?: 'day' | 'week' | 'month' | 'year'
    start?: Date
    end?: Date
  }): Promise<AnalyticsSummary>

  /**
   * Update startup configuration
   */
  configure(startupId: string, config: Partial<StartupConfig>): Promise<StartupConfig>

  /**
   * Set a secret for a startup
   */
  setSecret(startupId: string, name: string, value: string): Promise<void>

  /**
   * Get logs for a startup
   */
  logs(startupId: string, options?: {
    level?: Log['level']
    start?: Date
    end?: Date
    limit?: number
    search?: string
  }): Promise<Log[]>

  /**
   * Stream live logs
   */
  tailLogs(startupId: string, options?: {
    level?: Log['level']
  }): AsyncIterable<Log>

  /**
   * Pause a startup (stops serving traffic)
   */
  pause(startupId: string): Promise<void>

  /**
   * Resume a paused startup
   */
  resume(startupId: string): Promise<void>

  /**
   * Archive a startup (soft delete)
   */
  archive(startupId: string): Promise<void>

  /**
   * Transfer startup ownership
   */
  transfer(startupId: string, newOwnerId: string): Promise<void>

  /**
   * Invite a collaborator
   */
  invite(startupId: string, email: string, role: 'admin' | 'developer' | 'viewer'): Promise<void>

  /**
   * Get recent activity across all startups
   */
  activity(options?: {
    startupId?: string
    type?: Activity['type']
    limit?: number
  }): Promise<Activity[]>
}

// =============================================================================
// Client Factory & Default Instance
// =============================================================================

/**
 * Create a startups.studio client with custom options
 */
export function Studio(options?: ClientOptions): StudioClient {
  return createClient<StudioClient>('https://startups.studio', options)
}

/**
 * Default startups.studio client instance
 * Uses DO_API_KEY or ORG_AI_API_KEY from environment
 */
export const studio: StudioClient = Studio({
  apiKey: getDefaultApiKeySync(),
})

export default studio
