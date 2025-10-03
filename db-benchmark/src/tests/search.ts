import type { DatabaseAdapter, BenchmarkMetrics, BenchmarkTest } from '../types'

/**
 * Search Benchmarks - Test full-text and vector search performance
 */

/**
 * Benchmark: Full-text search
 */
export const benchmarkFullTextSearch: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  // Common search queries
  const queries = ['test', 'content', 'searchable', 'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing']

  const limit = 10

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.fullTextSearch(queries[0], limit)
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length]
    const start = performance.now()
    try {
      await adapter.fullTextSearch(query, limit)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('full-text-search', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Vector similarity search
 */
export const benchmarkVectorSearch: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const limit = 10

  // Generate random query embeddings
  const queryEmbeddings: number[][] = []
  for (let i = 0; i < iterations; i++) {
    const embedding: number[] = []
    for (let j = 0; j < 768; j++) {
      embedding.push(Math.random() * 2 - 1)
    }
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    queryEmbeddings.push(embedding.map((val) => val / magnitude))
  }

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.vectorSearch(queryEmbeddings[i], limit)
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.vectorSearch(queryEmbeddings[i], limit)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('vector-search', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Hybrid search (full-text + vector)
 */
export const benchmarkHybridSearch: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const queries = ['test', 'content', 'searchable', 'lorem', 'ipsum']
  const limit = 10

  // Generate query embeddings
  const queryEmbeddings: number[][] = []
  for (let i = 0; i < iterations; i++) {
    const embedding: number[] = []
    for (let j = 0; j < 768; j++) {
      embedding.push(Math.random() * 2 - 1)
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    queryEmbeddings.push(embedding.map((val) => val / magnitude))
  }

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.hybridSearch(queries[0], queryEmbeddings[i], limit)
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length]
    const start = performance.now()
    try {
      await adapter.hybridSearch(query, queryEmbeddings[i], limit)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('hybrid-search', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Run all search benchmarks
 */
export async function runSearchBenchmarks(adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics[]> {
  console.log(`Running search benchmarks for ${adapter.name} with ${datasetSize} records...`)

  const metrics: BenchmarkMetrics[] = []

  metrics.push(await benchmarkFullTextSearch(adapter, datasetSize, iterations))
  metrics.push(await benchmarkVectorSearch(adapter, datasetSize, iterations))
  metrics.push(await benchmarkHybridSearch(adapter, datasetSize, iterations))

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

  const throughput = mean > 0 ? 1000 / mean : 0
  const errorRate = (errors / iterations) * 100

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
