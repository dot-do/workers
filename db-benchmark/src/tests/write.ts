import type { DatabaseAdapter, BenchmarkMetrics, BenchmarkTest, Thing } from '../types'
import { ulid } from 'ulid'

/**
 * Write Benchmarks - Test database write performance
 */

/**
 * Benchmark: Insert single record
 */
export const benchmarkInsert: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  // Generate test things to insert
  const thingsToInsert: Thing[] = []
  for (let i = 0; i < iterations; i++) {
    const id = ulid()
    const ns = `test/write-benchmark-${i % 10}`
    thingsToInsert.push({
      id: `https://${ns}/${id}`,
      ns,
      type: 'test-insert',
      content: `Write benchmark test content ${i}`,
      data: { index: i, benchmark: 'insert' },
      meta: { created: new Date().toISOString() },
      embeddings: Array(768).fill(0).map(() => Math.random()),
      ts: new Date(),
      ulid: id,
    })
  }

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.insert(thingsToInsert[i])
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.insert(thingsToInsert[i])
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('insert', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Batch insert (100 records at a time)
 */
export const benchmarkBatchInsert: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const batchSize = 100

  // Warmup
  const warmupBatch: Thing[] = []
  for (let i = 0; i < batchSize; i++) {
    const id = ulid()
    const ns = 'test/write-benchmark-warmup'
    warmupBatch.push({
      id: `https://${ns}/${id}`,
      ns,
      type: 'test-batch',
      content: `Warmup batch content ${i}`,
      data: { index: i },
      ts: new Date(),
      ulid: id,
    })
  }
  try {
    await adapter.batchInsert(warmupBatch)
  } catch (e) {
    // Ignore warmup errors
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const batch: Thing[] = []
    for (let j = 0; j < batchSize; j++) {
      const id = ulid()
      const ns = `test/write-benchmark-${i % 10}`
      batch.push({
        id: `https://${ns}/${id}`,
        ns,
        type: 'test-batch',
        content: `Batch insert test content ${i}-${j}`,
        data: { batchIndex: i, itemIndex: j },
        ts: new Date(),
        ulid: id,
      })
    }

    const start = performance.now()
    try {
      await adapter.batchInsert(batch)
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('batch-insert', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Update single record
 */
export const benchmarkUpdate: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  // Pre-insert some records to update
  const ns = 'test/update-benchmark'
  const idsToUpdate: string[] = []

  for (let i = 0; i < iterations; i++) {
    const id = ulid()
    idsToUpdate.push(id)
    try {
      await adapter.insert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'test-update',
        content: `Original content ${i}`,
        data: { version: 1 },
        ts: new Date(),
        ulid: id,
      })
    } catch (e) {
      // Ignore insert errors
    }
  }

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.update(ns, idsToUpdate[i], {
        content: 'Warmup update',
        data: { version: 2 },
      })
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.update(ns, idsToUpdate[i], {
        content: `Updated content ${i}`,
        data: { version: i + 2, updated: true },
      })
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('update', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Upsert (insert or update)
 */
export const benchmarkUpsert: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  const ns = 'test/upsert-benchmark'
  const id = ulid()

  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.upsert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'test-upsert',
        content: 'Warmup upsert',
        data: { version: i },
        ts: new Date(),
        ulid: id,
      })
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure (keep upserting same record)
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.upsert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'test-upsert',
        content: `Upserted content ${i}`,
        data: { version: i, timestamp: Date.now() },
        ts: new Date(),
        ulid: id,
      })
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('upsert', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Benchmark: Delete single record
 */
export const benchmarkDelete: BenchmarkTest = async (adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics> => {
  const measurements: number[] = []
  let errors = 0
  const errorMessages: string[] = []

  // Pre-insert records to delete
  const ns = 'test/delete-benchmark'
  const idsToDelete: string[] = []

  for (let i = 0; i < iterations; i++) {
    const id = ulid()
    idsToDelete.push(id)
    try {
      await adapter.insert({
        id: `https://${ns}/${id}`,
        ns,
        type: 'test-delete',
        content: `To be deleted ${i}`,
        ts: new Date(),
        ulid: id,
      })
    } catch (e) {
      // Ignore insert errors
    }
  }

  // Warmup (delete first few)
  for (let i = 0; i < Math.min(5, iterations); i++) {
    try {
      await adapter.delete(ns, idsToDelete[i])
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Measure
  const startIndex = Math.min(5, iterations)
  for (let i = startIndex; i < iterations; i++) {
    const start = performance.now()
    try {
      await adapter.delete(ns, idsToDelete[i])
      const duration = performance.now() - start
      measurements.push(duration)
    } catch (e: any) {
      errors++
      errorMessages.push(e.message)
      measurements.push(0)
    }
  }

  return calculateMetrics('delete', adapter.name, datasetSize, iterations, measurements, errors, errorMessages)
}

/**
 * Run all write benchmarks
 */
export async function runWriteBenchmarks(adapter: DatabaseAdapter, datasetSize: number, iterations: number): Promise<BenchmarkMetrics[]> {
  console.log(`Running write benchmarks for ${adapter.name} with ${datasetSize} existing records...`)

  const metrics: BenchmarkMetrics[] = []

  metrics.push(await benchmarkInsert(adapter, datasetSize, iterations))
  metrics.push(await benchmarkBatchInsert(adapter, datasetSize, Math.min(10, iterations))) // Fewer iterations for batch
  metrics.push(await benchmarkUpdate(adapter, datasetSize, iterations))
  metrics.push(await benchmarkUpsert(adapter, datasetSize, iterations))
  metrics.push(await benchmarkDelete(adapter, datasetSize, iterations))

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
