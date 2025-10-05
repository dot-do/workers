import { Context } from 'hono'
import type { Env, Resource, SpanContext } from './types'
import { Tracer, extractTraceContext, injectTraceContext, SpanBuilder } from './tracing'
import { MetricsCollector, WorkerMetrics } from './metrics'

/**
 * Auto-instrumentation middleware for Hono workers
 */
export function observabilityMiddleware(serviceName: string, serviceVersion?: string) {
  return async (c: Context, next: () => Promise<void>) => {
    const env = c.env as Env
    const startTime = Date.now()

    // Create resource
    const resource: Resource = {
      serviceName,
      serviceVersion,
      deploymentEnvironment: env.ENVIRONMENT || 'production',
    }

    // Initialize tracer and metrics
    const tracer = new Tracer(env, resource)
    const metricsCollector = new MetricsCollector(env, resource)
    const workerMetrics = new WorkerMetrics(metricsCollector)

    // Extract parent trace context from headers
    const parentContext = extractTraceContext(c.req.raw.headers)

    // Start span for this request
    const span = parentContext
      ? tracer.startChildSpan(`${c.req.method} ${c.req.path}`, parentContext, 'SERVER')
      : tracer.startSpan(`${c.req.method} ${c.req.path}`, 'SERVER')

    // Add standard HTTP attributes
    span.setAttributes({
      'http.method': c.req.method,
      'http.url': c.req.url,
      'http.scheme': new URL(c.req.url).protocol.replace(':', ''),
      'http.host': c.req.header('host') || '',
      'http.user_agent': c.req.header('user-agent') || '',
      'http.request_content_length': c.req.header('content-length') || '0',
    })

    // Add CF-specific attributes
    const cf = (c.req.raw as any).cf
    if (cf) {
      span.setAttributes({
        'cf.colo': cf.colo || '',
        'cf.country': cf.country || '',
        'cf.region': cf.region || '',
        'cf.asn': cf.asn?.toString() || '',
      })
    }

    // Store tracer and metrics in context
    c.set('tracer', tracer)
    c.set('metrics', workerMetrics)
    c.set('span', span)
    c.set('traceContext', span.getContext())

    let status = 200

    try {
      await next()
      status = c.res.status

      span.setAttribute('http.status_code', status)
      span.setStatus(status >= 400 ? 'ERROR' : 'OK')
    } catch (error) {
      status = 500
      span.recordException(error as Error)
      throw error
    } finally {
      // Record metrics
      const duration = Date.now() - startTime
      metricsCollector.recordRequestDuration(duration, c.req.method, c.req.path, status)
      metricsCollector.recordRequest(c.req.method, c.req.path, status)

      // End span and write
      await tracer.writeSpans([span.end()])

      // Flush metrics
      await metricsCollector.flush()

      // Update service in registry
      await updateServiceRegistry(env, resource)
    }
  }
}

/**
 * RPC instrumentation wrapper
 */
export async function instrumentRpcCall<T>(
  c: Context,
  targetService: string,
  method: string,
  fn: (headers: Headers) => Promise<T>
): Promise<T> {
  const tracer = c.get('tracer') as Tracer
  const workerMetrics = c.get('metrics') as WorkerMetrics
  const parentContext = c.get('traceContext') as SpanContext

  // Start RPC span
  const span = tracer.startChildSpan(`rpc.${targetService}.${method}`, parentContext, 'CLIENT')
  span.setAttributes({
    'rpc.service': targetService,
    'rpc.method': method,
    'rpc.system': 'workers_rpc',
  })

  // Create headers for propagation
  const headers = new Headers()
  injectTraceContext(headers, span.getContext())

  try {
    const result = await workerMetrics.measureRpcCall(targetService, method, () => fn(headers))
    span.setStatus('OK')
    return result
  } catch (error) {
    span.recordException(error as Error)
    throw error
  } finally {
    await tracer.writeSpans([span.end()])

    // Record service dependency
    const env = c.env as Env
    const resource = c.get('tracer').resource
    await recordServiceDependency(env, resource.serviceName, targetService, 'rpc')
  }
}

/**
 * Database query instrumentation
 */
export async function instrumentDbQuery<T>(c: Context, query: string, fn: () => Promise<T>): Promise<T> {
  const tracer = c.get('tracer') as Tracer
  const parentContext = c.get('traceContext') as SpanContext

  const span = tracer.startChildSpan('db.query', parentContext, 'CLIENT')
  span.setAttributes({
    'db.system': 'd1',
    'db.statement': query.substring(0, 200), // truncate long queries
  })

  try {
    const result = await fn()
    span.setStatus('OK')
    return result
  } catch (error) {
    span.recordException(error as Error)
    throw error
  } finally {
    await tracer.writeSpans([span.end()])
  }
}

/**
 * Update service in registry
 */
async function updateServiceRegistry(env: Env, resource: Resource): Promise<void> {
  const serviceId = `${resource.serviceName}-${resource.deploymentEnvironment}`

  await env.DB.prepare(
    `INSERT INTO services (id, name, version, environment, last_seen_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       version = excluded.version,
       last_seen_at = excluded.last_seen_at,
       metadata = excluded.metadata`
  )
    .bind(
      serviceId,
      resource.serviceName,
      resource.serviceVersion || null,
      resource.deploymentEnvironment || 'production',
      Math.floor(Date.now() / 1000),
      JSON.stringify(resource.attributes || {})
    )
    .run()
}

/**
 * Record service dependency
 */
async function recordServiceDependency(env: Env, sourceService: string, targetService: string, type: string): Promise<void> {
  const sourceId = `${sourceService}-${env.ENVIRONMENT}`
  const targetId = `${targetService}-${env.ENVIRONMENT}`

  await env.DB.prepare(
    `INSERT INTO service_dependencies (source_service_id, target_service_id, dependency_type, request_count, last_seen_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(source_service_id, target_service_id, dependency_type) DO UPDATE SET
       request_count = request_count + 1,
       last_seen_at = excluded.last_seen_at`
  )
    .bind(sourceId, targetId, type, Math.floor(Date.now() / 1000))
    .run()
}
