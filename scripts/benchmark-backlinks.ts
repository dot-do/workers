#!/usr/bin/env tsx
/**
 * Backlink Query Benchmark Suite
 *
 * Compares performance of backlink queries across different database backends:
 * - D1 (SQLite)
 * - R2 SQL (Apache Iceberg + Parquet)
 * - ClickHouse (Workers Analytics Engine)
 *
 * Query Pattern:
 * SELECT fromNs, fromId, fromType, predicate, data
 * FROM relationships
 * WHERE toNs = ? AND toId = ?
 * ORDER BY fromNs, fromId
 * LIMIT 1000
 *
 * Metrics:
 * - Cold start latency (first query)
 * - Warm cache latency (subsequent queries)
 * - Min, Max, Avg, P50, P95, P99
 * - Throughput (queries per second)
 *
 * Usage:
 *   # Benchmark D1 only
 *   pnpm tsx scripts/benchmark-backlinks.ts --backend d1
 *
 *   # Benchmark all backends
 *   pnpm tsx scripts/benchmark-backlinks.ts --all
 *
 *   # Custom query parameters
 *   pnpm tsx scripts/benchmark-backlinks.ts --backend d1 --ns github.com --id /dot-do/api --iterations 100
 */

interface BenchmarkConfig {
  backend: 'd1' | 'r2sql' | 'clickhouse' | 'all'
  toNs: string
  toId: string
  iterations: number
  warmupIterations: number
}

interface BenchmarkResult {
  backend: string
  coldStart: number
  warmCache: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  qps: number
  totalTime: number
  iterations: number
  errors: number
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((sorted.length * p) / 100) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Calculate statistics from latency measurements
 */
function calculateStats(latencies: number[]): Omit<BenchmarkResult, 'backend' | 'iterations' | 'errors'> {
  const sorted = [...latencies].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  const avg = sum / sorted.length
  const totalTime = sum
  const qps = (sorted.length / totalTime) * 1000

  return {
    coldStart: sorted[0],
    warmCache: sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    qps,
    totalTime,
  }
}

/**
 * Benchmark D1 backlink queries
 */
async function benchmarkD1(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmarking D1...')
  console.log('===================')

  // Get D1 database ID from wrangler.jsonc
  const wranglerConfig = await import('../graph/wrangler.jsonc', { assert: { type: 'json' } })
  const d1Binding = wranglerConfig.default.d1_databases?.[0]

  if (!d1Binding) {
    throw new Error('D1 database not configured in graph/wrangler.jsonc')
  }

  console.log(`Database: ${d1Binding.database_name} (${d1Binding.database_id})`)
  console.log(`Query: toNs='${config.toNs}' toId='${config.toId}'`)
  console.log(`Iterations: ${config.iterations} (${config.warmupIterations} warmup)`)
  console.log('')

  const latencies: number[] = []
  let errors = 0

  // Warmup
  console.log(`🔥 Warming up (${config.warmupIterations} iterations)...`)
  for (let i = 0; i < config.warmupIterations; i++) {
    try {
      await queryD1(d1Binding.database_id, config.toNs, config.toId)
    } catch (error) {
      console.error(`Warmup error:`, error)
    }
  }

  // Benchmark
  console.log(`⏱️  Running benchmark (${config.iterations} iterations)...`)
  for (let i = 0; i < config.iterations; i++) {
    const start = Date.now()
    try {
      await queryD1(d1Binding.database_id, config.toNs, config.toId)
      const elapsed = Date.now() - start
      latencies.push(elapsed)

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`.`)
      }
    } catch (error) {
      errors++
      console.error(`\nQuery ${i + 1} error:`, error)
    }
  }
  console.log('')

  const stats = calculateStats(latencies)

  return {
    backend: 'D1',
    ...stats,
    iterations: config.iterations,
    errors,
  }
}

/**
 * Query D1 via wrangler
 */
async function queryD1(databaseId: string, toNs: string, toId: string): Promise<any[]> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const query = `SELECT fromNs, fromId, fromType, predicate, data FROM relationships WHERE toNs = '${toNs}' AND toId = '${toId}' ORDER BY fromNs, fromId LIMIT 1000`

  const { stdout, stderr } = await execAsync(`npx wrangler d1 execute ${databaseId} --command="${query}" --json`)

  if (stderr) {
    throw new Error(stderr)
  }

  const result = JSON.parse(stdout)
  return result[0]?.results || []
}

/**
 * Benchmark R2 SQL backlink queries
 */
async function benchmarkR2SQL(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmarking R2 SQL...')
  console.log('=======================')

  const warehouseName = 'b6641681fe423910342b9ffa1364c76d_mdxld-graph'

  console.log(`Warehouse: ${warehouseName}`)
  console.log(`Query: toNs='${config.toNs}' toId='${config.toId}'`)
  console.log(`Iterations: ${config.iterations} (${config.warmupIterations} warmup)`)
  console.log('')

  // Check if R2 SQL Worker is running
  console.log('⚠️  Make sure R2 SQL Query Worker is running:')
  console.log('   cd workers/r2sql-query && pnpm dev --remote')
  console.log('   Or set R2SQL_WORKER_URL to use deployed Worker')
  console.log('')

  const latencies: number[] = []
  let errors = 0

  // Warmup
  console.log(`🔥 Warming up (${config.warmupIterations} iterations)...`)
  for (let i = 0; i < config.warmupIterations; i++) {
    try {
      await queryR2SQL(warehouseName, config.toNs, config.toId)
    } catch (error) {
      console.error(`Warmup error:`, error)
    }
  }

  // Benchmark
  console.log(`⏱️  Running benchmark (${config.iterations} iterations)...`)
  for (let i = 0; i < config.iterations; i++) {
    const start = Date.now()
    try {
      await queryR2SQL(warehouseName, config.toNs, config.toId)
      const elapsed = Date.now() - start
      latencies.push(elapsed)

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`.`)
      }
    } catch (error) {
      errors++
      console.error(`\nQuery ${i + 1} error:`, error)
    }
  }
  console.log('')

  const stats = calculateStats(latencies)

  return {
    backend: 'R2 SQL',
    ...stats,
    iterations: config.iterations,
    errors,
  }
}

/**
 * Query R2 SQL via Worker
 */
async function queryR2SQL(warehouseName: string, toNs: string, toId: string): Promise<any[]> {
  // Use R2 SQL query Worker
  // Local: http://localhost:8787/query (when running wrangler dev)
  // Production: https://r2sql-query.do/query (when deployed)
  const workerUrl = process.env.R2SQL_WORKER_URL || 'http://localhost:8787/query'

  const query = `SELECT fromNs, fromId, fromType, predicate, data FROM default.relationships WHERE toNs = '${toNs}' AND toId = '${toId}' ORDER BY fromNs, fromId LIMIT 1000`

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql: query,
      warehouse: warehouseName,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`R2 SQL Worker error (${response.status}): ${error}`)
  }

  const data = (await response.json()) as { results: any[]; meta: any; error?: string }

  if (data.error) {
    throw new Error(`R2 SQL query error: ${data.error}`)
  }

  return data.results || []
}

/**
 * Benchmark ClickHouse backlink queries
 */
async function benchmarkClickHouse(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmarking ClickHouse...')
  console.log('============================')

  console.log('⚠️  ClickHouse benchmarking not yet implemented')
  console.log('   Workers Analytics Engine requires setup via Dashboard')
  console.log('   See: https://developers.cloudflare.com/analytics/analytics-engine/')
  console.log('')

  return {
    backend: 'ClickHouse',
    coldStart: 0,
    warmCache: 0,
    min: 0,
    max: 0,
    avg: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    qps: 0,
    totalTime: 0,
    iterations: 0,
    errors: 0,
  }
}

/**
 * Print benchmark results
 */
function printResults(results: BenchmarkResult[]) {
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('BENCHMARK RESULTS')
  console.log('=' .repeat(80))
  console.log('')

  for (const result of results) {
    console.log(`${result.backend}:`)
    console.log(`  Cold Start:   ${result.coldStart.toFixed(2)}ms`)
    console.log(`  Warm Cache:   ${result.warmCache.toFixed(2)}ms`)
    console.log(`  Min:          ${result.min.toFixed(2)}ms`)
    console.log(`  Max:          ${result.max.toFixed(2)}ms`)
    console.log(`  Avg:          ${result.avg.toFixed(2)}ms`)
    console.log(`  P50:          ${result.p50.toFixed(2)}ms`)
    console.log(`  P95:          ${result.p95.toFixed(2)}ms`)
    console.log(`  P99:          ${result.p99.toFixed(2)}ms`)
    console.log(`  Throughput:   ${result.qps.toFixed(2)} queries/sec`)
    console.log(`  Total Time:   ${result.totalTime.toFixed(2)}ms`)
    console.log(`  Iterations:   ${result.iterations}`)
    console.log(`  Errors:       ${result.errors}`)
    console.log('')
  }

  // Comparison
  if (results.length > 1) {
    console.log('COMPARISON:')
    const sorted = [...results].sort((a, b) => a.avg - b.avg)
    const fastest = sorted[0]

    for (const result of sorted) {
      const speedup = result.avg / fastest.avg
      const indicator = result.backend === fastest.backend ? '🏆' : '  '
      console.log(`  ${indicator} ${result.backend.padEnd(12)} ${result.avg.toFixed(2)}ms (${speedup.toFixed(2)}x)`)
    }
    console.log('')
  }

  console.log('=' .repeat(80))
}

/**
 * Parse command line arguments
 */
function parseArgs(): BenchmarkConfig {
  const args = process.argv.slice(2)
  const config: BenchmarkConfig = {
    backend: 'd1',
    toNs: 'github.com',
    toId: '/dot-do/api',
    iterations: 50,
    warmupIterations: 5,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--backend':
      case '-b':
        config.backend = next as any
        i++
        break
      case '--ns':
        config.toNs = next
        i++
        break
      case '--id':
        config.toId = next
        i++
        break
      case '--iterations':
      case '-i':
        config.iterations = parseInt(next, 10)
        i++
        break
      case '--warmup':
      case '-w':
        config.warmupIterations = parseInt(next, 10)
        i++
        break
      case '--all':
      case '-a':
        config.backend = 'all'
        break
    }
  }

  return config
}

/**
 * Main execution
 */
async function main() {
  const config = parseArgs()

  console.log('🚀 Backlink Query Benchmark Suite')
  console.log('=' .repeat(80))
  console.log('')
  console.log('Configuration:')
  console.log(`  Backend:     ${config.backend}`)
  console.log(`  Query:       toNs='${config.toNs}' toId='${config.toId}'`)
  console.log(`  Iterations:  ${config.iterations} (${config.warmupIterations} warmup)`)
  console.log('')

  const results: BenchmarkResult[] = []

  try {
    if (config.backend === 'd1' || config.backend === 'all') {
      const result = await benchmarkD1(config)
      results.push(result)
    }

    if (config.backend === 'r2sql' || config.backend === 'all') {
      const result = await benchmarkR2SQL(config)
      results.push(result)
    }

    if (config.backend === 'clickhouse' || config.backend === 'all') {
      const result = await benchmarkClickHouse(config)
      results.push(result)
    }

    printResults(results)
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error)
    process.exit(1)
  }
}

main()
