import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { RelationshipsServiceLogic } from './service'
import type { Relationship, RelationshipOptions, GraphNode, CreateRelationshipInput } from './service'

export { Relationship, RelationshipOptions, GraphNode, CreateRelationshipInput }

// ==================== RPC Service ====================

export class RelationshipsService extends WorkerEntrypoint<Env> {
  private getService() {
    return new RelationshipsServiceLogic(this.env.DB)
  }

  async getRelationships(fromNs: string, fromId: string, options?: RelationshipOptions): Promise<Relationship[]> {
    return await this.getService().getRelationships(fromNs, fromId, options)
  }

  async getIncomingRelationships(toNs: string, toId: string, options?: RelationshipOptions): Promise<Relationship[]> {
    return await this.getService().getIncomingRelationships(toNs, toId, options)
  }

  async createRelationship(data: CreateRelationshipInput): Promise<Relationship> {
    return await this.getService().createRelationship(data)
  }

  async deleteRelationship(id: string): Promise<void> {
    return await this.getService().deleteRelationship(id)
  }

  async getRelationshipGraph(ns: string, id: string, depth: number = 1): Promise<GraphNode> {
    return await this.getService().getRelationshipGraph(ns, id, depth)
  }
}

// ==================== HTTP Interface ====================

const app = new Hono<{ Bindings: Env }>()

// Get outgoing relationships
app.get('/relationships/:fromNs/:fromId', async (c) => {
  const service = new RelationshipsService(c.env, c.executionCtx)
  const rels = await service.getRelationships(c.req.param('fromNs'), c.req.param('fromId'), {
    type: c.req.query('type'),
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined,
    includeTo: c.req.query('includeTo') === 'true',
  })
  return c.json(rels)
})

// Get incoming relationships
app.get('/relationships/incoming/:toNs/:toId', async (c) => {
  const service = new RelationshipsService(c.env, c.executionCtx)
  const rels = await service.getIncomingRelationships(c.req.param('toNs'), c.req.param('toId'), {
    type: c.req.query('type'),
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined,
  })
  return c.json(rels)
})

// Create relationship
app.post('/relationships', async (c) => {
  const service = new RelationshipsService(c.env, c.executionCtx)
  const data = await c.req.json()
  const rel = await service.createRelationship(data)
  return c.json(rel, 201)
})

// Delete relationship
app.delete('/relationships/:id', async (c) => {
  const service = new RelationshipsService(c.env, c.executionCtx)
  await service.deleteRelationship(c.req.param('id'))
  return c.json({ success: true })
})

// Get relationship graph
app.get('/relationships/:ns/:id/graph', async (c) => {
  const service = new RelationshipsService(c.env, c.executionCtx)
  const depth = parseInt(c.req.query('depth') || '1')
  const graph = await service.getRelationshipGraph(c.req.param('ns'), c.req.param('id'), depth)
  return c.json(graph)
})

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}
