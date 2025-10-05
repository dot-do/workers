import type { D1Database } from '@cloudflare/workers-types'
import type { Thing, Relationship, ThingType, RelationshipType } from '../types/schema'

export class GraphDB {
  constructor(private db: D1Database) {}

  // Create a thing
  async createThing(thing: Omit<Thing, 'created_at' | 'updated_at'>): Promise<Thing> {
    const now = Math.floor(Date.now() / 1000)
    const metadata = thing.metadata ? JSON.stringify(thing.metadata) : null
    const tags = thing.tags ? JSON.stringify(thing.tags) : null

    await this.db
      .prepare(
        `INSERT INTO things (id, type, name, description, metadata, created_by, status, version, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        thing.id,
        thing.type,
        thing.name,
        thing.description || null,
        metadata,
        thing.created_by || null,
        thing.status,
        thing.version || null,
        tags,
        now,
        now
      )
      .run()

    return { ...thing, created_at: now, updated_at: now }
  }

  // Get a thing by ID
  async getThing(id: string): Promise<Thing | null> {
    const result = await this.db.prepare('SELECT * FROM things WHERE id = ?').bind(id).first()

    if (!result) return null

    return this.parseThingRow(result)
  }

  // Create a relationship
  async createRelationship(rel: Omit<Relationship, 'created_at'>): Promise<Relationship> {
    const now = Math.floor(Date.now() / 1000)
    const properties = rel.properties ? JSON.stringify(rel.properties) : null

    await this.db
      .prepare(
        `INSERT INTO relationships (id, source_id, target_id, type, properties, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(rel.id, rel.source_id, rel.target_id, rel.type, properties, rel.created_by || null, now)
      .run()

    return { ...rel, created_at: now }
  }

  // Get relationships for a thing
  async getRelationships(thingId: string, type?: RelationshipType, direction: 'out' | 'in' | 'both' = 'both'): Promise<Relationship[]> {
    let query = 'SELECT * FROM relationships WHERE '
    const params: any[] = []

    if (direction === 'out') {
      query += 'source_id = ?'
      params.push(thingId)
    } else if (direction === 'in') {
      query += 'target_id = ?'
      params.push(thingId)
    } else {
      query += '(source_id = ? OR target_id = ?)'
      params.push(thingId, thingId)
    }

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    const result = await this.db.prepare(query).bind(...params).all()

    return result.results.map((row) => this.parseRelationshipRow(row))
  }

  // Traverse the graph (find connected things)
  async traverse(startId: string, relationshipType?: RelationshipType, maxDepth: number = 3): Promise<Thing[]> {
    const visited = new Set<string>()
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }]
    const things: Thing[] = []

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!

      if (visited.has(id) || depth > maxDepth) continue
      visited.add(id)

      const thing = await this.getThing(id)
      if (thing) things.push(thing)

      const relationships = await this.getRelationships(id, relationshipType, 'out')

      for (const rel of relationships) {
        if (!visited.has(rel.target_id)) {
          queue.push({ id: rel.target_id, depth: depth + 1 })
        }
      }
    }

    return things
  }

  // Get model lineage (upstream dependencies)
  async getModelLineage(modelId: string): Promise<{ things: Thing[]; relationships: Relationship[] }> {
    const things: Thing[] = []
    const relationships: Relationship[] = []
    const visited = new Set<string>()

    const traverse = async (id: string) => {
      if (visited.has(id)) return
      visited.add(id)

      const thing = await this.getThing(id)
      if (thing) things.push(thing)

      const rels = await this.getRelationships(id, undefined, 'in')
      for (const rel of rels) {
        relationships.push(rel)
        await traverse(rel.source_id)
      }
    }

    await traverse(modelId)

    return { things, relationships }
  }

  // Search things by type and filters
  async searchThings(type: ThingType, filters?: { status?: string; tags?: string[] }): Promise<Thing[]> {
    let query = 'SELECT * FROM things WHERE type = ?'
    const params: any[] = [type]

    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    const result = await this.db.prepare(query).bind(...params).all()

    let things = result.results.map((row) => this.parseThingRow(row))

    // Filter by tags if provided
    if (filters?.tags && filters.tags.length > 0) {
      things = things.filter((thing) => {
        if (!thing.tags) return false
        return filters.tags!.some((tag) => thing.tags!.includes(tag))
      })
    }

    return things
  }

  // Helper to parse thing row
  private parseThingRow(row: any): Thing {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      status: row.status,
      version: row.version,
      tags: row.tags ? JSON.parse(row.tags) : undefined
    }
  }

  // Helper to parse relationship row
  private parseRelationshipRow(row: any): Relationship {
    return {
      id: row.id,
      source_id: row.source_id,
      target_id: row.target_id,
      type: row.type,
      properties: row.properties ? JSON.parse(row.properties) : undefined,
      created_at: row.created_at,
      created_by: row.created_by
    }
  }
}
