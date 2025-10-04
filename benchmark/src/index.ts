/**
 * Benchmark Worker - R2 SQL Content Search Performance Testing
 *
 * Tests R2 SQL performance with web content storage to determine if we need ClickHouse.
 *
 * Benchmarks:
 * 1. Write Performance - Store 10K content events with 5 formats (JSON, Code, Markdown, HTML, AST)
 * 2. Full-Text Search - Query markdown content by keywords
 * 3. Aggregations - Count content by namespace and language
 * 4. Deduplication - Find duplicate content by hash
 * 5. Historical Queries - Get all versions of a document
 *
 * Performance Thresholds (for R2 SQL to be acceptable):
 * - Recent content (100 items): < 1 second
 * - Full-text search: < 5 seconds
 * - Aggregations: < 10 seconds
 * - Deduplication: < 15 seconds
 * - Historical content: < 2 seconds
 */

import { Hono } from 'hono'
import { ulid } from 'ulid'
import type { ContentEvent, BenchmarkResult, Env } from './types'
import { generateTestContent } from './test-data'
import { runBenchmarks } from './benchmarks'

const app = new Hono<{ Bindings: Env }>()

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'benchmark' })
})

/**
 * Generate test data
 *
 * POST /generate
 * Body: { count: number, avgSizeKB?: number }
 */
app.post('/generate', async (c) => {
  const { count = 1000, avgSizeKB = 225 } = await c.req.json()

  const startTime = Date.now()
  const events: ContentEvent[] = []

  // Generate content events
  for (let i = 0; i < count; i++) {
    const content = generateTestContent(avgSizeKB)
    const timestamp = Date.now()

    events.push({
      // Identity
      ulid: ulid(timestamp),
      timestamp,
      eventTimestamp: timestamp,

      // Event Classification
      eventType: 'content',
      mutationType: 'create',

      // Entity Reference
      entityNs: content.ns,
      entityId: content.id,
      entityType: 'page',

      // Web Content (5 formats) ⭐
      contentJson: content.json ? JSON.stringify(content.json) : null,
      contentCode: content.code,
      contentMarkdown: content.markdown,
      contentHtml: content.html,
      contentAst: content.ast ? JSON.stringify(content.ast) : null,

      // Content Metadata
      contentLength: content.markdown.length,
      contentHash: content.hash,
      contentLanguage: content.language,
      contentFormat: 'mdx',

      // Source
      scriptName: 'benchmark',
      dispatchNamespace: null,
      workerName: 'benchmark',

      // Performance metrics
      cpuTime: 0,
      wallTime: 0,

      // Pipeline metadata
      pipelineInstance: 'benchmark',
      pipelineBatchId: ulid(),
      retryCount: 0,

      // Logs/Errors (null for content events)
      severity: 'info',
      category: 'success',
      errorType: null,
      errorMessage: null,
      hasException: false,
      logCount: 0,
      logs: null,
      exceptionCount: 0,
      exceptions: null,
      url: null,
      method: null,
      cfRay: null,
      userAgent: null,
      ip: null,
      status: null,
      outcome: 'ok',
      rpcMethod: null,
      queueName: null,
      emailTo: null,
      scheduledTime: null,
      cron: null,
    })

    // Send in batches of 100 to avoid memory issues
    if (events.length >= 100) {
      await c.env.PIPELINE.send(events)
      events.length = 0
    }
  }

  // Send remaining events
  if (events.length > 0) {
    await c.env.PIPELINE.send(events)
  }

  const duration = Date.now() - startTime

  return c.json({
    success: true,
    generated: count,
    duration,
    throughput: Math.round((count / duration) * 1000),
    avgSizeKB,
  })
})

/**
 * Run benchmarks
 *
 * GET /benchmark?type=all|write|search|aggregate|dedup|history
 */
app.get('/benchmark', async (c) => {
  const type = c.req.query('type') || 'all'

  const results = await runBenchmarks(c.env, type as any)

  return c.json({
    success: true,
    results,
    passed: results.every((r: BenchmarkResult) => r.passed),
  })
})

/**
 * Get benchmark status and thresholds
 */
app.get('/status', (c) => {
  return c.json({
    thresholds: {
      directLookup: {
        maxMs: 500,
        description: 'Direct ns+id lookup (MOST CRITICAL)',
        note: 'ClickHouse does this in < 100ms. If R2 SQL > 500ms, consider caching layer.',
        region: 'us-east-1',
      },
      recentContent: { maxMs: 500, description: 'Fetch 100 recent items', region: 'us-east-1' },
      fullTextSearch: { maxMs: 5000, description: 'Keyword search across markdown' },
      aggregations: { maxMs: 10000, description: 'Count content by namespace and language' },
      deduplication: { maxMs: 15000, description: 'Find duplicate content by hash' },
      historicalQueries: { maxMs: 2000, description: 'Get all versions of a document' },
    },
    architectureOptions: {
      option1: {
        name: 'R2 SQL Only',
        cost: '$34/month',
        condition: 'All benchmarks pass (including Direct Lookup < 500ms)',
        latency: {
          directLookup: '< 500ms (cold)',
          cached: 'N/A',
        },
      },
      option2: {
        name: 'R2 SQL + Cache Layer (SWR)',
        cost: '$34/month + cache storage',
        condition: 'Direct Lookup 500-2000ms, other benchmarks pass',
        latency: {
          directLookup: '500-2000ms (cold)',
          cached: '< 50ms (hot, edge cache)',
        },
        strategy: 'Cloudflare Cache API with Stale-While-Revalidate',
      },
      option3: {
        name: 'ClickHouse + R2 SQL',
        cost: '$432/month',
        condition: 'Direct Lookup > 2000ms or Full-Text Search > 5000ms',
        latency: {
          directLookup: '< 100ms (ClickHouse hot data)',
          fullTextSearch: '< 1000ms (ClickHouse)',
          coldData: '< 5000ms (R2 SQL archive)',
        },
        strategy: 'Hot data in ClickHouse, cold data in R2 SQL',
      },
    },
  })
})

export default app
