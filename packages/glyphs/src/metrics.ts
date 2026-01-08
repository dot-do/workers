/**
 * ılıl (metrics/m) glyph - Metrics Tracking
 *
 * A visual programming glyph for metrics tracking with:
 * - Counter: increment/decrement for monotonic counters
 * - Gauge: point-in-time values
 * - Timer: duration measurements
 * - Histogram: value distributions
 * - Summary: percentile calculations
 *
 * Visual metaphor: ılıl looks like a bar chart - metrics visualization.
 *
 * Usage:
 * - Counter: ılıl.increment('requests') or m.increment('requests')
 * - Gauge: ılıl.gauge('connections', 42)
 * - Timer: const timer = ılıl.timer('duration'); timer.stop()
 * - Histogram: ılıl.histogram('size', bytes)
 * - Tagged template: ılıl`increment requests`
 *
 * ASCII alias: m
 */

// ============================================================================
// Types
// ============================================================================

export interface Tags {
  [key: string]: string | number | boolean
}

export interface MetricData {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'timer'
  value: number
  tags?: Tags
  timestamp: number
}

export interface Timer {
  stop(): number
  cancel(): void
}

export interface MetricsBackend {
  send(metrics: MetricData[]): Promise<void>
}

export interface MetricsOptions {
  prefix?: string
  defaultTags?: Tags
  flushInterval?: number
  backend?: MetricsBackend
}

export interface MetricsConfig {
  prefix?: string
  defaultTags?: Tags
  flushInterval?: number
  backend?: MetricsBackend
}

export interface MetricsClient {
  // Counter operations
  increment(name: string, value?: number, tags?: Tags): void
  decrement(name: string, value?: number, tags?: Tags): void

  // Gauge operations
  gauge(name: string, value: number, tags?: Tags): void

  // Timer operations
  timer(name: string, tags?: Tags): Timer
  time<T>(name: string, fn: () => T | Promise<T>, tags?: Tags): Promise<T>

  // Histogram operations
  histogram(name: string, value: number, tags?: Tags): void

  // Summary operations
  summary(name: string, value: number, tags?: Tags): void

  // Configuration
  configure(options: MetricsOptions): void
  getConfig(): MetricsConfig

  // Flush to backend
  flush(): Promise<void>

  // Getters for testing
  getCounter(name: string, tags?: Tags): number
  getGauge(name: string, tags?: Tags): number | undefined
  getTimerValues(name: string, tags?: Tags): number[]
  getHistogramValues(name: string, tags?: Tags): number[]
  getSummaryValues(name: string, tags?: Tags): number[]
  getPercentile(name: string, percentile: number, tags?: Tags): number
  getMetrics(): MetricData[]

  // Cloudflare integration
  toCloudflareFormat(): unknown[]

  // Reset
  reset(): void

  // Tagged template support
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<void>
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a tag key for storing metrics with tags
 */
function createTagKey(name: string, tags?: Tags): string {
  if (!tags || Object.keys(tags).length === 0) {
    return name
  }
  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(tags).sort()
  const tagStr = sortedKeys.map(k => `${k}=${tags[k]}`).join(',')
  return `${name}|${tagStr}`
}

/**
 * Sanitize metric name (replace spaces and special chars)
 */
function sanitizeName(name: string): string {
  if (!name || name.trim() === '') {
    throw new Error('Metric name cannot be empty')
  }
  // Replace spaces with dots, remove other special characters except dots and underscores
  return name
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Get the current timestamp using high-resolution timing
 */
function now(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now()
  }
  return Date.now()
}

/**
 * Create the metrics client implementation
 */
function createMetricsClient(): MetricsClient {
  // Storage for different metric types
  let counters = new Map<string, number>()
  let gauges = new Map<string, number>()
  let timerValues = new Map<string, number[]>()
  let histogramValues = new Map<string, number[]>()
  let summaryValues = new Map<string, number[]>()
  let metrics: MetricData[] = []

  // Configuration
  let config: MetricsConfig = {}

  /**
   * Apply prefix to metric name if configured
   */
  function applyPrefix(name: string): string {
    if (config.prefix) {
      return `${config.prefix}.${name}`
    }
    return name
  }

  /**
   * Merge default tags with explicit tags
   */
  function mergeTags(explicitTags?: Tags): Tags | undefined {
    if (!config.defaultTags && !explicitTags) {
      return undefined
    }
    return { ...config.defaultTags, ...explicitTags }
  }

  /**
   * Record a metric data point
   */
  function recordMetric(
    name: string,
    type: MetricData['type'],
    value: number,
    tags?: Tags
  ): void {
    const mergedTags = mergeTags(tags)
    metrics.push({
      name: sanitizeName(name),
      type,
      value,
      tags: mergedTags,
      timestamp: Date.now(),
    })
  }

  // Create the base function for tagged template support
  const client = async function (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<void> {
    // Build the command string
    let command = ''
    for (let i = 0; i < strings.length; i++) {
      command += strings[i]
      if (i < values.length) {
        command += String(values[i])
      }
    }
    command = command.trim()

    // Parse the command
    // Formats:
    // - "increment <name>" or "increment <name> <value>"
    // - "gauge <name> <value>"
    // - "<name>++" (increment shorthand)
    // - "<name> = <value>" (gauge shorthand)

    // Shorthand: name++
    const incrementMatch = command.match(/^(\S+)\+\+$/)
    if (incrementMatch) {
      client.increment(incrementMatch[1])
      return
    }

    // Shorthand: name = value
    const gaugeMatch = command.match(/^(\S+)\s*=\s*(\d+(?:\.\d+)?)$/)
    if (gaugeMatch) {
      client.gauge(gaugeMatch[1], parseFloat(gaugeMatch[2]))
      return
    }

    // Full command format
    const parts = command.split(/\s+/)
    const action = parts[0]?.toLowerCase()
    const name = parts[1]
    const value = parts[2] ? parseFloat(parts[2]) : undefined

    if (action === 'increment') {
      client.increment(name, value)
    } else if (action === 'gauge' && value !== undefined) {
      client.gauge(name, value)
    } else if (action === 'histogram' && value !== undefined) {
      client.histogram(name, value)
    } else if (action === 'summary' && value !== undefined) {
      client.summary(name, value)
    }
  } as MetricsClient

  // ============================================================================
  // Counter Operations
  // ============================================================================

  client.increment = (name: string, value = 1, tags?: Tags): void => {
    const sanitized = sanitizeName(name)
    const prefixed = applyPrefix(sanitized)
    const key = createTagKey(prefixed, tags)
    const current = counters.get(key) ?? 0
    counters.set(key, current + value)
    recordMetric(prefixed, 'counter', current + value, tags)
  }

  client.decrement = (name: string, value = 1, tags?: Tags): void => {
    const sanitized = sanitizeName(name)
    const prefixed = applyPrefix(sanitized)
    const key = createTagKey(prefixed, tags)
    const current = counters.get(key) ?? 0
    counters.set(key, current - value)
    recordMetric(prefixed, 'counter', current - value, tags)
  }

  // ============================================================================
  // Gauge Operations
  // ============================================================================

  client.gauge = (name: string, value: number, tags?: Tags): void => {
    const sanitized = sanitizeName(name)
    const prefixed = applyPrefix(sanitized)
    const key = createTagKey(prefixed, tags)
    gauges.set(key, value)
    recordMetric(prefixed, 'gauge', value, tags)
  }

  // ============================================================================
  // Timer Operations
  // ============================================================================

  client.timer = (name: string, tags?: Tags): Timer => {
    const startTime = now()
    let cancelled = false

    return {
      stop(): number {
        if (cancelled) {
          return 0
        }
        const duration = now() - startTime
        const sanitized = sanitizeName(name)
        const prefixed = applyPrefix(sanitized)
        const key = createTagKey(prefixed, tags)
        const existing = timerValues.get(key) ?? []
        existing.push(duration)
        timerValues.set(key, existing)
        recordMetric(prefixed, 'timer', duration, tags)
        return duration
      },
      cancel(): void {
        cancelled = true
      },
    }
  }

  client.time = async <T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Tags
  ): Promise<T> => {
    const timer = client.timer(name, tags)
    try {
      const result = await fn()
      timer.stop()
      return result
    } catch (error) {
      timer.stop()
      throw error
    }
  }

  // ============================================================================
  // Histogram Operations
  // ============================================================================

  client.histogram = (name: string, value: number, tags?: Tags): void => {
    const sanitized = sanitizeName(name)
    const prefixed = applyPrefix(sanitized)
    const key = createTagKey(prefixed, tags)
    const existing = histogramValues.get(key) ?? []
    existing.push(value)
    histogramValues.set(key, existing)
    recordMetric(prefixed, 'histogram', value, tags)
  }

  // ============================================================================
  // Summary Operations
  // ============================================================================

  client.summary = (name: string, value: number, tags?: Tags): void => {
    const sanitized = sanitizeName(name)
    const prefixed = applyPrefix(sanitized)
    const key = createTagKey(prefixed, tags)
    const existing = summaryValues.get(key) ?? []
    existing.push(value)
    summaryValues.set(key, existing)
    recordMetric(prefixed, 'summary', value, tags)
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  client.configure = (options: MetricsOptions): void => {
    config = { ...config, ...options }
  }

  client.getConfig = (): MetricsConfig => {
    return { ...config }
  }

  // ============================================================================
  // Flush Operations
  // ============================================================================

  client.flush = async (): Promise<void> => {
    if (config.backend) {
      try {
        await config.backend.send([...metrics])
      } catch {
        // Handle backend errors gracefully
      }
    }
    // Clear metrics after flush
    counters.clear()
    gauges.clear()
    timerValues.clear()
    histogramValues.clear()
    summaryValues.clear()
    metrics = []
  }

  // ============================================================================
  // Getters (for testing)
  // ============================================================================

  client.getCounter = (name: string, tags?: Tags): number => {
    const sanitized = sanitizeName(name)
    const key = createTagKey(sanitized, tags)
    return counters.get(key) ?? 0
  }

  client.getGauge = (name: string, tags?: Tags): number | undefined => {
    const sanitized = sanitizeName(name)
    const key = createTagKey(sanitized, tags)
    return gauges.get(key)
  }

  client.getTimerValues = (name: string, tags?: Tags): number[] => {
    const sanitized = sanitizeName(name)
    const key = createTagKey(sanitized, tags)
    return timerValues.get(key) ?? []
  }

  client.getHistogramValues = (name: string, tags?: Tags): number[] => {
    const sanitized = sanitizeName(name)
    const key = createTagKey(sanitized, tags)
    return histogramValues.get(key) ?? []
  }

  client.getSummaryValues = (name: string, tags?: Tags): number[] => {
    const sanitized = sanitizeName(name)
    const key = createTagKey(sanitized, tags)
    return summaryValues.get(key) ?? []
  }

  client.getPercentile = (
    name: string,
    percentile: number,
    tags?: Tags
  ): number => {
    const values = client.getSummaryValues(name, tags)
    if (values.length === 0) {
      return 0
    }
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  client.getMetrics = (): MetricData[] => {
    return [...metrics]
  }

  // ============================================================================
  // Cloudflare Integration
  // ============================================================================

  client.toCloudflareFormat = (): unknown[] => {
    return metrics.map((m) => ({
      blob1: m.name,
      blob2: m.type,
      double1: m.value,
      ...m.tags,
    }))
  }

  // ============================================================================
  // Reset
  // ============================================================================

  client.reset = (): void => {
    counters = new Map()
    gauges = new Map()
    timerValues = new Map()
    histogramValues = new Map()
    summaryValues = new Map()
    metrics = []
    config = {}
  }

  return client
}

// ============================================================================
// Exports
// ============================================================================

/**
 * ılıl - Visual glyph for metrics tracking
 *
 * The bar chart pattern represents data visualization and metrics.
 */
export const ılıl: MetricsClient = createMetricsClient()

/**
 * m - ASCII alias for ılıl
 *
 * For developers who prefer or need ASCII identifiers.
 */
export const m: MetricsClient = ılıl
