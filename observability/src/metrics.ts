import type { Env, MetricData, MetricBatch, Resource } from './types'

/**
 * Metrics collector for Analytics Engine
 */
export class MetricsCollector {
  private buffer: MetricData[] = []
  private flushInterval: number = 10000 // 10 seconds
  private lastFlush: number = Date.now()

  constructor(
    private env: Env,
    private resource: Resource
  ) {}

  /**
   * Record a counter metric (monotonically increasing)
   */
  counter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.buffer.push({
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      labels: { ...labels, service: this.resource.serviceName },
    })
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.buffer.push({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      labels: { ...labels, service: this.resource.serviceName },
    })
  }

  /**
   * Record a histogram value (for distributions)
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.buffer.push({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      labels: { ...labels, service: this.resource.serviceName },
    })
  }

  /**
   * Record request duration
   */
  recordRequestDuration(durationMs: number, method: string, path: string, status: number, labels?: Record<string, string>): void {
    this.histogram('http_request_duration_ms', durationMs, {
      method,
      path,
      status: status.toString(),
      ...labels,
    })
  }

  /**
   * Record request count
   */
  recordRequest(method: string, path: string, status: number, labels?: Record<string, string>): void {
    this.counter('http_requests_total', 1, {
      method,
      path,
      status: status.toString(),
      ...labels,
    })
  }

  /**
   * Record error
   */
  recordError(error: string, labels?: Record<string, string>): void {
    this.counter('errors_total', 1, {
      error,
      ...labels,
    })
  }

  /**
   * Flush metrics to Analytics Engine
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const batch = [...this.buffer]
    this.buffer = []
    this.lastFlush = Date.now()

    // Write to Analytics Engine
    for (const metric of batch) {
      const labels = metric.labels || {}
      const labelKeys = Object.keys(labels).sort()
      const labelValues = labelKeys.map((k) => labels[k])

      this.env.METRICS.writeDataPoint({
        blobs: [metric.name, metric.type, ...labelValues],
        doubles: [metric.value, metric.timestamp || Date.now()],
        indexes: [metric.name, metric.type, this.resource.serviceName],
      })
    }
  }

  /**
   * Auto-flush if enough time has passed
   */
  async autoFlush(): Promise<void> {
    if (Date.now() - this.lastFlush > this.flushInterval) {
      await this.flush()
    }
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.length
  }
}

/**
 * Standard metrics for Worker requests
 */
export class WorkerMetrics {
  constructor(private collector: MetricsCollector) {}

  /**
   * Measure and record a request
   */
  async measureRequest<T>(
    method: string,
    path: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<{ result: T; status: number }> {
    const startTime = Date.now()
    let status = 200

    try {
      const result = await fn()
      return { result, status }
    } catch (error) {
      status = 500
      this.collector.recordError(error instanceof Error ? error.message : 'unknown_error', labels)
      throw error
    } finally {
      const duration = Date.now() - startTime
      this.collector.recordRequestDuration(duration, method, path, status, labels)
      this.collector.recordRequest(method, path, status, labels)
      await this.collector.autoFlush()
    }
  }

  /**
   * Record RPC call metrics
   */
  async measureRpcCall<T>(
    service: string,
    method: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      this.collector.histogram('rpc_call_duration_ms', duration, {
        target_service: service,
        method,
        status: 'success',
        ...labels,
      })
      this.collector.counter('rpc_calls_total', 1, {
        target_service: service,
        method,
        status: 'success',
        ...labels,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.collector.histogram('rpc_call_duration_ms', duration, {
        target_service: service,
        method,
        status: 'error',
        ...labels,
      })
      this.collector.counter('rpc_calls_total', 1, {
        target_service: service,
        method,
        status: 'error',
        ...labels,
      })
      this.collector.recordError(error instanceof Error ? error.message : 'rpc_error', {
        target_service: service,
        method,
        ...labels,
      })

      throw error
    } finally {
      await this.collector.autoFlush()
    }
  }

  /**
   * Record custom business metric
   */
  recordBusinessMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.collector.gauge(`business_${name}`, value, labels)
  }
}
