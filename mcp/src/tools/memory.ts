import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Knowledge Graph Memory Tools
 * Free tools for managing entities, relations, and observations
 *
 * ⚡ These tools are optimized with CapnWeb queuing for batch operations!
 * - Creating 10 entities = 1 RPC batch (not 10 round-trips)
 * - All memory operations use efficient batching internally
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'memory_create_entities',
      description: 'Create multiple new entities in the knowledge graph. ⚡ Optimized: All entities created in a single RPC batch via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                entityType: { type: 'string' },
                observations: { type: 'array', items: { type: 'string' } }
              },
              required: ['name', 'entityType', 'observations']
            }
          }
        },
        required: ['entities']
      }
    },
    {
      name: 'memory_create_relations',
      description: 'Create multiple new relations between entities. ⚡ Optimized: All relations created in a single RPC batch via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          relations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                relationType: { type: 'string' }
              },
              required: ['from', 'to', 'relationType']
            }
          }
        },
        required: ['relations']
      }
    },
    {
      name: 'memory_add_observations',
      description: 'Add new observations to existing entities. ⚡ Optimized: Batched reads then batched writes via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          observations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityName: { type: 'string' },
                contents: { type: 'array', items: { type: 'string' } }
              },
              required: ['entityName', 'contents']
            }
          }
        },
        required: ['observations']
      }
    },
    {
      name: 'memory_delete_entities',
      description: 'Remove entities and their relations. ⚡ Optimized: All deletes batched into single RPC call via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          entityNames: { type: 'array', items: { type: 'string' } }
        },
        required: ['entityNames']
      }
    },
    {
      name: 'memory_delete_observations',
      description: 'Remove specific observations from entities. ⚡ Optimized: Batched reads then batched writes via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          deletions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityName: { type: 'string' },
                observations: { type: 'array', items: { type: 'string' } }
              },
              required: ['entityName', 'observations']
            }
          }
        },
        required: ['deletions']
      }
    },
    {
      name: 'memory_delete_relations',
      description: 'Remove specific relations from the graph. ⚡ Optimized: All deletes batched into single RPC call via CapnWeb queuing.',
      inputSchema: {
        type: 'object',
        properties: {
          relations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                relationType: { type: 'string' }
              },
              required: ['from', 'to', 'relationType']
            }
          }
        },
        required: ['relations']
      }
    },
    {
      name: 'memory_read_graph',
      description: 'Read the entire knowledge graph',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'memory_search_nodes',
      description: 'Search for nodes based on query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    }
  ]
}

// Entity type
interface Entity {
  name: string
  entityType: string
  observations: string[]
}

// Relation type
interface Relation {
  from: string
  to: string
  relationType: string
}

// Knowledge Graph type
interface KnowledgeGraph {
  entities: Entity[]
  relations: Relation[]
}

export async function memory_create_entities(
  args: { entities: Entity[] },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // Store entities in database with CapnWeb queuing
  // ⚡ Queue all upserts without await, then batch them
  const promises = []
  for (const entity of args.entities) {
    promises.push(db.upsert({
      ns: 'memory',
      id: entity.name,
      data: entity
    }))
  }

  // Single RPC batch for all entities (much faster than sequential awaits!)
  await Promise.all(promises)

  return { created: args.entities }
}

export async function memory_create_relations(
  args: { relations: Relation[] },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // ⚡ CapnWeb: Queue all upserts, then batch
  const promises = []
  for (const relation of args.relations) {
    const id = `${relation.from}:${relation.relationType}:${relation.to}`
    promises.push(db.upsert({
      ns: 'memory_relations',
      id,
      data: relation
    }))
  }

  await Promise.all(promises)

  return { created: args.relations }
}

export async function memory_add_observations(
  args: { observations: Array<{ entityName: string; contents: string[] }> },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // ⚡ CapnWeb: Batch reads first, then batch writes
  // Step 1: Queue all gets (reads must be awaited)
  const getPromises = args.observations.map(obs =>
    db.get({ ns: 'memory', id: obs.entityName })
  )
  const entities = await Promise.all(getPromises)

  // Step 2: Queue all upserts (writes can be batched)
  const results: any = {}
  const upsertPromises = []

  for (let i = 0; i < args.observations.length; i++) {
    const obs = args.observations[i]
    const entity = entities[i]

    if (entity && entity.data) {
      const existingObs = (entity.data as Entity).observations || []
      const newObs = obs.contents.filter(c => !existingObs.includes(c))

      upsertPromises.push(db.upsert({
        ns: 'memory',
        id: obs.entityName,
        data: {
          ...(entity.data as Entity),
          observations: [...existingObs, ...newObs]
        }
      }))

      results[obs.entityName] = newObs
    }
  }

  await Promise.all(upsertPromises)

  return results
}

export async function memory_delete_entities(
  args: { entityNames: string[] },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // ⚡ CapnWeb: Batch reads first, then batch deletes
  // Get all relations first (single query)
  const relations = await db.list({ ns: 'memory_relations' })

  // Queue all entity deletes
  const deletePromises = args.entityNames.map(name =>
    db.delete({ ns: 'memory', id: name })
  )

  // Queue relation deletes for entities being removed
  if (relations.items) {
    for (const rel of relations.items) {
      const relData = rel.data as Relation
      if (args.entityNames.includes(relData.from) || args.entityNames.includes(relData.to)) {
        deletePromises.push(db.delete({ ns: 'memory_relations', id: rel.id }))
      }
    }
  }

  await Promise.all(deletePromises)

  return { deleted: args.entityNames }
}

export async function memory_delete_observations(
  args: { deletions: Array<{ entityName: string; observations: string[] }> },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // ⚡ CapnWeb: Batch reads first, then batch writes
  const getPromises = args.deletions.map(deletion =>
    db.get({ ns: 'memory', id: deletion.entityName })
  )
  const entities = await Promise.all(getPromises)

  // Queue all upserts
  const upsertPromises = []
  for (let i = 0; i < args.deletions.length; i++) {
    const deletion = args.deletions[i]
    const entity = entities[i]

    if (entity && entity.data) {
      const currentObs = (entity.data as Entity).observations || []
      const newObs = currentObs.filter(obs => !deletion.observations.includes(obs))

      upsertPromises.push(db.upsert({
        ns: 'memory',
        id: deletion.entityName,
        data: {
          ...(entity.data as Entity),
          observations: newObs
        }
      }))
    }
  }

  await Promise.all(upsertPromises)

  return { success: true }
}

export async function memory_delete_relations(
  args: { relations: Relation[] },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  // ⚡ CapnWeb: Queue all deletes, then batch
  const deletePromises = args.relations.map(relation => {
    const id = `${relation.from}:${relation.relationType}:${relation.to}`
    return db.delete({ ns: 'memory_relations', id })
  })

  await Promise.all(deletePromises)

  return { success: true }
}

export async function memory_read_graph(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<KnowledgeGraph> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  const entitiesResult = await db.list({ ns: 'memory' })
  const relationsResult = await db.list({ ns: 'memory_relations' })

  return {
    entities: entitiesResult.items?.map(item => item.data as Entity) || [],
    relations: relationsResult.items?.map(item => item.data as Relation) || []
  }
}

export async function memory_search_nodes(
  args: { query: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const db = c.env.DB
  if (!db) throw new Error('DB service not available')

  const results = await db.search({
    query: args.query,
    namespace: 'memory',
    mode: 'hybrid',
    limit: 20
  })

  return { entities: results.results || [] }
}
