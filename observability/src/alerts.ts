import type { Env, AlertConfig, AlertIncident, AlertCondition, AlertSeverity } from './types'

/**
 * Alert evaluation and notification engine
 */
export class AlertEngine {
  constructor(private env: Env) {}

  /**
   * Get all alert configurations
   */
  async getAlertConfigs(): Promise<AlertConfig[]> {
    const result = await this.env.DB.prepare(
      `SELECT
         id, name, description, service_id as serviceId, metric_name as metricName,
         condition, threshold, window_seconds as windowSeconds, severity,
         enabled, labels
       FROM alert_configs
       WHERE enabled = 1
       ORDER BY severity DESC, name`
    ).all()

    return result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      serviceId: row.serviceId,
      metricName: row.metricName,
      condition: row.condition as AlertCondition,
      threshold: row.threshold,
      windowSeconds: row.windowSeconds,
      severity: row.severity as AlertSeverity,
      enabled: row.enabled === 1,
      labels: row.labels ? JSON.parse(row.labels) : undefined,
    }))
  }

  /**
   * Create alert configuration
   */
  async createAlertConfig(config: Omit<AlertConfig, 'id'>): Promise<string> {
    const id = crypto.randomUUID()

    await this.env.DB.prepare(
      `INSERT INTO alert_configs (id, name, description, service_id, metric_name, condition, threshold, window_seconds, severity, enabled, labels)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        config.name,
        config.description || null,
        config.serviceId || null,
        config.metricName,
        config.condition,
        config.threshold,
        config.windowSeconds,
        config.severity,
        config.enabled ? 1 : 0,
        config.labels ? JSON.stringify(config.labels) : null
      )
      .run()

    return id
  }

  /**
   * Evaluate all alerts against current metrics
   */
  async evaluateAlerts(): Promise<AlertIncident[]> {
    const configs = await this.getAlertConfigs()
    const incidents: AlertIncident[] = []

    for (const config of configs) {
      const incident = await this.evaluateAlert(config)
      if (incident) {
        incidents.push(incident)
      }
    }

    return incidents
  }

  /**
   * Evaluate a single alert configuration
   */
  async evaluateAlert(config: AlertConfig): Promise<AlertIncident | null> {
    // Query Analytics Engine for metric data within window
    // Note: This is a simplified example - actual Analytics Engine queries would use SQL API
    const windowStart = Math.floor(Date.now() / 1000) - config.windowSeconds
    const metricValue = await this.queryMetric(config.metricName, config.serviceId, windowStart)

    if (metricValue === null) return null

    // Check if threshold is breached
    const isBreached = this.checkThreshold(metricValue, config.condition, config.threshold)

    if (!isBreached) {
      // Check if there's an existing firing incident to resolve
      await this.resolveIncident(config.id)
      return null
    }

    // Check if already firing
    const existingIncident = await this.getActiveIncident(config.id)
    if (existingIncident) {
      // Update incident value
      await this.updateIncidentValue(existingIncident.id, metricValue)
      return existingIncident
    }

    // Create new incident
    const incident = await this.createIncident(config, metricValue)
    await this.sendNotification(incident, config)

    return incident
  }

  /**
   * Query metric value from Analytics Engine
   * In production, this would use Analytics Engine SQL API
   */
  private async queryMetric(metricName: string, serviceId: string | undefined, windowStart: number): Promise<number | null> {
    // This is a placeholder - Analytics Engine queries would be done via SQL API
    // For now, we'll use a simple KV lookup for demonstration
    const key = `metric:${metricName}:${serviceId || 'all'}:latest`
    const value = await this.env.ALERT_STATE.get(key)
    return value ? parseFloat(value) : null
  }

  /**
   * Check if value breaches threshold
   */
  private checkThreshold(value: number, condition: AlertCondition, threshold: number): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold
      case 'gte':
        return value >= threshold
      case 'lt':
        return value < threshold
      case 'lte':
        return value <= threshold
      case 'eq':
        return value === threshold
      default:
        return false
    }
  }

  /**
   * Get active incident for alert config
   */
  private async getActiveIncident(alertConfigId: string): Promise<AlertIncident | null> {
    const result = await this.env.DB.prepare(
      `SELECT
         id, alert_config_id as alertConfigId, service_id as serviceId, state, value, threshold,
         message, labels, fired_at as firedAt, resolved_at as resolvedAt,
         acknowledged_at as acknowledgedAt, acknowledged_by as acknowledgedBy
       FROM alert_incidents
       WHERE alert_config_id = ? AND state = 'firing'
       ORDER BY fired_at DESC
       LIMIT 1`
    )
      .bind(alertConfigId)
      .first()

    if (!result) return null

    return {
      id: result.id as string,
      alertConfigId: result.alertConfigId as string,
      serviceId: result.serviceId as string | undefined,
      state: result.state as 'firing' | 'resolved',
      value: result.value as number,
      threshold: result.threshold as number,
      message: result.message as string | undefined,
      labels: result.labels ? JSON.parse(result.labels as string) : undefined,
      firedAt: result.firedAt as number,
      resolvedAt: result.resolvedAt as number | undefined,
      acknowledgedAt: result.acknowledgedAt as number | undefined,
      acknowledgedBy: result.acknowledgedBy as string | undefined,
    }
  }

  /**
   * Create new alert incident
   */
  private async createIncident(config: AlertConfig, value: number): Promise<AlertIncident> {
    const id = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    const message = `Alert ${config.name}: ${config.metricName} is ${value} (threshold: ${config.condition} ${config.threshold})`

    await this.env.DB.prepare(
      `INSERT INTO alert_incidents (id, alert_config_id, service_id, state, value, threshold, message, labels, fired_at)
       VALUES (?, ?, ?, 'firing', ?, ?, ?, ?, ?)`
    )
      .bind(id, config.id, config.serviceId || null, value, config.threshold, message, JSON.stringify(config.labels || {}), now)
      .run()

    return {
      id,
      alertConfigId: config.id,
      serviceId: config.serviceId,
      state: 'firing',
      value,
      threshold: config.threshold,
      message,
      labels: config.labels,
      firedAt: now,
    }
  }

  /**
   * Update incident value
   */
  private async updateIncidentValue(incidentId: string, value: number): Promise<void> {
    await this.env.DB.prepare(`UPDATE alert_incidents SET value = ? WHERE id = ?`).bind(value, incidentId).run()
  }

  /**
   * Resolve incident
   */
  private async resolveIncident(alertConfigId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)

    await this.env.DB.prepare(
      `UPDATE alert_incidents
       SET state = 'resolved', resolved_at = ?
       WHERE alert_config_id = ? AND state = 'firing'`
    )
      .bind(now, alertConfigId)
      .run()
  }

  /**
   * Acknowledge incident
   */
  async acknowledgeIncident(incidentId: string, acknowledgedBy: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)

    await this.env.DB.prepare(
      `UPDATE alert_incidents
       SET acknowledged_at = ?, acknowledged_by = ?
       WHERE id = ?`
    )
      .bind(now, acknowledgedBy, incidentId)
      .run()
  }

  /**
   * Send alert notification
   */
  private async sendNotification(incident: AlertIncident, config: AlertConfig): Promise<void> {
    if (!this.env.ALERT_WEBHOOK_URL) return

    const payload = {
      id: incident.id,
      alert: config.name,
      severity: config.severity,
      message: incident.message,
      value: incident.value,
      threshold: incident.threshold,
      service: incident.serviceId,
      labels: incident.labels,
      firedAt: new Date(incident.firedAt * 1000).toISOString(),
    }

    try {
      await fetch(this.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send alert notification:', error)
    }
  }

  /**
   * Get alert incidents
   */
  async getIncidents(state?: 'firing' | 'resolved', limit: number = 100): Promise<AlertIncident[]> {
    let query = `SELECT
       id, alert_config_id as alertConfigId, service_id as serviceId, state, value, threshold,
       message, labels, fired_at as firedAt, resolved_at as resolvedAt,
       acknowledged_at as acknowledgedAt, acknowledged_by as acknowledgedBy
     FROM alert_incidents`

    const params: any[] = []

    if (state) {
      query += ` WHERE state = ?`
      params.push(state)
    }

    query += ` ORDER BY fired_at DESC LIMIT ?`
    params.push(limit)

    const result = await this.env.DB.prepare(query).bind(...params).all()

    return result.results.map((row: any) => ({
      id: row.id,
      alertConfigId: row.alertConfigId,
      serviceId: row.serviceId,
      state: row.state,
      value: row.value,
      threshold: row.threshold,
      message: row.message,
      labels: row.labels ? JSON.parse(row.labels) : undefined,
      firedAt: row.firedAt,
      resolvedAt: row.resolvedAt,
      acknowledgedAt: row.acknowledgedAt,
      acknowledgedBy: row.acknowledgedBy,
    }))
  }
}
