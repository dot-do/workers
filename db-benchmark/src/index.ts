import { WorkerEntrypoint } from 'cloudflare:workers'
import type { BenchmarkConfig, BenchmarkResult, BenchmarkMetrics, DatabaseAdapter, BenchmarkSummary } from './types'

// Import adapters
import { PostgresAdapter } from './adapters/postgres'
import { ClickHouseAdapter } from './adapters/clickhouse'
import { D1Adapter } from './adapters/d1'
import { DurableObjectSQLiteAdapter, SQLiteStorage } from './adapters/sqlite'
import { MongoDBAdapter } from './adapters/mongo'

// Import test suites
import { runReadBenchmarks } from './tests/read'
import { runWriteBenchmarks } from './tests/write'
import { runSearchBenchmarks } from './tests/search'
import { runMixedWorkload } from './tests/mixed'

// Import report generator
import { generateReport } from './report'

export { SQLiteStorage }

export default class BenchmarkWorker extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/run') {
      return this.runBenchmarks()
    }

    if (url.pathname === '/report') {
      // Fetch latest results from KV and generate report
      const results = await this.env.BENCHMARK_RESULTS.get('latest', 'json')
      if (!results) {
        return Response.json({ error: 'No benchmark results found' }, { status: 404 })
      }
      const report = generateReport(results as BenchmarkResult)
      return new Response(report, {
        headers: { 'Content-Type': 'text/markdown' },
      })
    }

    return Response.json({
      message: 'Database Benchmark Suite',
      endpoints: {
        '/run': 'Run all benchmarks',
        '/report': 'View latest benchmark report',
      },
    })
  }

  async runBenchmarks(): Promise<Response> {
    const config: BenchmarkConfig = {
      databases: ['postgres', 'clickhouse', 'd1', 'sqlite', 'mongodb'],
      datasetSizes: [1000, 10000, 100000],
      iterations: 50,
      warmupIterations: 10,
      concurrency: 10,
    }

    const startTime = Date.now()
    const allMetrics: BenchmarkMetrics[] = []

    console.log('Starting database benchmarks...')
    console.log('Configuration:', JSON.stringify(config, null, 2))

    // Initialize adapters
    const adapters = await this.initializeAdapters()

    // Run benchmarks for each database and dataset size
    for (const adapter of adapters) {
      try {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`Benchmarking: ${adapter.name}`)
        console.log('='.repeat(60))

        await adapter.connect()
        await adapter.migrate()

        for (const datasetSize of config.datasetSizes) {
          console.log(`\nDataset size: ${datasetSize.toLocaleString()} records`)

          // Clear and seed database
          await adapter.clear()
          console.log('Seeding database...')
          await adapter.seed(datasetSize)
          console.log('Seeding complete')

          // Run test suites
          const readMetrics = await runReadBenchmarks(adapter, datasetSize, config.iterations)
          const writeMetrics = await runWriteBenchmarks(adapter, datasetSize, config.iterations)
          const searchMetrics = await runSearchBenchmarks(adapter, datasetSize, config.iterations)
          const mixedMetric = await runMixedWorkload(adapter, datasetSize, config.iterations)

          allMetrics.push(...readMetrics, ...writeMetrics, ...searchMetrics, mixedMetric)

          console.log(`Completed benchmarks for ${datasetSize.toLocaleString()} records`)
        }

        await adapter.disconnect()
        console.log(`\nCompleted benchmarking ${adapter.name}`)
      } catch (error: any) {
        console.error(`Error benchmarking ${adapter.name}:`, error.message)
      }
    }

    const duration = Date.now() - startTime

    // Generate summary
    const summary = this.generateSummary(allMetrics)

    const result: BenchmarkResult = {
      config,
      metrics: allMetrics,
      summary,
      timestamp: new Date(),
      duration,
    }

    // Store results in KV
    await this.env.BENCHMARK_RESULTS.put('latest', JSON.stringify(result))

    // Generate and store report
    const report = generateReport(result)
    await this.env.BENCHMARK_RESULTS.put('latest-report', report)

    return Response.json({
      message: 'Benchmarks completed successfully',
      duration: `${(duration / 1000).toFixed(2)}s`,
      totalTests: allMetrics.length,
      summary,
      reportUrl: '/report',
    })
  }

  private async initializeAdapters(): Promise<DatabaseAdapter[]> {
    const adapters: DatabaseAdapter[] = []

    // PostgreSQL/Neon
    if (this.env.POSTGRES_URL) {
      adapters.push(new PostgresAdapter(this.env.POSTGRES_URL))
    }

    // ClickHouse
    if (this.env.CLICKHOUSE_URL) {
      adapters.push(
        new ClickHouseAdapter({
          url: this.env.CLICKHOUSE_URL,
          database: this.env.CLICKHOUSE_DATABASE,
          username: this.env.CLICKHOUSE_USERNAME,
          password: this.env.CLICKHOUSE_PASSWORD,
        })
      )
    }

    // D1
    if (this.env.BENCHMARK_D1) {
      adapters.push(new D1Adapter(this.env.BENCHMARK_D1))
    }

    // Durable Object SQLite
    if (this.env.SQLITE_STORAGE) {
      adapters.push(new DurableObjectSQLiteAdapter({ SQLITE_STORAGE: this.env.SQLITE_STORAGE }))
    }

    // MongoDB
    if (this.env.MONGODB_API_KEY) {
      adapters.push(
        new MongoDBAdapter({
          apiKey: this.env.MONGODB_API_KEY,
          dataSource: this.env.MONGODB_DATA_SOURCE,
          database: this.env.MONGODB_DATABASE,
          collection: this.env.MONGODB_COLLECTION || 'benchmark_things',
        })
      )
    }

    return adapters
  }

  private generateSummary(metrics: BenchmarkMetrics[]): BenchmarkSummary {
    // Group metrics by database and operation
    const byDatabase = new Map<string, BenchmarkMetrics[]>()
    const byOperation = new Map<string, BenchmarkMetrics[]>()

    for (const metric of metrics) {
      if (!byDatabase.has(metric.database)) {
        byDatabase.set(metric.database, [])
      }
      byDatabase.get(metric.database)!.push(metric)

      if (!byOperation.has(metric.operationName)) {
        byOperation.set(metric.operationName, [])
      }
      byOperation.get(metric.operationName)!.push(metric)
    }

    // Find winners by category
    const readOps = ['get', 'list', 'count', 'aggregate']
    const writeOps = ['insert', 'batch-insert', 'update', 'upsert', 'delete']
    const searchOps = ['full-text-search', 'vector-search', 'hybrid-search']

    const readMetrics = metrics.filter((m) => readOps.includes(m.operationName))
    const writeMetrics = metrics.filter((m) => writeOps.includes(m.operationName))
    const searchMetrics = metrics.filter((m) => searchOps.includes(m.operationName))

    const overallWinner = this.findWinner(metrics, 'p95')
    const oltpWinner = this.findWinner([...readMetrics, ...writeMetrics], 'p95')
    const olapWinner = this.findWinner([...metrics.filter((m) => m.operationName === 'aggregate')], 'p95')
    const searchWinner = this.findWinner(searchMetrics, 'p95')

    // Cost efficiency: lowest cost per operation
    const costEfficiencyWinner = await this.findCostWinner(byDatabase)

    // Generate recommendations
    const recommendations = [
      {
        database: oltpWinner,
        useCase: 'Transactional Workloads (OLTP)',
        reasoning: 'Best performance for read and write operations',
      },
      {
        database: olapWinner,
        useCase: 'Analytics Workloads (OLAP)',
        reasoning: 'Optimized for aggregations and large-scale queries',
      },
      {
        database: searchWinner,
        useCase: 'Search and AI Applications',
        reasoning: 'Superior full-text and vector search capabilities',
      },
      {
        database: costEfficiencyWinner,
        useCase: 'Cost-Optimized Applications',
        reasoning: 'Best price-performance ratio',
      },
    ]

    // Identify surprises (unexpected results)
    const surprises: string[] = []

    // Check if any database had high error rates
    for (const [db, dbMetrics] of byDatabase) {
      const avgErrorRate = dbMetrics.reduce((sum, m) => sum + m.errorRate, 0) / dbMetrics.length
      if (avgErrorRate > 5) {
        surprises.push(`${db} had unexpectedly high error rate (${avgErrorRate.toFixed(1)}%)`)
      }
    }

    // Check for significant performance differences
    const p95Latencies = Array.from(byDatabase.entries()).map(([db, dbMetrics]) => ({
      db,
      avgP95: dbMetrics.reduce((sum, m) => sum + m.latency.p95, 0) / dbMetrics.length,
    }))
    p95Latencies.sort((a, b) => a.avgP95 - b.avgP95)

    if (p95Latencies.length > 1) {
      const fastest = p95Latencies[0]
      const slowest = p95Latencies[p95Latencies.length - 1]
      const ratio = slowest.avgP95 / fastest.avgP95

      if (ratio > 5) {
        surprises.push(`${fastest.db} was ${ratio.toFixed(1)}x faster than ${slowest.db} on average`)
      }
    }

    return {
      winner: {
        overall: overallWinner,
        oltp: oltpWinner,
        olap: olapWinner,
        search: searchWinner,
        costEfficiency: costEfficiencyWinner,
      },
      recommendations,
      surprises,
    }
  }

  private findWinner(metrics: BenchmarkMetrics[], latencyKey: keyof BenchmarkMetrics['latency']): string {
    if (metrics.length === 0) return 'N/A'

    const byDatabase = new Map<string, number[]>()

    for (const metric of metrics) {
      if (!byDatabase.has(metric.database)) {
        byDatabase.set(metric.database, [])
      }
      byDatabase.get(metric.database)!.push(metric.latency[latencyKey])
    }

    let bestDb = ''
    let bestAvg = Infinity

    for (const [db, latencies] of byDatabase) {
      const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      if (avg < bestAvg && avg > 0) {
        bestAvg = avg
        bestDb = db
      }
    }

    return bestDb || 'N/A'
  }

  private async findCostWinner(byDatabase: Map<string, BenchmarkMetrics[]>): Promise<string> {
    const adapters = await this.initializeAdapters()

    let bestDb = ''
    let bestCostPerOp = Infinity

    for (const adapter of adapters) {
      try {
        const cost = await adapter.estimateCost(1_000_000)
        if (cost < bestCostPerOp && cost > 0) {
          bestCostPerOp = cost
          bestDb = adapter.name
        }
      } catch (e) {
        // Skip if cost estimation fails
      }
    }

    return bestDb || 'N/A'
  }
}
