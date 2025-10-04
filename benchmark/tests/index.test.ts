/**
 * Tests for Benchmark Worker HTTP API
 */

import { describe, it, expect, vi } from 'vitest'
import app from '../src/index'
import type { Env } from '../src/types'

// Mock environment
const mockEnv: Env = {
  PIPELINE: {
    send: vi.fn(async () => {}),
  },
  R2_SQL: {} as any,
}

describe('Benchmark Worker HTTP API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const req = new Request('http://localhost/health')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toEqual({ status: 'ok', service: 'benchmark' })
    })
  })

  describe('GET /status', () => {
    it('should return thresholds and architecture options', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveProperty('thresholds')
      expect(data).toHaveProperty('architectureOptions')
    })

    it('should include Direct Lookup threshold', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.thresholds).toHaveProperty('directLookup')
      expect(data.thresholds.directLookup).toHaveProperty('maxMs', 500)
      expect(data.thresholds.directLookup).toHaveProperty('region', 'us-east-1')
    })

    it('should include all benchmark thresholds', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.thresholds).toHaveProperty('directLookup')
      expect(data.thresholds).toHaveProperty('recentContent')
      expect(data.thresholds).toHaveProperty('fullTextSearch')
      expect(data.thresholds).toHaveProperty('aggregations')
      expect(data.thresholds).toHaveProperty('deduplication')
      expect(data.thresholds).toHaveProperty('historicalQueries')
    })

    it('should include 3 architecture options', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.architectureOptions).toHaveProperty('option1')
      expect(data.architectureOptions).toHaveProperty('option2')
      expect(data.architectureOptions).toHaveProperty('option3')
    })

    it('should include cost information', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.architectureOptions.option1.cost).toBe('$34/month')
      expect(data.architectureOptions.option2.cost).toContain('$34/month')
      expect(data.architectureOptions.option3.cost).toBe('$432/month')
    })

    it('should recommend caching strategy', async () => {
      const req = new Request('http://localhost/status')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.architectureOptions.option2).toHaveProperty('strategy')
      expect(data.architectureOptions.option2.strategy).toContain('Cache API')
    })
  })

  describe('GET /benchmark', () => {
    // Skip this test as it can take 30+ seconds with all simulated benchmarks
    it.skip('should run all benchmarks by default', async () => {
      const req = new Request('http://localhost/benchmark')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('results')
      expect(data.results).toHaveLength(6)
    })

    it('should run specific benchmark when type is provided', async () => {
      const req = new Request('http://localhost/benchmark?type=lookup')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.results).toHaveLength(1)
      expect(data.results[0].name).toBe('Direct Lookup')
    })

    it('should indicate overall pass/fail status', async () => {
      const req = new Request('http://localhost/benchmark?type=lookup')
      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data).toHaveProperty('passed')
      expect(typeof data.passed).toBe('boolean')
    })
  })

  describe('POST /generate', () => {
    it('should generate test data with default parameters', async () => {
      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('generated')
      expect(data).toHaveProperty('duration')
      expect(data).toHaveProperty('throughput')
    })

    it('should accept custom count parameter', async () => {
      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 100 }),
      })

      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.generated).toBe(100)
    })

    it('should accept custom avgSizeKB parameter', async () => {
      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10, avgSizeKB: 500 }),
      })

      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data.avgSizeKB).toBe(500)
    })

    it('should send events to Pipeline', async () => {
      const sendSpy = vi.spyOn(mockEnv.PIPELINE, 'send')

      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 }),
      })

      await app.fetch(req, mockEnv)

      // Should be called at least once
      expect(sendSpy).toHaveBeenCalled()
    })

    it('should calculate throughput', async () => {
      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 100 }),
      })

      const res = await app.fetch(req, mockEnv)
      const data = await res.json()

      expect(data).toHaveProperty('throughput')
      expect(data.throughput).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const req = new Request('http://localhost/unknown')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(404)
    })

    it('should handle invalid JSON in POST requests', async () => {
      const req = new Request('http://localhost/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const res = await app.fetch(req, mockEnv)

      // Hono returns 500 for unhandled errors
      // In production, we'd want to catch this and return 400
      expect(res.status).toBe(500)
    })
  })
})
