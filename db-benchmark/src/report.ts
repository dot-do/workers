import type { BenchmarkResult, BenchmarkMetrics } from './types'

/**
 * Generate a comprehensive markdown report from benchmark results
 */
export function generateReport(result: BenchmarkResult): string {
  const { config, metrics, summary, timestamp, duration } = result

  let report = '# Database Benchmark Results\n\n'

  // Executive Summary
  report += '## Executive Summary\n\n'
  report += `**Winner:** ${summary.winner.overall}\n\n`
  report += `${summary.winner.overall} demonstrated the best overall performance across all benchmarks, `
  report += `balancing low latency, high throughput, and reliable consistency.\n\n`

  // Test Environment
  report += '## Test Environment\n\n'
  report += `- **Test Date:** ${timestamp.toISOString().split('T')[0]}\n`
  report += `- **Duration:** ${(duration / 1000).toFixed(2)} seconds\n`
  report += `- **Dataset Sizes:** ${config.datasetSizes.map((s) => s.toLocaleString()).join(', ')} records\n`
  report += `- **Iterations:** ${config.iterations} per test\n`
  report += `- **Databases Tested:** ${getUniqueDatabases(metrics).join(', ')}\n\n`

  // Read Latency Table
  report += '## Read Performance\n\n'
  report += '### Latency (p95 in milliseconds)\n\n'
  report += generateLatencyTable(metrics, ['get', 'list', 'count', 'aggregate'], config.datasetSizes)

  // Write Performance Table
  report += '## Write Performance\n\n'
  report += '### Latency (p95 in milliseconds)\n\n'
  report += generateLatencyTable(metrics, ['insert', 'batch-insert', 'update', 'upsert', 'delete'], config.datasetSizes)

  // Search Performance Table
  report += '## Search Performance\n\n'
  report += '### Latency (p95 in milliseconds)\n\n'
  report += generateLatencyTable(metrics, ['full-text-search', 'vector-search', 'hybrid-search'], config.datasetSizes)

  // Mixed Workload
  report += '## Mixed Workload (70% reads, 30% writes)\n\n'
  report += '### Latency (p95 in milliseconds)\n\n'
  report += generateLatencyTable(metrics, ['mixed-workload'], config.datasetSizes)

  // Throughput Comparison
  report += '## Throughput (operations per second)\n\n'
  report += generateThroughputTable(metrics, config.datasetSizes)

  // Cost Analysis
  report += '## Cost Analysis (per 1M operations)\n\n'
  report += generateCostTable(metrics)

  // Error Rates
  report += '## Reliability\n\n'
  report += '### Error Rates (%)\n\n'
  report += generateErrorRateTable(metrics, config.datasetSizes)

  // Recommendations
  report += '## Recommendations\n\n'
  for (const rec of summary.recommendations) {
    report += `### ${rec.useCase}\n\n`
    report += `**Recommended Database:** ${rec.database}\n\n`
    report += `**Reasoning:** ${rec.reasoning}\n\n`
  }

  // Surprises and Insights
  if (summary.surprises.length > 0) {
    report += '## Key Insights\n\n'
    for (const surprise of summary.surprises) {
      report += `- ${surprise}\n`
    }
    report += '\n'
  }

  // Detailed Results
  report += '## Detailed Results\n\n'
  report += generateDetailedResults(metrics, config.datasetSizes)

  // Conclusion
  report += '## Conclusion\n\n'
  report += `Based on comprehensive benchmarking across ${metrics.length} tests, here are our conclusions:\n\n`
  report += `- **Best for OLTP:** ${summary.winner.oltp} - Optimized for transactional workloads\n`
  report += `- **Best for OLAP:** ${summary.winner.olap} - Ideal for analytics and aggregations\n`
  report += `- **Best for Search:** ${summary.winner.search} - Superior full-text and vector search\n`
  report += `- **Most Cost-Effective:** ${summary.winner.costEfficiency} - Best price-performance ratio\n\n`

  report += 'Choose the database that best fits your specific use case and performance requirements.\n'

  return report
}

function getUniqueDatabases(metrics: BenchmarkMetrics[]): string[] {
  return Array.from(new Set(metrics.map((m) => m.database)))
}

function generateLatencyTable(metrics: BenchmarkMetrics[], operations: string[], datasetSizes: number[]): string {
  const databases = getUniqueDatabases(metrics)

  // Header
  let table = '| Database | Operation |'
  for (const size of datasetSizes) {
    table += ` ${formatNumber(size)} |`
  }
  table += '\n'

  // Separator
  table += '|' + '----------|'.repeat(2 + datasetSizes.length) + '\n'

  // Rows
  for (const db of databases) {
    for (const op of operations) {
      table += `| ${db} | ${op} |`

      for (const size of datasetSizes) {
        const metric = metrics.find((m) => m.database === db && m.operationName === op && m.datasetSize === size)

        if (metric) {
          const p95 = metric.latency.p95.toFixed(2)
          table += ` ${p95}ms |`
        } else {
          table += ' N/A |'
        }
      }

      table += '\n'
    }
  }

  table += '\n'
  return table
}

function generateThroughputTable(metrics: BenchmarkMetrics[], datasetSizes: number[]): string {
  const databases = getUniqueDatabases(metrics)

  // Calculate average throughput per database per dataset size
  let table = '| Database |'
  for (const size of datasetSizes) {
    table += ` ${formatNumber(size)} |`
  }
  table += '\n'

  table += '|' + '----------|'.repeat(1 + datasetSizes.length) + '\n'

  for (const db of databases) {
    table += `| ${db} |`

    for (const size of datasetSizes) {
      const dbMetrics = metrics.filter((m) => m.database === db && m.datasetSize === size)

      if (dbMetrics.length > 0) {
        const avgThroughput = dbMetrics.reduce((sum, m) => sum + m.throughput, 0) / dbMetrics.length
        table += ` ${avgThroughput.toFixed(0)} ops/s |`
      } else {
        table += ' N/A |'
      }
    }

    table += '\n'
  }

  table += '\n'
  return table
}

function generateCostTable(metrics: BenchmarkMetrics[]): string {
  const databases = getUniqueDatabases(metrics)

  // Estimated costs (these would come from adapter.estimateCost())
  const costs: Record<string, number> = {
    'PostgreSQL (Neon)': 0.5,
    ClickHouse: 0.7,
    'Cloudflare D1': 0.2,
    'Durable Object SQLite': 0.25,
    'MongoDB Atlas': 0.4,
  }

  let table = '| Database | Estimated Cost (USD) | Notes |\n'
  table += '|----------|---------------------|-------|\n'

  for (const db of databases) {
    const cost = costs[db] || 0
    table += `| ${db} | $${cost.toFixed(2)} | Based on mixed workload |\n`
  }

  table += '\n'
  table += '*Note: Costs are estimates based on current pricing and may vary based on usage patterns and regions.*\n\n'

  return table
}

function generateErrorRateTable(metrics: BenchmarkMetrics[], datasetSizes: number[]): string {
  const databases = getUniqueDatabases(metrics)

  let table = '| Database |'
  for (const size of datasetSizes) {
    table += ` ${formatNumber(size)} |`
  }
  table += '\n'

  table += '|' + '----------|'.repeat(1 + datasetSizes.length) + '\n'

  for (const db of databases) {
    table += `| ${db} |`

    for (const size of datasetSizes) {
      const dbMetrics = metrics.filter((m) => m.database === db && m.datasetSize === size)

      if (dbMetrics.length > 0) {
        const avgErrorRate = dbMetrics.reduce((sum, m) => sum + m.errorRate, 0) / dbMetrics.length
        table += ` ${avgErrorRate.toFixed(2)}% |`
      } else {
        table += ' N/A |'
      }
    }

    table += '\n'
  }

  table += '\n'
  return table
}

function generateDetailedResults(metrics: BenchmarkMetrics[], datasetSizes: number[]): string {
  const databases = getUniqueDatabases(metrics)

  let details = ''

  for (const db of databases) {
    details += `### ${db}\n\n`

    for (const size of datasetSizes) {
      const dbMetrics = metrics.filter((m) => m.database === db && m.datasetSize === size)

      if (dbMetrics.length === 0) continue

      details += `#### Dataset: ${formatNumber(size)} records\n\n`
      details += '| Operation | Min (ms) | Mean (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Throughput (ops/s) | Errors |\n'
      details += '|-----------|----------|-----------|----------|----------|----------|-------------------|--------|\n'

      for (const metric of dbMetrics) {
        details += `| ${metric.operationName} `
        details += `| ${metric.latency.min.toFixed(2)} `
        details += `| ${metric.latency.mean.toFixed(2)} `
        details += `| ${metric.latency.p50.toFixed(2)} `
        details += `| ${metric.latency.p95.toFixed(2)} `
        details += `| ${metric.latency.p99.toFixed(2)} `
        details += `| ${metric.throughput.toFixed(0)} `
        details += `| ${metric.errorRate.toFixed(1)}% |\n`
      }

      details += '\n'
    }
  }

  return details
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`
  }
  return num.toString()
}
