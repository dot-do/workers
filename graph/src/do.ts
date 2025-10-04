/**
 * Graph Database Durable Object
 *
 * SQLite-backed graph database for Things & Relationships
 * Provides same interface as D1 but with DO SQLite storage
 */

import { DurableObject } from 'cloudflare:workers'
import type { Thing, Relationship, ThingFilter, RelationshipFilter, QueryResult } from '@do/graph-types'
import {
  createThing as apiCreateThing,
  getThing as apiGetThing,
  updateThing as apiUpdateThing,
  deleteThing as apiDeleteThing,
  queryThings as apiQueryThings,
  bulkCreateThings as apiBulkCreateThings,
  createRelationship as apiCreateRelationship,
  getInboundRelationships as apiGetInboundRelationships,
  getOutboundRelationships as apiGetOutboundRelationships,
  queryRelationships as apiQueryRelationships,
  deleteRelationship as apiDeleteRelationship,
  bulkCreateRelationships as apiBulkCreateRelationships,
} from '@do/graph-api'

/**
 * Environment for Durable Object
 */
export interface GraphDOEnv {
  GRAPH_DO: DurableObjectNamespace
}

/**
 * Graph Database Durable Object
 *
 * Each DO instance is an isolated graph database with SQLite storage
 */
export class GraphDO extends DurableObject {
  private sql: SqlStorage
  private initialized = false

  constructor(ctx: DurableObjectState, env: GraphDOEnv) {
    super(ctx, env)
    this.sql = this.ctx.storage.sql
  }

  /**
   * Initialize database schema
   */
  private async init() {
    if (this.initialized) return

    // Create Things table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS things (
        ulid TEXT PRIMARY KEY,
        ns TEXT NOT NULL,
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        content TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(ns, id)
      )
    `)

    // Create indexes for Things
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_things_ns_id ON things(ns, id)`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_things_type ON things(type)`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_things_content ON things(content)`)

    // Create Relationships table
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        ulid TEXT PRIMARY KEY,
        fromNs TEXT NOT NULL,
        fromId TEXT NOT NULL,
        fromType TEXT NOT NULL,
        predicate TEXT NOT NULL,
        toNs TEXT NOT NULL,
        toId TEXT NOT NULL,
        toType TEXT NOT NULL,
        data TEXT,
        createdAt TEXT NOT NULL,
        UNIQUE(fromNs, fromId, predicate, toNs, toId)
      )
    `)

    // Create indexes for Relationships (optimized for inbound queries)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_relationships_inbound ON relationships(toNs, toId, predicate)`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_relationships_outbound ON relationships(fromNs, fromId, predicate)`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_relationships_predicate ON relationships(predicate)`)

    this.initialized = true
  }

  /**
   * Fetch handler - main RPC interface
   */
  async fetch(request: Request): Promise<Response> {
    await this.init()

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Thing operations
      if (path === '/things' && request.method === 'POST') {
        const body = await request.json()
        if (Array.isArray(body)) {
          const result = await apiBulkCreateThings(body, this.sql)
          return Response.json(result)
        } else {
          const result = await apiCreateThing(body, this.sql)
          return Response.json(result)
        }
      }

      if (path.startsWith('/things/') && request.method === 'GET') {
        const [, , ns, id] = path.split('/')
        if (ns && id) {
          const result = await apiGetThing(ns, id, this.sql)
          return Response.json(result)
        }
      }

      if (path === '/things' && request.method === 'GET') {
        const filter: ThingFilter = {}
        if (url.searchParams.has('ns')) filter.ns = url.searchParams.get('ns')!
        if (url.searchParams.has('id')) filter.id = url.searchParams.get('id')!
        if (url.searchParams.has('type')) filter.type = url.searchParams.get('type')!
        if (url.searchParams.has('contentLike')) filter.contentLike = url.searchParams.get('contentLike')!

        const limit = parseInt(url.searchParams.get('limit') || '100')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const result = await apiQueryThings(filter, { limit, offset }, this.sql)
        return Response.json(result)
      }

      if (path.startsWith('/things/') && request.method === 'PATCH') {
        const [, , ns, id] = path.split('/')
        if (ns && id) {
          const updates = await request.json()
          const result = await apiUpdateThing(ns, id, updates, this.sql)
          return Response.json(result)
        }
      }

      if (path.startsWith('/things/') && request.method === 'DELETE') {
        const [, , ns, id] = path.split('/')
        if (ns && id) {
          const result = await apiDeleteThing(ns, id, this.sql)
          return Response.json({ deleted: result })
        }
      }

      // Relationship operations
      if (path === '/relationships' && request.method === 'POST') {
        const body = await request.json()
        if (Array.isArray(body)) {
          const result = await apiBulkCreateRelationships(body, this.sql)
          return Response.json(result)
        } else {
          const result = await apiCreateRelationship(body, this.sql)
          return Response.json(result)
        }
      }

      if (path.startsWith('/relationships/inbound/')) {
        const [, , , toNs, toId] = path.split('/')
        if (toNs && toId) {
          const predicate = url.searchParams.get('predicate') || undefined
          const limit = parseInt(url.searchParams.get('limit') || '100')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const result = await apiGetInboundRelationships(toNs, toId, { predicate, limit, offset }, this.sql)
          return Response.json(result)
        }
      }

      if (path.startsWith('/relationships/outbound/')) {
        const [, , , fromNs, fromId] = path.split('/')
        if (fromNs && fromId) {
          const predicate = url.searchParams.get('predicate') || undefined
          const limit = parseInt(url.searchParams.get('limit') || '100')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const result = await apiGetOutboundRelationships(fromNs, fromId, { predicate, limit, offset }, this.sql)
          return Response.json(result)
        }
      }

      if (path === '/relationships' && request.method === 'GET') {
        const filter: RelationshipFilter = {}
        if (url.searchParams.has('fromNs')) filter.fromNs = url.searchParams.get('fromNs')!
        if (url.searchParams.has('fromId')) filter.fromId = url.searchParams.get('fromId')!
        if (url.searchParams.has('fromType')) filter.fromType = url.searchParams.get('fromType')!
        if (url.searchParams.has('predicate')) filter.predicate = url.searchParams.get('predicate')!
        if (url.searchParams.has('toNs')) filter.toNs = url.searchParams.get('toNs')!
        if (url.searchParams.has('toId')) filter.toId = url.searchParams.get('toId')!

        const limit = parseInt(url.searchParams.get('limit') || '100')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const result = await apiQueryRelationships(filter, { limit, offset }, this.sql)
        return Response.json(result)
      }

      if (path.startsWith('/relationships/') && request.method === 'DELETE') {
        const ulid = path.split('/')[2]
        if (ulid) {
          const result = await apiDeleteRelationship(ulid, this.sql)
          return Response.json({ deleted: result })
        }
      }

      return new Response('Not Found', { status: 404 })
    } catch (error: any) {
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  /**
   * Direct RPC methods (for service bindings)
   */
  async createThing(thing: Thing): Promise<Thing & { ulid: string }> {
    await this.init()
    return await apiCreateThing(thing, this.sql)
  }

  async getThing(ns: string, id: string): Promise<(Thing & { ulid: string }) | null> {
    await this.init()
    return await apiGetThing(ns, id, this.sql)
  }

  async updateThing(ns: string, id: string, updates: Partial<Omit<Thing, 'ns' | 'id'>>): Promise<(Thing & { ulid: string }) | null> {
    await this.init()
    return await apiUpdateThing(ns, id, updates, this.sql)
  }

  async deleteThing(ns: string, id: string): Promise<boolean> {
    await this.init()
    return await apiDeleteThing(ns, id, this.sql)
  }

  async queryThings(filter: ThingFilter, options?: { limit?: number; offset?: number }): Promise<QueryResult<Thing & { ulid: string }>> {
    await this.init()
    return await apiQueryThings(filter, options, this.sql)
  }

  async bulkCreateThings(things: Thing[]) {
    await this.init()
    return await apiBulkCreateThings(things, this.sql)
  }

  async createRelationship(relationship: Relationship): Promise<Relationship & { ulid: string }> {
    await this.init()
    return await apiCreateRelationship(relationship, this.sql)
  }

  async getInboundRelationships(
    toNs: string,
    toId: string,
    options?: { predicate?: string; limit?: number; offset?: number }
  ): Promise<QueryResult<Relationship & { ulid: string }>> {
    await this.init()
    return await apiGetInboundRelationships(toNs, toId, options, this.sql)
  }

  async getOutboundRelationships(
    fromNs: string,
    fromId: string,
    options?: { predicate?: string; limit?: number; offset?: number }
  ): Promise<QueryResult<Relationship & { ulid: string }>> {
    await this.init()
    return await apiGetOutboundRelationships(fromNs, fromId, options, this.sql)
  }

  async queryRelationships(filter: RelationshipFilter, options?: { limit?: number; offset?: number }): Promise<QueryResult<Relationship & { ulid: string }>> {
    await this.init()
    return await apiQueryRelationships(filter, options, this.sql)
  }

  async deleteRelationship(ulid: string): Promise<boolean> {
    await this.init()
    return await apiDeleteRelationship(ulid, this.sql)
  }

  async bulkCreateRelationships(relationships: Relationship[]) {
    await this.init()
    return await apiBulkCreateRelationships(relationships, this.sql)
  }
}
