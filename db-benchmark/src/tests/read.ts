import type { DatabaseAdapter, BenchmarkMetrics, BenchmarkTest } from '../types'

/**
 * Read Benchmarks - Test database read performance
 */

/**
 * Benchmark: Get single item by ID
 */
export const benchmarkGet: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  // Pick random IDs to fetch
  const ns = 'test/namespace-0'
  const idsToFetch: string[] = []

  for (let i = 0; i < iterations; i++) {
    const randomIndex = Math.floor(Math.random() * datasetSize)
    const randomId = `test-id-${randomIndex}`
    idsToFetch.push(randomId)
  }

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    try {
      await adapter.get(ns, idsToFetch[i])
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.get(ns, idsToFetch[i])
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0) // Failed operation
    }
  }

  return calculateMetrics('get', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: List items with pagination
 */
export const benchmarkList: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const ns = 'test/namespace-0'
  const limit = 20
  const maxOffset = Math.max(0, Math.floor(datasetSize / 10) - limit) // Don't go beyond dataset

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.list(ns, limit, 0)
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const offset = Math.floor(Math.random() * maxOffset)
    const start = performance.now()
    try {
      await adapter.list(ns, limit, offset)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('list', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Count items in namespace
 */
export const benchmarkCount: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const namespaces = Array.from({ length: 10 }, (_, i) => `test/namespace-${i}`)

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.count(namespaces[0])
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const ns = namespaces[i % namespaces.length]
    const start = performance.now()
    try {
      await adapter.count(ns)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('count', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Aggregate by field (group by type)
 */
export const benchmarkAggregate: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const namespaces = Array.from({ length: 10 }, (_, i) => `test/namespace-${i}`)

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.aggregate(namespaces[0], 'type')
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const ns = namespaces[i % namespaces.length]
    const start = performance.now()
    try {
      await adapter.aggregate(ns, 'type')
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('aggregate', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Run all read benchmarks
 */
export async function runReadBenchmarks(adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics[]> {
  console.log(`Running read benchmarks for ${adapter.name} with ${datasetSize} records...`)

  const metrics: BenchmarkMetrics[] = []

  metrics.push(await benchmarkGet(adapter, datasetSize, iterations))
  metrics.push(await benchmarkList(adapter, datasetSize, iterations))
  metrics.push(await benchmarkCount(adapter, datasetSize, iterations))
  metrics.push(await benchmarkAggregate(adapter, datasetSize, iterations))

  return metrics
}

/**
 * Calculate metrics from measurements
 */
function calculateMetrics(
  operationName: string,
  database: string,
  datasetSize: number,
  iterations: number,
  measurements: number[],
  errors: number,
  errorMessages: string[]
): BenchmarkMetrics {
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

  const throughput = mean > 0 ? 1000 / mean : 0 // operations per second
  const errorRate = (errors / iterations) * 100

  // Deduplicate error messages
  const uniqueErrors = Array.from(new Set(errorMessages)).slice(0, 5)

  return {
    operationName,
    database,
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
