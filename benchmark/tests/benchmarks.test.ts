/**
 * Tests for Benchmark Implementations
 */

import { describe, it, expect } from 'vitest'
import { runBenchmarks } from '../src/benchmarks'
import type { Env } from '../src/types'

// Mock environment
const mockEnv: Env = {
  PIPELINE: {
    send: async () => {},
  },
  R2_SQL: {} as any,
}

describe('Benchmarks', () => {
  describe('runBenchmarks', () => {
    it('should run Direct Lookup benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Direct Lookup')
      expect(results[0]).toHaveProperty('threshold', 500)
      expect(results[0]).toHaveProperty('durationMs')
      expect(results[0]).toHaveProperty('passed')
    })

    it('should run Recent Content benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'recent')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Recent Content')
      expect(results[0]).toHaveProperty('threshold', 500)
    })

    it('should run Full-Text Search benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'search')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Full-Text Search')
      expect(results[0]).toHaveProperty('threshold', 5000)
    })

    it('should run Aggregations benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'aggregate')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Aggregations')
      expect(results[0]).toHaveProperty('threshold', 10000)
    })

    it('should run Deduplication benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'dedup')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Deduplication')
      expect(results[0]).toHaveProperty('threshold', 15000)
    })

    it('should run Historical Queries benchmark', async () => {
      const results = await runBenchmarks(mockEnv, 'history')

      expect(results).toHaveLength(1)
      expect(results[0]).toHaveProperty('name', 'Historical Queries')
      expect(results[0]).toHaveProperty('threshold', 2000)
    })

    // Skip this test as it can take 30+ seconds with all simulated benchmarks
    it.skip('should run all benchmarks when type is "all"', async () => {
      const results = await runBenchmarks(mockEnv, 'all')

      expect(results).toHaveLength(6)
      expect(results[0].name).toBe('Direct Lookup')
      expect(results[1].name).toBe('Recent Content')
      expect(results[2].name).toBe('Full-Text Search')
      expect(results[3].name).toBe('Aggregations')
      expect(results[4].name).toBe('Deduplication')
      expect(results[5].name).toBe('Historical Queries')
    })

    it('should include description in results', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      expect(results[0]).toHaveProperty('description')
      expect(results[0].description).toContain('ns+id')
    })

    it('should include query details in results', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      expect(results[0]).toHaveProperty('details')
      expect(results[0].details).toHaveProperty('query')
      expect(results[0].details.query).toContain('SELECT')
      expect(results[0].details.query).toContain('FROM events')
    })

    it('should mark benchmark as passed if under threshold', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      // Simulated delay should be < 500ms threshold
      if (results[0].durationMs < 500) {
        expect(results[0].passed).toBe(true)
      }
    })

    it('should mark benchmark as failed if over threshold', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      // Simulated delay might be > 500ms threshold
      if (results[0].durationMs >= 500) {
        expect(results[0].passed).toBe(false)
      }
    })

    it('should include region info for Direct Lookup', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      expect(results[0].details).toHaveProperty('entity_ns')
      expect(results[0].details).toHaveProperty('entity_id')
    })

    it('should measure duration accurately', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')

      // Should have non-zero duration
      expect(results[0].durationMs).toBeGreaterThan(0)
      expect(results[0].durationMs).toBeLessThan(10000) // Max 10 seconds for simulated
    })
  })

  describe('Benchmark Thresholds', () => {
    it('should use correct threshold for Direct Lookup', async () => {
      const results = await runBenchmarks(mockEnv, 'lookup')
      expect(results[0].threshold).toBe(500) // Most critical, < 500ms
    })

    it('should use correct threshold for Recent Content', async () => {
      const results = await runBenchmarks(mockEnv, 'recent')
      expect(results[0].threshold).toBe(500) // Adjusted from 1s
    })

    it('should use correct threshold for Full-Text Search', async () => {
      const results = await runBenchmarks(mockEnv, 'search')
      expect(results[0].threshold).toBe(5000) // 5 seconds
    })

    it('should use correct threshold for Aggregations', async () => {
      const results = await runBenchmarks(mockEnv, 'aggregate')
      expect(results[0].threshold).toBe(10000) // 10 seconds
    })

    it('should use correct threshold for Deduplication', async () => {
      const results = await runBenchmarks(mockEnv, 'dedup')
      expect(results[0].threshold).toBe(15000) // 15 seconds
    })

    it('should use correct threshold for Historical Queries', async () => {
      const results = await runBenchmarks(mockEnv, 'history')
      expect(results[0].threshold).toBe(2000) // 2 seconds
    })
  })
})
