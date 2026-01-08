/**
 * Tests for ılıl (metrics/m) glyph - Metrics Tracking
 *
 * RED Phase: Define the API contract through failing tests.
 *
 * The ılıl glyph provides metrics tracking with:
 * - Counter: increment/decrement for monotonic counters
 * - Gauge: point-in-time values
 * - Timer: duration measurements
 * - Histogram: value distributions
 * - Summary: percentile calculations
 *
 * Visual metaphor: ılıl looks like a bar chart - metrics visualization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// These imports will fail until implementation exists
// This is expected for RED phase TDD
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Module doesn't exist yet (RED phase)
import { ılıl, m } from '../src/metrics.js'

// Test interfaces
interface Tags {
  [key: string]: string | number | boolean
}

interface MetricData {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'timer'
  value: number
  tags?: Tags
  timestamp: number
}

interface Timer {
  stop(): number
  cancel(): void
}

interface MetricsBackend {
  send(metrics: MetricData[]): Promise<void>
}

describe('ılıl (metrics/m) glyph - Metrics Tracking', () => {
  beforeEach(() => {
    // Reset metrics state between tests
    ılıl.reset?.()
  })

  describe('Counter Operations', () => {
    describe('increment()', () => {
      it('should increment counter by 1 when called with name only', () => {
        ılıl.increment('requests')

        const value = ılıl.getCounter?.('requests')
        expect(value).toBe(1)
      })

      it('should increment counter by specified value', () => {
        ılıl.increment('requests', 5)

        const value = ılıl.getCounter?.('requests')
        expect(value).toBe(5)
      })

      it('should accumulate multiple increments', () => {
        ılıl.increment('requests')
        ılıl.increment('requests')
        ılıl.increment('requests', 3)

        const value = ılıl.getCounter?.('requests')
        expect(value).toBe(5)
      })

      it('should increment counter with tags', () => {
        ılıl.increment('requests', 1, { endpoint: '/api/users' })
        ılıl.increment('requests', 1, { endpoint: '/api/orders' })
        ılıl.increment('requests', 1, { endpoint: '/api/users' })

        const usersValue = ılıl.getCounter?.('requests', { endpoint: '/api/users' })
        const ordersValue = ılıl.getCounter?.('requests', { endpoint: '/api/orders' })

        expect(usersValue).toBe(2)
        expect(ordersValue).toBe(1)
      })

      it('should handle numeric tags', () => {
        ılıl.increment('errors', 1, { code: 500 })
        ılıl.increment('errors', 1, { code: 404 })

        const value500 = ılıl.getCounter?.('errors', { code: 500 })
        const value404 = ılıl.getCounter?.('errors', { code: 404 })

        expect(value500).toBe(1)
        expect(value404).toBe(1)
      })

      it('should handle boolean tags', () => {
        ılıl.increment('cache', 1, { hit: true })
        ılıl.increment('cache', 1, { hit: false })

        const hits = ılıl.getCounter?.('cache', { hit: true })
        const misses = ılıl.getCounter?.('cache', { hit: false })

        expect(hits).toBe(1)
        expect(misses).toBe(1)
      })

      it('should handle dotted metric names', () => {
        ılıl.increment('http.requests.total')

        const value = ılıl.getCounter?.('http.requests.total')
        expect(value).toBe(1)
      })
    })

    describe('decrement()', () => {
      it('should decrement counter by 1', () => {
        ılıl.increment('active_jobs', 5)
        ılıl.decrement('active_jobs')

        const value = ılıl.getCounter?.('active_jobs')
        expect(value).toBe(4)
      })

      it('should decrement counter by specified value', () => {
        ılıl.increment('active_jobs', 10)
        ılıl.decrement('active_jobs', 3)

        const value = ılıl.getCounter?.('active_jobs')
        expect(value).toBe(7)
      })

      it('should allow counter to go negative', () => {
        ılıl.decrement('balance', 5)

        const value = ılıl.getCounter?.('balance')
        expect(value).toBe(-5)
      })

      it('should decrement counter with tags', () => {
        ılıl.increment('connections', 10, { region: 'us-east' })
        ılıl.decrement('connections', 3, { region: 'us-east' })

        const value = ılıl.getCounter?.('connections', { region: 'us-east' })
        expect(value).toBe(7)
      })
    })
  })

  describe('Gauge Operations', () => {
    describe('gauge()', () => {
      it('should set gauge to specified value', () => {
        ılıl.gauge('connections', 42)

        const value = ılıl.getGauge?.('connections')
        expect(value).toBe(42)
      })

      it('should overwrite previous gauge value', () => {
        ılıl.gauge('connections', 42)
        ılıl.gauge('connections', 100)

        const value = ılıl.getGauge?.('connections')
        expect(value).toBe(100)
      })

      it('should set gauge with tags', () => {
        ılıl.gauge('memory_mb', 512, { host: 'server-1' })
        ılıl.gauge('memory_mb', 1024, { host: 'server-2' })

        const server1 = ılıl.getGauge?.('memory_mb', { host: 'server-1' })
        const server2 = ılıl.getGauge?.('memory_mb', { host: 'server-2' })

        expect(server1).toBe(512)
        expect(server2).toBe(1024)
      })

      it('should handle float values', () => {
        ılıl.gauge('cpu_usage', 75.5)

        const value = ılıl.getGauge?.('cpu_usage')
        expect(value).toBe(75.5)
      })

      it('should handle zero values', () => {
        ılıl.gauge('queue_size', 0)

        const value = ılıl.getGauge?.('queue_size')
        expect(value).toBe(0)
      })

      it('should handle negative values', () => {
        ılıl.gauge('temperature', -10)

        const value = ılıl.getGauge?.('temperature')
        expect(value).toBe(-10)
      })
    })
  })

  describe('Timer Operations', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('timer()', () => {
      it('should return a Timer object with stop method', () => {
        const timer = ılıl.timer('request.duration')

        expect(timer).toBeDefined()
        expect(typeof timer.stop).toBe('function')
      })

      it('should return a Timer object with cancel method', () => {
        const timer = ılıl.timer('request.duration')

        expect(typeof timer.cancel).toBe('function')
      })

      it('should measure elapsed time and return duration on stop', () => {
        const timer = ılıl.timer('request.duration')

        vi.advanceTimersByTime(100)

        const duration = timer.stop()

        expect(duration).toBeGreaterThanOrEqual(100)
        expect(duration).toBeLessThan(150) // Allow some tolerance
      })

      it('should record timer value to histogram/summary on stop', () => {
        const timer = ılıl.timer('request.duration')

        vi.advanceTimersByTime(50)
        timer.stop()

        const recorded = ılıl.getTimerValues?.('request.duration')
        expect(recorded).toBeDefined()
        expect(recorded?.length).toBe(1)
        expect(recorded?.[0]).toBeGreaterThanOrEqual(50)
      })

      it('should support tags on timer', () => {
        const timer = ılıl.timer('request.duration', { endpoint: '/api/users' })

        vi.advanceTimersByTime(75)
        timer.stop()

        const recorded = ılıl.getTimerValues?.('request.duration', { endpoint: '/api/users' })
        expect(recorded?.length).toBe(1)
      })

      it('should not record when timer is cancelled', () => {
        const timer = ılıl.timer('request.duration')

        vi.advanceTimersByTime(50)
        timer.cancel()

        const recorded = ılıl.getTimerValues?.('request.duration')
        expect(recorded?.length ?? 0).toBe(0)
      })

      it('should handle multiple concurrent timers', () => {
        const timer1 = ılıl.timer('request.duration')
        vi.advanceTimersByTime(50)

        const timer2 = ılıl.timer('request.duration')
        vi.advanceTimersByTime(50)

        const duration1 = timer1.stop()
        const duration2 = timer2.stop()

        expect(duration1).toBeGreaterThanOrEqual(100)
        expect(duration2).toBeGreaterThanOrEqual(50)
        expect(duration2).toBeLessThan(duration1)
      })
    })

    describe('time()', () => {
      it('should measure duration of sync function', async () => {
        const result = await ılıl.time('sync.operation', () => {
          vi.advanceTimersByTime(25)
          return 'result'
        })

        expect(result).toBe('result')

        const recorded = ılıl.getTimerValues?.('sync.operation')
        expect(recorded?.length).toBe(1)
        expect(recorded?.[0]).toBeGreaterThanOrEqual(25)
      })

      it('should measure duration of async function', async () => {
        const result = await ılıl.time('async.operation', async () => {
          await vi.advanceTimersByTimeAsync(50)
          return { data: 'async result' }
        })

        expect(result).toEqual({ data: 'async result' })

        const recorded = ılıl.getTimerValues?.('async.operation')
        expect(recorded?.length).toBe(1)
      })

      it('should support tags on time()', async () => {
        await ılıl.time('db.query', async () => {
          await vi.advanceTimersByTimeAsync(30)
          return []
        }, { table: 'users' })

        const recorded = ılıl.getTimerValues?.('db.query', { table: 'users' })
        expect(recorded?.length).toBe(1)
      })

      it('should record duration even when function throws', async () => {
        try {
          await ılıl.time('failing.operation', async () => {
            await vi.advanceTimersByTimeAsync(20)
            throw new Error('Operation failed')
          })
        } catch {
          // Expected error
        }

        const recorded = ılıl.getTimerValues?.('failing.operation')
        expect(recorded?.length).toBe(1)
      })

      it('should rethrow function errors', async () => {
        const error = new Error('Test error')

        await expect(
          ılıl.time('error.operation', async () => {
            throw error
          })
        ).rejects.toThrow('Test error')
      })
    })
  })

  describe('Histogram Operations', () => {
    describe('histogram()', () => {
      it('should record value to histogram', () => {
        ılıl.histogram('response.size', 1024)

        const values = ılıl.getHistogramValues?.('response.size')
        expect(values).toContain(1024)
      })

      it('should record multiple values', () => {
        ılıl.histogram('response.size', 512)
        ılıl.histogram('response.size', 1024)
        ılıl.histogram('response.size', 2048)

        const values = ılıl.getHistogramValues?.('response.size')
        expect(values).toHaveLength(3)
        expect(values).toContain(512)
        expect(values).toContain(1024)
        expect(values).toContain(2048)
      })

      it('should record histogram with tags', () => {
        ılıl.histogram('batch.size', 10, { queue: 'email' })
        ılıl.histogram('batch.size', 50, { queue: 'sms' })

        const emailValues = ılıl.getHistogramValues?.('batch.size', { queue: 'email' })
        const smsValues = ılıl.getHistogramValues?.('batch.size', { queue: 'sms' })

        expect(emailValues).toContain(10)
        expect(smsValues).toContain(50)
      })

      it('should handle float values', () => {
        ılıl.histogram('latency.ms', 15.5)

        const values = ılıl.getHistogramValues?.('latency.ms')
        expect(values).toContain(15.5)
      })

      it('should handle zero values', () => {
        ılıl.histogram('empty.responses', 0)

        const values = ılıl.getHistogramValues?.('empty.responses')
        expect(values).toContain(0)
      })
    })
  })

  describe('Summary Operations', () => {
    describe('summary()', () => {
      it('should record value to summary', () => {
        ılıl.summary('request.duration', 100)

        const values = ılıl.getSummaryValues?.('request.duration')
        expect(values).toContain(100)
      })

      it('should record multiple values for percentile calculation', () => {
        // Record values for p50, p90, p99 calculation
        for (let i = 1; i <= 100; i++) {
          ılıl.summary('request.duration', i)
        }

        const values = ılıl.getSummaryValues?.('request.duration')
        expect(values).toHaveLength(100)
      })

      it('should support tags on summary', () => {
        ılıl.summary('request.duration', 50, { endpoint: '/api/users' })

        const values = ılıl.getSummaryValues?.('request.duration', { endpoint: '/api/users' })
        expect(values).toContain(50)
      })

      it('should calculate percentiles', () => {
        // Record 1-100 for easy percentile verification
        for (let i = 1; i <= 100; i++) {
          ılıl.summary('response.time', i)
        }

        const p50 = ılıl.getPercentile?.('response.time', 50)
        const p90 = ılıl.getPercentile?.('response.time', 90)
        const p99 = ılıl.getPercentile?.('response.time', 99)

        expect(p50).toBeCloseTo(50, 0)
        expect(p90).toBeCloseTo(90, 0)
        expect(p99).toBeCloseTo(99, 0)
      })
    })
  })

  describe('Configuration', () => {
    describe('configure()', () => {
      it('should accept prefix option', () => {
        ılıl.configure({ prefix: 'workers_do' })

        ılıl.increment('requests')

        // Metric should be prefixed
        const value = ılıl.getCounter?.('workers_do.requests')
        expect(value).toBe(1)
      })

      it('should accept defaultTags option', () => {
        ılıl.configure({
          defaultTags: { app: 'myapp', env: 'production' },
        })

        ılıl.increment('requests')

        // Default tags should be applied
        const metrics = ılıl.getMetrics?.()
        const requestMetric = metrics?.find((m: MetricData) => m.name === 'requests')

        expect(requestMetric?.tags).toMatchObject({
          app: 'myapp',
          env: 'production',
        })
      })

      it('should merge explicit tags with default tags', () => {
        ılıl.configure({
          defaultTags: { app: 'myapp' },
        })

        ılıl.increment('requests', 1, { endpoint: '/api' })

        const metrics = ılıl.getMetrics?.()
        const requestMetric = metrics?.find((m: MetricData) => m.name === 'requests')

        expect(requestMetric?.tags).toMatchObject({
          app: 'myapp',
          endpoint: '/api',
        })
      })

      it('should allow explicit tags to override default tags', () => {
        ılıl.configure({
          defaultTags: { env: 'production' },
        })

        ılıl.increment('requests', 1, { env: 'staging' })

        const metrics = ılıl.getMetrics?.()
        const requestMetric = metrics?.find((m: MetricData) => m.name === 'requests')

        expect(requestMetric?.tags?.env).toBe('staging')
      })

      it('should accept flushInterval option', () => {
        ılıl.configure({ flushInterval: 10000 })

        expect(ılıl.getConfig?.().flushInterval).toBe(10000)
      })

      it('should accept backend option', () => {
        const mockBackend: MetricsBackend = {
          send: vi.fn(),
        }

        ılıl.configure({ backend: mockBackend })

        expect(ılıl.getConfig?.().backend).toBe(mockBackend)
      })
    })
  })

  describe('Flush Operations', () => {
    describe('flush()', () => {
      it('should return a promise', () => {
        const result = ılıl.flush()

        expect(result).toBeInstanceOf(Promise)
      })

      it('should send metrics to configured backend', async () => {
        const mockBackend: MetricsBackend = {
          send: vi.fn().mockResolvedValue(undefined),
        }

        ılıl.configure({ backend: mockBackend })
        ılıl.increment('requests', 5)

        await ılıl.flush()

        expect(mockBackend.send).toHaveBeenCalled()
        const sentMetrics = (mockBackend.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(sentMetrics).toBeInstanceOf(Array)
      })

      it('should clear metrics after flush', async () => {
        const mockBackend: MetricsBackend = {
          send: vi.fn().mockResolvedValue(undefined),
        }

        ılıl.configure({ backend: mockBackend })
        ılıl.increment('requests', 5)

        await ılıl.flush()

        const value = ılıl.getCounter?.('requests')
        expect(value).toBe(0)
      })

      it('should handle backend errors gracefully', async () => {
        const mockBackend: MetricsBackend = {
          send: vi.fn().mockRejectedValue(new Error('Network error')),
        }

        ılıl.configure({ backend: mockBackend })
        ılıl.increment('requests')

        // Should not throw
        await expect(ılıl.flush()).resolves.not.toThrow()
      })

      it('should work without backend configured (no-op)', async () => {
        ılıl.increment('requests')

        // Should resolve successfully even without backend
        await expect(ılıl.flush()).resolves.not.toThrow()
      })
    })
  })

  describe('Tagged Template Usage', () => {
    it('should increment via tagged template', async () => {
      await ılıl`increment requests`

      const value = ılıl.getCounter?.('requests')
      expect(value).toBe(1)
    })

    it('should increment with value via tagged template', async () => {
      const count = 5
      await ılıl`increment requests ${count}`

      const value = ılıl.getCounter?.('requests')
      expect(value).toBe(5)
    })

    it('should gauge via tagged template', async () => {
      const connections = 42
      await ılıl`gauge connections ${connections}`

      const value = ılıl.getGauge?.('connections')
      expect(value).toBe(42)
    })

    it('should support shorthand syntax', async () => {
      await ılıl`requests++` // Increment
      await ılıl`connections = ${50}` // Gauge

      expect(ılıl.getCounter?.('requests')).toBe(1)
      expect(ılıl.getGauge?.('connections')).toBe(50)
    })
  })

  describe('ASCII Alias - m', () => {
    it('should export m as alias for ılıl', () => {
      expect(m).toBeDefined()
      expect(m).toBe(ılıl)
    })

    it('should work identically via m.increment()', () => {
      m.increment('requests')

      const value = m.getCounter?.('requests')
      expect(value).toBe(1)
    })

    it('should work identically via m.gauge()', () => {
      m.gauge('connections', 100)

      const value = m.getGauge?.('connections')
      expect(value).toBe(100)
    })

    it('should work identically via m.timer()', () => {
      const timer = m.timer('request.duration')

      expect(timer).toBeDefined()
      expect(typeof timer.stop).toBe('function')
    })

    it('should work identically via m.histogram()', () => {
      m.histogram('response.size', 1024)

      const values = m.getHistogramValues?.('response.size')
      expect(values).toContain(1024)
    })

    it('should work identically via m.summary()', () => {
      m.summary('request.duration', 50)

      const values = m.getSummaryValues?.('request.duration')
      expect(values).toContain(50)
    })

    it('should work identically via tagged template', async () => {
      await m`increment api.calls`

      const value = m.getCounter?.('api.calls')
      expect(value).toBe(1)
    })
  })

  describe('Metric Name Validation', () => {
    it('should sanitize metric names with spaces', () => {
      ılıl.increment('my metric name')

      // Should be converted to dots or underscores
      const value = ılıl.getCounter?.('my.metric.name') ?? ılıl.getCounter?.('my_metric_name')
      expect(value).toBe(1)
    })

    it('should handle empty metric name gracefully', () => {
      expect(() => ılıl.increment('')).toThrow()
    })

    it('should handle special characters in metric names', () => {
      ılıl.increment('http/requests')

      // Should sanitize special characters
      const metrics = ılıl.getMetrics?.()
      expect(metrics?.length).toBeGreaterThan(0)
    })
  })

  describe('Thread Safety / Concurrency', () => {
    it('should handle concurrent increments correctly', async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(ılıl.increment('concurrent.counter'))
      )

      await Promise.all(promises)

      const value = ılıl.getCounter?.('concurrent.counter')
      expect(value).toBe(100)
    })

    it('should handle concurrent gauge updates', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(ılıl.gauge('concurrent.gauge', i))
      )

      await Promise.all(promises)

      // Last write wins - value should be one of 0-9
      const value = ılıl.getGauge?.('concurrent.gauge')
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    })
  })

  describe('Reset and Clear', () => {
    it('should reset all metrics', () => {
      ılıl.increment('counter1', 5)
      ılıl.increment('counter2', 10)
      ılıl.gauge('gauge1', 100)

      ılıl.reset?.()

      expect(ılıl.getCounter?.('counter1')).toBe(0)
      expect(ılıl.getCounter?.('counter2')).toBe(0)
      expect(ılıl.getGauge?.('gauge1')).toBeUndefined()
    })

    it('should reset configuration', () => {
      ılıl.configure({ prefix: 'test', defaultTags: { env: 'test' } })

      ılıl.reset?.()

      const config = ılıl.getConfig?.()
      expect(config?.prefix).toBeUndefined()
      expect(config?.defaultTags).toBeUndefined()
    })
  })

  describe('Type Safety', () => {
    it('should infer correct types for counter operations', () => {
      // These should compile without TypeScript errors
      ılıl.increment('typed.counter')
      ılıl.increment('typed.counter', 5)
      ılıl.increment('typed.counter', 1, { tag: 'value' })
      ılıl.decrement('typed.counter')
      ılıl.decrement('typed.counter', 2)
      ılıl.decrement('typed.counter', 1, { tag: 'value' })
    })

    it('should infer correct types for gauge operations', () => {
      ılıl.gauge('typed.gauge', 42)
      ılıl.gauge('typed.gauge', 3.14)
      ılıl.gauge('typed.gauge', -10, { host: 'server' })
    })

    it('should infer correct return type for timer', () => {
      const timer: Timer = ılıl.timer('typed.timer')
      const duration: number = timer.stop()

      expect(typeof duration).toBe('number')
    })

    it('should infer correct return type for time()', async () => {
      const result: string = await ılıl.time('typed.time', () => 'result')
      expect(result).toBe('result')

      const asyncResult: number = await ılıl.time('typed.async', async () => 42)
      expect(asyncResult).toBe(42)
    })
  })

  describe('Integration with Cloudflare', () => {
    it('should have method to get Cloudflare Analytics compatible format', () => {
      ılıl.increment('requests', 1, { endpoint: '/api' })

      const cfFormat = ılıl.toCloudflareFormat?.()

      expect(cfFormat).toBeDefined()
      expect(Array.isArray(cfFormat)).toBe(true)
    })
  })
})

describe('ılıl Type Signatures', () => {
  it('should be callable as tagged template literal', () => {
    // Verify the type signature allows tagged template usage
    const taggedCall = async () => {
      await ılıl`increment test.metric`
    }
    expect(taggedCall).toBeDefined()
  })

  it('should have proper method signatures', () => {
    expect(typeof ılıl.increment).toBe('function')
    expect(typeof ılıl.decrement).toBe('function')
    expect(typeof ılıl.gauge).toBe('function')
    expect(typeof ılıl.timer).toBe('function')
    expect(typeof ılıl.time).toBe('function')
    expect(typeof ılıl.histogram).toBe('function')
    expect(typeof ılıl.summary).toBe('function')
    expect(typeof ılıl.configure).toBe('function')
    expect(typeof ılıl.flush).toBe('function')
  })
})
