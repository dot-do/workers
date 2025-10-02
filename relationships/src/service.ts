import { z } from 'zod'

// ==================== Types ====================

export interface Relationship {
  ns: string
  id: string
  type: string
  fromNs: string
  fromId: string
  toNs: string
  toId: string
  data: Record<string, any>
  code?: string
  visibility: 'public' | 'private' | 'unlisted'
  createdAt: Date
  updatedAt: Date
  toThing?: any
}

export interface RelationshipOptions {
  type?: string
  limit?: number
  offset?: number
  includeTo?: boolean
}

export interface GraphNode {
  thing: any
  relationships: Array<Relationship & { node?: GraphNode }>
}

export interface CreateRelationshipInput {
  type: string
  fromNs: string
  fromId: string
  toNs: string
  toId: string
  data?: Record<string, any>
  code?: string
  visibility?: 'public' | 'private' | 'unlisted'
}

export interface DB {
  get(url: string): Promise<any>
  put(url: string, data: any): Promise<void>
  sql(query: string, ...params: any[]): Promise<{ data?: any[] }>
}

// ==================== Schemas ====================

export const createRelationshipSchema = z.object({
  type: z.string().min(1),
  fromNs: z.string().min(1),
  fromId: z.string().min(1),
  toNs: z.string().min(1),
  toId: z.string().min(1),
  data: z.record(z.any()).optional().default({}),
  code: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional().default('public'),
})

export const relationshipOptionsSchema = z.object({
  type: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
  includeTo: z.boolean().optional().default(false),
})

// ==================== Service Logic ====================

export class RelationshipsServiceLogic {
  constructor(private db: DB) {}

  async getRelationships(fromNs: string, fromId: string, options?: RelationshipOptions): Promise<Relationship[]> {
    const opts = relationshipOptionsSchema.parse(options || {})

    let sql = `SELECT * FROM relationships WHERE fromNs = ? AND fromId = ?`
    const params: any[] = [fromNs, fromId]

    if (opts.type) {
      sql += ` AND type = ?`
      params.push(opts.type)
    }

    sql += ` LIMIT ? OFFSET ?`
    params.push(opts.limit, opts.offset)

    const rels = await this.db.sql(sql, ...params)

    if (opts.includeTo && rels.data) {
      for (const rel of rels.data) {
        const toThing = await this.db.get(`https://${rel.toNs}/${rel.toId}`)
        if (toThing) rel.toThing = toThing
      }
    }

    return (rels.data || []) as Relationship[]
  }

  async getIncomingRelationships(toNs: string, toId: string, options?: RelationshipOptions): Promise<Relationship[]> {
    const opts = relationshipOptionsSchema.parse(options || {})

    let sql = `SELECT * FROM relationships WHERE toNs = ? AND toId = ?`
    const params: any[] = [toNs, toId]

    if (opts.type) {
      sql += ` AND type = ?`
      params.push(opts.type)
    }

    sql += ` LIMIT ? OFFSET ?`
    params.push(opts.limit, opts.offset)

    const rels = await this.db.sql(sql, ...params)
    return (rels.data || []) as Relationship[]
  }

  async createRelationship(data: CreateRelationshipInput): Promise<Relationship> {
    const validated = createRelationshipSchema.parse(data)

    const from = await this.db.get(`https://${validated.fromNs}/${validated.fromId}`)
    const to = await this.db.get(`https://${validated.toNs}/${validated.toId}`)

    if (!from || !to) {
      throw new Error('Source or target thing not found')
    }

    if (await this.wouldCreateCycle(validated)) {
      throw new Error('Would create circular relationship')
    }

    const id = `${validated.fromNs}-${validated.fromId}-${validated.type}-${validated.toNs}-${validated.toId}`

    const relationship = {
      ns: 'relationship',
      id,
      type: validated.type,
      fromNs: validated.fromNs,
      fromId: validated.fromId,
      toNs: validated.toNs,
      toId: validated.toId,
      data: validated.data || {},
      code: validated.code,
      visibility: validated.visibility || 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.db.put(`https://relationship/${id}`, relationship)
    return relationship as Relationship
  }

  async deleteRelationship(id: string): Promise<void> {
    await this.db.sql(`DELETE FROM relationships WHERE ns = 'relationship' AND id = ?`, id)
  }

  async getRelationshipGraph(ns: string, id: string, depth: number = 1): Promise<GraphNode> {
    if (depth < 0 || depth > 5) {
      throw new Error('Depth must be between 0 and 5')
    }

    const thing = await this.db.get(`https://${ns}/${id}`)

    if (!thing) {
      throw new Error('Thing not found')
    }

    const relationships = await this.getRelationships(ns, id, { limit: 100 })

    const node: GraphNode = {
      thing,
      relationships: [],
    }

    if (depth > 0) {
      for (const rel of relationships) {
        try {
          const childNode = await this.getRelationshipGraph(rel.toNs, rel.toId, depth - 1)
          node.relationships.push({ ...rel, node: childNode })
        } catch (error) {
          node.relationships.push(rel)
        }
      }
    } else {
      node.relationships = relationships
    }

    return node
  }

  async wouldCreateCycle(rel: CreateRelationshipInput): Promise<boolean> {
    const visited = new Set<string>()
    const stack = [`${rel.toNs}:${rel.toId}`]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)

      if (current === `${rel.fromNs}:${rel.fromId}`) {
        return true
      }

      const [ns, id] = current.split(':')
      const rels = await this.getRelationships(ns, id, { limit: 100 })

      for (const r of rels) {
        stack.push(`${r.toNs}:${r.toId}`)
      }
    }

    return false
  }
}
