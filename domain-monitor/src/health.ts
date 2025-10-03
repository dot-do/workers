/**
 * Domain Health Check Functions
 * Performs comprehensive health checks on domains
 */

import type { Env, DomainHealthCheck, HealthCheckStatus, HealthCheckIssue, MonitoringConfig } from './types'

/**
 * Perform comprehensive health check on a domain
 */
export async function checkDomainHealth(domain: string, config: MonitoringConfig, env: Env): Promise<DomainHealthCheck> {
  const timestamp = new Date().toISOString()
  const issues: HealthCheckIssue[] = []

  // Initialize results
  const checks: {
    dns: HealthCheckStatus
    http: HealthCheckStatus
    https: HealthCheckStatus
    ssl: HealthCheckStatus
  } = {
    dns: { status: 'pass' },
    http: { status: 'pass' },
    https: { status: 'pass' },
    ssl: { status: 'pass' },
  }

  // DNS Check
  if (config.healthCheck.checkDNS) {
    checks.dns = await checkDNS(domain, env)
    if (checks.dns.status === 'fail') {
      issues.push({
        type: 'dns',
        severity: 'critical',
        message: checks.dns.message || 'DNS resolution failed',
        timestamp,
      })
    }
  }

  // HTTP Check
  if (config.healthCheck.checkHTTP) {
    checks.http = await checkHTTP(domain)
    if (checks.http.status === 'fail') {
      issues.push({
        type: 'http',
        severity: 'warning',
        message: checks.http.message || 'HTTP check failed',
        timestamp,
      })
    }
  }

  // HTTPS Check
  if (config.healthCheck.checkHTTPS) {
    checks.https = await checkHTTPS(domain)
    if (checks.https.status === 'fail') {
      issues.push({
        type: 'https',
        severity: 'critical',
        message: checks.https.message || 'HTTPS check failed',
        timestamp,
      })
    }
  }

  // SSL Certificate Check
  if (config.healthCheck.checkSSL) {
    checks.ssl = await checkSSL(domain)
    if (checks.ssl.status === 'fail') {
      issues.push({
        type: 'ssl',
        severity: 'critical',
        message: checks.ssl.message || 'SSL certificate invalid or expired',
        timestamp,
      })
    }
  }

  // Screenshot Check (optional)
  let screenshotCheck: HealthCheckStatus | undefined
  if (config.screenshot.enabled) {
    screenshotCheck = await checkScreenshot(domain, env)
    if (screenshotCheck.status === 'fail') {
      issues.push({
        type: 'screenshot',
        severity: 'warning',
        message: screenshotCheck.message || 'Screenshot capture failed',
        timestamp,
      })
    }
  }

  // Determine overall health
  const criticalIssues = issues.filter((i) => i.severity === 'critical')
  const warningIssues = issues.filter((i) => i.severity === 'warning')

  let overall: 'healthy' | 'degraded' | 'unhealthy'
  if (criticalIssues.length > 0) {
    overall = 'unhealthy'
  } else if (warningIssues.length > 0) {
    overall = 'degraded'
  } else {
    overall = 'healthy'
  }

  return {
    domain,
    timestamp,
    checks: {
      ...checks,
      screenshot: screenshotCheck,
    },
    overall,
    issues,
  }
}

/**
 * Check DNS resolution
 */
async function checkDNS(domain: string, env: Env): Promise<HealthCheckStatus> {
  const start = Date.now()

  try {
    // Use DNS_TOOLS service if available
    if (env.DNS_TOOLS) {
      const result = await env.DNS_TOOLS.dns(domain, 'A')
      const responseTime = Date.now() - start

      if (result.error || result.records.length === 0) {
        return {
          status: 'fail',
          message: result.error || 'No DNS records found',
          responseTime,
        }
      }

      return {
        status: 'pass',
        message: `${result.records.length} A records found`,
        responseTime,
        details: {
          records: result.records.map((r: any) => r.value),
        },
      }
    }

    // Fallback: Try to resolve via HTTP request
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })

    return {
      status: 'pass',
      message: 'DNS resolved via HTTP',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'DNS check failed',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check HTTP connectivity
 */
async function checkHTTP(domain: string): Promise<HealthCheckStatus> {
  const start = Date.now()

  try {
    const response = await fetch(`http://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      redirect: 'manual', // Don't follow redirects
    })

    const responseTime = Date.now() - start

    // HTTP 2xx or 3xx (redirect) is acceptable
    if (response.status >= 200 && response.status < 400) {
      return {
        status: 'pass',
        message: `HTTP ${response.status}`,
        responseTime,
        details: {
          statusCode: response.status,
          redirectLocation: response.headers.get('location'),
        },
      }
    }

    return {
      status: 'warn',
      message: `HTTP ${response.status}`,
      responseTime,
      details: {
        statusCode: response.status,
      },
    }
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'HTTP check failed',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check HTTPS connectivity
 */
async function checkHTTPS(domain: string): Promise<HealthCheckStatus> {
  const start = Date.now()

  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - start

    if (response.ok) {
      return {
        status: 'pass',
        message: `HTTPS ${response.status}`,
        responseTime,
        details: {
          statusCode: response.status,
        },
      }
    }

    return {
      status: 'warn',
      message: `HTTPS ${response.status}`,
      responseTime,
      details: {
        statusCode: response.status,
      },
    }
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'HTTPS check failed',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check SSL certificate validity
 */
async function checkSSL(domain: string): Promise<HealthCheckStatus> {
  const start = Date.now()

  try {
    // Make HTTPS request to trigger SSL validation
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - start

    // If the request succeeds, SSL is valid
    // (Fetch API will fail on invalid certificates)
    return {
      status: 'pass',
      message: 'SSL certificate valid',
      responseTime,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SSL check failed'

    // Check for specific SSL errors
    if (message.includes('certificate') || message.includes('SSL') || message.includes('TLS')) {
      return {
        status: 'fail',
        message: 'SSL certificate invalid or expired',
        responseTime: Date.now() - start,
        details: {
          error: message,
        },
      }
    }

    // Other errors (might not be SSL-related)
    return {
      status: 'fail',
      message,
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Check screenshot capture
 */
async function checkScreenshot(domain: string, env: Env): Promise<HealthCheckStatus> {
  const start = Date.now()

  try {
    if (!env.BROWSERLESS_API_KEY) {
      return {
        status: 'warn',
        message: 'Browserless API key not configured',
        responseTime: 0,
      }
    }

    // Use Browserless API to capture screenshot
    const response = await fetch('https://chrome.browserless.io/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://${domain}`,
        options: {
          fullPage: false,
          type: 'png',
        },
      }),
      signal: AbortSignal.timeout(30000),
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        status: 'fail',
        message: `Screenshot API failed: ${response.status}`,
        responseTime,
      }
    }

    return {
      status: 'pass',
      message: 'Screenshot captured successfully',
      responseTime,
    }
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Screenshot failed',
      responseTime: Date.now() - start,
    }
  }
}
