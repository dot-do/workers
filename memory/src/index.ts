/**
 * AI Memory System - Main API
 *
 * Coordinates between:
 * - Memory Durable Objects (working memory)
 * - Semantic Memory (Vectorize)
 * - Memory Consolidation (Workers AI)
 * - Archival Storage (R2)
 * - Memory Graph (D1)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, Message, MemoryQuery } from './types'
import { SemanticMemory } from './semantic'
import { MemoryConsolidation } from './consolidation'
import { ArchivalStorage } from './archival'
import { MemoryGraph } from './graph'

// Export Durable Object
export { MemoryObject } from './memory-object'

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('/*', cors())

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: Date.now() })
})

/**
 * Initialize a new memory session
 */
app.post('/sessions', async (c) => {
  const { sessionId } = await c.req.json()

  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400)
  }

  // Get or create Durable Object
  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  const response = await obj.fetch('http://internal/init', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  })

  return c.json(await response.json())
})

/**
 * Add a message to working memory
 */
app.post('/sessions/:sessionId/messages', async (c) => {
  const sessionId = c.req.param('sessionId')
  const message: Message = await c.req.json()

  // Add to Durable Object
  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  const response = await obj.fetch('http://internal/add', {
    method: 'POST',
    body: JSON.stringify(message)
  })

  return c.json(await response.json())
})

/**
 * Get working memory
 */
app.get('/sessions/:sessionId/memory', async (c) => {
  const sessionId = c.req.param('sessionId')
  const context = c.req.query('context')
  const limit = c.req.query('limit')

  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  const url = new URL('http://internal/get')
  if (context) url.searchParams.set('context', context)
  if (limit) url.searchParams.set('limit', limit)

  const response = await obj.fetch(url.toString())

  return c.json(await response.json())
})

/**
 * Search memories semantically
 */
app.post('/sessions/:sessionId/search', async (c) => {
  const sessionId = c.req.param('sessionId')
  const body = await c.req.json()

  const query: MemoryQuery = {
    query: body.query,
    sessionId,
    type: body.type,
    timeRange: body.timeRange,
    limit: body.limit || 10,
    minImportance: body.minImportance || 0
  }

  const semantic = new SemanticMemory(c.env)
  const results = await semantic.search(query)

  return c.json({ results })
})

/**
 * Find similar memories
 */
app.get('/memories/:memoryId/similar', async (c) => {
  const memoryId = c.req.param('memoryId')
  const limit = parseInt(c.req.query('limit') || '5')

  const semantic = new SemanticMemory(c.env)
  const results = await semantic.findSimilar(memoryId, limit)

  return c.json({ results })
})

/**
 * Cluster memories
 */
app.get('/sessions/:sessionId/clusters', async (c) => {
  const sessionId = c.req.param('sessionId')
  const numClusters = parseInt(c.req.query('clusters') || '5')

  const semantic = new SemanticMemory(c.env)
  const clusters = await semantic.clusterMemories(sessionId, numClusters)

  const result = Array.from(clusters.entries()).map(([id, memories]) => ({
    clusterId: id,
    size: memories.length,
    memories
  }))

  return c.json({ clusters: result })
})

/**
 * Consolidate memories
 */
app.post('/sessions/:sessionId/consolidate', async (c) => {
  const sessionId = c.req.param('sessionId')

  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  const response = await obj.fetch('http://internal/consolidate', {
    method: 'POST'
  })

  return c.json(await response.json())
})

/**
 * Get memory statistics
 */
app.get('/sessions/:sessionId/stats', async (c) => {
  const sessionId = c.req.param('sessionId')

  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  const response = await obj.fetch('http://internal/stats')

  return c.json(await response.json())
})

/**
 * Archive session
 */
app.post('/sessions/:sessionId/archive', async (c) => {
  const sessionId = c.req.param('sessionId')

  const archival = new ArchivalStorage(c.env)
  const archiveKey = await archival.archiveSession(sessionId)

  return c.json({ archiveKey })
})

/**
 * Get archive statistics
 */
app.get('/sessions/:sessionId/archive/stats', async (c) => {
  const sessionId = c.req.param('sessionId')

  const archival = new ArchivalStorage(c.env)
  const stats = await archival.getArchiveStats(sessionId)

  return c.json(stats)
})

/**
 * Export session
 */
app.get('/sessions/:sessionId/export', async (c) => {
  const sessionId = c.req.param('sessionId')
  const format = c.req.query('format') || 'json'

  const archival = new ArchivalStorage(c.env)
  const exported = await archival.exportSession(sessionId, format as any)

  const contentTypes = {
    json: 'application/json',
    markdown: 'text/markdown',
    html: 'text/html',
    txt: 'text/plain'
  }

  return new Response(exported, {
    headers: {
      'Content-Type': contentTypes[format as keyof typeof contentTypes] || 'text/plain',
      'Content-Disposition': `attachment; filename="session-${sessionId}.${format}"`
    }
  })
})

/**
 * Replay memory
 */
app.post('/sessions/:sessionId/replay', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { timestamp, contextWindow = 10 } = await c.req.json()

  const archival = new ArchivalStorage(c.env)
  const replay = await archival.replayMemory(sessionId, timestamp, contextWindow)

  return c.json(replay)
})

/**
 * Get entity
 */
app.get('/entities/:entityId', async (c) => {
  const entityId = c.req.param('entityId')

  const graph = new MemoryGraph(c.env)
  const entity = await graph.getEntity(entityId)

  if (!entity) {
    return c.json({ error: 'Entity not found' }, 404)
  }

  return c.json(entity)
})

/**
 * Get entity relationships
 */
app.get('/entities/:entityId/relationships', async (c) => {
  const entityId = c.req.param('entityId')

  const graph = new MemoryGraph(c.env)
  const relationships = await graph.getEntityRelationships(entityId)

  return c.json({ relationships })
})

/**
 * Get related entities
 */
app.get('/entities/:entityId/related', async (c) => {
  const entityId = c.req.param('entityId')
  const depth = parseInt(c.req.query('depth') || '1')

  const graph = new MemoryGraph(c.env)
  const related = await graph.getRelatedEntities(entityId, depth)

  return c.json({ entities: related })
})

/**
 * Find path between entities
 */
app.get('/entities/:sourceId/path/:targetId', async (c) => {
  const sourceId = c.req.param('sourceId')
  const targetId = c.req.param('targetId')

  const graph = new MemoryGraph(c.env)
  const path = await graph.findPath(sourceId, targetId)

  if (!path) {
    return c.json({ error: 'No path found' }, 404)
  }

  return c.json({ path })
})

/**
 * Get graph
 */
app.get('/sessions/:sessionId/graph', async (c) => {
  const sessionId = c.req.param('sessionId')

  const graph = new MemoryGraph(c.env)
  const data = await graph.buildGraph(sessionId)

  return c.json(data)
})

/**
 * Get graph statistics
 */
app.get('/sessions/:sessionId/graph/stats', async (c) => {
  const sessionId = c.req.param('sessionId')

  const graph = new MemoryGraph(c.env)
  const stats = await graph.getGraphStats(sessionId)

  return c.json({
    ...stats,
    entityTypes: Array.from(stats.entityTypes.entries()).map(([type, count]) => ({ type, count })),
    relationshipTypes: Array.from(stats.relationshipTypes.entries()).map(([type, count]) => ({ type, count }))
  })
})

/**
 * Find communities
 */
app.get('/sessions/:sessionId/communities', async (c) => {
  const sessionId = c.req.param('sessionId')

  const graph = new MemoryGraph(c.env)
  const communities = await graph.findCommunities(sessionId)

  const result = Array.from(communities.entries()).map(([id, entities]) => ({
    communityId: id,
    size: entities.length,
    entities
  }))

  return c.json({ communities: result })
})

/**
 * Get central entities
 */
app.get('/sessions/:sessionId/central-entities', async (c) => {
  const sessionId = c.req.param('sessionId')
  const limit = parseInt(c.req.query('limit') || '10')

  const graph = new MemoryGraph(c.env)
  const entities = await graph.getCentralEntities(sessionId, limit)

  return c.json({ entities })
})

/**
 * Export graph
 */
app.get('/sessions/:sessionId/graph/export', async (c) => {
  const sessionId = c.req.param('sessionId')
  const format = c.req.query('format') || 'json'

  const graph = new MemoryGraph(c.env)
  const exported = await graph.exportGraph(sessionId, format as any)

  const contentTypes = {
    json: 'application/json',
    dot: 'text/plain',
    cytoscape: 'application/json'
  }

  return new Response(exported, {
    headers: {
      'Content-Type': contentTypes[format as keyof typeof contentTypes] || 'text/plain',
      'Content-Disposition': `attachment; filename="graph-${sessionId}.${format}"`
    }
  })
})

/**
 * WebSocket endpoint for real-time memory streaming
 */
app.get('/sessions/:sessionId/ws', async (c) => {
  const sessionId = c.req.param('sessionId')

  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }

  // Forward to Durable Object
  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  return obj.fetch(c.req.raw)
})

/**
 * Example: Complete conversation flow
 */
app.post('/demo/conversation', async (c) => {
  const { sessionId, messages } = await c.req.json()

  // 1. Initialize session
  const id = c.env.MEMORY.idFromName(sessionId)
  const obj = c.env.MEMORY.get(id)

  await obj.fetch('http://internal/init', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  })

  // 2. Add messages
  for (const message of messages) {
    await obj.fetch('http://internal/add', {
      method: 'POST',
      body: JSON.stringify(message)
    })
  }

  // 3. Search for relevant memories
  const semantic = new SemanticMemory(c.env)
  const searchResults = await semantic.search({
    query: messages[messages.length - 1].content,
    sessionId,
    limit: 5
  })

  // 4. Get current stats
  const statsResponse = await obj.fetch('http://internal/stats')
  const stats = await statsResponse.json()

  // 5. Build response with context
  return c.json({
    sessionId,
    messagesAdded: messages.length,
    relevantMemories: searchResults.length,
    stats,
    suggestions: searchResults.map(r => r.memory.content).slice(0, 3)
  })
})

export default app
