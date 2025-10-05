import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import type { Env, TraceData, MetricBatch } from './types'
import { TraceDataSchema, MetricBatchSchema } from './types'
import { Tracer } from './tracing'
import { MetricsCollector } from './metrics'
import { ServiceMap } from './service-map'
import { AlertEngine } from './alerts'
import { observabilityMiddleware } from './middleware'

const app = new Hono<{ Bindings: Env }>()

// CORS for Grafana
app.use('*', cors())

// Note: We do NOT apply observability middleware to the observability service itself
// to avoid circular dependencies and recursion

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'observability-collector' })
})

// ============================================================================
// OTLP-compatible endpoints
// ============================================================================

/**
 * POST /v1/traces - OpenTelemetry trace ingestion
 */
app.post('/v1/traces', async (c) => {
  try {
    const body = await c.req.json()
    const traceData = TraceDataSchema.parse(body)

    const tracer = new Tracer(c.env, traceData.resource)
    await tracer.writeTrace(traceData)

    return c.json({ success: true })
  } catch (error) {
    console.error('Error ingesting traces:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Invalid trace data' }, 400)
  }
})

/**
 * POST /v1/metrics - Metrics ingestion
 */
app.post('/v1/metrics', async (c) => {
  try {
    const body = await c.req.json()
    const metricBatch = MetricBatchSchema.parse(body)

    const collector = new MetricsCollector(c.env, metricBatch.resource)

    for (const metric of metricBatch.metrics) {
      switch (metric.type) {
        case 'counter':
          collector.counter(metric.name, metric.value, metric.labels)
          break
        case 'gauge':
          collector.gauge(metric.name, metric.value, metric.labels)
          break
        case 'histogram':
          collector.histogram(metric.name, metric.value, metric.labels)
          break
      }
    }

    await collector.flush()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error ingesting metrics:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Invalid metric data' }, 400)
  }
})

// ============================================================================
// Service Map API
// ============================================================================

/**
 * GET /api/services - List all services
 */
app.get('/api/services', async (c) => {
  const serviceMap = new ServiceMap(c.env)
  const services = await serviceMap.getServices()
  return c.json({ services })
})

/**
 * GET /api/services/:id - Get service details
 */
app.get('/api/services/:id', async (c) => {
  const serviceId = c.req.param('id')
  const serviceMap = new ServiceMap(c.env)

  const [service, dependencies] = await Promise.all([serviceMap.getService(serviceId), serviceMap.getServiceDependencies(serviceId)])

  if (!service) {
    return c.json({ error: 'Service not found' }, 404)
  }

  return c.json({ service, dependencies })
})

/**
 * GET /api/service-map - Get service dependency graph
 */
app.get('/api/service-map', async (c) => {
  const serviceMap = new ServiceMap(c.env)
  const graph = await serviceMap.getCytoscapeGraph()
  return c.json(graph)
})

/**
 * GET /api/service-map/cycles - Detect circular dependencies
 */
app.get('/api/service-map/cycles', async (c) => {
  const serviceMap = new ServiceMap(c.env)
  const cycles = await serviceMap.detectCircularDependencies()
  return c.json({ cycles, count: cycles.length })
})

// ============================================================================
// Traces Query API (for Grafana)
// ============================================================================

/**
 * GET /api/traces - Search traces
 */
app.get('/api/traces', async (c) => {
  const serviceName = c.req.query('service')
  const operation = c.req.query('operation')
  const status = c.req.query('status')
  const minDuration = c.req.query('minDuration')
  const limit = parseInt(c.req.query('limit') || '100', 10)

  let query = `SELECT * FROM trace_metadata WHERE 1=1`
  const params: any[] = []

  if (serviceName) {
    query += ` AND service_name = ?`
    params.push(serviceName)
  }

  if (operation) {
    query += ` AND operation_name LIKE ?`
    params.push(`%${operation}%`)
  }

  if (status) {
    query += ` AND status = ?`
    params.push(status)
  }

  if (minDuration) {
    query += ` AND duration_ms >= ?`
    params.push(parseFloat(minDuration))
  }

  query += ` ORDER BY timestamp DESC LIMIT ?`
  params.push(limit)

  const result = await c.env.DB.prepare(query).bind(...params).all()

  return c.json({
    traces: result.results.map((row: any) => ({
      traceId: row.trace_id,
      serviceName: row.service_name,
      operationName: row.operation_name,
      durationMs: row.duration_ms,
      status: row.status,
      errorMessage: row.error_message,
      spanCount: row.span_count,
      timestamp: row.timestamp,
      labels: row.labels ? JSON.parse(row.labels) : {},
    })),
  })
})

/**
 * GET /api/traces/:traceId - Get trace details
 * Note: This would query Analytics Engine for full span data
 */
app.get('/api/traces/:traceId', async (c) => {
  const traceId = c.req.param('traceId')

  // Get trace metadata
  const metadata = await c.env.DB.prepare(`SELECT * FROM trace_metadata WHERE trace_id = ?`).bind(traceId).first()

  if (!metadata) {
    return c.json({ error: 'Trace not found' }, 404)
  }

  // In production, this would query Analytics Engine for full span data
  // For now, return metadata only
  return c.json({
    traceId: metadata.trace_id,
    serviceName: metadata.service_name,
    operationName: metadata.operation_name,
    durationMs: metadata.duration_ms,
    status: metadata.status,
    errorMessage: metadata.error_message,
    spanCount: metadata.span_count,
    timestamp: metadata.timestamp,
    labels: metadata.labels ? JSON.parse(metadata.labels as string) : {},
  })
})

// ============================================================================
// Alerts API
// ============================================================================

/**
 * GET /api/alerts/configs - List alert configurations
 */
app.get('/api/alerts/configs', async (c) => {
  const alertEngine = new AlertEngine(c.env)
  const configs = await alertEngine.getAlertConfigs()
  return c.json({ configs })
})

/**
 * POST /api/alerts/configs - Create alert configuration
 */
app.post('/api/alerts/configs', async (c) => {
  try {
    const body = await c.req.json()
    const alertEngine = new AlertEngine(c.env)
    const id = await alertEngine.createAlertConfig(body)
    return c.json({ id })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid alert config' }, 400)
  }
})

/**
 * GET /api/alerts/incidents - List alert incidents
 */
app.get('/api/alerts/incidents', async (c) => {
  const state = c.req.query('state') as 'firing' | 'resolved' | undefined
  const alertEngine = new AlertEngine(c.env)
  const incidents = await alertEngine.getIncidents(state)
  return c.json({ incidents })
})

/**
 * POST /api/alerts/incidents/:id/acknowledge - Acknowledge incident
 */
app.post('/api/alerts/incidents/:id/acknowledge', async (c) => {
  const incidentId = c.req.param('id')
  const { acknowledgedBy } = await c.req.json()

  const alertEngine = new AlertEngine(c.env)
  await alertEngine.acknowledgeIncident(incidentId, acknowledgedBy)

  return c.json({ success: true })
})

/**
 * POST /api/alerts/evaluate - Manually trigger alert evaluation
 */
app.post('/api/alerts/evaluate', async (c) => {
  const alertEngine = new AlertEngine(c.env)
  const incidents = await alertEngine.evaluateAlerts()
  return c.json({ incidents, count: incidents.length })
})

// ============================================================================
// Analytics Engine SQL Proxy (for Grafana)
// ============================================================================

/**
 * POST /api/query - Execute SQL query on Analytics Engine
 * This endpoint would be used by Grafana's ClickHouse datasource
 */
app.post('/api/query', async (c) => {
  try {
    const { query } = await c.req.json()

    // In production, this would execute the query against Analytics Engine
    // For now, return a placeholder response
    return c.json({
      data: [],
      meta: [],
      rows: 0,
    })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Query failed' }, 400)
  }
})

export default app
