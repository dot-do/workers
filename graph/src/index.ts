/**
 * Schema.org URI-based Graph Database API
 * Cloudflare Workers + D1 + Hono
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import * as things from './things'
import * as relationships from './relationships'
import * as query from './query'
import * as mdxSync from './mdx-sync'
import { buildThingUri, validateThing, isValidType } from './schema-org'

// ============================================================================
// Environment
// ============================================================================

export interface Env {
  DB: D1Database
  BUCKET?: R2Bucket // For backups and exports
  GITHUB_WEBHOOK_SECRET?: string
}

// ============================================================================
// API Application
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// Enable CORS
app.use('/*', cors())

// ============================================================================
// ROOT - Service Info
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'Schema.org Graph Database',
    version: '1.0.0',
    description: 'URI-based graph database with Schema.org types and SPARQL-like queries',
    architecture: {
      storage: 'Cloudflare D1 (SQLite)',
      tables: ['things', 'relationships'],
      design: '2-table graph model with recursive CTEs',
    },
    features: [
      'Schema.org type validation',
      'Graph traversal (n-hop)',
      'Shortest path finding',
      'Subgraph extraction',
      'MDX repository sync',
      'SPARQL-like query API',
    ],
    endpoints: {
      things: '/things',
      relationships: '/relationships',
      query: '/query',
      mdx: '/mdx',
      graph: '/graph',
    },
  })
})

// ============================================================================
// THINGS ENDPOINTS
// ============================================================================

// List things
app.get('/things', async (c) => {
  const type = c.req.query('type')
  const source = c.req.query('source')
  const namespace = c.req.query('namespace')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  const result = await things.list(c.env.DB, {
    type,
    source,
    namespace,
    limit,
    offset,
  })

  return c.json(result)
})

// Get thing by ID
app.get('/things/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const thing = await things.getWithProperties(c.env.DB, id)

  if (!thing) {
    return c.json({ error: 'Thing not found' }, 404)
  }

  return c.json(thing)
})

// Create thing
app.post('/things', async (c) => {
  try {
    const body = await c.req.json()

    // Validate input
    const schema = z.object({
      id: z.string().url(),
      type: z.string(),
      properties: z.record(z.any()),
      source: z.string().optional(),
      namespace: z.string().optional(),
    })

    const input = schema.parse(body)

    // Validate against Schema.org type
    validateThing(input.type, input.properties)

    const result = await things.create(c.env.DB, input)
    return c.json(result, 201)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Update thing
app.put('/things/:id', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'))
    const body = await c.req.json()

    const schema = z.object({
      properties: z.record(z.any()).optional(),
      source: z.string().optional(),
      namespace: z.string().optional(),
    })

    const input = schema.parse(body)
    const result = await things.update(c.env.DB, id, input)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Upsert thing
app.post('/things/upsert', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      id: z.string().url(),
      type: z.string(),
      properties: z.record(z.any()),
      source: z.string().optional(),
      namespace: z.string().optional(),
    })

    const input = schema.parse(body)
    validateThing(input.type, input.properties)

    const result = await things.upsert(c.env.DB, input)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Delete thing
app.delete('/things/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const success = await things.del(c.env.DB, id)

  if (!success) {
    return c.json({ error: 'Thing not found' }, 404)
  }

  return c.json({ success: true })
})

// Search things
app.get('/things/search', async (c) => {
  const q = c.req.query('q')
  if (!q) {
    return c.json({ error: 'Missing query parameter: q' }, 400)
  }

  const type = c.req.query('type')
  const source = c.req.query('source')
  const limit = parseInt(c.req.query('limit') || '20')

  const results = await things.search(c.env.DB, q, { type, source, limit })
  return c.json({ results, total: results.length })
})

// Count by type
app.get('/things/stats/by-type', async (c) => {
  const namespace = c.req.query('namespace')
  const counts = await things.countByType(c.env.DB, namespace)
  return c.json(counts)
})

// ============================================================================
// RELATIONSHIPS ENDPOINTS
// ============================================================================

// List relationships
app.get('/relationships', async (c) => {
  const subject = c.req.query('subject')
  const predicate = c.req.query('predicate')
  const object = c.req.query('object')
  const namespace = c.req.query('namespace')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')
  const includeDetails = c.req.query('includeDetails') === 'true'

  const result = await relationships.list(c.env.DB, {
    subject,
    predicate,
    object,
    namespace,
    limit,
    offset,
    includeThingDetails: includeDetails,
  })

  return c.json(result)
})

// Get relationship by ID
app.get('/relationships/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const relationship = await relationships.get(c.env.DB, id)

  if (!relationship) {
    return c.json({ error: 'Relationship not found' }, 404)
  }

  return c.json(relationship)
})

// Create relationship
app.post('/relationships', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      subject: z.string().url(),
      predicate: z.string().url(),
      object: z.string().url(),
      properties: z.record(z.any()).optional(),
      namespace: z.string().optional(),
    })

    const input = schema.parse(body)
    const result = await relationships.create(c.env.DB, input)
    return c.json(result, 201)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Update relationship
app.put('/relationships/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()

    const schema = z.object({
      properties: z.record(z.any()).optional(),
    })

    const input = schema.parse(body)
    const result = await relationships.update(c.env.DB, id, input)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Upsert relationship
app.post('/relationships/upsert', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      subject: z.string().url(),
      predicate: z.string().url(),
      object: z.string().url(),
      properties: z.record(z.any()).optional(),
      namespace: z.string().optional(),
    })

    const input = schema.parse(body)
    const result = await relationships.upsert(c.env.DB, input)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Delete relationship
app.delete('/relationships/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const success = await relationships.del(c.env.DB, id)

  if (!success) {
    return c.json({ error: 'Relationship not found' }, 404)
  }

  return c.json({ success: true })
})

// Get outgoing relationships
app.get('/relationships/outgoing/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const predicate = c.req.query('predicate')

  const result = await relationships.getOutgoing(c.env.DB, id, predicate)
  return c.json({ relationships: result, total: result.length })
})

// Get incoming relationships
app.get('/relationships/incoming/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const predicate = c.req.query('predicate')

  const result = await relationships.getIncoming(c.env.DB, id, predicate)
  return c.json({ relationships: result, total: result.length })
})

// Count by predicate
app.get('/relationships/stats/by-predicate', async (c) => {
  const namespace = c.req.query('namespace')
  const counts = await relationships.countByPredicate(c.env.DB, namespace)
  return c.json(counts)
})

// ============================================================================
// GRAPH QUERY ENDPOINTS
// ============================================================================

// Traverse graph (n-hop)
app.get('/query/traverse/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const maxDepth = parseInt(c.req.query('depth') || '2')
  const direction = (c.req.query('direction') as 'outgoing' | 'incoming' | 'both') || 'both'
  const limit = parseInt(c.req.query('limit') || '100')

  const result = await query.traverse(c.env.DB, id, {
    maxDepth,
    direction,
    limit,
  })

  return c.json({
    nodes: Array.from(result.nodes.values()),
    edges: result.edges,
    stats: {
      nodeCount: result.nodes.size,
      edgeCount: result.edges.length,
    },
  })
})

// Shortest path
app.get('/query/shortest-path', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to) {
    return c.json({ error: 'Missing parameters: from, to' }, 400)
  }

  const maxDepth = parseInt(c.req.query('depth') || '5')
  const result = await query.shortestPath(c.env.DB, decodeURIComponent(from), decodeURIComponent(to), maxDepth)

  if (!result) {
    return c.json({ error: 'No path found' }, 404)
  }

  return c.json(result)
})

// Find all paths
app.get('/query/all-paths', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to) {
    return c.json({ error: 'Missing parameters: from, to' }, 400)
  }

  const maxDepth = parseInt(c.req.query('depth') || '3')
  const limit = parseInt(c.req.query('limit') || '10')
  const result = await query.findAllPaths(c.env.DB, decodeURIComponent(from), decodeURIComponent(to), maxDepth, limit)

  return c.json({ paths: result, total: result.length })
})

// Extract subgraph
app.get('/query/subgraph/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const radius = parseInt(c.req.query('radius') || '1')

  const result = await query.extractSubgraph(c.env.DB, id, radius)

  return c.json({
    nodes: Array.from(result.nodes.values()),
    edges: result.edges,
    stats: {
      nodeCount: result.nodes.size,
      edgeCount: result.edges.length,
    },
  })
})

// Common neighbors
app.get('/query/common-neighbors', async (c) => {
  const id1 = c.req.query('id1')
  const id2 = c.req.query('id2')

  if (!id1 || !id2) {
    return c.json({ error: 'Missing parameters: id1, id2' }, 400)
  }

  const result = await query.commonNeighbors(c.env.DB, decodeURIComponent(id1), decodeURIComponent(id2))
  return c.json({ neighbors: result, total: result.length })
})

// Node degree
app.get('/query/degree/:id', async (c) => {
  const id = decodeURIComponent(c.req.param('id'))
  const result = await query.nodeDegree(c.env.DB, id)
  return c.json(result)
})

// Graph statistics
app.get('/query/stats', async (c) => {
  const namespace = c.req.query('namespace')
  const result = await query.getGraphStats(c.env.DB, namespace)
  return c.json(result)
})

// ============================================================================
// MDX SYNC ENDPOINTS
// ============================================================================

// Webhook handler for MDX repositories
app.post('/mdx/webhook', async (c) => {
  try {
    // Verify webhook signature (if secret is set)
    if (c.env.GITHUB_WEBHOOK_SECRET) {
      const signature = c.req.header('X-Hub-Signature-256')
      // TODO: Implement HMAC verification
    }

    const payload = await c.req.json<mdxSync.WebhookPayload>()
    const result = await mdxSync.handleWebhook(c.env.DB, payload)

    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Sync single MDX file
app.post('/mdx/sync', async (c) => {
  try {
    const body = await c.req.json()

    const schema = z.object({
      slug: z.string(),
      frontmatter: z.record(z.any()),
      content: z.string(),
      source: z.string(),
    })

    const mdxFile = schema.parse(body)
    await mdxSync.syncMDXToDatabase(c.env.DB, mdxFile)

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Export repository to MDX
app.get('/mdx/export/:repo', async (c) => {
  const repo = c.req.param('repo')
  const mdxFiles = await mdxSync.exportRepoToMDX(c.env.DB, repo)

  const result: Record<string, string> = {}
  for (const [slug, content] of mdxFiles.entries()) {
    result[slug] = content
  }

  return c.json(result)
})

// Generate MDX for a thing
app.get('/mdx/generate/:id', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'))
    const mdx = await mdxSync.generateMDXFromDatabase(c.env.DB, id)

    return c.text(mdx, 200, {
      'Content-Type': 'text/markdown',
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health check
app.get('/health', async (c) => {
  try {
    // Test database connection
    const result = await c.env.DB.prepare('SELECT 1').first()

    return c.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return c.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      500
    )
  }
})

// Initialize database (run schema.sql)
app.post('/admin/init-db', async (c) => {
  try {
    // This would execute schema.sql
    // For now, return a placeholder
    return c.json({ message: 'Run schema.sql separately via wrangler d1 execute' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Export default handler
export default {
  fetch: app.fetch,
}
