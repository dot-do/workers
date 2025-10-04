#!/usr/bin/env tsx
/**
 * R2 SQL Data Ingestion Script
 *
 * Sends sample MDXLD relationships to R2 SQL Pipeline HTTP endpoint.
 *
 * Prerequisites:
 * 1. R2 SQL Pipeline created (run ./r2-sql-setup.sh)
 * 2. Stream endpoint URL obtained
 *
 * Usage:
 *   export R2_SQL_STREAM_URL=https://pipeline-endpoint.workers.dev
 *   pnpm tsx scripts/ingest-to-r2-sql.ts
 */

import { generateSampleData } from './sample-mdxld-data'

interface IngestionOptions {
  streamUrl: string
  batchSize?: number
  dryRun?: boolean
}

/**
 * Send relationships to R2 SQL Pipeline
 */
async function ingestRelationships(options: IngestionOptions) {
  const { streamUrl, batchSize = 100, dryRun = false } = options

  console.log('🚀 R2 SQL Data Ingestion')
  console.log('=======================')
  console.log(`Stream URL: ${streamUrl}`)
  console.log(`Batch Size: ${batchSize}`)
  console.log(`Dry Run: ${dryRun}`)
  console.log('')

  // Generate sample data
  console.log('📦 Generating sample MDXLD data...')
  const { relationships, summary } = generateSampleData()

  console.log(`✅ Generated ${relationships.length} relationships`)
  console.log(`   Things: ${summary.thingsCount}`)
  console.log(`   Types: ${JSON.stringify(summary.types)}`)
  console.log(`   Namespaces: ${summary.namespaces.join(', ')}`)
  console.log('')

  if (dryRun) {
    console.log('🔍 Dry Run - Sample relationship:')
    console.log(JSON.stringify(relationships[0], null, 2))
    return
  }

  // Split into batches
  const batches = []
  for (let i = 0; i < relationships.length; i += batchSize) {
    batches.push(relationships.slice(i, i + batchSize))
  }

  console.log(`📤 Sending ${batches.length} batches...`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const startTime = Date.now()

    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Batch ${i + 1}/${batches.length} failed (${elapsed}ms): ${response.status} ${error}`)
        errorCount += batch.length
      } else {
        console.log(`✅ Batch ${i + 1}/${batches.length} sent (${batch.length} records, ${elapsed}ms)`)
        successCount += batch.length
      }
    } catch (error) {
      const elapsed = Date.now() - startTime
      console.error(`❌ Batch ${i + 1}/${batches.length} error (${elapsed}ms):`, error)
      errorCount += batch.length
    }
  }

  console.log('')
  console.log('📊 Ingestion Complete')
  console.log('===================')
  console.log(`✅ Success: ${successCount} records`)
  console.log(`❌ Errors: ${errorCount} records`)

  if (errorCount === 0) {
    console.log('')
    console.log('🎉 All data ingested successfully!')
    console.log('')
    console.log('Next Steps:')
    console.log('1. Wait for Parquet files to be created (check R2 bucket)')
    console.log('2. Run test queries:')
    console.log('   export WRANGLER_R2_SQL_AUTH_TOKEN=$R2_SQL_AUTH_TOKEN')
    console.log('   npx wrangler r2 sql query "b6641681fe423910342b9ffa1364c76d_mdxld-graph" \\')
    console.log('     "SELECT * FROM default.relationships LIMIT 10"')
    console.log('')
    console.log('3. Run backlink query:')
    console.log('   npx wrangler r2 sql query "b6641681fe423910342b9ffa1364c76d_mdxld-graph" \\')
    console.log('     "SELECT fromNs, fromId, fromType, predicate FROM default.relationships WHERE toNs = \'github.com\' AND toId = \'/dot-do/api\'"')
  }
}

/**
 * Get stream URL from wrangler pipelines
 */
async function getStreamUrl(): Promise<string | null> {
  try {
    // Try to get pipeline details
    console.log('🔍 Looking up pipeline stream URL...')
    // Note: Wrangler doesn't expose a JSON API for this
    // User must provide URL manually for now
    return null
  } catch (error) {
    return null
  }
}

/**
 * Main execution
 */
async function main() {
  // Check for stream URL
  let streamUrl = process.env.R2_SQL_STREAM_URL

  if (!streamUrl) {
    streamUrl = await getStreamUrl()
  }

  if (!streamUrl) {
    console.error('❌ Error: R2_SQL_STREAM_URL environment variable not set')
    console.error('')
    console.error('To get the stream URL:')
    console.error('1. Run: npx wrangler pipelines streams list')
    console.error('2. Find the stream named "mdxld_relationships_stream"')
    console.error('3. Copy the endpoint URL')
    console.error('4. Export it:')
    console.error('   export R2_SQL_STREAM_URL=https://your-stream-endpoint.workers.dev')
    console.error('')
    console.error('Or run in dry-run mode to see sample data:')
    console.error('   R2_SQL_STREAM_URL=dummy pnpm tsx scripts/ingest-to-r2-sql.ts --dry-run')
    process.exit(1)
  }

  // Check for dry-run flag
  const dryRun = process.argv.includes('--dry-run')

  await ingestRelationships({
    streamUrl,
    batchSize: 100,
    dryRun,
  })
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
