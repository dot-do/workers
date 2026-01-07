/**
 * @dotdo/observability - Observability utilities for Cloudflare Workers
 *
 * Provides metrics, tracing, and lifecycle hooks for comprehensive
 * observability in Cloudflare Workers applications.
 */

// Type exports
export type Tags = Record<string, string>
export type MetricType = 'counter' | 'gauge' | 'histogram'

export interface MetricValue {
  value: number
  tags?: Tags
}

export interface Counter {
  type: 'counter'
  name: string
  values: MetricValue[]
}

export interface Gauge {
  type: 'gauge'
  name: string
  values: MetricValue[]
}

export interface HistogramBucket {
  le: number
  count: number
}

export interface HistogramData {
  buckets: HistogramBucket[]
  sum: number
  count: number
}

export interface Histogram {
  type: 'histogram'
  name: string
  values: MetricValue[]
  buckets: HistogramBucket[]
  sum: number
  count: number
}

export interface SpanOptions {
  parent?: Span
}

export interface SpanContext {
  traceId: string
  spanId: string
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, string | number | boolean>
}

export interface ObservabilityConfig {
  metrics?: Metrics
  tracer?: Tracer
  prefix?: string
  onRequest?: (request: Request) => void
  onResponse?: (request: Request, response: Response, duration: number) => void
  onError?: (error: Error, request?: Request) => void
  onStorageOperation?: (op: string, key: string, duration: number) => void
}

// Default histogram buckets (similar to Prometheus defaults)
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

// Helper to generate unique IDs
function generateId(): string {
  const chars = 'abcdef0123456789'
  let id = ''
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// Helper to create a tag key from tags object
function createTagKey(tags?: Tags): string {
  if (!tags || Object.keys(tags).length === 0) return ''
  return Object.entries(tags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',')
}

interface MetricTimer {
  stop(): number
}

interface HistogramMetric {
  type: 'histogram'
  name: string
  dataByTags: Map<string, HistogramData>
  bucketDefs: number[]
}

type InternalMetric = Counter | Gauge | HistogramMetric

export class Metrics {
  private metrics: Map<string, InternalMetric> = new Map()
  private descriptions: Map<string, string> = new Map()

  counter(name: string, value: number = 1, tags?: Tags): void {
    if (value < 0) {
      throw new Error('Counter cannot be decremented')
    }

    let metric = this.metrics.get(name) as Counter | undefined
    if (!metric) {
      metric = { type: 'counter', name, values: [] }
      this.metrics.set(name, metric)
    }

    const tagKey = createTagKey(tags)
    const existing = metric.values.find((v) => createTagKey(v.tags) === tagKey)
    if (existing) {
      existing.value += value
    } else {
      metric.values.push({ value, tags })
    }
  }

  gauge(name: string, value: number, tags?: Tags): void {
    let metric = this.metrics.get(name) as Gauge | undefined
    if (!metric) {
      metric = { type: 'gauge', name, values: [] }
      this.metrics.set(name, metric)
    }

    const tagKey = createTagKey(tags)
    const existing = metric.values.find((v) => createTagKey(v.tags) === tagKey)
    if (existing) {
      existing.value = value
    } else {
      metric.values.push({ value, tags })
    }
  }

  incrementGauge(name: string, value: number = 1, tags?: Tags): void {
    const metric = this.metrics.get(name) as Gauge | undefined
    if (!metric) {
      this.gauge(name, value, tags)
      return
    }

    const tagKey = createTagKey(tags)
    const existing = metric.values.find((v) => createTagKey(v.tags) === tagKey)
    if (existing) {
      existing.value += value
    } else {
      metric.values.push({ value, tags })
    }
  }

  decrementGauge(name: string, value: number = 1, tags?: Tags): void {
    const metric = this.metrics.get(name) as Gauge | undefined
    if (!metric) {
      this.gauge(name, -value, tags)
      return
    }

    const tagKey = createTagKey(tags)
    const existing = metric.values.find((v) => createTagKey(v.tags) === tagKey)
    if (existing) {
      existing.value -= value
    } else {
      metric.values.push({ value: -value, tags })
    }
  }

  histogram(name: string, value: number, tags?: Tags, buckets?: number[]): void {
    let metric = this.metrics.get(name) as HistogramMetric | undefined
    if (!metric) {
      const bucketDefs = buckets || DEFAULT_BUCKETS
      metric = {
        type: 'histogram',
        name,
        dataByTags: new Map(),
        bucketDefs,
      }
      this.metrics.set(name, metric)
    }

    const tagKey = createTagKey(tags)
    let data = metric.dataByTags.get(tagKey)
    if (!data) {
      // Initialize buckets with +Infinity
      const allBuckets = [...metric.bucketDefs, Infinity]
      data = {
        buckets: allBuckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      }
      metric.dataByTags.set(tagKey, data)
    }

    // Update sum and count
    data.sum += value
    data.count += 1

    // Update buckets (cumulative)
    for (const bucket of data.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1
      }
    }
  }

  timing(name: string, ms: number, tags?: Tags): void {
    this.histogram(name, ms, tags)
  }

  startTimer(name: string, tags?: Tags): MetricTimer {
    const startTime = Date.now()
    return {
      stop: () => {
        const duration = Date.now() - startTime
        this.histogram(name, duration, tags)
        return duration
      },
    }
  }

  getMetric(name: string): Counter | Gauge | Histogram | undefined {
    const metric = this.metrics.get(name)
    if (!metric) return undefined

    if (metric.type === 'histogram') {
      const histMetric = metric as HistogramMetric
      // Return combined view
      let totalSum = 0
      let totalCount = 0
      const allBuckets = [...histMetric.bucketDefs, Infinity].map((le) => ({ le, count: 0 }))

      for (const data of histMetric.dataByTags.values()) {
        totalSum += data.sum
        totalCount += data.count
        for (let i = 0; i < allBuckets.length; i++) {
          const bucket = allBuckets[i]
          if (bucket) {
            bucket.count += data.buckets[i]?.count || 0
          }
        }
      }

      return {
        type: 'histogram',
        name,
        values: this.getMetricValues(name),
        buckets: allBuckets,
        sum: totalSum,
        count: totalCount,
      }
    }

    return metric as Counter | Gauge
  }

  getMetricValue(name: string, tags?: Tags): number | undefined {
    const metric = this.metrics.get(name)
    if (!metric) return undefined

    if (metric.type === 'histogram') {
      const histMetric = metric as HistogramMetric
      const tagKey = createTagKey(tags)
      const data = histMetric.dataByTags.get(tagKey)
      return data?.sum
    }

    const tagKey = createTagKey(tags)
    const metricWithValues = metric as Counter | Gauge
    const mv = metricWithValues.values.find((v) => createTagKey(v.tags) === tagKey)
    return mv?.value
  }

  getMetricValues(name: string): MetricValue[] {
    const metric = this.metrics.get(name)
    if (!metric) return []

    if (metric.type === 'histogram') {
      const histMetric = metric as HistogramMetric
      const values: MetricValue[] = []
      for (const [tagKey, data] of histMetric.dataByTags) {
        const tags = tagKey ? this.parseTagKey(tagKey) : undefined
        values.push({ value: data.sum, tags })
      }
      return values
    }

    return (metric as Counter | Gauge).values
  }

  private parseTagKey(tagKey: string): Tags {
    const tags: Tags = {}
    if (!tagKey) return tags
    for (const pair of tagKey.split(',')) {
      const [k, v] = pair.split('=')
      if (k && v !== undefined) {
        tags[k] = v
      }
    }
    return tags
  }

  getHistogram(name: string, tags?: Tags): Histogram | undefined {
    const metric = this.metrics.get(name)
    if (!metric || metric.type !== 'histogram') return undefined

    const histMetric = metric as HistogramMetric
    const tagKey = createTagKey(tags)

    // If no specific tags, return aggregated data
    if (!tags || Object.keys(tags).length === 0) {
      // Get first entry or aggregated
      const firstEntry = histMetric.dataByTags.values().next().value
      if (!firstEntry) return undefined

      return {
        type: 'histogram',
        name,
        values: [],
        buckets: firstEntry.buckets,
        sum: firstEntry.sum,
        count: firstEntry.count,
      }
    }

    const data = histMetric.dataByTags.get(tagKey)
    if (!data) return undefined

    return {
      type: 'histogram',
      name,
      values: [{ value: data.sum, tags }],
      buckets: data.buckets,
      sum: data.sum,
      count: data.count,
    }
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys())
  }

  reset(): void {
    this.metrics.clear()
  }

  resetMetric(name: string): void {
    this.metrics.delete(name)
  }

  setDescription(name: string, description: string): void {
    this.descriptions.set(name, description)
  }

  getDescription(name: string): string | undefined {
    return this.descriptions.get(name)
  }

  // Internal method for PrometheusExporter
  _getInternalMetrics(): Map<string, InternalMetric> {
    return this.metrics
  }
}

export class Span {
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parentSpanId?: string
  readonly startTime: number
  endTime?: number
  duration?: number
  status?: 'ok' | 'error'
  statusMessage?: string

  private attributes: Map<string, string | number | boolean> = new Map()
  private events: SpanEvent[] = []
  private ended: boolean = false
  private onEnd?: (span: Span) => void

  constructor(
    name: string,
    traceId: string,
    spanId: string,
    parentSpanId?: string,
    onEnd?: (span: Span) => void
  ) {
    this.name = name
    this.traceId = traceId
    this.spanId = spanId
    this.parentSpanId = parentSpanId
    this.startTime = Date.now()
    this.onEnd = onEnd
  }

  setAttribute(key: string, value: string | number | boolean): void {
    if (this.ended) {
      throw new Error('Span has ended')
    }
    this.attributes.set(key, value)
  }

  setAttributes(attributes: Record<string, string | number | boolean>): void {
    if (this.ended) {
      throw new Error('Span has ended')
    }
    for (const [key, value] of Object.entries(attributes)) {
      this.attributes.set(key, value)
    }
  }

  getAttribute(key: string): string | number | boolean | undefined {
    return this.attributes.get(key)
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (this.ended) {
      throw new Error('Span has ended')
    }
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    })
  }

  getEvents(): SpanEvent[] {
    return this.events
  }

  setStatus(status: 'ok' | 'error', message?: string): void {
    this.status = status
    if (message) {
      this.statusMessage = message
    }
  }

  recordException(error: Error): void {
    this.setStatus('error', error.message)
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack || '',
    })
  }

  end(): void {
    if (this.ended) {
      throw new Error('Span has already ended')
    }
    this.ended = true
    this.endTime = Date.now()
    this.duration = this.endTime - this.startTime
    if (this.onEnd) {
      this.onEnd(this)
    }
  }

  toJSON(): Record<string, unknown> {
    const attrs: Record<string, string | number | boolean> = {}
    for (const [k, v] of this.attributes) {
      attrs[k] = v
    }
    return {
      name: this.name,
      spanId: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      statusMessage: this.statusMessage,
      attributes: attrs,
      events: this.events,
    }
  }
}

export class Tracer {
  private activeSpanRef: Span | null = null
  private completedSpans: Span[] = []
  private currentTraceId: string | null = null

  startSpan(name: string, options?: SpanOptions): Span {
    const parent = options?.parent || this.activeSpanRef
    const traceId = parent?.traceId || this.currentTraceId || generateId()
    const spanId = generateId()

    if (!this.currentTraceId) {
      this.currentTraceId = traceId
    }

    const span = new Span(name, traceId, spanId, parent?.spanId, (completedSpan) => {
      this.completedSpans.push(completedSpan)
    })

    return span
  }

  activeSpan(): Span | null {
    return this.activeSpanRef
  }

  setActiveSpan(span: Span): void {
    this.activeSpanRef = span
  }

  async withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> {
    const previousSpan = this.activeSpanRef
    const span = this.startSpan(name)
    this.setActiveSpan(span)

    try {
      const result = await fn(span)
      span.end()
      return result
    } catch (error) {
      span.recordException(error as Error)
      span.end()
      throw error
    } finally {
      this.activeSpanRef = previousSpan
    }
  }

  getCompletedSpans(): Span[] {
    return this.completedSpans
  }

  reset(): void {
    this.activeSpanRef = null
    this.completedSpans = []
    this.currentTraceId = null
  }
}

export interface ObservabilityHooks {
  onRequest(request: Request): void
  onResponse(request: Request, response: Response, duration: number): void
  onError(error: Error, request?: Request): void
  onStorageOperation(op: string, key: string, duration: number): void
}

export function createObservabilityHooks(config: ObservabilityConfig): ObservabilityHooks {
  const { metrics, tracer, onRequest, onResponse, onError, onStorageOperation } = config

  return {
    onRequest(request: Request): void {
      // Call custom hook if provided
      if (onRequest) {
        onRequest(request)
      }

      // Create request span
      if (tracer) {
        const span = tracer.startSpan('http.request')
        span.setAttribute('http.method', request.method)
        span.setAttribute('http.url', request.url)
        tracer.setActiveSpan(span)
      }

      // Increment request counter
      if (metrics) {
        metrics.counter('http_requests_total', 1)
      }
    },

    onResponse(request: Request, response: Response, duration: number): void {
      // Call custom hook if provided
      if (onResponse) {
        onResponse(request, response, duration)
      }

      // End request span
      if (tracer) {
        const span = tracer.activeSpan()
        if (span) {
          span.setAttribute('http.status_code', response.status)
          span.end()
        }
      }

      // Record duration histogram
      if (metrics) {
        metrics.histogram('http_request_duration_ms', duration, {
          method: request.method,
          status: String(response.status),
        })
      }
    },

    onError(error: Error, request?: Request): void {
      // Call custom hook if provided
      if (onError) {
        onError(error, request)
      }

      // Record exception on span
      if (tracer) {
        const span = tracer.activeSpan()
        if (span) {
          span.recordException(error)
        }
      }

      // Increment error counter
      if (metrics) {
        metrics.counter('http_errors_total', 1)
      }
    },

    onStorageOperation(op: string, key: string, duration: number): void {
      // Call custom hook if provided
      if (onStorageOperation) {
        onStorageOperation(op, key, duration)
      }

      // Record storage timing
      if (metrics) {
        metrics.histogram('storage_operation_duration_ms', duration, {
          operation: op,
        })
      }

      // Create and end storage span
      if (tracer) {
        const span = tracer.startSpan(`storage.${op}`)
        span.setAttribute('storage.operation', op)
        span.setAttribute('storage.key', key)
        span.end()
      }
    },
  }
}

export class PrometheusExporter {
  private metrics: Metrics

  constructor(metrics: Metrics) {
    this.metrics = metrics
  }

  export(): string {
    const lines: string[] = []
    const internalMetrics = this.metrics._getInternalMetrics()

    for (const [name, metric] of internalMetrics) {
      const description = this.metrics.getDescription(name)

      if (description) {
        lines.push(`# HELP ${name} ${description}`)
      }

      if (metric.type === 'counter') {
        lines.push(`# TYPE ${name} counter`)
        for (const mv of (metric as Counter).values) {
          const labels = this.formatLabels(mv.tags)
          lines.push(`${name}${labels} ${mv.value}`)
        }
      } else if (metric.type === 'gauge') {
        lines.push(`# TYPE ${name} gauge`)
        for (const mv of (metric as Gauge).values) {
          const labels = this.formatLabels(mv.tags)
          lines.push(`${name}${labels} ${mv.value}`)
        }
      } else if (metric.type === 'histogram') {
        lines.push(`# TYPE ${name} histogram`)
        const histMetric = metric as {
          type: 'histogram'
          name: string
          dataByTags: Map<string, HistogramData>
          bucketDefs: number[]
        }

        for (const [tagKey, data] of histMetric.dataByTags) {
          const baseTags = tagKey ? this.parseTagKey(tagKey) : undefined

          // Export buckets
          for (const bucket of data.buckets) {
            const le = bucket.le === Infinity ? '+Inf' : String(bucket.le)
            const bucketTags = baseTags ? { ...baseTags, le } : { le }
            const labels = this.formatLabels(bucketTags)
            lines.push(`${name}_bucket${labels} ${bucket.count}`)
          }

          // Export sum
          const sumLabels = this.formatLabels(baseTags)
          lines.push(`${name}_sum${sumLabels} ${data.sum}`)

          // Export count
          lines.push(`${name}_count${sumLabels} ${data.count}`)
        }
      }
    }

    return lines.join('\n')
  }

  private formatLabels(tags?: Tags): string {
    if (!tags || Object.keys(tags).length === 0) return ''
    const pairs = Object.entries(tags)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return `{${pairs}}`
  }

  private parseTagKey(tagKey: string): Tags {
    const tags: Tags = {}
    if (!tagKey) return tags
    for (const pair of tagKey.split(',')) {
      const [k, v] = pair.split('=')
      if (k && v !== undefined) {
        tags[k] = v
      }
    }
    return tags
  }

  toResponse(): Response {
    const body = this.export()
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    })
  }
}

export class Timer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  elapsed(): number {
    return Date.now() - this.startTime
  }

  reset(): void {
    this.startTime = Date.now()
  }
}

export class WorkerIntegration {
  private metrics: Metrics
  private tracer: Tracer
  private prefix: string
  private hooks: ObservabilityHooks

  constructor(config: ObservabilityConfig) {
    this.metrics = config.metrics || new Metrics()
    this.tracer = config.tracer || new Tracer()
    this.prefix = config.prefix || ''

    this.hooks = createObservabilityHooks({
      ...config,
      metrics: this.metrics,
      tracer: this.tracer,
    })
  }

  getHooks(): ObservabilityHooks {
    return this.hooks
  }

  wrapHandler(
    handler: (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>
  ): (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response> {
    return async (request: Request, env: unknown, ctx: ExecutionContext) => {
      const startTime = Date.now()

      // Increment request counter with prefix
      this.metrics.counter(`${this.prefix}http_requests_total`, 1)

      // Create request span
      const span = this.tracer.startSpan('http.request')
      span.setAttribute('http.method', request.method)
      span.setAttribute('http.url', request.url)
      this.tracer.setActiveSpan(span)

      try {
        const response = await handler(request, env, ctx)
        const duration = Date.now() - startTime

        span.setAttribute('http.status_code', response.status)
        span.end()

        // Record duration
        this.metrics.histogram(`${this.prefix}http_request_duration_ms`, duration, {
          method: request.method,
          status: String(response.status),
        })

        return response
      } catch (error) {
        // Record error
        this.metrics.counter(`${this.prefix}http_errors_total`, 1)
        span.recordException(error as Error)
        span.end()
        throw error
      }
    }
  }

  async handleMetrics(_request: Request): Promise<Response> {
    const exporter = new PrometheusExporter(this.metrics)
    return exporter.toResponse()
  }
}
