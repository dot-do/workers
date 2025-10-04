/**
 * Graph Service Worker
 *
 * Exposes Things & Relationships API via:
 * - RPC (WorkerEntrypoint for service-to-service calls)
 * - REST (Hono HTTP API)
 * - MCP (Model Context Protocol for AI agents)
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Thing, Relationship, ThingFilter, RelationshipFilter, QueryResult } from '@dot-do/graph-types'
import {
  createThing,
  getThing,
  updateThing,
  deleteThing,
  queryThings,
  bulkCreateThings,
  createRelationship,
  getInboundRelationships,
  getOutboundRelationships,
  queryRelationships,
  deleteRelationship,
  bulkCreateRelationships,
} from '@dot-do/graph-api'

/**
 * Environment bindings
 */
export interface Env {
  // Database binding (D1, R2 SQL, or ClickHouse)
  DB: any // Will be typed based on implementation

  // Service bindings
  AUTH_SERVICE?: any
}

/**
 * Graph Service - RPC Interface
 *
 * For service-to-service calls via Workers RPC
 */
export class GraphService extends WorkerEntrypoint<Env> {
  // ============================================================
  // THING OPERATIONS
  // ============================================================

  /**
   * Create a new thing
   */
  async createThing(thing: Thing): Promise<Thing & { ulid: string }> {
    return await createThing(thing, this.env.DB)
  }

  /**
   * Get thing by ns+id (most common operation)
   */
  async getThing(ns: string, id: string): Promise<(Thing & { ulid: string }) | null> {
    return await getThing(ns, id, this.env.DB)
  }

  /**
   * Update thing
   */
  async updateThing(ns: string, id: string, updates: Partial<Omit<Thing, 'ns' | 'id'>>): Promise<(Thing & { ulid: string }) | null> {
    return await updateThing(ns, id, updates, this.env.DB)
  }

  /**
   * Delete thing
   */
  async deleteThing(ns: string, id: string): Promise<boolean> {
    return await deleteThing(ns, id, this.env.DB)
  }

  /**
   * Query things
   */
  async queryThings(filter: ThingFilter, options?: { limit?: number; offset?: number }): Promise<QueryResult<Thing & { ulid: string }>> {
    return await queryThings(filter, options, this.env.DB)
  }

  /**
   * Bulk create things
   */
  async bulkCreateThings(things: Thing[]) {
    return await bulkCreateThings(things, this.env.DB)
  }

  // ============================================================
  // RELATIONSHIP OPERATIONS
  // ============================================================

  /**
   * Create a new relationship
   */
  async createRelationship(relationship: Relationship): Promise<Relationship & { ulid: string }> {
    return await createRelationship(relationship, this.env.DB)
  }

  /**
   * Get inbound relationships (what points TO this thing)
   * PRIMARY USE CASE - optimized by index
   */
  async getInboundRelationships(
    toNs: string,
    toId: string,
    options?: { predicate?: string; limit?: number; offset?: number }
  ): Promise<QueryResult<Relationship & { ulid: string }>> {
    return await getInboundRelationships(toNs, toId, options, this.env.DB)
  }

  /**
   * Get outbound relationships (what this thing points TO)
   */
  async getOutboundRelationships(
    fromNs: string,
    fromId: string,
    options?: { predicate?: string; limit?: number; offset?: number }
  ): Promise<QueryResult<Relationship & { ulid: string }>> {
    return await getOutboundRelationships(fromNs, fromId, options, this.env.DB)
  }

  /**
   * Query relationships
   */
  async queryRelationships(
    filter: RelationshipFilter,
    options?: { limit?: number; offset?: number }
  ): Promise<QueryResult<Relationship & { ulid: string }>> {
    return await queryRelationships(filter, options, this.env.DB)
  }

  /**
   * Delete relationship
   */
  async deleteRelationship(ulid: string): Promise<boolean> {
    return await deleteRelationship(ulid, this.env.DB)
  }

  /**
   * Bulk create relationships
   */
  async bulkCreateRelationships(relationships: Relationship[]) {
    return await bulkCreateRelationships(relationships, this.env.DB)
  }
}

// ============================================================
// HTTP API (Hono)
// ============================================================

const app = new Hono<{ Bindings: Env }>()

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'graph' })
})

// ============================================================
// THING ROUTES
// ============================================================

/**
 * Create thing
 * POST /things
 */
app.post('/things', async (c) => {
  const thing: Thing = await c.req.json()
  const result = await createThing(thing, c.env.DB)
  return c.json(result, 201)
})

/**
 * Get thing by ns+id
 * GET /things/:ns/:id
 */
app.get('/things/:ns/:id', async (c) => {
  const ns = c.req.param('ns')
  const id = c.req.param('id')
  const thing = await getThing(ns, id, c.env.DB)

  if (!thing) {
    return c.json({ error: 'Thing not found' }, 404)
  }

  return c.json(thing)
})

/**
 * Update thing
 * PATCH /things/:ns/:id
 */
app.patch('/things/:ns/:id', async (c) => {
  const ns = c.req.param('ns')
  const id = c.req.param('id')
  const updates: Partial<Thing> = await c.req.json()

  const thing = await updateThing(ns, id, updates, c.env.DB)

  if (!thing) {
    return c.json({ error: 'Thing not found' }, 404)
  }

  return c.json(thing)
})

/**
 * Delete thing
 * DELETE /things/:ns/:id
 */
app.delete('/things/:ns/:id', async (c) => {
  const ns = c.req.param('ns')
  const id = c.req.param('id')
  const deleted = await deleteThing(ns, id, c.env.DB)

  if (!deleted) {
    return c.json({ error: 'Thing not found' }, 404)
  }

  return c.json({ success: true })
})

/**
 * Query things
 * GET /things?ns=xxx&type=xxx&limit=100
 */
app.get('/things', async (c) => {
  const ns = c.req.query('ns')
  const id = c.req.query('id')
  const type = c.req.query('type')
  const contentLike = c.req.query('contentLike')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = parseInt(c.req.query('offset') || '0')

  const filter: ThingFilter = {}
  if (ns) filter.ns = ns
  if (id) filter.id = id
  if (type) filter.type = type
  if (contentLike) filter.contentLike = contentLike

  const result = await queryThings(filter, { limit, offset }, c.env.DB)
  return c.json(result)
})

/**
 * Bulk create things
 * POST /things/bulk
 */
app.post('/things/bulk', async (c) => {
  const things: Thing[] = await c.req.json()
  const result = await bulkCreateThings(things, c.env.DB)
  return c.json(result)
})

// ============================================================
// RELATIONSHIP ROUTES
// ============================================================

/**
 * Create relationship
 * POST /relationships
 */
app.post('/relationships', async (c) => {
  const relationship: Relationship = await c.req.json()
  const result = await createRelationship(relationship, c.env.DB)
  return c.json(result, 201)
})

/**
 * Get inbound relationships (what points TO this thing)
 * GET /relationships/inbound/:toNs/:toId
 */
app.get('/relationships/inbound/:toNs/:toId', async (c) => {
  const toNs = c.req.param('toNs')
  const toId = c.req.param('toId')
  const predicate = c.req.query('predicate')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = parseInt(c.req.query('offset') || '0')

  const result = await getInboundRelationships(toNs, toId, { predicate, limit, offset }, c.env.DB)
  return c.json(result)
})

/**
 * Get outbound relationships (what this thing points TO)
 * GET /relationships/outbound/:fromNs/:fromId
 */
app.get('/relationships/outbound/:fromNs/:fromId', async (c) => {
  const fromNs = c.req.param('fromNs')
  const fromId = c.req.param('fromId')
  const predicate = c.req.query('predicate')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = parseInt(c.req.query('offset') || '0')

  const result = await getOutboundRelationships(fromNs, fromId, { predicate, limit, offset }, c.env.DB)
  return c.json(result)
})

/**
 * Query relationships
 * GET /relationships?fromNs=xxx&toNs=xxx&predicate=xxx
 */
app.get('/relationships', async (c) => {
  const fromNs = c.req.query('fromNs')
  const fromId = c.req.query('fromId')
  const fromType = c.req.query('fromType')
  const predicate = c.req.query('predicate')
  const toNs = c.req.query('toNs')
  const toId = c.req.query('toId')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = parseInt(c.req.query('offset') || '0')

  const filter: RelationshipFilter = {}
  if (fromNs) filter.fromNs = fromNs
  if (fromId) filter.fromId = fromId
  if (fromType) filter.fromType = fromType
  if (predicate) filter.predicate = predicate
  if (toNs) filter.toNs = toNs
  if (toId) filter.toId = toId

  const result = await queryRelationships(filter, { limit, offset }, c.env.DB)
  return c.json(result)
})

/**
 * Delete relationship
 * DELETE /relationships/:ulid
 */
app.delete('/relationships/:ulid', async (c) => {
  const ulid = c.req.param('ulid')
  const deleted = await deleteRelationship(ulid, c.env.DB)

  if (!deleted) {
    return c.json({ error: 'Relationship not found' }, 404)
  }

  return c.json({ success: true })
})

/**
 * Bulk create relationships
 * POST /relationships/bulk
 */
app.post('/relationships/bulk', async (c) => {
  const relationships: Relationship[] = await c.req.json()
  const result = await bulkCreateRelationships(relationships, c.env.DB)
  return c.json(result)
})

// Export Durable Object
export { GraphDO } from './do.js'

// Export both RPC and HTTP interfaces
export default {
  fetch: app.fetch,
}
