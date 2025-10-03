/**
 * Domain Expiration Monitoring
 * Checks domain expiration dates and sends alerts
 */

import type { Env, DomainExpirationAlert, MonitoringConfig } from './types'

/**
 * Check if domain is expiring soon and needs alerts
 */
export async function checkExpiration(domain: string, expirationDate: string, config: MonitoringConfig): Promise<DomainExpirationAlert[]> {
  const alerts: DomainExpirationAlert[] = []

  if (!config.alerts.enabled) {
    return alerts
  }

  const now = new Date()
  const expires = new Date(expirationDate)
  const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Check if already expired
  if (daysUntilExpiry <= 0) {
    alerts.push({
      domain,
      registrar: 'unknown' as any,
      expirationDate,
      daysUntilExpiry,
      severity: 'critical',
      message: `Domain ${domain} has EXPIRED! Immediate action required.`,
      timestamp: now.toISOString(),
      sent: false,
    })
    return alerts
  }

  // Check against configured alert thresholds
  for (const days of config.alerts.expirationDays) {
    if (daysUntilExpiry === days) {
      const severity = days <= 7 ? 'critical' : days <= 30 ? 'warning' : 'info'

      alerts.push({
        domain,
        registrar: 'unknown' as any,
        expirationDate,
        daysUntilExpiry,
        severity,
        message: `Domain ${domain} expires in ${days} days on ${expires.toLocaleDateString()}`,
        timestamp: now.toISOString(),
        sent: false,
      })
    }
  }

  return alerts
}

/**
 * Get all domains expiring within specified days
 */
export async function getExpiringDomains(days: number, env: Env): Promise<any[]> {
  const expiringDomains: any[] = []

  try {
    // Query monitoring records from D1
    const stmt = env.DB.prepare(
      `SELECT * FROM monitoring
       WHERE julianday(expirationDate) - julianday('now') <= ?
       AND julianday(expirationDate) - julianday('now') > 0
       ORDER BY expirationDate ASC`
    )

    const result = await stmt.bind(days).all()

    if (result.results) {
      expiringDomains.push(...result.results)
    }
  } catch (error) {
    console.error('Error querying expiring domains:', error)
  }

  return expiringDomains
}

/**
 * Send expiration alert via configured channels
 */
export async function sendExpirationAlert(alert: DomainExpirationAlert, config: MonitoringConfig, env: Env): Promise<boolean> {
  const results: boolean[] = []

  // Send to each configured channel
  for (const channel of config.alerts.channels) {
    switch (channel) {
      case 'email':
        results.push(await sendEmailAlert(alert, config, env))
        break
      case 'slack':
        results.push(await sendSlackAlert(alert, config, env))
        break
      case 'webhook':
        results.push(await sendWebhookAlert(alert, config, env))
        break
    }
  }

  // Return true if at least one channel succeeded
  return results.some((r) => r === true)
}

/**
 * Send alert via email
 */
async function sendEmailAlert(alert: DomainExpirationAlert, config: MonitoringConfig, env: Env): Promise<boolean> {
  try {
    if (!env.EMAIL_API_KEY) {
      console.warn('Email API key not configured')
      return false
    }

    // Use a service like SendGrid, Mailgun, or Resend
    const subject =
      alert.severity === 'critical'
        ? `🚨 URGENT: ${alert.domain} expires in ${alert.daysUntilExpiry} days`
        : `⚠️ ${alert.domain} expires in ${alert.daysUntilExpiry} days`

    const body = `
Domain Expiration Alert

Domain: ${alert.domain}
Registrar: ${alert.registrar}
Expires: ${new Date(alert.expirationDate).toLocaleDateString()}
Days Until Expiry: ${alert.daysUntilExpiry}
Severity: ${alert.severity.toUpperCase()}

${alert.message}

Please renew this domain before it expires.
    `.trim()

    // Example using a generic email API
    const response = await fetch('https://api.email-provider.com/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: config.alerts.recipients,
        subject,
        text: body,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending email alert:', error)
    return false
  }
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(alert: DomainExpirationAlert, config: MonitoringConfig, env: Env): Promise<boolean> {
  try {
    if (!env.SLACK_WEBHOOK_URL) {
      console.warn('Slack webhook URL not configured')
      return false
    }

    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️'
    const color = alert.severity === 'critical' ? '#ff0000' : alert.severity === 'warning' ? '#ffa500' : '#0000ff'

    const payload = {
      text: `${emoji} Domain Expiration Alert`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Domain',
              value: alert.domain,
              short: true,
            },
            {
              title: 'Days Until Expiry',
              value: alert.daysUntilExpiry.toString(),
              short: true,
            },
            {
              title: 'Expiration Date',
              value: new Date(alert.expirationDate).toLocaleDateString(),
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Message',
              value: alert.message,
              short: false,
            },
          ],
          footer: 'Domain Monitor',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
        },
      ],
    }

    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending Slack alert:', error)
    return false
  }
}

/**
 * Send alert to custom webhook
 */
async function sendWebhookAlert(alert: DomainExpirationAlert, config: MonitoringConfig, env: Env): Promise<boolean> {
  try {
    // Custom webhook implementation
    // This would be configured per-domain or globally
    return false
  } catch (error) {
    console.error('Error sending webhook alert:', error)
    return false
  }
}
