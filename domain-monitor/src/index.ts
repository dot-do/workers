/**
 * Domain Monitoring Service
 * Scheduled monitoring of domain health, expiration, and screenshots
 * Runs hourly via Cloudflare Cron Triggers
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type {
  Env,
  DomainMonitoringRecord,
  DomainHealthCheck,
  MonitoringConfig,
  MonitoringStats,
  MonitoringTask,
} from './types'
import { checkDomainHealth } from './health'
import { checkExpiration, sendExpirationAlert, getExpiringDomains } from './expiration'
import { performScreenshotCheck } from './screenshot'
import {
  getEmailReputation,
  getEmailMetrics,
  getReputationSummary,
  checkReputationThresholds,
  storeReputationCheck,
  storeReputationAlert,
  sendReputationAlert,
  getDefaultReputationConfig,
} from './reputation'
import type { EmailDomainReputation, EmailDeliverabilityMetrics, EmailReputationSummary, ReputationAlert } from './types'

/**
 * RPC Interface - Service Bindings
 */
export class DomainMonitorService extends WorkerEntrypoint<Env> {
  /**
   * Monitor a single domain
   */
  async monitorDomain(domain: string): Promise<DomainHealthCheck> {
    const config = await this.getMonitoringConfig(domain)
    return await checkDomainHealth(domain, config, this.env)
  }

  /**
   * Get monitoring statistics
   */
  async getStats(): Promise<MonitoringStats> {
    const stmt = this.env.DB.prepare(`
      SELECT
        COUNT(*) as totalDomains,
        SUM(CASE WHEN monitoringEnabled = 1 THEN 1 ELSE 0 END) as monitoredDomains,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as healthyDomains
      FROM monitoring
    `)

    const result = await stmt.first()

    const expiring30 = await getExpiringDomains(30, this.env)
    const expiring7 = await getExpiringDomains(7, this.env)

    return {
      totalDomains: (result?.totalDomains as number) || 0,
      monitoredDomains: (result?.monitoredDomains as number) || 0,
      healthyDomains: (result?.healthyDomains as number) || 0,
      unhealthyDomains: 0,
      expiringWithin30Days: expiring30.length,
      expiringWithin7Days: expiring7.length,
      lastCheckTime: new Date().toISOString(),
      checksToday: 0,
      alertsSentToday: 0,
    }
  }

  /**
   * Get email reputation for a domain
   */
  async getEmailReputation(domainId: string, domain: string, refresh = false): Promise<EmailDomainReputation> {
    return await getEmailReputation(domainId, domain, refresh, this.env)
  }

  /**
   * Get email deliverability metrics for a domain
   */
  async getEmailMetrics(domainId: string, domain: string, period = 'week'): Promise<EmailDeliverabilityMetrics> {
    return await getEmailMetrics(domainId, domain, period, this.env)
  }

  /**
   * Get comprehensive reputation summary for a domain
   */
  async getReputationSummary(domainId: string, domain: string, refresh = false): Promise<EmailReputationSummary> {
    return await getReputationSummary(domainId, domain, refresh, this.env)
  }

  /**
   * Check reputation thresholds and generate alerts
   */
  async checkReputationAlerts(domainId: string, domain: string): Promise<ReputationAlert[]> {
    const config = getDefaultReputationConfig(domainId)
    return await checkReputationThresholds(domainId, domain, config, this.env)
  }

  /**
   * Get monitoring config for a domain
   */
  private async getMonitoringConfig(domain: string): Promise<MonitoringConfig> {
    // Default configuration
    return {
      domain,
      enabled: true,
      checkInterval: 60, // 1 hour
      alerts: {
        enabled: true,
        expirationDays: [30, 14, 7, 1],
        channels: ['slack'],
        recipients: [],
      },
      healthCheck: {
        enabled: true,
        checkDNS: true,
        checkHTTP: true,
        checkHTTPS: true,
        checkSSL: true,
      },
      screenshot: {
        enabled: false,
        compareEnabled: false,
        interval: 24, // 24 hours
      },
    }
  }
}

/**
 * HTTP Interface - REST API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'domain-monitor',
    version: '1.0.0',
    endpoints: {
      stats: 'GET /stats',
      monitor: 'POST /monitor',
      domains: 'GET /domains',
      expiringDomains: 'GET /domains/expiring?days=30',
      healthCheck: 'POST /health/:domain',
      screenshot: 'POST /screenshot/:domain',
      reputation: 'GET /reputation/:domainId',
      reputationSummary: 'GET /reputation/:domainId/summary',
      metrics: 'GET /reputation/:domainId/metrics',
      alerts: 'GET /reputation/:domainId/alerts',
    },
  })
})

// Get monitoring statistics
app.get('/stats', async (c) => {
  const service = new DomainMonitorService({} as any, c.env)
  const stats = await service.getStats()
  return c.json(stats)
})

// Get all monitored domains
app.get('/domains', async (c) => {
  const stmt = c.env.DB.prepare('SELECT * FROM monitoring WHERE monitoringEnabled = 1 ORDER BY domain ASC')
  const result = await stmt.all()
  return c.json({ domains: result.results || [] })
})

// Get expiring domains
app.get('/domains/expiring', async (c) => {
  const days = parseInt(c.req.query('days') || '30')
  const domains = await getExpiringDomains(days, c.env)
  return c.json({ domains, count: domains.length })
})

// Perform health check on a domain
app.post('/health/:domain', async (c) => {
  const domain = c.req.param('domain')
  const service = new DomainMonitorService({} as any, c.env)
  const result = await service.monitorDomain(domain)
  return c.json(result)
})

// Capture screenshot of a domain
app.post('/screenshot/:domain', async (c) => {
  const domain = c.req.param('domain')
  const result = await performScreenshotCheck(domain, c.env)
  return c.json(result)
})

// Add domain to monitoring
app.post('/monitor', async (c) => {
  const { domain, registrar, expirationDate } = await c.req.json<{
    domain: string
    registrar: string
    expirationDate: string
  }>()

  const stmt = c.env.DB.prepare(
    `INSERT OR REPLACE INTO monitoring (domain, registrar, expirationDate, status, lastChecked, nextCheck, monitoringEnabled, alertsEnabled, screenshotEnabled, healthCheckEnabled)
     VALUES (?, ?, ?, 'active', datetime('now'), datetime('now', '+1 hour'), 1, 1, 0, 1)`
  )

  await stmt.bind(domain, registrar, expirationDate).run()

  return c.json({ success: true, message: `Monitoring enabled for ${domain}` })
})

// Get email reputation for a domain
app.get('/reputation/:domainId', async (c) => {
  const domainId = c.req.param('domainId')
  const refresh = c.req.query('refresh') === 'true'

  // Get domain from database
  const domainRecord = await c.env.DB.prepare('SELECT domain FROM email_domains WHERE id = ?').bind(domainId).first()

  if (!domainRecord) {
    return c.json({ error: 'Domain not found' }, 404)
  }

  const service = new DomainMonitorService({} as any, c.env)
  const reputation = await service.getEmailReputation(domainId, domainRecord.domain as string, refresh)

  return c.json(reputation)
})

// Get comprehensive reputation summary
app.get('/reputation/:domainId/summary', async (c) => {
  const domainId = c.req.param('domainId')
  const refresh = c.req.query('refresh') === 'true'

  // Get domain from database
  const domainRecord = await c.env.DB.prepare('SELECT domain FROM email_domains WHERE id = ?').bind(domainId).first()

  if (!domainRecord) {
    return c.json({ error: 'Domain not found' }, 404)
  }

  const service = new DomainMonitorService({} as any, c.env)
  const summary = await service.getReputationSummary(domainId, domainRecord.domain as string, refresh)

  return c.json(summary)
})

// Get email deliverability metrics
app.get('/reputation/:domainId/metrics', async (c) => {
  const domainId = c.req.param('domainId')
  const period = c.req.query('period') || 'week'

  // Get domain from database
  const domainRecord = await c.env.DB.prepare('SELECT domain FROM email_domains WHERE id = ?').bind(domainId).first()

  if (!domainRecord) {
    return c.json({ error: 'Domain not found' }, 404)
  }

  const service = new DomainMonitorService({} as any, c.env)
  const metrics = await service.getEmailMetrics(domainId, domainRecord.domain as string, period)

  return c.json(metrics)
})

// Check reputation and get alerts
app.get('/reputation/:domainId/alerts', async (c) => {
  const domainId = c.req.param('domainId')

  // Get domain from database
  const domainRecord = await c.env.DB.prepare('SELECT domain FROM email_domains WHERE id = ?').bind(domainId).first()

  if (!domainRecord) {
    return c.json({ error: 'Domain not found' }, 404)
  }

  const service = new DomainMonitorService({} as any, c.env)
  const alerts = await service.checkReputationAlerts(domainId, domainRecord.domain as string)

  return c.json({ alerts, count: alerts.length })
})

/**
 * Scheduled Cron Handler - Runs Every Hour
 */
async function handleScheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('Starting scheduled domain monitoring...')

  try {
    // Get all domains that need checking
    const stmt = env.DB.prepare(`
      SELECT * FROM monitoring
      WHERE monitoringEnabled = 1
      AND datetime(nextCheck) <= datetime('now')
      ORDER BY nextCheck ASC
    `)

    const result = await stmt.all()
    const domains = result.results || []

    console.log(`Found ${domains.length} domains to check`)

    // Queue monitoring tasks for parallel processing
    for (const domain of domains) {
      const task: MonitoringTask = {
        type: 'full_scan',
        domain: domain.domain as string,
        priority: 'normal',
        scheduledAt: new Date().toISOString(),
      }

      await env.MONITORING_QUEUE.send(task)
    }

    console.log(`Queued ${domains.length} monitoring tasks`)
  } catch (error) {
    console.error('Error in scheduled monitoring:', error)
  }
}

/**
 * Queue Consumer - Process Monitoring Tasks
 */
async function handleQueue(batch: MessageBatch, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const task = message.body as MonitoringTask

      console.log(`Processing ${task.type} for ${task.domain}`)

      const config = await getMonitoringConfigFromDB(task.domain, env)

      if (!config.enabled) {
        message.ack()
        continue
      }

      // Perform health check
      if (config.healthCheck.enabled) {
        const healthResult = await checkDomainHealth(task.domain, config, env)
        await storeHealthCheckResult(task.domain, healthResult, env)

        // Log issues
        if (healthResult.overall === 'unhealthy') {
          console.warn(`Domain ${task.domain} is unhealthy:`, healthResult.issues)
        }
      }

      // Check email reputation (for email domains)
      const emailDomain = await getEmailDomainRecord(task.domain, env)
      if (emailDomain) {
        try {
          // Get reputation summary
          const reputationSummary = await getReputationSummary(emailDomain.id, task.domain, false, env)
          await storeReputationCheck(emailDomain.id, reputationSummary, env)

          // Check for alerts
          const reputationConfig = getDefaultReputationConfig(emailDomain.id)
          const alerts = await checkReputationThresholds(emailDomain.id, task.domain, reputationConfig, env)

          // Process and store alerts
          for (const alert of alerts) {
            await storeReputationAlert(alert, env)

            // Send alert notification if configured
            const sent = await sendReputationAlert(alert, reputationConfig, env)
            if (sent) {
              console.log(`Sent reputation alert for ${task.domain}: ${alert.message}`)
            }
          }

          // Log critical issues
          if (reputationSummary.status === 'critical') {
            console.warn(`Domain ${task.domain} has critical reputation issues:`, reputationSummary.criticalIssues)
          }
        } catch (error) {
          console.error(`Error checking reputation for ${task.domain}:`, error)
        }
      }

      // Check expiration
      if (config.alerts.enabled) {
        const domainRecord = await getDomainRecord(task.domain, env)
        if (domainRecord?.expirationDate) {
          const alerts = await checkExpiration(task.domain, domainRecord.expirationDate, config)

          for (const alert of alerts) {
            const sent = await sendExpirationAlert(alert, config, env)
            if (sent) {
              await recordAlert(task.domain, alert, env)
            }
          }
        }
      }

      // Capture screenshot (if enabled and scheduled)
      if (config.screenshot.enabled && shouldTakeScreenshot(task.domain, config, env)) {
        await performScreenshotCheck(task.domain, env)
      }

      // Update next check time
      await updateNextCheckTime(task.domain, config.checkInterval, env)

      message.ack()
    } catch (error) {
      console.error(`Error processing message:`, error)
      message.retry()
    }
  }
}

/**
 * Helper Functions
 */
async function getMonitoringConfigFromDB(domain: string, env: Env): Promise<MonitoringConfig> {
  // For now, return default config
  // In production, this would fetch from database
  return {
    domain,
    enabled: true,
    checkInterval: 60,
    alerts: {
      enabled: true,
      expirationDays: [30, 14, 7, 1],
      channels: ['slack'],
      recipients: [],
    },
    healthCheck: {
      enabled: true,
      checkDNS: true,
      checkHTTP: true,
      checkHTTPS: true,
      checkSSL: true,
    },
    screenshot: {
      enabled: false,
      compareEnabled: false,
      interval: 24,
    },
  }
}

async function getDomainRecord(domain: string, env: Env): Promise<any> {
  const stmt = env.DB.prepare('SELECT * FROM monitoring WHERE domain = ?')
  return await stmt.bind(domain).first()
}

async function getEmailDomainRecord(domain: string, env: Env): Promise<any> {
  const stmt = env.DB.prepare('SELECT * FROM email_domains WHERE domain = ?')
  return await stmt.bind(domain).first()
}

async function storeHealthCheckResult(domain: string, result: DomainHealthCheck, env: Env): Promise<void> {
  const stmt = env.DB.prepare(
    `INSERT INTO health_checks (domain, timestamp, overall, checks, issues)
     VALUES (?, ?, ?, ?, ?)`
  )

  await stmt.bind(domain, result.timestamp, result.overall, JSON.stringify(result.checks), JSON.stringify(result.issues)).run()
}

async function recordAlert(domain: string, alert: any, env: Env): Promise<void> {
  const stmt = env.DB.prepare(
    `INSERT INTO alerts (domain, timestamp, severity, message, sent)
     VALUES (?, ?, ?, ?, 1)`
  )

  await stmt.bind(domain, alert.timestamp, alert.severity, alert.message).run()
}

function shouldTakeScreenshot(domain: string, config: MonitoringConfig, env: Env): boolean {
  // Simple check - in production, would check last screenshot time from DB
  return config.screenshot.enabled
}

async function updateNextCheckTime(domain: string, intervalMinutes: number, env: Env): Promise<void> {
  const stmt = env.DB.prepare(
    `UPDATE monitoring
     SET lastChecked = datetime('now'),
         nextCheck = datetime('now', '+${intervalMinutes} minutes')
     WHERE domain = ?`
  )

  await stmt.bind(domain).run()
}

/**
 * Main Export - Handles HTTP, Scheduled, and Queue events
 */
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
  queue: handleQueue,
} satisfies ExportedHandler<Env>
