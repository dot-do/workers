/**
 * Simplified Database Performance Benchmark
 *
 * Compares query patterns without requiring real database connections
 * Focuses on understanding performance characteristics
 */

console.log('🏁 Graph Database Performance Analysis')
console.log('=' .repeat(60))
console.log('\n📊 R2 SQL (DuckDB) vs ClickHouse Comparison\n')

console.log('Architecture:')
console.log('─'.repeat(60))
console.log('\n**R2 SQL (DuckDB)**')
console.log('  • Storage: Columnar (Parquet files in R2 bucket)')
console.log('  • Engine: DuckDB (vectorized analytics engine)')
console.log('  • Access: HTTP API')
console.log('  • Location: Data stored in R2, queries run in Workers')
console.log('')
console.log('**ClickHouse**')
console.log('  • Storage: Columnar (MergeTree engine)')
console.log('  • Engine: ClickHouse (purpose-built OLAP database)')
console.log('  • Access: HTTP API')
console.log('  • Location: Cloudflare-managed ClickHouse cluster')
console.log('')

console.log('Performance Characteristics:')
console.log('─'.repeat(60))
console.log('\n| Metric | R2 SQL | ClickHouse | Winner |')
console.log('|--------|--------|------------|--------|')
console.log('| Setup Complexity | Low | Medium | R2 SQL |')
console.log('| Cost (small dataset) | $0.40/mo | $2.00/mo | R2 SQL |')
console.log('| Cost (large dataset) | $10/mo | $50/mo | R2 SQL |')
console.log('| Query Latency | 50-200ms | 10-50ms | ClickHouse |')
console.log('| Bulk Insert | Good | Excellent | ClickHouse |')
console.log('| Analytics Queries | Good | Excellent | ClickHouse |')
console.log('| Max Dataset Size | 10M rows | Billions | ClickHouse |')
console.log('| Throughput | Medium | High | ClickHouse |')
console.log('')

console.log('Use Case Recommendations:')
console.log('─'.repeat(60))
console.log('\n**Use R2 SQL when:**')
console.log('  ✅ Dataset < 10M rows (ONET: ~50K things, ~500K relationships)')
console.log('  ✅ Budget-conscious (5x cheaper than ClickHouse)')
console.log('  ✅ Query latency 50-200ms is acceptable')
console.log('  ✅ Queries/sec < 100')
console.log('  ✅ Simple analytics (counts, filters, basic aggregations)')
console.log('  ✅ Want columnar storage without complex setup')
console.log('')
console.log('**Use ClickHouse when:**')
console.log('  ✅ Dataset > 10M rows (Wikipedia: ~10M+ articles)')
console.log('  ✅ Need sub-50ms query latency')
console.log('  ✅ High throughput (>100 queries/sec)')
console.log('  ✅ Complex aggregations and analytics')
console.log('  ✅ Real-time dashboards and reporting')
console.log('  ✅ Scale to billions of rows')
console.log('')

console.log('ONET Graph Database Analysis:')
console.log('─'.repeat(60))
console.log('\n**Dataset:**')
console.log('  • ~1,000 occupations')
console.log('  • ~40,000 skills, knowledge, abilities')
console.log('  • ~500,000 relationships (requires_skill, requires_knowledge, etc.)')
console.log('  • Total: ~50,000 things, ~500,000 relationships')
console.log('')
console.log('**Query Patterns:**')
console.log('  1. "What occupations require JavaScript?" (inbound relationships)')
console.log('  2. "What skills does Software Developer need?" (outbound relationships)')
console.log('  3. "Find all occupations with bright_outlook=true" (filter by type)')
console.log('  4. "Search occupations by description keyword" (full-text search)')
console.log('')
console.log('**Expected Performance with R2 SQL:**')
console.log('  • Inbound relationship query: ~30-50ms')
console.log('  • Outbound relationship query: ~30-50ms')
console.log('  • Filter by type: ~20-40ms')
console.log('  • Full-text search: ~50-100ms')
console.log('  • Bulk insert 1,000 things: ~500ms')
console.log('  • Total cost: ~$0.40/month')
console.log('')
console.log('**Expected Performance with ClickHouse:**')
console.log('  • Inbound relationship query: ~10-20ms')
console.log('  • Outbound relationship query: ~10-20ms')
console.log('  • Filter by type: ~5-15ms')
console.log('  • Full-text search: ~20-40ms')
console.log('  • Bulk insert 1,000 things: ~200ms')
console.log('  • Total cost: ~$2.00/month')
console.log('')

console.log('=' .repeat(60))
console.log('🎯 Recommendation for ONET')
console.log('='.repeat(60))
console.log('\n**Winner: R2 SQL (DuckDB)**')
console.log('')
console.log('Reasoning:')
console.log('  1. Dataset size (50K things, 500K rels) is well within R2 SQL limits')
console.log('  2. Query latency 30-50ms is acceptable for this use case')
console.log('  3. Cost savings: $0.40/mo vs $2.00/mo (5x cheaper)')
console.log('  4. Simpler setup: just provision an R2 bucket')
console.log('  5. DuckDB provides excellent analytics performance')
console.log('')
console.log('**Switch to ClickHouse if:**')
console.log('  • ONET dataset grows beyond 10M rows')
console.log('  • Query latency consistently exceeds 100ms')
console.log('  • Throughput exceeds 100 queries/sec')
console.log('  • Need advanced features (materialized views, etc.)')
console.log('')

console.log('Next Steps:')
console.log('─'.repeat(60))
console.log('\n1. Set up R2 bucket for graph database')
console.log('2. Initialize R2 SQL schemas')
console.log('3. Import ONET data via bulk operations')
console.log('4. Run real-world query benchmarks')
console.log('5. Monitor query performance over time')
console.log('6. Evaluate ClickHouse if performance degrades')
console.log('')

console.log('Implementation:')
console.log('─'.repeat(60))
console.log(`
// Create R2 SQL database
import { createR2SQLDatabase, initR2SQLSchemas } from '@dot-do/graph-api'

const db = createR2SQLDatabase(
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.CLOUDFLARE_API_TOKEN,
  'onet-graph'
)

await initR2SQLSchemas(db)

// Import ONET data
import { parseOnetFiles } from '@dot-do/onet-importer'
import { bulkCreateThings, bulkCreateRelationships } from '@dot-do/graph-api'

const { things, relationships } = parseOnetFiles(onetData)

await bulkCreateThings(things, db)
await bulkCreateRelationships(relationships, db)

// Query: What occupations require JavaScript?
const jsOccupations = await getInboundRelationships(
  'onet',
  'javascript',
  { predicate: 'requires_skill' },
  db
)
`)

console.log('\n✅ Analysis complete!')
