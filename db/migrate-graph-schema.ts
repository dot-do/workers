/**
 * ClickHouse Graph Schema Migration Script
 *
 * Applies the optimized graph schema (graph_things + graph_relationships)
 * alongside the existing full MDX content system.
 *
 * Usage:
 *   pnpm tsx workers/db/migrate-graph-schema.ts
 */

import 'dotenv/config'
import { createClient } from '@clickhouse/client-web'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL,
  database: process.env.CLICKHOUSE_DATABASE,
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
})

async function migrate() {
  console.log('🚀 Starting ClickHouse Graph Schema Migration\n')

  // Read schema file
  const schemaPath = join(__dirname, 'schema.graph.sql')
  const schemaSQL = readFileSync(schemaPath, 'utf-8')

  // Split into individual statements
  const statements = schemaSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  console.log(`📄 Found ${statements.length} statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Extract statement type (CREATE TABLE, CREATE VIEW, etc.)
    const firstLine = statement.split('\n')[0]
    const statementType = firstLine.match(/^(CREATE|ALTER|DROP)\s+(\w+)/i)?.[0] || 'Statement'

    try {
      console.log(`⏳ [${i + 1}/${statements.length}] Executing: ${statementType}...`)

      const result = await clickhouse.command({
        query: statement,
        clickhouse_settings: {
          enable_json_type: 1,
          allow_experimental_vector_similarity_index: 1,
          max_execution_time: 60000, // 60 seconds
        },
      })

      console.log(`✅ Success\n`)
      successCount++
    } catch (error: any) {
      // Check if error is "already exists"
      if (error.message?.includes('already exists') || error.message?.includes('ALREADY_EXISTS')) {
        console.log(`ℹ️  Already exists (skipping)\n`)
        successCount++
      } else {
        console.error(`❌ Error: ${error.message}\n`)
        console.error(`Statement: ${statement.substring(0, 200)}...\n`)
        errorCount++
      }
    }
  }

  // Summary
  console.log('=' .repeat(80))
  console.log('📊 Migration Summary')
  console.log('=' .repeat(80))
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log('')

  if (errorCount === 0) {
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Verify tables exist:')
    console.log('     SELECT name FROM system.tables WHERE database = \'' + process.env.CLICKHOUSE_DATABASE + '\' AND name LIKE \'graph_%\'')
    console.log('  2. Check table counts:')
    console.log('     SELECT COUNT(*) FROM graph_things')
    console.log('     SELECT COUNT(*) FROM graph_relationships')
    console.log('  3. Test a backlink query:')
    console.log('     SELECT * FROM graph_relationships WHERE toNs = \'onet.org\' LIMIT 10')
  } else {
    console.log('⚠️  Migration completed with errors. Please review the logs above.')
    process.exit(1)
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
