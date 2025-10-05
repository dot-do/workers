import type { Env, Span, SpanContext, SpanAttributes, SpanStatus, TraceData, Resource } from './types'

// W3C Trace Context header names
export const TRACE_PARENT_HEADER = 'traceparent'
export const TRACE_STATE_HEADER = 'tracestate'

/**
 * Generate a random trace ID (128-bit hex string)
 */
export function generateTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a random span ID (64-bit hex string)
 */
export function generateSpanId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse W3C traceparent header
 * Format: 00-{traceId}-{parentId}-{traceFlags}
 */
export function parseTraceParent(traceparent: string): SpanContext | null {
  const parts = traceparent.split('-')
  if (parts.length !== 4 || parts[0] !== '00') return null

  return {
    traceId: parts[1],
    spanId: parts[2],
    traceFlags: parseInt(parts[3], 16),
  }
}

/**
 * Format W3C traceparent header
 */
export function formatTraceParent(context: SpanContext): string {
  const flags = context.traceFlags.toString(16).padStart(2, '0')
  return `00-${context.traceId}-${context.spanId}-${flags}`
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContext(headers: Headers): SpanContext | null {
  const traceparent = headers.get(TRACE_PARENT_HEADER)
  if (!traceparent) return null
  return parseTraceParent(traceparent)
}

/**
 * Inject trace context into request headers
 */
export function injectTraceContext(headers: Headers, context: SpanContext): void {
  headers.set(TRACE_PARENT_HEADER, formatTraceParent(context))
}

/**
 * Span builder for OpenTelemetry-compatible spans
 */
export class SpanBuilder {
  private span: Span
  private startTimeMs: number

  constructor(name: string, parentContext?: SpanContext | null, kind: Span['kind'] = 'INTERNAL') {
    const traceId = parentContext?.traceId || generateTraceId()
    const spanId = generateSpanId()

    this.startTimeMs = Date.now()
    this.span = {
      context: {
        traceId,
        spanId,
        traceFlags: 1, // sampled
      },
      parentSpanId: parentContext?.spanId,
      name,
      kind,
      startTime: this.startTimeMs * 1000, // convert to microseconds
      attributes: {},
    }
  }

  setAttribute(key: string, value: string | number | boolean): this {
    if (!this.span.attributes) this.span.attributes = {}
    this.span.attributes[key] = value
    return this
  }

  setAttributes(attributes: SpanAttributes): this {
    if (!this.span.attributes) this.span.attributes = {}
    Object.assign(this.span.attributes, attributes)
    return this
  }

  setStatus(code: SpanStatus['code'], message?: string): this {
    this.span.status = { code, message }
    return this
  }

  addEvent(name: string, attributes?: SpanAttributes): this {
    if (!this.span.events) this.span.events = []
    this.span.events.push({
      name,
      timestamp: Date.now() * 1000, // microseconds
      attributes,
    })
    return this
  }

  recordException(error: Error): this {
    this.setStatus('ERROR', error.message)
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack || '',
    })
    return this
  }

  end(): Span {
    this.span.endTime = Date.now() * 1000 // microseconds
    return this.span
  }

  getContext(): SpanContext {
    return this.span.context
  }
}

/**
 * Tracer for collecting and writing spans
 */
export class Tracer {
  constructor(
    private env: Env,
    private resource: Resource
  ) {}

  /**
   * Start a new root span
   */
  startSpan(name: string, kind: Span['kind'] = 'INTERNAL'): SpanBuilder {
    return new SpanBuilder(name, null, kind)
  }

  /**
   * Start a child span from parent context
   */
  startChildSpan(name: string, parentContext: SpanContext, kind: Span['kind'] = 'INTERNAL'): SpanBuilder {
    return new SpanBuilder(name, parentContext, kind)
  }

  /**
   * Write spans to Analytics Engine
   */
  async writeSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return

    // Write each span to Analytics Engine
    for (const span of spans) {
      const durationMs = span.endTime && span.startTime ? (span.endTime - span.startTime) / 1000 : 0

      this.env.TRACES.writeDataPoint({
        blobs: [
          span.context.traceId,
          span.context.spanId,
          span.parentSpanId || '',
          span.name,
          span.kind,
          span.status?.code || 'UNSET',
          this.resource.serviceName,
          this.resource.deploymentEnvironment || 'production',
          JSON.stringify(span.attributes || {}),
        ],
        doubles: [span.startTime / 1000, durationMs], // convert to milliseconds
        indexes: [this.resource.serviceName, span.kind, span.status?.code || 'UNSET'],
      })
    }

    // Store trace metadata in D1 for search
    const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0]
    const durationMs = rootSpan.endTime && rootSpan.startTime ? (rootSpan.endTime - rootSpan.startTime) / 1000 : 0

    await this.env.DB.prepare(
      `INSERT INTO trace_metadata (trace_id, service_name, operation_name, duration_ms, status, error_message, span_count, timestamp, labels)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(trace_id) DO UPDATE SET
         span_count = span_count + excluded.span_count,
         duration_ms = MAX(duration_ms, excluded.duration_ms),
         status = CASE WHEN excluded.status = 'error' THEN 'error' ELSE status END`
    )
      .bind(
        rootSpan.context.traceId,
        this.resource.serviceName,
        rootSpan.name,
        durationMs,
        rootSpan.status?.code === 'ERROR' ? 'error' : 'ok',
        rootSpan.status?.message || null,
        spans.length,
        Math.floor(Date.now() / 1000),
        JSON.stringify(rootSpan.attributes || {})
      )
      .run()
  }

  /**
   * Write a complete trace
   */
  async writeTrace(traceData: TraceData): Promise<void> {
    await this.writeSpans(traceData.spans)
  }
}

/**
 * Convenience function to trace an async operation
 */
export async function traced<T>(
  tracer: Tracer,
  name: string,
  fn: (span: SpanBuilder) => Promise<T>,
  parentContext?: SpanContext,
  kind: Span['kind'] = 'INTERNAL'
): Promise<T> {
  const span = parentContext ? tracer.startChildSpan(name, parentContext, kind) : tracer.startSpan(name, kind)

  try {
    const result = await fn(span)
    span.setStatus('OK')
    return result
  } catch (error) {
    if (error instanceof Error) {
      span.recordException(error)
    }
    throw error
  } finally {
    await tracer.writeSpans([span.end()])
  }
}
