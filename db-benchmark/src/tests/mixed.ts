import type { DatabaseAdapter, BenchmarkMetrics } from '../types'
import { ulid } from 'ulid'

/**
 * Mixed Workload Benchmark - Simulates realistic usage patterns
 * 70% reads, 30% writes
 */

export async function runMixedWorkload(adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const ns = 'test/mixed-workload'

  // Operations distribution: 70% reads, 30% writes
  const operations = [
    'get', // 30%
    'get',
    'get',
    'list', // 20%
    'list',
    'search', // 20%
    'search',
    'insert', // 15%
    'insert',
    'update', // 15%
    'update',
  ]

  // Pre-populate some data for reads/updates
  const existingIds: string[] = []
  for (let i = 0; i < 100; i++) {
    const id = ulid()
    existingIds.push(id)
    try {
      await adapter.insert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'mixed-test',
        content: `Mixed workload test content ${i}`,
        data: { index: i },
        ts: new Date(),
        ulid: id,
      })
    } catch (e) {
      // Ignore pre-population errors
    }
  }

  // Warmup
  for (let i = 0; i < 10; i++) {
    const op = operations[i % operations.length]
    try {
      await executeOperation(adapter, op, ns, existingIds)
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure mixed workload
  for (let i = 0; i < iterations; i++) {
    const op = operations[i % operations.length]
    const start = performance.now()
    try {
      await executeOperation(adapter, op, ns, existingIds)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  // Calculate metrics
  const validMeasurements = measurements.filter((m) => m > 0).sort((a, b) => a - b)

  const min = validMeasurements.length > 0 ? validMeasurements[0] : 0
  const max = validMeasurements.length > 0 ? validMeasurements[validMeasurements.length - 1] : 0
  const mean = validMeasurements.length > 0 ? validMeasurements.reduce((a, b) => a + b, 0) / validMeasurements.length : 0

  const p50Index = Math.floor(validMeasurements.length * 0.5)
  const p95Index = Math.floor(validMeasurements.length * 0.95)
  const p99Index = Math.floor(validMeasurements.length * 0.99)

  const median = validMeasurements.length > 0 ? validMeasurements[p50Index] : 0
  const p50 = median
  const p95 = validMeasurements.length > 0 ? validMeasurements[p95Index] : 0
  const p99 = validMeasurements.length > 0 ? validMeasurements[p99Index] : 0

  const throughput = mean > 0 ? 1000 / mean : 0
  const errorRate = (errors / iterations) * 100

  const uniqueErrors = Array.from(new Set(errorMessages)).slice(0, 5)

  return {
    operationName: 'mixed-workload',
    database: adapter.name,
    datasetSize,
    iterations,
    latency: {
      min,
      max,
      mean,
      median,
      p50,
      p95,
      p99,
    },
    throughput,
    errorRate,
    errors: uniqueErrors,
    timestamp: new Date(),
  }
}

async function executeOperation(adapter: DatabaseAdapter, operation: string, ns: string, existingIds: string[]): Promise<void> {
  switch (operation) {
    case 'get': {
      const id = existingIds[Math.floor(Math.random() * existingIds.length)]
      await adapter.get(ns, id)
      break
    }

    case 'list': {
      const limit = 20
      const offset = Math.floor(Math.random() * 50)
      await adapter.list(ns, limit, offset)
      break
    }

    case 'search': {
      const queries = ['test', 'content', 'workload']
      const query = queries[Math.floor(Math.random() * queries.length)]
      await adapter.fullTextSearch(query, 10)
      break
    }

    case 'insert': {
      const id = ulid()
      await adapter.insert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'mixed-test',
        content: `New record ${id}`,
        data: { created: Date.now() },
        ts: new Date(),
        ulid: id,
      })
      // Add to existing IDs for future reads
      existingIds.push(id)
      break
    }

    case 'update': {
      const id = existingIds[Math.floor(Math.random() * existingIds.length)]
      await adapter.update(ns, id, {
        data: { updated: Date.now(), version: Math.random() },
      })
      break
    }

    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}
