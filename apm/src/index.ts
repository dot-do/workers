import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'

// Import from POC #7 (distributed tracing)
import { Tracer } from '../cloudflare-data-poc-observability/src/tracing'
import { MetricsCollector } from '../cloudflare-data-poc-observability/src/metrics'
import { ServiceMap } from '../cloudflare-data-poc-observability/src/service-map'
import { AlertEngine } from '../cloudflare-data-poc-observability/src/alerts'

// New APM components
import { RUMCollector } from './rum/collector'
import { SyntheticEngine } from './synthetic/engine'
import { LogAggregator, LogAggregatorDO } from './logs/aggregator'
import { AnomalyDetector } from './ai/anomaly-detection'
import { CostAttributionEngine } from './cost/attribution'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'cloudflare-apm-suite',
    version: '1.0.0',
    components: {
      traces: 'ok',
      metrics: 'ok',
      logs: 'ok',
      rum: 'ok',
      synthetic: 'ok',
      ai: 'ok',
    },
  })
})

// ============================================================================
// RUM (Real User Monitoring)
// ============================================================================

/**
 * POST /v1/rum - Ingest RUM events from browser SDK
 */
app.post('/v1/rum', async (c) => {
  try {
    const { applicationId, events } = await c.req.json()
    const rumCollector = new RUMCollector(c.env)

    // Enrich with geographic data from Cloudflare headers
    const enrichedEvents = events.map((event: any) => ({
      ...event,
      country: c.req.header('cf-ipcountry'),
      region: c.req.header('cf-region'),
      city: c.req.header('cf-city'),
    }))

    await rumCollector.ingestEvents(applicationId, enrichedEvents)

    return c.json({ success: true })
  } catch (error) {
    console.error('Error ingesting RUM events:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Invalid RUM data' }, 400)
  }
})

/**
 * GET /api/rum/dashboard/:appId - Get RUM dashboard data
 */
app.get('/api/rum/dashboard/:appId', async (c) => {
  const appId = c.req.param('appId')
  const from = parseInt(c.req.query('from') || String(Date.now() - 24 * 60 * 60 * 1000))
  const to = parseInt(c.req.query('to') || String(Date.now()))

  const rumCollector = new RUMCollector(c.env)
  const data = await rumCollector.getDashboardData(appId, from, to)

  return c.json(data)
})

/**
 * GET /api/rum/session/:sessionId - Get session replay
 */
app.get('/api/rum/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const rumCollector = new RUMCollector(c.env)
  const events = await rumCollector.getSessionReplay(sessionId)

  return c.json({ sessionId, events })
})

// ============================================================================
// Synthetic Monitoring
// ============================================================================

/**
 * GET /api/synthetic/checks - List all synthetic checks
 */
app.get('/api/synthetic/checks', async (c) => {
  const syntheticEngine = new SyntheticEngine(c.env)
  const checks = await syntheticEngine.listChecks()

  return c.json({ checks })
})

/**
 * POST /api/synthetic/checks - Create synthetic check
 */
app.post('/api/synthetic/checks', async (c) => {
  try {
    const check = await c.req.json()

    // Insert into D1
    await c.env.DB.prepare(
      `INSERT INTO synthetic_checks (
        id, name, type, interval, timeout, locations, enabled,
        url, method, headers, body, expected_status, expected_body,
        script, alert_on_failure, alert_threshold, alert_channels
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        check.id || crypto.randomUUID(),
        check.name,
        check.type,
        check.interval,
        check.timeout,
        JSON.stringify(check.locations),
        check.enabled ? 1 : 0,
        check.url || null,
        check.method || null,
        check.headers ? JSON.stringify(check.headers) : null,
        check.body || null,
        check.expectedStatus || null,
        check.expectedBody || null,
        check.script || null,
        check.alertOnFailure ? 1 : 0,
        check.alertThreshold,
        JSON.stringify(check.alertChannels)
      )
      .run()

    return c.json({ success: true, id: check.id })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid check config' }, 400)
  }
})

/**
 * GET /api/synthetic/results/:checkId - Get check results
 */
app.get('/api/synthetic/results/:checkId', async (c) => {
  const checkId = c.req.param('checkId')
  const from = parseInt(c.req.query('from') || String(Date.now() - 24 * 60 * 60 * 1000))
  const to = parseInt(c.req.query('to') || String(Date.now()))

  const syntheticEngine = new SyntheticEngine(c.env)
  const results = await syntheticEngine.getCheckResults(checkId, from, to)

  return c.json({ results })
})

// ============================================================================
// Log Aggregation
// ============================================================================

/**
 * POST /v1/logs - Ingest log entries
 */
app.post('/v1/logs', async (c) => {
  try {
    const logs = await c.req.json()
    const logAggregator = new LogAggregator(c.env)

    await logAggregator.ingest(logs)

    return c.json({ success: true })
  } catch (error) {
    console.error('Error ingesting logs:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Invalid log data' }, 400)
  }
})

/**
 * POST /api/logs/search - Search logs
 */
app.post('/api/logs/search', async (c) => {
  try {
    const query = await c.req.json()
    const logAggregator = new LogAggregator(c.env)

    const results = await logAggregator.search(query)

    return c.json(results)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid query' }, 400)
  }
})

/**
 * GET /api/logs/trace/:traceId - Get logs for trace
 */
app.get('/api/logs/trace/:traceId', async (c) => {
  const traceId = c.req.param('traceId')
  const logAggregator = new LogAggregator(c.env)

  const logs = await logAggregator.getTraceLogs(traceId)

  return c.json({ traceId, logs })
})

/**
 * GET /api/logs/patterns/:service - Get log patterns
 */
app.get('/api/logs/patterns/:service', async (c) => {
  const service = c.req.param('service')
  const from = parseInt(c.req.query('from') || String(Date.now() - 24 * 60 * 60 * 1000))
  const to = parseInt(c.req.query('to') || String(Date.now()))

  const logAggregator = new LogAggregator(c.env)
  const patterns = await logAggregator.getPatterns(service, from, to)

  return c.json(patterns)
})

// ============================================================================
// AI Anomaly Detection
// ============================================================================

/**
 * POST /api/anomalies/detect - Detect anomalies in metric
 */
app.post('/api/anomalies/detect', async (c) => {
  try {
    const { config, data } = await c.req.json()
    const anomalyDetector = new AnomalyDetector(c.env)

    const anomalies = await anomalyDetector.detectAnomalies(config, data)

    return c.json({ anomalies })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Detection failed' }, 400)
  }
})

/**
 * GET /api/anomalies/recent - Get recent anomalies
 */
app.get('/api/anomalies/recent', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24')
  const from = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000)

  const result = await c.env.DB.prepare(
    `SELECT * FROM alert_incidents
     WHERE alert_id LIKE 'anomaly-%' AND state = 'firing'
     AND timestamp >= ?
     ORDER BY timestamp DESC
     LIMIT 100`
  )
    .bind(from)
    .all()

  return c.json({
    anomalies: result.results.map((row: any) => ({
      id: row.id,
      metricName: row.alert_id.replace('anomaly-', ''),
      severity: row.severity,
      timestamp: row.timestamp * 1000,
      value: row.value,
      message: row.message,
    })),
  })
})

// ============================================================================
// Cost Attribution
// ============================================================================

/**
 * POST /api/cost/record - Record cost attribution
 */
app.post('/api/cost/record', async (c) => {
  try {
    const attribution = await c.req.json()
    const costEngine = new CostAttributionEngine(c.env)

    await costEngine.recordCost(attribution)

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid data' }, 400)
  }
})

/**
 * GET /api/cost/report - Generate cost report
 */
app.get('/api/cost/report', async (c) => {
  const from = parseInt(c.req.query('from') || String(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const to = parseInt(c.req.query('to') || String(Date.now()))

  const costEngine = new CostAttributionEngine(c.env)
  const report = await costEngine.generateReport(from, to)

  return c.json(report)
})

/**
 * GET /api/cost/compare - Compare costs to competitors
 */
app.get('/api/cost/compare', async (c) => {
  const events = parseInt(c.req.query('events') || '1000000')
  const costEngine = new CostAttributionEngine(c.env)

  const comparison = costEngine.compareCosts(events)

  return c.json(comparison)
})

// ============================================================================
// Cron Triggers - Synthetic Monitoring
// ============================================================================

async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const syntheticEngine = new SyntheticEngine(env)
  const checks = await syntheticEngine.listChecks()

  // Determine which checks to run based on cron schedule
  const cronMinute = new Date(event.scheduledTime).getMinutes()

  for (const check of checks) {
    if (!check.enabled) continue

    // Check if this check should run at this interval
    const shouldRun = cronMinute % (check.interval / 60) === 0

    if (shouldRun) {
      // Run check in all configured locations
      for (const location of check.locations) {
        try {
          await syntheticEngine.executeCheck(check, location)
        } catch (error) {
          console.error(`Failed to run check ${check.id} in ${location}:`, error)
        }
      }
    }
  }

  // Run anomaly detection
  const anomalyDetector = new AnomalyDetector(env)

  // Get all anomaly detection configs
  const configs = await env.DB.prepare(`SELECT * FROM anomaly_detection_configs WHERE enabled = 1`).all()

  for (const configRow of configs.results as any[]) {
    const config = {
      metricName: configRow.metric_name,
      algorithm: configRow.algorithm,
      sensitivity: configRow.sensitivity,
      seasonality: configRow.seasonality,
      minDataPoints: configRow.min_data_points,
    }

    try {
      await anomalyDetector.monitorMetric(config)
    } catch (error) {
      console.error(`Failed to monitor metric ${config.metricName}:`, error)
    }
  }
}

// Export default worker
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
}

// Export Durable Objects
export { LogAggregatorDO }
