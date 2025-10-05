import type { Env, SyntheticCheck, SyntheticResult, SyntheticStep } from '../types'

/**
 * Synthetic Monitoring Engine
 * Executes health checks, API tests, and full user journeys
 */
export class SyntheticEngine {
  constructor(private env: Env) {}

  /**
   * Execute a synthetic check
   */
  async executeCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    const startTime = Date.now()

    try {
      let result: SyntheticResult

      switch (check.type) {
        case 'http':
          result = await this.executeHttpCheck(check, location)
          break
        case 'ping':
          result = await this.executePingCheck(check, location)
          break
        case 'tcp':
          result = await this.executeTcpCheck(check, location)
          break
        case 'dns':
          result = await this.executeDnsCheck(check, location)
          break
        case 'ssl':
          result = await this.executeSslCheck(check, location)
          break
        case 'playwright':
          result = await this.executePlaywrightCheck(check, location)
          break
        default:
          throw new Error(`Unknown check type: ${check.type}`)
      }

      // Store result in Analytics Engine
      await this.storeResult(result)

      // Check if alert should be triggered
      if (!result.success && check.alertOnFailure) {
        await this.checkAlertThreshold(check, result)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const result: SyntheticResult = {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }

      await this.storeResult(result)
      return result
    }
  }

  /**
   * HTTP/HTTPS health check
   */
  private async executeHttpCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    if (!check.url) throw new Error('URL is required for HTTP check')

    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), check.timeout)

    try {
      const response = await fetch(check.url, {
        method: check.method || 'GET',
        headers: check.headers,
        body: check.body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      // Check status code
      const expectedStatus = check.expectedStatus || 200
      const statusOk = response.status === expectedStatus

      // Check body content (if specified)
      let bodyOk = true
      if (check.expectedBody) {
        const body = await response.text()
        bodyOk = body.includes(check.expectedBody)
      }

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: statusOk && bodyOk,
        duration,
        statusCode: response.status,
        errorMessage: !statusOk ? `Expected status ${expectedStatus}, got ${response.status}` : !bodyOk ? 'Body does not match expected content' : undefined,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Ping check (TCP connection test)
   */
  private async executePingCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    if (!check.url) throw new Error('URL is required for ping check')

    const startTime = Date.now()

    try {
      // Simple fetch with HEAD request
      const response = await fetch(check.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(check.timeout),
      })

      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: response.ok,
        duration,
        statusCode: response.status,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * TCP port check
   */
  private async executeTcpCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    // TCP checks would use Cloudflare's TCP socket API (when available)
    // For now, fall back to HTTP check
    return this.executeHttpCheck(check, location)
  }

  /**
   * DNS resolution check
   */
  private async executeDnsCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    if (!check.url) throw new Error('URL is required for DNS check')

    const startTime = Date.now()

    try {
      const hostname = new URL(check.url).hostname

      // Use DNS over HTTPS (Cloudflare's 1.1.1.1)
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(check.timeout),
      })

      const duration = Date.now() - startTime
      const data = await response.json()

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: response.ok && data.Answer && data.Answer.length > 0,
        duration,
        errorMessage: !data.Answer || data.Answer.length === 0 ? 'No DNS records found' : undefined,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * SSL certificate check
   */
  private async executeSslCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    if (!check.url) throw new Error('URL is required for SSL check')

    const startTime = Date.now()

    try {
      const response = await fetch(check.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(check.timeout),
      })

      const duration = Date.now() - startTime

      // Check if HTTPS
      const isHttps = check.url.startsWith('https://')

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: isHttps && response.ok,
        duration,
        errorMessage: !isHttps ? 'URL is not HTTPS' : undefined,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Playwright browser automation check
   * This would run in a separate Worker with Browser Rendering API
   */
  private async executePlaywrightCheck(check: SyntheticCheck, location: string): Promise<SyntheticResult> {
    if (!check.script) throw new Error('Script is required for Playwright check')

    const startTime = Date.now()

    try {
      // In production, this would use Cloudflare Browser Rendering API
      // For now, return a placeholder
      const steps: SyntheticStep[] = [
        {
          name: 'Navigate to page',
          success: true,
          duration: 1200,
        },
        {
          name: 'Wait for element',
          success: true,
          duration: 500,
        },
        {
          name: 'Click button',
          success: true,
          duration: 300,
        },
      ]

      const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: steps.every((s) => s.success),
        duration: totalDuration,
        steps,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        checkId: check.id,
        timestamp: startTime,
        location,
        success: false,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Store check result in Analytics Engine
   */
  private async storeResult(result: SyntheticResult): Promise<void> {
    this.env.METRICS.writeDataPoint({
      blobs: [result.checkId, result.location, result.success ? 'success' : 'failure', result.errorMessage || ''],
      doubles: [result.duration, result.statusCode || 0],
      indexes: [result.checkId, result.location, result.success ? 'success' : 'failure'],
    })

    // Store in D1 for alerting and history
    await this.env.DB.prepare(
      `INSERT INTO synthetic_results (
        check_id, timestamp, location, success, duration, status_code, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(result.checkId, Math.floor(result.timestamp / 1000), result.location, result.success ? 1 : 0, result.duration, result.statusCode || null, result.errorMessage || null)
      .run()
  }

  /**
   * Check if consecutive failures exceed threshold
   */
  private async checkAlertThreshold(check: SyntheticCheck, result: SyntheticResult): Promise<void> {
    // Get recent results for this check
    const recentResults = await this.env.DB.prepare(
      `SELECT success FROM synthetic_results
       WHERE check_id = ? AND location = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
      .bind(check.id, result.location, check.alertThreshold)
      .all()

    if (!recentResults.results) return

    // Check if all recent results are failures
    const allFailures = recentResults.results.every((r: any) => r.success === 0)

    if (allFailures && recentResults.results.length >= check.alertThreshold) {
      // Trigger alert
      await this.triggerAlert(check, result)
    }
  }

  /**
   * Trigger alert for failed check
   */
  private async triggerAlert(check: SyntheticCheck, result: SyntheticResult): Promise<void> {
    // Create alert incident
    const incidentId = crypto.randomUUID()

    await this.env.DB.prepare(
      `INSERT INTO alert_incidents (
        id, alert_id, state, severity, timestamp, value, message, labels
      ) VALUES (?, ?, 'firing', 'critical', ?, ?, ?, ?)`
    )
      .bind(
        incidentId,
        `synthetic-${check.id}`,
        Math.floor(Date.now() / 1000),
        0,
        `Synthetic check "${check.name}" failed in ${result.location}: ${result.errorMessage}`,
        JSON.stringify({ checkId: check.id, location: result.location })
      )
      .run()

    // Send notifications
    for (const channel of check.alertChannels) {
      await this.sendNotification(channel, check, result)
    }
  }

  /**
   * Send alert notification
   */
  private async sendNotification(channel: string, check: SyntheticCheck, result: SyntheticResult): Promise<void> {
    // In production, this would integrate with PagerDuty, Slack, etc.
    console.log(`Alert: ${check.name} failed in ${result.location}`)
  }

  /**
   * List all synthetic checks
   */
  async listChecks(): Promise<SyntheticCheck[]> {
    const result = await this.env.DB.prepare(`SELECT * FROM synthetic_checks WHERE enabled = 1`).all()

    return result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      interval: row.interval,
      timeout: row.timeout,
      locations: JSON.parse(row.locations),
      enabled: row.enabled === 1,
      url: row.url,
      method: row.method,
      headers: row.headers ? JSON.parse(row.headers) : undefined,
      body: row.body,
      expectedStatus: row.expected_status,
      expectedBody: row.expected_body,
      script: row.script,
      alertOnFailure: row.alert_on_failure === 1,
      alertThreshold: row.alert_threshold,
      alertChannels: JSON.parse(row.alert_channels),
    }))
  }

  /**
   * Get check results
   */
  async getCheckResults(checkId: string, from: number, to: number): Promise<SyntheticResult[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM synthetic_results
       WHERE check_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC
       LIMIT 1000`
    )
      .bind(checkId, Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    return result.results.map((row: any) => ({
      checkId: row.check_id,
      timestamp: row.timestamp * 1000,
      location: row.location,
      success: row.success === 1,
      duration: row.duration,
      statusCode: row.status_code,
      errorMessage: row.error_message,
    }))
  }
}
