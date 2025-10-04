/**
 * Domain Monitor - Type Definitions
 * Types for domain status monitoring, expiration tracking, and health checks
 */

import type { Registrar, DomainStatus } from 'domains.do'

export interface Env {
  // Environment variables
  ENVIRONMENT: string
  ALERT_DAYS_BEFORE_EXPIRY: string
  BROWSERLESS_API_KEY?: string
  SLACK_WEBHOOK_URL?: string
  EMAIL_API_KEY?: string

  // D1 Database
  DB: D1Database

  // Service bindings
  DOMAINS?: any // DomainsService
  DNS_TOOLS?: any // DNSToolsService
  DELIVERABILITY?: any // DeliverabilityService

  // Queue binding
  MONITORING_QUEUE: Queue

  // KV namespace for caching
  REPUTATION_CACHE?: KVNamespace
}

/**
 * Domain Monitoring Record
 */
export interface DomainMonitoringRecord {
  id: string
  domain: string
  registrar: Registrar
  expirationDate: string
  status: DomainStatus
  lastChecked: string
  nextCheck: string
  monitoringEnabled: boolean
  alertsEnabled: boolean
  screenshotEnabled: boolean
  healthCheckEnabled: boolean
  metadata?: Record<string, unknown>
}

/**
 * Domain Health Check Result
 */
export interface DomainHealthCheck {
  domain: string
  timestamp: string
  checks: {
    dns: HealthCheckStatus
    http: HealthCheckStatus
    https: HealthCheckStatus
    ssl: HealthCheckStatus
    screenshot?: HealthCheckStatus
  }
  overall: 'healthy' | 'degraded' | 'unhealthy'
  issues: HealthCheckIssue[]
}

export interface HealthCheckStatus {
  status: 'pass' | 'fail' | 'warn'
  message?: string
  responseTime?: number
  details?: Record<string, unknown>
}

export interface HealthCheckIssue {
  type: 'dns' | 'http' | 'https' | 'ssl' | 'screenshot' | 'other'
  severity: 'critical' | 'warning' | 'info'
  message: string
  timestamp: string
}

/**
 * Domain Expiration Alert
 */
export interface DomainExpirationAlert {
  domain: string
  registrar: Registrar
  expirationDate: string
  daysUntilExpiry: number
  severity: 'critical' | 'warning' | 'info'
  message: string
  timestamp: string
  sent: boolean
}

/**
 * Screenshot Result
 */
export interface ScreenshotResult {
  domain: string
  url: string
  timestamp: string
  success: boolean
  screenshotUrl?: string
  error?: string
  compareHash?: string // For detecting visual changes
  changeDetected?: boolean
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  domain: string
  enabled: boolean
  checkInterval: number // minutes
  alerts: {
    enabled: boolean
    expirationDays: number[] // [30, 14, 7, 1]
    channels: ('email' | 'slack' | 'webhook')[]
    recipients: string[]
  }
  healthCheck: {
    enabled: boolean
    checkDNS: boolean
    checkHTTP: boolean
    checkHTTPS: boolean
    checkSSL: boolean
  }
  screenshot: {
    enabled: boolean
    compareEnabled: boolean
    interval: number // hours
  }
}

/**
 * Monitoring Statistics
 */
export interface MonitoringStats {
  totalDomains: number
  monitoredDomains: number
  healthyDomains: number
  unhealthyDomains: number
  expiringWithin30Days: number
  expiringWithin7Days: number
  lastCheckTime: string
  checksToday: number
  alertsSentToday: number
}

/**
 * Monitoring Task for Queue
 */
export interface MonitoringTask {
  type: 'health_check' | 'expiration_check' | 'screenshot' | 'full_scan'
  domain: string
  priority: 'high' | 'normal' | 'low'
  scheduledAt: string
  metadata?: Record<string, unknown>
}

/**
 * Monitoring History Entry
 */
export interface MonitoringHistoryEntry {
  id: string
  domain: string
  timestamp: string
  checkType: 'health' | 'expiration' | 'screenshot'
  result: 'success' | 'failure' | 'warning'
  details: Record<string, unknown>
}

/**
 * Alert Channel Configuration
 */
export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook'
  enabled: boolean
  config: {
    url?: string
    apiKey?: string
    recipients?: string[]
  }
}

/**
 * Email Domain Reputation
 */
export interface EmailDomainReputation {
  domainId: string
  domain: string
  senderScore: number // 0-100
  ipReputation: number // 0-100
  domainReputation: number // 0-100
  blacklistCount: number
  blacklists: string[]
  spfStatus: 'pass' | 'fail' | 'neutral' | 'unknown'
  dkimStatus: 'pass' | 'fail' | 'unknown'
  dmarcStatus: 'pass' | 'fail' | 'none' | 'unknown'
  warmupStatus: 'not_started' | 'in_progress' | 'paused' | 'completed'
  deliverabilityStatus: 'excellent' | 'good' | 'warning' | 'critical'
  lastChecked: string
}

/**
 * Email Deliverability Metrics
 */
export interface EmailDeliverabilityMetrics {
  domainId: string
  domain: string
  period: string
  sent: number
  delivered: number
  bounced: number
  complained: number
  deliveryRate: number
  bounceRate: number
  complaintRate: number
  openRate: number
  clickRate: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  issues: string[]
  recommendations: string[]
  timestamp: string
}

/**
 * Email Reputation Summary
 */
export interface EmailReputationSummary {
  domain: string
  domainId: string
  overallScore: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical'
  reputation: EmailDomainReputation
  metrics: EmailDeliverabilityMetrics
  criticalIssues: string[]
  warnings: string[]
  recommendations: string[]
  lastUpdated: string
}

/**
 * Reputation Tracking Config
 */
export interface ReputationTrackingConfig {
  domainId: string
  enabled: boolean
  checkInterval: number // minutes (default: 60)
  alertThresholds: {
    bounceRate: number // default: 0.05
    complaintRate: number // default: 0.001
    senderScore: number // default: 70
  }
  autoAlerts: {
    enabled: boolean
    onCritical: boolean
    onWarning: boolean
    channels: ('email' | 'slack' | 'webhook')[]
  }
}

/**
 * Reputation Alert
 */
export interface ReputationAlert {
  domainId: string
  domain: string
  severity: 'critical' | 'warning' | 'info'
  category: 'bounce_rate' | 'complaint_rate' | 'blacklist' | 'dns_auth' | 'sender_score' | 'delivery_rate'
  message: string
  recommendation: string
  timestamp: string
  acknowledged: boolean
}
