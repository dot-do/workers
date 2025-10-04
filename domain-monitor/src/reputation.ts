/**
 * Domain Reputation Tracking
 * Monitors email deliverability, sender reputation, and DNS authentication
 */

import type {
  Env,
  EmailDomainReputation,
  EmailDeliverabilityMetrics,
  EmailReputationSummary,
  ReputationTrackingConfig,
  ReputationAlert,
} from './types'

/**
 * Get email domain reputation from deliverability service
 */
export async function getEmailReputation(domainId: string, domain: string, refresh: boolean, env: Env): Promise<EmailDomainReputation> {
  if (!env.DELIVERABILITY) {
    throw new Error('Deliverability service not available')
  }

  try {
    // Get reputation from deliverability service
    const reputation = await env.DELIVERABILITY.getReputation({
      domainId,
      refresh,
    })

    // Get warmup status from database
    const warmupRecord = await env.DB.prepare('SELECT status FROM email_warmup WHERE domain_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(domainId)
      .first()

    const warmupStatus = warmupRecord ? (warmupRecord.status as any) : 'not_started'

    // Calculate deliverability status based on sender score and DNS auth
    let deliverabilityStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good'
    if (reputation.senderScore >= 90 && reputation.spfStatus === 'pass' && reputation.dkimStatus === 'pass' && reputation.dmarcStatus === 'pass') {
      deliverabilityStatus = 'excellent'
    } else if (reputation.senderScore < 70 || reputation.blacklistCount > 0 || reputation.spfStatus === 'fail' || reputation.dkimStatus === 'fail') {
      deliverabilityStatus = 'critical'
    } else if (reputation.senderScore < 80 || reputation.dmarcStatus !== 'pass') {
      deliverabilityStatus = 'warning'
    }

    return {
      domainId,
      domain,
      senderScore: reputation.senderScore,
      ipReputation: reputation.ipReputation,
      domainReputation: reputation.domainReputation,
      blacklistCount: reputation.blacklistCount,
      blacklists: reputation.blacklists,
      spfStatus: reputation.spfStatus,
      dkimStatus: reputation.dkimStatus,
      dmarcStatus: reputation.dmarcStatus,
      warmupStatus,
      deliverabilityStatus,
      lastChecked: reputation.lastChecked,
    }
  } catch (error) {
    console.error(`Failed to get reputation for ${domain}:`, error)
    throw error
  }
}

/**
 * Get email deliverability metrics from deliverability service
 */
export async function getEmailMetrics(domainId: string, domain: string, period: string, env: Env): Promise<EmailDeliverabilityMetrics> {
  if (!env.DELIVERABILITY) {
    throw new Error('Deliverability service not available')
  }

  try {
    const metrics = await env.DELIVERABILITY.getMetrics({
      domainId,
      period,
    })

    return {
      domainId,
      domain,
      period: metrics.period,
      sent: metrics.sent,
      delivered: metrics.delivered,
      bounced: metrics.bounced,
      complained: metrics.complained,
      deliveryRate: metrics.deliveryRate,
      bounceRate: metrics.bounceRate,
      complaintRate: metrics.complaintRate,
      openRate: metrics.openRate,
      clickRate: metrics.clickRate,
      status: metrics.status,
      issues: metrics.issues,
      recommendations: metrics.recommendations,
      timestamp: metrics.timestamp,
    }
  } catch (error) {
    console.error(`Failed to get metrics for ${domain}:`, error)
    throw error
  }
}

/**
 * Get comprehensive reputation summary
 */
export async function getReputationSummary(domainId: string, domain: string, refresh: boolean, env: Env): Promise<EmailReputationSummary> {
  // Get reputation and metrics in parallel
  const [reputation, metrics] = await Promise.all([
    getEmailReputation(domainId, domain, refresh, env),
    getEmailMetrics(domainId, domain, 'week', env),
  ])

  // Calculate overall score (weighted average)
  // 40% sender score, 30% deliverability, 20% engagement, 10% DNS auth
  const senderWeight = reputation.senderScore * 0.4
  const deliverabilityWeight = (metrics.deliveryRate * 100) * 0.3
  const engagementWeight = ((metrics.openRate + metrics.clickRate) * 50) * 0.2
  const dnsWeight =
    (reputation.spfStatus === 'pass' ? 33.33 : 0) + (reputation.dkimStatus === 'pass' ? 33.33 : 0) + (reputation.dmarcStatus === 'pass' ? 33.33 : 0)
  const dnsAuthWeight = dnsWeight * 0.1

  const overallScore = Math.round(senderWeight + deliverabilityWeight + engagementWeight + dnsAuthWeight)

  // Determine overall status (most severe status wins)
  let status: 'excellent' | 'good' | 'warning' | 'critical' = 'good'
  if (reputation.deliverabilityStatus === 'critical' || metrics.status === 'critical') {
    status = 'critical'
  } else if (reputation.deliverabilityStatus === 'warning' || metrics.status === 'warning') {
    status = 'warning'
  } else if (reputation.deliverabilityStatus === 'excellent' && metrics.status === 'excellent') {
    status = 'excellent'
  }

  // Collect critical issues and warnings
  const criticalIssues: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check reputation issues
  if (reputation.blacklistCount > 0) {
    criticalIssues.push(`Domain found on ${reputation.blacklistCount} blacklist(s): ${reputation.blacklists.join(', ')}`)
    recommendations.push('Request delisting immediately and review sending practices')
  }

  if (reputation.spfStatus === 'fail') {
    warnings.push('SPF record not passing')
    recommendations.push('Verify SPF record is correctly configured in DNS')
  }

  if (reputation.dkimStatus === 'fail') {
    warnings.push('DKIM not passing')
    recommendations.push('Verify DKIM keys are correctly configured in DNS')
  }

  if (reputation.dmarcStatus !== 'pass') {
    warnings.push('DMARC not configured or not passing')
    recommendations.push('Add DMARC record with policy=quarantine or policy=reject')
  }

  if (reputation.senderScore < 70) {
    criticalIssues.push(`Sender score critically low: ${reputation.senderScore}/100`)
    recommendations.push('Review DNS authentication, warmup status, and sending practices')
  }

  // Add metrics issues
  if (metrics.bounceRate > 0.1) {
    criticalIssues.push(`Bounce rate critically high at ${(metrics.bounceRate * 100).toFixed(2)}%`)
    recommendations.push('Immediately pause sending and clean your list')
  } else if (metrics.bounceRate > 0.05) {
    warnings.push(`Bounce rate high at ${(metrics.bounceRate * 100).toFixed(2)}%`)
    recommendations.push('Clean your email list and validate addresses')
  }

  if (metrics.complaintRate > 0.005) {
    criticalIssues.push(`Spam complaint rate critically high at ${(metrics.complaintRate * 100).toFixed(3)}%`)
    recommendations.push('Review email content and targeting')
  } else if (metrics.complaintRate > 0.001) {
    warnings.push(`Complaint rate high at ${(metrics.complaintRate * 100).toFixed(4)}%`)
    recommendations.push('Review email content and frequency')
  }

  // Add existing recommendations from metrics
  recommendations.push(...metrics.recommendations)

  return {
    domain,
    domainId,
    overallScore,
    status,
    reputation,
    metrics,
    criticalIssues,
    warnings,
    recommendations: [...new Set(recommendations)], // deduplicate
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Check reputation against thresholds and generate alerts
 */
export async function checkReputationThresholds(
  domainId: string,
  domain: string,
  config: ReputationTrackingConfig,
  env: Env
): Promise<ReputationAlert[]> {
  const alerts: ReputationAlert[] = []

  try {
    // Get current reputation and metrics
    const [reputation, metrics] = await Promise.all([
      getEmailReputation(domainId, domain, false, env),
      getEmailMetrics(domainId, domain, 'day', env),
    ])

    const now = new Date().toISOString()

    // Check bounce rate threshold
    if (metrics.bounceRate > config.alertThresholds.bounceRate) {
      alerts.push({
        domainId,
        domain,
        severity: metrics.bounceRate > 0.1 ? 'critical' : 'warning',
        category: 'bounce_rate',
        message: `Bounce rate of ${(metrics.bounceRate * 100).toFixed(2)}% exceeds threshold of ${(config.alertThresholds.bounceRate * 100).toFixed(2)}%`,
        recommendation: metrics.bounceRate > 0.1 ? 'Immediately pause sending and clean your list' : 'Clean your email list and validate addresses',
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check complaint rate threshold
    if (metrics.complaintRate > config.alertThresholds.complaintRate) {
      alerts.push({
        domainId,
        domain,
        severity: metrics.complaintRate > 0.005 ? 'critical' : 'warning',
        category: 'complaint_rate',
        message: `Complaint rate of ${(metrics.complaintRate * 100).toFixed(4)}% exceeds threshold of ${(config.alertThresholds.complaintRate * 100).toFixed(4)}%`,
        recommendation: 'Review email content, targeting, and frequency',
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check sender score threshold
    if (reputation.senderScore < config.alertThresholds.senderScore) {
      alerts.push({
        domainId,
        domain,
        severity: reputation.senderScore < 60 ? 'critical' : 'warning',
        category: 'sender_score',
        message: `Sender score of ${reputation.senderScore}/100 is below threshold of ${config.alertThresholds.senderScore}/100`,
        recommendation: 'Review DNS authentication (SPF/DKIM/DMARC), warmup status, and sending practices',
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check blacklist status
    if (reputation.blacklistCount > 0) {
      alerts.push({
        domainId,
        domain,
        severity: 'critical',
        category: 'blacklist',
        message: `Domain found on ${reputation.blacklistCount} blacklist(s): ${reputation.blacklists.join(', ')}`,
        recommendation: 'Request delisting immediately and review sending practices to prevent re-listing',
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check DNS authentication
    if (reputation.spfStatus !== 'pass') {
      alerts.push({
        domainId,
        domain,
        severity: 'warning',
        category: 'dns_auth',
        message: `SPF status is ${reputation.spfStatus} (expected: pass)`,
        recommendation: 'Verify SPF record is correctly configured in DNS',
        timestamp: now,
        acknowledged: false,
      })
    }

    if (reputation.dkimStatus !== 'pass') {
      alerts.push({
        domainId,
        domain,
        severity: 'warning',
        category: 'dns_auth',
        message: `DKIM status is ${reputation.dkimStatus} (expected: pass)`,
        recommendation: 'Verify DKIM keys are correctly configured in DNS',
        timestamp: now,
        acknowledged: false,
      })
    }

    if (reputation.dmarcStatus === 'none' || reputation.dmarcStatus === 'fail') {
      alerts.push({
        domainId,
        domain,
        severity: 'warning',
        category: 'dns_auth',
        message: `DMARC status is ${reputation.dmarcStatus} (expected: pass)`,
        recommendation: 'Add DMARC record with policy=quarantine or policy=reject',
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check delivery rate
    if (metrics.deliveryRate < 0.95) {
      alerts.push({
        domainId,
        domain,
        severity: metrics.deliveryRate < 0.85 ? 'critical' : 'warning',
        category: 'delivery_rate',
        message: `Delivery rate of ${(metrics.deliveryRate * 100).toFixed(2)}% is below 95%`,
        recommendation: 'Check DNS records, sender reputation, and email content',
        timestamp: now,
        acknowledged: false,
      })
    }
  } catch (error) {
    console.error(`Error checking reputation thresholds for ${domain}:`, error)
  }

  return alerts
}

/**
 * Store reputation check result in database
 */
export async function storeReputationCheck(domainId: string, summary: EmailReputationSummary, env: Env): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO reputation_checks (domain_id, timestamp, overall_score, status, sender_score, bounce_rate, complaint_rate, delivery_rate, critical_issues, warnings, recommendations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        domainId,
        summary.lastUpdated,
        summary.overallScore,
        summary.status,
        summary.reputation.senderScore,
        summary.metrics.bounceRate,
        summary.metrics.complaintRate,
        summary.metrics.deliveryRate,
        JSON.stringify(summary.criticalIssues),
        JSON.stringify(summary.warnings),
        JSON.stringify(summary.recommendations)
      )
      .run()
  } catch (error) {
    console.error(`Error storing reputation check for ${domainId}:`, error)
  }
}

/**
 * Store reputation alert in database
 */
export async function storeReputationAlert(alert: ReputationAlert, env: Env): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO reputation_alerts (domain_id, domain, timestamp, severity, category, message, recommendation, acknowledged)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(alert.domainId, alert.domain, alert.timestamp, alert.severity, alert.category, alert.message, alert.recommendation, alert.acknowledged ? 1 : 0)
      .run()
  } catch (error) {
    console.error(`Error storing reputation alert:`, error)
  }
}

/**
 * Send reputation alert notifications
 */
export async function sendReputationAlert(alert: ReputationAlert, config: ReputationTrackingConfig, env: Env): Promise<boolean> {
  if (!config.autoAlerts.enabled) {
    return false
  }

  // Check if should send based on severity
  if (alert.severity === 'critical' && !config.autoAlerts.onCritical) {
    return false
  }

  if (alert.severity === 'warning' && !config.autoAlerts.onWarning) {
    return false
  }

  try {
    // Send to configured channels
    for (const channel of config.autoAlerts.channels) {
      switch (channel) {
        case 'slack':
          if (env.SLACK_WEBHOOK_URL) {
            await sendSlackAlert(alert, env.SLACK_WEBHOOK_URL)
          }
          break
        case 'email':
          // Would integrate with email service
          break
        case 'webhook':
          // Would call configured webhook
          break
      }
    }

    return true
  } catch (error) {
    console.error(`Error sending reputation alert:`, error)
    return false
  }
}

/**
 * Send Slack notification for reputation alert
 */
async function sendSlackAlert(alert: ReputationAlert, webhookUrl: string): Promise<void> {
  const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good'

  const payload = {
    attachments: [
      {
        color,
        title: `🚨 ${alert.severity.toUpperCase()} - Email Reputation Alert`,
        fields: [
          { title: 'Domain', value: alert.domain, short: true },
          { title: 'Category', value: alert.category, short: true },
          { title: 'Issue', value: alert.message, short: false },
          { title: 'Recommendation', value: alert.recommendation, short: false },
        ],
        footer: 'Domain Monitor',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
      },
    ],
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Get default reputation tracking config
 */
export function getDefaultReputationConfig(domainId: string): ReputationTrackingConfig {
  return {
    domainId,
    enabled: true,
    checkInterval: 60, // 1 hour
    alertThresholds: {
      bounceRate: 0.05, // 5%
      complaintRate: 0.001, // 0.1%
      senderScore: 70,
    },
    autoAlerts: {
      enabled: true,
      onCritical: true,
      onWarning: false,
      channels: ['slack'],
    },
  }
}
