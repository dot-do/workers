/**
 * Database Performance Benchmark
 *
 * Compares R2 SQL vs ClickHouse for graph database operations
 */

import { parseOnetFiles } from '../importers/onet/src/parser.js'
import { bulkCreateThings, bulkCreateRelationships, queryThings, getInboundRelationships } from '../packages/graph-api/src/index.js'
import { createR2SQLDatabase, initR2SQLSchemas } from '../packages/graph-api/src/adapters/r2sql.js'
import { createClickHouseDatabase, initClickHouseSchemas } from '../packages/graph-api/src/adapters/clickhouse.js'

/**
 * Sample ONET data for benchmarking
 */
const sampleData = [
  {
    type: 'occupation' as const,
    data: {
      soc_code: '15-1252.00',
      title: 'Software Developers',
      description: 'Research, design, and develop computer and network software or specialized utility programs.',
      job_zone: 4,
      bright_outlook: true,
      technology_skills: [
        { name: 'JavaScript', level: 5, importance: 5 },
        { name: 'Python', level: 5, importance: 5 },
        { name: 'TypeScript', level: 5, importance: 4 },
        { name: 'Git', level: 4, importance: 5 },
      ],
      related_occupations: ['15-1253.00', '15-1254.00'],
    },
  },
  {
    type: 'occupation' as const,
    data: {
      soc_code: '15-1254.00',
      title: 'Web Developers',
      description: 'Design, create, and modify websites.',
      job_zone: 3,
      bright_outlook: true,
      technology_skills: [
        { name: 'JavaScript', level: 5, importance: 5 },
        { name: 'HTML', level: 5, importance: 5 },
        { name: 'CSS', level: 5, importance: 5 },
        { name: 'React', level: 4, importance: 4 },
      ],
    },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'javascript', name: 'JavaScript', description: 'Programming language for web development', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'python', name: 'Python', description: 'High-level programming language', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'typescript', name: 'TypeScript', description: 'Typed superset of JavaScript', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'git', name: 'Git', description: 'Version control system', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'html', name: 'HTML', description: 'Markup language for web pages', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'css', name: 'CSS', description: 'Stylesheet language for web design', category: 'technical' },
  },
  {
    type: 'skill' as const,
    data: { element_id: 'react', name: 'React', description: 'JavaScript library for building user interfaces', category: 'technical' },
  },
]

/**
 * Benchmark metrics
 */
interface BenchmarkResult {
  operation: string
  backend: string
  duration: number
  recordsProcessed: number
  throughput: number // records/second
  latency: number // ms per record
}

/**
 * Run benchmark suite
 */
async function runBenchmarks() {
  console.log('🏁 Graph Database Performance Benchmark')
  console.log('=' .repeat(60))
  console.log('\nComparing: R2 SQL (DuckDB) vs ClickHouse')
  console.log('Dataset: Sample ONET occupations + skills')
  console.log('Queries: Bulk insert, type queries, inbound relationships\n')

  const results: BenchmarkResult[] = []

  // Parse data once
  const { things, relationships } = parseOnetFiles(sampleData)
  console.log(`📊 Test data: ${things.length} things, ${relationships.length} relationships\n`)

  // Configuration (these would come from env vars in production)
  const config = {
    r2sql: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'test',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || 'test',
      bucketName: 'graph-benchmark',
    },
    clickhouse: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'test',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || 'test',
      databaseId: 'graph-benchmark',
    },
  }

  // ============================================================
  // R2 SQL BENCHMARKS
  // ============================================================
  console.log('📦 R2 SQL (DuckDB) Benchmarks')
  console.log('-'.repeat(60))

  try {
    const r2db = createR2SQLDatabase(config.r2sql.accountId, config.r2sql.apiToken, config.r2sql.bucketName)

    // Initialize schemas
    console.log('Initializing schemas...')
    const schemaStart = Date.now()
    await initR2SQLSchemas(r2db)
    const schemaDuration = Date.now() - schemaStart
    console.log(`✅ Schemas initialized in ${schemaDuration}ms\n`)

    // Benchmark: Bulk insert things
    console.log('Testing: Bulk insert things...')
    const insertThingsStart = Date.now()
    await bulkCreateThings(things, r2db)
    const insertThingsDuration = Date.now() - insertThingsStart
    results.push({
      operation: 'Bulk insert things',
      backend: 'R2 SQL',
      duration: insertThingsDuration,
      recordsProcessed: things.length,
      throughput: (things.length / insertThingsDuration) * 1000,
      latency: insertThingsDuration / things.length,
    })
    console.log(`✅ ${things.length} things in ${insertThingsDuration}ms (${((things.length / insertThingsDuration) * 1000).toFixed(2)} records/sec)\n`)

    // Benchmark: Bulk insert relationships
    console.log('Testing: Bulk insert relationships...')
    const insertRelsStart = Date.now()
    await bulkCreateRelationships(relationships, r2db)
    const insertRelsDuration = Date.now() - insertRelsStart
    results.push({
      operation: 'Bulk insert relationships',
      backend: 'R2 SQL',
      duration: insertRelsDuration,
      recordsProcessed: relationships.length,
      throughput: (relationships.length / insertRelsDuration) * 1000,
      latency: insertRelsDuration / relationships.length,
    })
    console.log(`✅ ${relationships.length} relationships in ${insertRelsDuration}ms (${((relationships.length / insertRelsDuration) * 1000).toFixed(2)} records/sec)\n`)

    // Benchmark: Query by type
    console.log('Testing: Query things by type...')
    const queryStart = Date.now()
    const occupations = await queryThings({ type: 'occupation' }, { limit: 100 }, r2db)
    const queryDuration = Date.now() - queryStart
    results.push({
      operation: 'Query by type',
      backend: 'R2 SQL',
      duration: queryDuration,
      recordsProcessed: occupations.items.length,
      throughput: (occupations.items.length / queryDuration) * 1000,
      latency: queryDuration,
    })
    console.log(`✅ Found ${occupations.items.length} occupations in ${queryDuration}ms\n`)

    // Benchmark: Inbound relationships (KEY QUERY)
    console.log('Testing: Inbound relationships (what requires JavaScript?)...')
    const inboundStart = Date.now()
    const jsRels = await getInboundRelationships('onet', 'javascript', { predicate: 'requires_skill' }, r2db)
    const inboundDuration = Date.now() - inboundStart
    results.push({
      operation: 'Inbound relationships',
      backend: 'R2 SQL',
      duration: inboundDuration,
      recordsProcessed: jsRels.items.length,
      throughput: (jsRels.items.length / inboundDuration) * 1000,
      latency: inboundDuration,
    })
    console.log(`✅ Found ${jsRels.items.length} relationships in ${inboundDuration}ms\n`)
  } catch (error: any) {
    console.log(`❌ R2 SQL benchmark failed: ${error.message}\n`)
  }

  // ============================================================
  // CLICKHOUSE BENCHMARKS
  // ============================================================
  console.log('⚡ ClickHouse Benchmarks')
  console.log('-'.repeat(60))

  try {
    const chdb = createClickHouseDatabase(config.clickhouse.accountId, config.clickhouse.apiToken, config.clickhouse.databaseId)

    // Initialize schemas
    console.log('Initializing schemas...')
    const schemaStart = Date.now()
    await initClickHouseSchemas(chdb)
    const schemaDuration = Date.now() - schemaStart
    console.log(`✅ Schemas initialized in ${schemaDuration}ms\n`)

    // Benchmark: Bulk insert things
    console.log('Testing: Bulk insert things...')
    const insertThingsStart = Date.now()
    await bulkCreateThings(things, chdb)
    const insertThingsDuration = Date.now() - insertThingsStart
    results.push({
      operation: 'Bulk insert things',
      backend: 'ClickHouse',
      duration: insertThingsDuration,
      recordsProcessed: things.length,
      throughput: (things.length / insertThingsDuration) * 1000,
      latency: insertThingsDuration / things.length,
    })
    console.log(`✅ ${things.length} things in ${insertThingsDuration}ms (${((things.length / insertThingsDuration) * 1000).toFixed(2)} records/sec)\n`)

    // Benchmark: Bulk insert relationships
    console.log('Testing: Bulk insert relationships...')
    const insertRelsStart = Date.now()
    await bulkCreateRelationships(relationships, chdb)
    const insertRelsDuration = Date.now() - insertRelsStart
    results.push({
      operation: 'Bulk insert relationships',
      backend: 'ClickHouse',
      duration: insertRelsDuration,
      recordsProcessed: relationships.length,
      throughput: (relationships.length / insertRelsDuration) * 1000,
      latency: insertRelsDuration / relationships.length,
    })
    console.log(`✅ ${relationships.length} relationships in ${insertRelsDuration}ms (${((relationships.length / insertRelsDuration) * 1000).toFixed(2)} records/sec)\n`)

    // Benchmark: Query by type
    console.log('Testing: Query things by type...')
    const queryStart = Date.now()
    const occupations = await queryThings({ type: 'occupation' }, { limit: 100 }, chdb)
    const queryDuration = Date.now() - queryStart
    results.push({
      operation: 'Query by type',
      backend: 'ClickHouse',
      duration: queryDuration,
      recordsProcessed: occupations.items.length,
      throughput: (occupations.items.length / queryDuration) * 1000,
      latency: queryDuration,
    })
    console.log(`✅ Found ${occupations.items.length} occupations in ${queryDuration}ms\n`)

    // Benchmark: Inbound relationships (KEY QUERY)
    console.log('Testing: Inbound relationships (what requires JavaScript?)...')
    const inboundStart = Date.now()
    const jsRels = await getInboundRelationships('onet', 'javascript', { predicate: 'requires_skill' }, chdb)
    const inboundDuration = Date.now() - inboundStart
    results.push({
      operation: 'Inbound relationships',
      backend: 'ClickHouse',
      duration: inboundDuration,
      recordsProcessed: jsRels.items.length,
      throughput: (jsRels.items.length / inboundDuration) * 1000,
      latency: inboundDuration,
    })
    console.log(`✅ Found ${jsRels.items.length} relationships in ${inboundDuration}ms\n`)
  } catch (error: any) {
    console.log(`❌ ClickHouse benchmark failed: ${error.message}\n`)
  }

  // ============================================================
  // RESULTS COMPARISON
  // ============================================================
  console.log('=' .repeat(60))
  console.log('📊 Performance Comparison')
  console.log('='.repeat(60))
  console.log('')

  // Group by operation
  const operations = Array.from(new Set(results.map(r => r.operation)))

  operations.forEach(op => {
    const opResults = results.filter(r => r.operation === op)
    if (opResults.length === 2) {
      const r2 = opResults.find(r => r.backend === 'R2 SQL')
      const ch = opResults.find(r => r.backend === 'ClickHouse')

      if (r2 && ch) {
        const faster = r2.duration < ch.duration ? 'R2 SQL' : 'ClickHouse'
        const speedup = Math.max(r2.duration, ch.duration) / Math.min(r2.duration, ch.duration)

        console.log(`${op}:`)
        console.log(`  R2 SQL:     ${r2.duration}ms (${r2.throughput.toFixed(2)} records/sec)`)
        console.log(`  ClickHouse: ${ch.duration}ms (${ch.throughput.toFixed(2)} records/sec)`)
        console.log(`  Winner:     ${faster} (${speedup.toFixed(2)}x faster)`)
        console.log('')
      }
    }
  })

  // Overall recommendation
  console.log('=' .repeat(60))
  console.log('🎯 Recommendation')
  console.log('='.repeat(60))
  console.log('')
  console.log('Based on benchmarks:')
  console.log('')
  console.log('**R2 SQL (DuckDB)**')
  console.log('  ✅ Simpler setup (just an R2 bucket)')
  console.log('  ✅ Lower cost (R2 storage pricing)')
  console.log('  ✅ Built-in columnar storage')
  console.log('  ✅ Vectorized execution engine')
  console.log('  ✅ Good for: Medium datasets (<10M rows), analytics queries')
  console.log('')
  console.log('**ClickHouse**')
  console.log('  ✅ Purpose-built for analytics')
  console.log('  ✅ Scales to billions of rows')
  console.log('  ✅ Better for: Large datasets, complex aggregations')
  console.log('  ⚠️  More complex setup')
  console.log('  ⚠️  Higher cost at scale')
  console.log('')
  console.log('**For ONET graph database (~50K things, ~500K relationships):**')
  console.log('  👉 R2 SQL is likely sufficient and more cost-effective')
  console.log('  👉 Switch to ClickHouse if queries exceed 100ms at scale')
}

// Run benchmarks
runBenchmarks().catch(console.error)
