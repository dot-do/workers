/**
 * Monitoring Tasks
 */

/**
 * Health check all services (runs every 5 minutes)
 * Pings all critical services and alerts if any are down
 */
export async function healthCheckServices(env: Env) {
  const startTime = Date.now()
  const services = [
    { name: 'db', binding: env.DB as any },
    { name: 'ai', binding: env.AI as any },
    { name: 'queue', binding: env.QUEUE as any },
  ]

  const results: any[] = []
  let allHealthy = true

  for (const service of services) {
    try {
      // Try to call a basic method on each service
      const healthCheck = await fetch(`https://${service.name}.do/health`)
      const isHealthy = healthCheck.ok

      results.push({
        service: service.name,
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
      })

      if (!isHealthy) {
        allHealthy = false
      }
    } catch (error: any) {
      results.push({
        service: service.name,
        status: 'down',
        error: error.message,
      })
      allHealthy = false
    }
  }

  // Alert if any service is down
  if (!allHealthy) {
    console.error('Service health check failed:', results)
    // In production, send alert to monitoring system
  }

  return {
    success: allHealthy,
    results,
    duration: Date.now() - startTime,
    message: allHealthy ? 'All services healthy' : 'Some services are down',
  }
}

/**
 * Check rate limit usage (runs hourly)
 * Monitors API rate limits and alerts if nearing thresholds
 */
export async function checkRateLimits(env: Env) {
  const startTime = Date.now()

  try {
    // Query rate limit usage from database via RPC
    const db = env.DB as any // Service binding (RPC)
    const result = await db.query(
      `SELECT api_key, COUNT(*) as requests
       FROM api_requests
       WHERE created_at > datetime('now', '-1 hour')
       GROUP BY api_key
       HAVING requests > 900`, // Alert if >90% of 1000/hour limit
      {}
    )

    const warnings = result?.results || []

    if (warnings.length > 0) {
      console.warn('Rate limit warnings:', warnings)
      // In production, send alerts
    }

    return {
      success: true,
      warnings,
      duration: Date.now() - startTime,
      message: warnings.length > 0 ? `${warnings.length} API keys nearing rate limit` : 'All rate limits healthy',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}
