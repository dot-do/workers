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

  // Queue binding
  MONITORING_QUEUE: Queue
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
