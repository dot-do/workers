import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Metrics,
  MetricType,
  Tags,
  MetricValue,
  Counter,
  Gauge,
  Histogram,
  Tracer,
  Span,
  SpanOptions,
  SpanContext,
  ObservabilityHooks,
  createObservabilityHooks,
  Timer,
  PrometheusExporter,
  WorkerIntegration,
  ObservabilityConfig,
} from '../src/index'

describe('Metrics', () => {
  let metrics: Metrics

  beforeEach(() => {
    metrics = new Metrics()
  })

  describe('Counter', () => {
    it('should create and increment a counter', () => {
      metrics.counter('requests_total')
      expect(metrics.getMetric('requests_total')).toBeDefined()
      expect(metrics.getMetric('requests_total')?.type).toBe('counter')
    })

    it('should increment counter by 1 by default', () => {
      metrics.counter('requests_total')
      metrics.counter('requests_total')
      expect(metrics.getMetricValue('requests_total')).toBe(2)
    })

    it('should increment counter by specified value', () => {
      metrics.counter('requests_total', 5)
      metrics.counter('requests_total', 3)
      expect(metrics.getMetricValue('requests_total')).toBe(8)
    })

    it('should support tags on counters', () => {
      metrics.counter('requests_total', 1, { method: 'GET', path: '/api' })
      metrics.counter('requests_total', 1, { method: 'POST', path: '/api' })

      const values = metrics.getMetricValues('requests_total')
      expect(values.length).toBe(2)
    })

    it('should aggregate same tag combinations', () => {
      metrics.counter('requests_total', 1, { method: 'GET' })
      metrics.counter('requests_total', 2, { method: 'GET' })

      const values = metrics.getMetricValues('requests_total')
      expect(values.length).toBe(1)
      expect(values[0]?.value).toBe(3)
    })

    it('should not allow negative increments', () => {
      expect(() => metrics.counter('requests_total', -1)).toThrow('Counter cannot be decremented')
    })
  })

  describe('Gauge', () => {
    it('should create and set a gauge', () => {
      metrics.gauge('temperature', 25.5)
      expect(metrics.getMetric('temperature')).toBeDefined()
      expect(metrics.getMetric('temperature')?.type).toBe('gauge')
    })

    it('should set gauge to specified value', () => {
      metrics.gauge('temperature', 25.5)
      expect(metrics.getMetricValue('temperature')).toBe(25.5)
    })

    it('should replace gauge value on subsequent calls', () => {
      metrics.gauge('temperature', 25.5)
      metrics.gauge('temperature', 30.0)
      expect(metrics.getMetricValue('temperature')).toBe(30.0)
    })

    it('should support tags on gauges', () => {
      metrics.gauge('temperature', 25.5, { location: 'indoor' })
      metrics.gauge('temperature', 35.0, { location: 'outdoor' })

      const values = metrics.getMetricValues('temperature')
      expect(values.length).toBe(2)
    })

    it('should allow negative values', () => {
      metrics.gauge('balance', -100)
      expect(metrics.getMetricValue('balance')).toBe(-100)
    })

    it('should increment gauge value', () => {
      metrics.gauge('active_connections', 5)
      metrics.incrementGauge('active_connections', 3)
      expect(metrics.getMetricValue('active_connections')).toBe(8)
    })

    it('should decrement gauge value', () => {
      metrics.gauge('active_connections', 5)
      metrics.decrementGauge('active_connections', 2)
      expect(metrics.getMetricValue('active_connections')).toBe(3)
    })
  })

  describe('Histogram', () => {
    it('should create and observe a histogram', () => {
      metrics.histogram('request_duration', 0.5)
      expect(metrics.getMetric('request_duration')).toBeDefined()
      expect(metrics.getMetric('request_duration')?.type).toBe('histogram')
    })

    it('should track count of observations', () => {
      metrics.histogram('request_duration', 0.1)
      metrics.histogram('request_duration', 0.2)
      metrics.histogram('request_duration', 0.3)

      const histogram = metrics.getHistogram('request_duration')
      expect(histogram?.count).toBe(3)
    })

    it('should track sum of observations', () => {
      metrics.histogram('request_duration', 0.1)
      metrics.histogram('request_duration', 0.2)
      metrics.histogram('request_duration', 0.3)

      const histogram = metrics.getHistogram('request_duration')
      expect(histogram?.sum).toBeCloseTo(0.6, 5)
    })

    it('should use default buckets', () => {
      metrics.histogram('request_duration', 0.05)

      const histogram = metrics.getHistogram('request_duration')
      expect(histogram?.buckets).toBeDefined()
      expect(histogram?.buckets.length).toBeGreaterThan(0)
    })

    it('should support custom buckets', () => {
      const customBuckets = [0.01, 0.05, 0.1, 0.5, 1.0]
      metrics.histogram('request_duration', 0.05, undefined, customBuckets)

      const histogram = metrics.getHistogram('request_duration')
      expect(histogram?.buckets.map((b) => b.le)).toEqual([...customBuckets, Infinity])
    })

    it('should increment appropriate buckets', () => {
      const buckets = [0.1, 0.5, 1.0]
      metrics.histogram('request_duration', 0.05, undefined, buckets)
      metrics.histogram('request_duration', 0.3, undefined, buckets)
      metrics.histogram('request_duration', 0.8, undefined, buckets)

      const histogram = metrics.getHistogram('request_duration')
      expect(histogram?.buckets.find((b) => b.le === 0.1)?.count).toBe(1)
      expect(histogram?.buckets.find((b) => b.le === 0.5)?.count).toBe(2)
      expect(histogram?.buckets.find((b) => b.le === 1.0)?.count).toBe(3)
      expect(histogram?.buckets.find((b) => b.le === Infinity)?.count).toBe(3)
    })

    it('should support tags on histograms', () => {
      metrics.histogram('request_duration', 0.1, { method: 'GET' })
      metrics.histogram('request_duration', 0.2, { method: 'POST' })

      const values = metrics.getMetricValues('request_duration')
      expect(values.length).toBe(2)
    })
  })

  describe('Timing', () => {
    it('should record timing in milliseconds', () => {
      metrics.timing('request_time_ms', 150)
      expect(metrics.getMetricValue('request_time_ms')).toBe(150)
    })

    it('should support tags on timings', () => {
      metrics.timing('request_time_ms', 100, { endpoint: '/api/users' })
      const values = metrics.getMetricValues('request_time_ms')
      expect(values.length).toBe(1)
      expect(values[0]?.tags?.endpoint).toBe('/api/users')
    })

    it('should be recorded as histogram type', () => {
      metrics.timing('request_time_ms', 100)
      expect(metrics.getMetric('request_time_ms')?.type).toBe('histogram')
    })
  })

  describe('Timer utility', () => {
    it('should measure elapsed time', async () => {
      const timer = metrics.startTimer('operation_duration')

      await new Promise((resolve) => setTimeout(resolve, 50))
      const duration = timer.stop()

      expect(duration).toBeGreaterThanOrEqual(45)
      expect(duration).toBeLessThan(150)
    })

    it('should record timing to metrics on stop', async () => {
      const timer = metrics.startTimer('operation_duration')
      await new Promise((resolve) => setTimeout(resolve, 10))
      timer.stop()

      const histogram = metrics.getHistogram('operation_duration')
      expect(histogram?.count).toBe(1)
    })

    it('should support tags on timer', async () => {
      const timer = metrics.startTimer('operation_duration', { operation: 'fetch' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      timer.stop()

      const values = metrics.getMetricValues('operation_duration')
      expect(values[0]?.tags?.operation).toBe('fetch')
    })
  })

  describe('Reset and clear', () => {
    it('should reset all metrics', () => {
      metrics.counter('requests_total', 5)
      metrics.gauge('temperature', 25)

      metrics.reset()

      expect(metrics.getMetricValue('requests_total')).toBeUndefined()
      expect(metrics.getMetricValue('temperature')).toBeUndefined()
    })

    it('should reset specific metric', () => {
      metrics.counter('requests_total', 5)
      metrics.gauge('temperature', 25)

      metrics.resetMetric('requests_total')

      expect(metrics.getMetricValue('requests_total')).toBeUndefined()
      expect(metrics.getMetricValue('temperature')).toBe(25)
    })
  })

  describe('Metric listing', () => {
    it('should list all metric names', () => {
      metrics.counter('requests_total')
      metrics.gauge('temperature')
      metrics.histogram('duration')

      const names = metrics.getMetricNames()
      expect(names).toContain('requests_total')
      expect(names).toContain('temperature')
      expect(names).toContain('duration')
    })
  })
})

describe('Tracer', () => {
  let tracer: Tracer

  beforeEach(() => {
    tracer = new Tracer()
  })

  afterEach(() => {
    tracer.reset()
  })

  describe('Span creation', () => {
    it('should create a span with name', () => {
      const span = tracer.startSpan('my-operation')

      expect(span).toBeDefined()
      expect(span.name).toBe('my-operation')
    })

    it('should assign unique span ID', () => {
      const span1 = tracer.startSpan('operation-1')
      const span2 = tracer.startSpan('operation-2')

      expect(span1.spanId).toBeDefined()
      expect(span2.spanId).toBeDefined()
      expect(span1.spanId).not.toBe(span2.spanId)
    })

    it('should assign trace ID', () => {
      const span = tracer.startSpan('operation')

      expect(span.traceId).toBeDefined()
      expect(typeof span.traceId).toBe('string')
    })

    it('should share trace ID with parent span', () => {
      const parent = tracer.startSpan('parent')
      const child = tracer.startSpan('child', { parent })

      expect(child.traceId).toBe(parent.traceId)
    })

    it('should set parent span ID on child spans', () => {
      const parent = tracer.startSpan('parent')
      const child = tracer.startSpan('child', { parent })

      expect(child.parentSpanId).toBe(parent.spanId)
    })

    it('should record start time', () => {
      const before = Date.now()
      const span = tracer.startSpan('operation')
      const after = Date.now()

      expect(span.startTime).toBeGreaterThanOrEqual(before)
      expect(span.startTime).toBeLessThanOrEqual(after)
    })
  })

  describe('Span attributes', () => {
    it('should set attributes on span', () => {
      const span = tracer.startSpan('operation')
      span.setAttribute('user.id', '12345')

      expect(span.getAttribute('user.id')).toBe('12345')
    })

    it('should support multiple attribute types', () => {
      const span = tracer.startSpan('operation')
      span.setAttribute('string', 'value')
      span.setAttribute('number', 42)
      span.setAttribute('boolean', true)

      expect(span.getAttribute('string')).toBe('value')
      expect(span.getAttribute('number')).toBe(42)
      expect(span.getAttribute('boolean')).toBe(true)
    })

    it('should set multiple attributes at once', () => {
      const span = tracer.startSpan('operation')
      span.setAttributes({
        'http.method': 'GET',
        'http.url': '/api/users',
        'http.status_code': 200,
      })

      expect(span.getAttribute('http.method')).toBe('GET')
      expect(span.getAttribute('http.url')).toBe('/api/users')
      expect(span.getAttribute('http.status_code')).toBe(200)
    })
  })

  describe('Span events', () => {
    it('should add events to span', () => {
      const span = tracer.startSpan('operation')
      span.addEvent('cache.miss')

      const events = span.getEvents()
      expect(events.length).toBe(1)
      expect(events[0]?.name).toBe('cache.miss')
    })

    it('should add event with attributes', () => {
      const span = tracer.startSpan('operation')
      span.addEvent('exception', { 'exception.message': 'Something went wrong' })

      const events = span.getEvents()
      expect(events[0]?.attributes?.['exception.message']).toBe('Something went wrong')
    })

    it('should record event timestamp', () => {
      const span = tracer.startSpan('operation')
      const before = Date.now()
      span.addEvent('event')
      const after = Date.now()

      const events = span.getEvents()
      expect(events[0]?.timestamp).toBeGreaterThanOrEqual(before)
      expect(events[0]?.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('Span status', () => {
    it('should set OK status', () => {
      const span = tracer.startSpan('operation')
      span.setStatus('ok')

      expect(span.status).toBe('ok')
    })

    it('should set error status with message', () => {
      const span = tracer.startSpan('operation')
      span.setStatus('error', 'Something went wrong')

      expect(span.status).toBe('error')
      expect(span.statusMessage).toBe('Something went wrong')
    })

    it('should record exception', () => {
      const span = tracer.startSpan('operation')
      const error = new Error('Test error')
      span.recordException(error)

      expect(span.status).toBe('error')
      const events = span.getEvents()
      expect(events.some((e) => e.name === 'exception')).toBe(true)
    })
  })

  describe('Span completion', () => {
    it('should finish span and record end time', () => {
      const span = tracer.startSpan('operation')
      span.end()

      expect(span.endTime).toBeDefined()
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime)
    })

    it('should calculate duration', async () => {
      const span = tracer.startSpan('operation')
      await new Promise((resolve) => setTimeout(resolve, 50))
      span.end()

      expect(span.duration).toBeGreaterThanOrEqual(45)
    })

    it('should not allow modifications after end', () => {
      const span = tracer.startSpan('operation')
      span.end()

      expect(() => span.setAttribute('key', 'value')).toThrow('Span has ended')
      expect(() => span.addEvent('event')).toThrow('Span has ended')
    })

    it('should not allow ending twice', () => {
      const span = tracer.startSpan('operation')
      span.end()

      expect(() => span.end()).toThrow('Span has already ended')
    })
  })

  describe('Active span context', () => {
    it('should track active span', () => {
      expect(tracer.activeSpan()).toBeNull()

      const span = tracer.startSpan('operation')
      tracer.setActiveSpan(span)

      expect(tracer.activeSpan()).toBe(span)
    })

    it('should automatically set child parent from active span', () => {
      const parent = tracer.startSpan('parent')
      tracer.setActiveSpan(parent)

      const child = tracer.startSpan('child')

      expect(child.parentSpanId).toBe(parent.spanId)
    })

    it('should run callback with span context', async () => {
      const result = await tracer.withSpan('operation', async (span) => {
        expect(tracer.activeSpan()).toBe(span)
        return 'result'
      })

      expect(result).toBe('result')
    })

    it('should restore previous active span after withSpan', async () => {
      const parent = tracer.startSpan('parent')
      tracer.setActiveSpan(parent)

      await tracer.withSpan('child', async () => {
        // Active span is child inside callback
      })

      expect(tracer.activeSpan()).toBe(parent)
    })
  })

  describe('Span export', () => {
    it('should export completed spans', () => {
      const span = tracer.startSpan('operation')
      span.end()

      const spans = tracer.getCompletedSpans()
      expect(spans.length).toBe(1)
      expect(spans[0]?.name).toBe('operation')
    })

    it('should export span to JSON format', () => {
      const span = tracer.startSpan('operation')
      span.setAttribute('key', 'value')
      span.end()

      const json = span.toJSON()
      expect(json.name).toBe('operation')
      expect(json.attributes.key).toBe('value')
      expect(json.spanId).toBeDefined()
      expect(json.traceId).toBeDefined()
    })
  })
})

describe('ObservabilityHooks', () => {
  let hooks: ObservabilityHooks
  let metrics: Metrics
  let tracer: Tracer

  beforeEach(() => {
    metrics = new Metrics()
    tracer = new Tracer()
    hooks = createObservabilityHooks({ metrics, tracer })
  })

  afterEach(() => {
    tracer.reset()
  })

  describe('Request lifecycle', () => {
    it('should call onRequest hook', () => {
      const onRequestSpy = vi.fn()
      hooks = createObservabilityHooks({
        metrics,
        tracer,
        onRequest: onRequestSpy,
      })

      const request = new Request('https://example.com/api')
      hooks.onRequest(request)

      expect(onRequestSpy).toHaveBeenCalledWith(request)
    })

    it('should create request span', () => {
      const request = new Request('https://example.com/api')
      hooks.onRequest(request)

      expect(tracer.activeSpan()).not.toBeNull()
      expect(tracer.activeSpan()?.name).toBe('http.request')
    })

    it('should set HTTP attributes on request span', () => {
      const request = new Request('https://example.com/api/users', {
        method: 'POST',
      })
      hooks.onRequest(request)

      const span = tracer.activeSpan()
      expect(span?.getAttribute('http.method')).toBe('POST')
      expect(span?.getAttribute('http.url')).toBe('https://example.com/api/users')
    })

    it('should increment request counter', () => {
      const request = new Request('https://example.com/api')
      hooks.onRequest(request)

      expect(metrics.getMetricValue('http_requests_total')).toBe(1)
    })
  })

  describe('Response lifecycle', () => {
    it('should call onResponse hook', () => {
      const onResponseSpy = vi.fn()
      hooks = createObservabilityHooks({
        metrics,
        tracer,
        onResponse: onResponseSpy,
      })

      const request = new Request('https://example.com/api')
      const response = new Response('OK', { status: 200 })
      hooks.onRequest(request)
      hooks.onResponse(request, response, 100)

      expect(onResponseSpy).toHaveBeenCalledWith(request, response, 100)
    })

    it('should end request span on response', () => {
      const request = new Request('https://example.com/api')
      const response = new Response('OK', { status: 200 })

      hooks.onRequest(request)
      const span = tracer.activeSpan()
      hooks.onResponse(request, response, 100)

      expect(span?.endTime).toBeDefined()
    })

    it('should set response status on span', () => {
      const request = new Request('https://example.com/api')
      const response = new Response('OK', { status: 200 })

      hooks.onRequest(request)
      const span = tracer.activeSpan()
      hooks.onResponse(request, response, 100)

      expect(span?.getAttribute('http.status_code')).toBe(200)
    })

    it('should record request duration histogram', () => {
      const request = new Request('https://example.com/api')
      const response = new Response('OK', { status: 200 })

      hooks.onRequest(request)
      hooks.onResponse(request, response, 150)

      const histogram = metrics.getHistogram('http_request_duration_ms')
      expect(histogram?.count).toBe(1)
    })

    it('should tag metrics with method and status', () => {
      const request = new Request('https://example.com/api', { method: 'GET' })
      const response = new Response('OK', { status: 200 })

      hooks.onRequest(request)
      hooks.onResponse(request, response, 100)

      const values = metrics.getMetricValues('http_request_duration_ms')
      expect(values[0]?.tags?.method).toBe('GET')
      expect(values[0]?.tags?.status).toBe('200')
    })
  })

  describe('Error handling', () => {
    it('should call onError hook', () => {
      const onErrorSpy = vi.fn()
      hooks = createObservabilityHooks({
        metrics,
        tracer,
        onError: onErrorSpy,
      })

      const error = new Error('Something went wrong')
      const request = new Request('https://example.com/api')

      hooks.onRequest(request)
      hooks.onError(error, request)

      expect(onErrorSpy).toHaveBeenCalledWith(error, request)
    })

    it('should record exception on span', () => {
      const error = new Error('Something went wrong')
      const request = new Request('https://example.com/api')

      hooks.onRequest(request)
      hooks.onError(error, request)

      const span = tracer.activeSpan()
      expect(span?.status).toBe('error')
    })

    it('should increment error counter', () => {
      const error = new Error('Something went wrong')
      const request = new Request('https://example.com/api')

      hooks.onRequest(request)
      hooks.onError(error, request)

      expect(metrics.getMetricValue('http_errors_total')).toBe(1)
    })

    it('should handle error without request context', () => {
      const error = new Error('Something went wrong')

      expect(() => hooks.onError(error)).not.toThrow()
      expect(metrics.getMetricValue('http_errors_total')).toBe(1)
    })
  })

  describe('Storage operations', () => {
    it('should call onStorageOperation hook', () => {
      const onStorageOperationSpy = vi.fn()
      hooks = createObservabilityHooks({
        metrics,
        tracer,
        onStorageOperation: onStorageOperationSpy,
      })

      hooks.onStorageOperation('get', 'user:123', 5)

      expect(onStorageOperationSpy).toHaveBeenCalledWith('get', 'user:123', 5)
    })

    it('should record storage operation timing', () => {
      hooks.onStorageOperation('get', 'user:123', 5)

      const histogram = metrics.getHistogram('storage_operation_duration_ms')
      expect(histogram?.count).toBe(1)
    })

    it('should tag storage metrics with operation type', () => {
      hooks.onStorageOperation('get', 'user:123', 5)

      const values = metrics.getMetricValues('storage_operation_duration_ms')
      expect(values[0]?.tags?.operation).toBe('get')
    })

    it('should create span for storage operation', () => {
      const request = new Request('https://example.com/api')
      hooks.onRequest(request)

      hooks.onStorageOperation('put', 'user:123', 10)

      const spans = tracer.getCompletedSpans()
      expect(spans.some((s) => s.name === 'storage.put')).toBe(true)
    })
  })
})

describe('PrometheusExporter', () => {
  let metrics: Metrics
  let exporter: PrometheusExporter

  beforeEach(() => {
    metrics = new Metrics()
    exporter = new PrometheusExporter(metrics)
  })

  describe('Counter export', () => {
    it('should export counter in Prometheus format', () => {
      metrics.counter('requests_total', 42)

      const output = exporter.export()

      expect(output).toContain('# TYPE requests_total counter')
      expect(output).toContain('requests_total 42')
    })

    it('should export counter with labels', () => {
      metrics.counter('requests_total', 10, { method: 'GET', path: '/api' })

      const output = exporter.export()

      expect(output).toContain('requests_total{method="GET",path="/api"} 10')
    })

    it('should export multiple label combinations', () => {
      metrics.counter('requests_total', 10, { method: 'GET' })
      metrics.counter('requests_total', 5, { method: 'POST' })

      const output = exporter.export()

      expect(output).toContain('requests_total{method="GET"} 10')
      expect(output).toContain('requests_total{method="POST"} 5')
    })
  })

  describe('Gauge export', () => {
    it('should export gauge in Prometheus format', () => {
      metrics.gauge('temperature', 25.5)

      const output = exporter.export()

      expect(output).toContain('# TYPE temperature gauge')
      expect(output).toContain('temperature 25.5')
    })

    it('should export gauge with labels', () => {
      metrics.gauge('temperature', 25.5, { location: 'indoor' })

      const output = exporter.export()

      expect(output).toContain('temperature{location="indoor"} 25.5')
    })
  })

  describe('Histogram export', () => {
    it('should export histogram in Prometheus format', () => {
      metrics.histogram('request_duration', 0.1)
      metrics.histogram('request_duration', 0.2)

      const output = exporter.export()

      expect(output).toContain('# TYPE request_duration histogram')
      expect(output).toContain('request_duration_sum')
      expect(output).toContain('request_duration_count 2')
    })

    it('should export histogram buckets', () => {
      const buckets = [0.1, 0.5, 1.0]
      metrics.histogram('request_duration', 0.05, undefined, buckets)

      const output = exporter.export()

      expect(output).toContain('request_duration_bucket{le="0.1"} 1')
      expect(output).toContain('request_duration_bucket{le="0.5"} 1')
      expect(output).toContain('request_duration_bucket{le="1"} 1')
      expect(output).toContain('request_duration_bucket{le="+Inf"} 1')
    })

    it('should export histogram with labels and buckets', () => {
      metrics.histogram('request_duration', 0.1, { method: 'GET' })

      const output = exporter.export()

      expect(output).toContain('request_duration_bucket{method="GET",le=')
      expect(output).toContain('request_duration_sum{method="GET"}')
      expect(output).toContain('request_duration_count{method="GET"}')
    })
  })

  describe('HELP comments', () => {
    it('should include HELP comments when description provided', () => {
      metrics.counter('requests_total', 1)
      metrics.setDescription('requests_total', 'Total number of HTTP requests')

      const output = exporter.export()

      expect(output).toContain('# HELP requests_total Total number of HTTP requests')
    })
  })

  describe('HTTP Response', () => {
    it('should return HTTP response with correct content type', () => {
      metrics.counter('requests_total', 1)

      const response = exporter.toResponse()

      expect(response.headers.get('Content-Type')).toBe('text/plain; version=0.0.4; charset=utf-8')
    })

    it('should return 200 status', () => {
      const response = exporter.toResponse()

      expect(response.status).toBe(200)
    })
  })
})

describe('Timer', () => {
  it('should create standalone timer', () => {
    const timer = new Timer()

    expect(timer).toBeDefined()
  })

  it('should measure elapsed time', async () => {
    const timer = new Timer()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const elapsed = timer.elapsed()

    expect(elapsed).toBeGreaterThanOrEqual(45)
    expect(elapsed).toBeLessThan(150)
  })

  it('should allow multiple elapsed calls', async () => {
    const timer = new Timer()
    await new Promise((resolve) => setTimeout(resolve, 20))
    const first = timer.elapsed()
    await new Promise((resolve) => setTimeout(resolve, 20))
    const second = timer.elapsed()

    expect(second).toBeGreaterThan(first)
  })

  it('should reset timer', async () => {
    const timer = new Timer()
    await new Promise((resolve) => setTimeout(resolve, 50))
    timer.reset()
    const elapsed = timer.elapsed()

    expect(elapsed).toBeLessThan(20)
  })
})

describe('WorkerIntegration', () => {
  let metrics: Metrics
  let tracer: Tracer
  let integration: WorkerIntegration

  beforeEach(() => {
    metrics = new Metrics()
    tracer = new Tracer()
    integration = new WorkerIntegration({ metrics, tracer })
  })

  afterEach(() => {
    tracer.reset()
  })

  describe('Request handler wrapper', () => {
    it('should wrap fetch handler', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'))
      const wrappedHandler = integration.wrapHandler(handler)

      const request = new Request('https://example.com/api')
      const response = await wrappedHandler(request, {}, {} as ExecutionContext)

      expect(handler).toHaveBeenCalledWith(request, {}, expect.anything())
      expect(response.status).toBe(200)
    })

    it('should record request metrics', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'))
      const wrappedHandler = integration.wrapHandler(handler)

      const request = new Request('https://example.com/api')
      await wrappedHandler(request, {}, {} as ExecutionContext)

      expect(metrics.getMetricValue('http_requests_total')).toBe(1)
    })

    it('should create request span', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'))
      const wrappedHandler = integration.wrapHandler(handler)

      const request = new Request('https://example.com/api')
      await wrappedHandler(request, {}, {} as ExecutionContext)

      const spans = tracer.getCompletedSpans()
      expect(spans.length).toBeGreaterThan(0)
    })

    it('should handle errors and record them', async () => {
      const error = new Error('Handler error')
      const handler = vi.fn().mockRejectedValue(error)
      const wrappedHandler = integration.wrapHandler(handler)

      const request = new Request('https://example.com/api')

      await expect(wrappedHandler(request, {}, {} as ExecutionContext)).rejects.toThrow(
        'Handler error'
      )
      expect(metrics.getMetricValue('http_errors_total')).toBe(1)
    })
  })

  describe('Metrics endpoint', () => {
    it('should expose /metrics endpoint', async () => {
      metrics.counter('requests_total', 10)

      const request = new Request('https://example.com/metrics')
      const response = await integration.handleMetrics(request)

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('requests_total')
    })
  })

  describe('Configuration', () => {
    it('should allow custom metric prefix', () => {
      integration = new WorkerIntegration({
        metrics,
        tracer,
        prefix: 'myapp_',
      })

      const handler = vi.fn().mockResolvedValue(new Response('OK'))
      const wrappedHandler = integration.wrapHandler(handler)

      const request = new Request('https://example.com/api')
      wrappedHandler(request, {}, {} as ExecutionContext)

      expect(metrics.getMetricValue('myapp_http_requests_total')).toBe(1)
    })
  })
})

describe('Type exports', () => {
  it('should export all required types', () => {
    // Type-checking test - verifies exports compile correctly
    const _tags: Tags = { key: 'value' }
    const _metricValue: MetricValue = { value: 1, tags: _tags }
    const _counter: Counter = { type: 'counter', name: 'test', values: [] }
    const _gauge: Gauge = { type: 'gauge', name: 'test', values: [] }
    const _histogram: Histogram = {
      type: 'histogram',
      name: 'test',
      values: [],
      buckets: [],
      sum: 0,
      count: 0,
    }
    const _spanOptions: SpanOptions = { parent: undefined }
    const _spanContext: SpanContext = { traceId: 'abc', spanId: '123' }
    const _config: ObservabilityConfig = {}

    expect(_tags).toBeDefined()
    expect(_metricValue).toBeDefined()
    expect(_counter).toBeDefined()
    expect(_gauge).toBeDefined()
    expect(_histogram).toBeDefined()
    expect(_spanOptions).toBeDefined()
    expect(_spanContext).toBeDefined()
    expect(_config).toBeDefined()
  })
})
