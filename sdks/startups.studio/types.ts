/**
 * startups.studio - Type definitions
 *
 * Core types for Autonomous Startup portfolio management.
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Startup status in the portfolio
 */
export type StartupStatus =
  | 'draft'        // Initial concept, not yet deployed
  | 'building'     // Under active development
  | 'staging'      // Deployed to staging environment
  | 'live'         // Production deployment
  | 'paused'       // Temporarily suspended
  | 'archived'     // No longer active, preserved for reference

/**
 * Startup priority level
 */
export type StartupPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Health status of a startup
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Team member role in a startup
 */
export type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer'

// =============================================================================
// Startup Entity
// =============================================================================

/**
 * Core startup entity in the portfolio
 */
export interface Startup {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** URL-safe slug */
  slug: string
  /** Description of the startup */
  description?: string
  /** Current status */
  status: StartupStatus
  /** Priority level */
  priority: StartupPriority
  /** Primary domain */
  domain?: string
  /** Additional domains */
  domains?: string[]
  /** Repository URL */
  repository?: string
  /** Tags for organization */
  tags?: string[]
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Owner user ID */
  ownerId: string
}

// =============================================================================
// Deployment
// =============================================================================

/**
 * Deployment status
 */
export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'rolled_back'

/**
 * A single deployment of a startup
 */
export interface Deployment {
  /** Unique identifier */
  id: string
  /** Startup ID */
  startupId: string
  /** Git commit SHA */
  commitSha?: string
  /** Git branch */
  branch?: string
  /** Deployment status */
  status: DeploymentStatus
  /** Environment (staging, production) */
  environment: 'staging' | 'production'
  /** Deployment URL */
  url?: string
  /** Build logs URL */
  logsUrl?: string
  /** Duration in seconds */
  duration?: number
  /** Error message if failed */
  error?: string
  /** Initiated by user ID */
  initiatedBy?: string
  /** Timestamp */
  createdAt: Date
  /** Completion timestamp */
  completedAt?: Date
}

// =============================================================================
// Health & Monitoring
// =============================================================================

/**
 * Health check result
 */
export interface HealthCheck {
  /** Startup ID */
  startupId: string
  /** Overall health status */
  status: HealthStatus
  /** Health score (0-100) */
  score: number
  /** Individual checks */
  checks: {
    name: string
    status: HealthStatus
    message?: string
    latency?: number
    lastChecked: Date
  }[]
  /** Timestamp */
  timestamp: Date
}

/**
 * Service incident
 */
export interface Incident {
  /** Unique identifier */
  id: string
  /** Startup ID */
  startupId: string
  /** Incident title */
  title: string
  /** Description */
  description?: string
  /** Severity level */
  severity: IncidentSeverity
  /** Is resolved? */
  resolved: boolean
  /** Impact description */
  impact?: string
  /** Root cause (if known) */
  rootCause?: string
  /** Resolution notes */
  resolution?: string
  /** Started timestamp */
  startedAt: Date
  /** Resolved timestamp */
  resolvedAt?: Date
  /** Acknowledged by user ID */
  acknowledgedBy?: string
  /** Acknowledged timestamp */
  acknowledgedAt?: Date
}

// =============================================================================
// Analytics
// =============================================================================

/**
 * Revenue analytics
 */
export interface RevenueAnalytics {
  /** Startup ID */
  startupId: string
  /** Time period */
  period: 'day' | 'week' | 'month' | 'year'
  /** Total revenue */
  total: number
  /** Currency */
  currency: string
  /** Revenue by day */
  breakdown: {
    date: string
    revenue: number
    transactions: number
  }[]
  /** Growth rate */
  growthRate: number
  /** MRR (Monthly Recurring Revenue) */
  mrr?: number
  /** ARR (Annual Recurring Revenue) */
  arr?: number
  /** Churn rate */
  churnRate?: number
}

/**
 * Traffic analytics
 */
export interface TrafficAnalytics {
  /** Startup ID */
  startupId: string
  /** Time period */
  period: 'day' | 'week' | 'month' | 'year'
  /** Total requests */
  totalRequests: number
  /** Unique visitors */
  uniqueVisitors: number
  /** Page views */
  pageViews: number
  /** Bandwidth used (bytes) */
  bandwidth: number
  /** Traffic by day */
  breakdown: {
    date: string
    requests: number
    visitors: number
    pageViews: number
    bandwidth: number
  }[]
  /** Top pages */
  topPages: {
    path: string
    views: number
  }[]
  /** Top referrers */
  topReferrers: {
    source: string
    visits: number
  }[]
  /** Geographic distribution */
  geography: {
    country: string
    visits: number
  }[]
}

/**
 * Performance analytics
 */
export interface PerformanceAnalytics {
  /** Startup ID */
  startupId: string
  /** Time period */
  period: 'day' | 'week' | 'month' | 'year'
  /** Average response time (ms) */
  avgResponseTime: number
  /** P50 response time (ms) */
  p50ResponseTime: number
  /** P95 response time (ms) */
  p95ResponseTime: number
  /** P99 response time (ms) */
  p99ResponseTime: number
  /** Error rate (percentage) */
  errorRate: number
  /** Uptime percentage */
  uptime: number
  /** CPU utilization (percentage) */
  cpuUtilization?: number
  /** Memory utilization (percentage) */
  memoryUtilization?: number
  /** Performance over time */
  breakdown: {
    date: string
    avgResponseTime: number
    errorRate: number
    uptime: number
  }[]
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Startup configuration
 */
export interface StartupConfig {
  /** Startup ID */
  startupId: string
  /** Environment variables (names only, values are secured) */
  envVars: {
    name: string
    isSecret: boolean
    updatedAt: Date
  }[]
  /** Build configuration */
  build?: {
    command?: string
    outputDir?: string
    nodeVersion?: string
    installCommand?: string
  }
  /** Deployment triggers */
  triggers?: {
    branch?: string
    autoDeploy: boolean
    deployOnPush: boolean
  }
  /** Custom domains configuration */
  domains?: {
    domain: string
    verified: boolean
    ssl: boolean
    primary: boolean
  }[]
  /** Feature flags */
  features?: Record<string, boolean>
}

/**
 * Environment variable value (for set operations)
 */
export interface EnvVar {
  name: string
  value: string
  isSecret?: boolean
}

// =============================================================================
// Logs
// =============================================================================

/**
 * Log entry
 */
export interface LogEntry {
  /** Timestamp */
  timestamp: Date
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error'
  /** Log message */
  message: string
  /** Request ID */
  requestId?: string
  /** Source (function, worker, etc.) */
  source?: string
  /** Additional context */
  metadata?: Record<string, unknown>
}

/**
 * Log query options
 */
export interface LogQueryOptions {
  /** Start time */
  startTime?: Date
  /** End time */
  endTime?: Date
  /** Filter by level */
  level?: LogEntry['level'] | LogEntry['level'][]
  /** Search query */
  query?: string
  /** Maximum results */
  limit?: number
  /** Cursor for pagination */
  cursor?: string
}

// =============================================================================
// Team
// =============================================================================

/**
 * Team member
 */
export interface TeamMember {
  /** User ID */
  userId: string
  /** Email */
  email: string
  /** Display name */
  name?: string
  /** Avatar URL */
  avatar?: string
  /** Role in the startup */
  role: TeamRole
  /** When they joined */
  joinedAt: Date
  /** Invited by user ID */
  invitedBy?: string
}

/**
 * Team invitation
 */
export interface TeamInvite {
  /** Invite ID */
  id: string
  /** Startup ID */
  startupId: string
  /** Invitee email */
  email: string
  /** Offered role */
  role: TeamRole
  /** Invited by user ID */
  invitedBy: string
  /** Expiration timestamp */
  expiresAt: Date
  /** Created timestamp */
  createdAt: Date
  /** Accepted timestamp */
  acceptedAt?: Date
}

// =============================================================================
// Portfolio
// =============================================================================

/**
 * Portfolio overview
 */
export interface PortfolioOverview {
  /** Total startups */
  totalStartups: number
  /** By status breakdown */
  byStatus: Record<StartupStatus, number>
  /** By priority breakdown */
  byPriority: Record<StartupPriority, number>
  /** Total revenue (all startups) */
  totalRevenue?: {
    amount: number
    currency: string
    period: 'month' | 'year'
  }
  /** Total traffic (all startups) */
  totalTraffic?: {
    requests: number
    visitors: number
    period: 'month' | 'year'
  }
  /** Average health score */
  avgHealthScore: number
  /** Startups with active incidents */
  startupsWithIncidents: number
  /** Recent deployments */
  recentDeployments: number
  /** Last updated */
  updatedAt: Date
}

/**
 * Portfolio stats
 */
export interface PortfolioStats {
  /** Total startups */
  totalStartups: number
  /** Live startups */
  liveStartups: number
  /** Startups building */
  buildingStartups: number
  /** Archived startups */
  archivedStartups: number
  /** Total deployments (all time) */
  totalDeployments: number
  /** Successful deployment rate */
  deploymentSuccessRate: number
  /** Average uptime across portfolio */
  avgUptime: number
  /** Total team members */
  totalTeamMembers: number
}
