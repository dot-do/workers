/**
 * Semantic Triple Network Worker
 *
 * Main entrypoint providing RPC, HTTP, MCP, and Queue interfaces
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type {
  Env,
  Triple,
  VerbDefinition,
  RoleDefinition,
  CapabilityCheck,
  GraphResult,
  Path,
  CreateTripleRequest,
  QueryTriplesRequest,
  TraverseGraphRequest,
  FindPathsRequest,
  QueueMessage,
  McpTool,
} from './types'

import {
  createTriple,
  getTriple,
  queryTriples,
  deleteTriple,
} from './triples'

import {
  initializeVerbRegistry,
  resolveVerb,
  listVerbs,
  registerVerb,
} from './verbs'

import {
  initializeRoleRegistry,
  resolveRole,
  checkCapability,
  getRoleCapabilities,
  registerRole,
  listRoles,
} from './roles'

import {
  traverseGraph,
  findPaths,
  getNeighbors,
  executeQuery,
  getPredicateStats,
  getSubjectStats,
} from './query'

// Initialize registries
initializeVerbRegistry()
initializeRoleRegistry()

// ===== RPC Interface (WorkerEntrypoint) =====

export class IngService extends WorkerEntrypoint<Env> {
  // === Triple Operations ===

  async createTriple(params: CreateTripleRequest): Promise<Triple> {
    const userId = 'system' // TODO: Get from auth context
    return await createTriple(params, userId, this.env)
  }

  async getTriple(id: string): Promise<Triple | null> {
    return await getTriple(id, this.env)
  }

  async queryTriples(pattern: QueryTriplesRequest): Promise<{ triples: Triple[]; total: number }> {
    return await queryTriples(pattern, this.env)
  }

  async deleteTriple(id: string): Promise<boolean> {
    const userId = 'system' // TODO: Get from auth context
    return await deleteTriple(id, userId, this.env)
  }

  // === Verb Operations ===

  async resolveVerb(gerund: string): Promise<VerbDefinition | null> {
    return await resolveVerb(gerund, this.env)
  }

  async listVerbs(category?: string): Promise<VerbDefinition[]> {
    return await listVerbs(category, this.env)
  }

  async registerVerb(definition: VerbDefinition): Promise<VerbDefinition> {
    return await registerVerb(definition, this.env)
  }

  // === Role Operations ===

  async resolveRole(subject: string): Promise<RoleDefinition | null> {
    return await resolveRole(subject, this.env)
  }

  async checkCapability(role: string, verb: string): Promise<CapabilityCheck> {
    return await checkCapability(role, verb, this.env)
  }

  async getRoleCapabilities(role: string): Promise<string[]> {
    return await getRoleCapabilities(role, this.env)
  }

  async registerRole(definition: RoleDefinition): Promise<RoleDefinition> {
    return await registerRole(definition, this.env)
  }

  async listRoles(): Promise<RoleDefinition[]> {
    return await listRoles(this.env)
  }

  // === Graph Operations ===

  async traverse(params: TraverseGraphRequest): Promise<GraphResult> {
    return await traverseGraph(params.start, params.depth, params.direction, this.env)
  }

  async findPaths(params: FindPathsRequest): Promise<Path[]> {
    const maxDepth = params.maxDepth ?? 5
    return await findPaths(params.from, params.to, maxDepth, this.env)
  }

  async getNeighbors(node: string, direction: 'forward' | 'backward' | 'both' = 'both'): Promise<string[]> {
    const neighbors = await getNeighbors(node, direction, this.env)
    return neighbors.map(n => n.nodeId)
  }

  // === Query Operations ===

  async executeQuery(pattern: string): Promise<Triple[]> {
    return await executeQuery(pattern, this.env)
  }

  async getStats(): Promise<{ predicates: Record<string, number>; subjects: Record<string, number> }> {
    const predicates = await getPredicateStats(this.env)
    const subjects = await getSubjectStats(this.env)
    return { predicates, subjects }
  }
}

// ===== HTTP API (Hono) =====

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors())

// Health check
app.get('/health', c => c.json({ status: 'ok', service: 'ing', timestamp: new Date().toISOString() }))

// === Triple Routes ===

app.post('/triples', async c => {
  try {
    const body = await c.req.json<CreateTripleRequest>()
    const service = new IngService(c.env.ctx, c.env)
    const triple = await service.createTriple(body)
    return c.json({ success: true, triple })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/triples/:id', async c => {
  try {
    const id = c.req.param('id')
    const service = new IngService(c.env.ctx, c.env)
    const triple = await service.getTriple(id)

    if (!triple) {
      return c.json({ success: false, error: 'Triple not found' }, 404)
    }

    return c.json({ success: true, triple })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/triples', async c => {
  try {
    const query = c.req.query()
    const pattern: QueryTriplesRequest = {
      subject: query.subject,
      predicate: query.predicate,
      object: query.object,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    }

    const service = new IngService(c.env.ctx, c.env)
    const result = await service.queryTriples(pattern)

    return c.json({ success: true, triples: result.triples, total: result.total })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.delete('/triples/:id', async c => {
  try {
    const id = c.req.param('id')
    const service = new IngService(c.env.ctx, c.env)
    const deleted = await service.deleteTriple(id)

    if (!deleted) {
      return c.json({ success: false, error: 'Triple not found or already deleted' }, 404)
    }

    return c.json({ success: true, message: 'Triple deleted' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// === Verb Routes ===

app.get('/verbs/:gerund', async c => {
  try {
    const gerund = c.req.param('gerund')
    const service = new IngService(c.env.ctx, c.env)
    const verb = await service.resolveVerb(gerund)

    if (!verb) {
      return c.json({ success: false, error: 'Verb not found' }, 404)
    }

    return c.json({ success: true, verb })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/verbs', async c => {
  try {
    const category = c.req.query('category')
    const service = new IngService(c.env.ctx, c.env)
    const verbs = await service.listVerbs(category)

    return c.json({ success: true, verbs, count: verbs.length })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.post('/verbs', async c => {
  try {
    const body = await c.req.json<VerbDefinition>()
    const service = new IngService(c.env.ctx, c.env)
    const verb = await service.registerVerb(body)

    return c.json({ success: true, verb })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// === Role Routes ===

app.get('/roles/:subject', async c => {
  try {
    const subject = c.req.param('subject')
    const service = new IngService(c.env.ctx, c.env)
    const role = await service.resolveRole(subject)

    if (!role) {
      return c.json({ success: false, error: 'Role not found' }, 404)
    }

    return c.json({ success: true, role })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/roles/:role/capabilities', async c => {
  try {
    const role = c.req.param('role')
    const service = new IngService(c.env.ctx, c.env)
    const capabilities = await service.getRoleCapabilities(role)

    return c.json({ success: true, role, capabilities })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.post('/roles/:role/check/:verb', async c => {
  try {
    const role = c.req.param('role')
    const verb = c.req.param('verb')
    const service = new IngService(c.env.ctx, c.env)
    const capability = await service.checkCapability(role, verb)

    return c.json({ success: true, role, verb, capability })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/roles', async c => {
  try {
    const service = new IngService(c.env.ctx, c.env)
    const roles = await service.listRoles()

    return c.json({ success: true, roles, count: roles.length })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// === Graph Routes ===

app.post('/graph/traverse', async c => {
  try {
    const body = await c.req.json<TraverseGraphRequest>()
    const service = new IngService(c.env.ctx, c.env)
    const graph = await service.traverse(body)

    return c.json({ success: true, graph })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.post('/graph/paths', async c => {
  try {
    const body = await c.req.json<FindPathsRequest>()
    const service = new IngService(c.env.ctx, c.env)
    const paths = await service.findPaths(body)

    return c.json({ success: true, paths, count: paths.length })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/graph/:node/neighbors', async c => {
  try {
    const node = c.req.param('node')
    const direction = (c.req.query('direction') as 'forward' | 'backward' | 'both') || 'both'
    const service = new IngService(c.env.ctx, c.env)
    const neighbors = await service.getNeighbors(node, direction)

    return c.json({ success: true, node, direction, neighbors, count: neighbors.length })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// === Query Routes ===

app.post('/query', async c => {
  try {
    const body = await c.req.json<{ pattern: string }>()
    const service = new IngService(c.env.ctx, c.env)
    const triples = await service.executeQuery(body.pattern)

    return c.json({ success: true, triples, count: triples.length })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

app.get('/stats', async c => {
  try {
    const service = new IngService(c.env.ctx, c.env)
    const stats = await service.getStats()

    return c.json({ success: true, stats })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// === URL Pattern Routes (semantic triple URLs) ===

app.get('/:verb/:subject/:object', async c => {
  try {
    const verb = c.req.param('verb')
    const subject = c.req.param('subject')
    const object = c.req.param('object')

    const service = new IngService(c.env.ctx, c.env)
    const result = await service.queryTriples({
      subject,
      predicate: verb,
      object,
      limit: 1,
    })

    if (result.triples.length === 0) {
      return c.json({ success: false, error: 'Triple not found' }, 404)
    }

    return c.json({ success: true, triple: result.triples[0] })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// ===== MCP Server Tools =====

export const mcpTools: McpTool[] = [
  {
    name: 'ing_create_triple',
    description: 'Create a semantic triple relating subject, predicate, and object',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'The agent/role performing the action' },
        predicate: { type: 'string', description: 'The action/verb in gerund form' },
        object: { type: 'string', description: 'The target entity' },
        context: { type: 'object', description: '5W1H metadata (optional)' },
      },
      required: ['subject', 'predicate', 'object'],
    },
    handler: async (input: CreateTripleRequest) => {
      // This would be called by MCP server
      // Implementation provided by MCP integration
      return { success: true, message: 'Triple created' }
    },
  },

  {
    name: 'ing_query_triples',
    description: 'Search for semantic triples matching a pattern',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Subject filter (optional)' },
        predicate: { type: 'string', description: 'Predicate filter (optional)' },
        object: { type: 'string', description: 'Object filter (optional)' },
        limit: { type: 'number', default: 10, description: 'Maximum results' },
      },
    },
    handler: async (input: QueryTriplesRequest) => {
      return { success: true, triples: [] }
    },
  },

  {
    name: 'ing_resolve_verb',
    description: 'Get the full definition of a verb from its gerund form',
    inputSchema: {
      type: 'object',
      properties: {
        gerund: { type: 'string', description: 'Verb in gerund form (e.g., "invoicing")' },
      },
      required: ['gerund'],
    },
    handler: async (input: { gerund: string }) => {
      return { success: true, verb: null }
    },
  },

  {
    name: 'ing_check_capability',
    description: 'Check if a role has permission to perform a verb',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Role name' },
        verb: { type: 'string', description: 'Verb in gerund form' },
      },
      required: ['role', 'verb'],
    },
    handler: async (input: { role: string; verb: string }) => {
      return { success: true, capability: { allowed: false } }
    },
  },

  {
    name: 'ing_traverse_graph',
    description: 'Navigate the semantic graph from a starting node',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Starting node' },
        depth: { type: 'number', default: 2, description: 'Traversal depth' },
        direction: {
          type: 'string',
          enum: ['forward', 'backward', 'both'],
          default: 'forward',
          description: 'Traversal direction',
        },
      },
      required: ['start'],
    },
    handler: async (input: TraverseGraphRequest) => {
      return { success: true, graph: { nodes: [], edges: [], depth: 0 } }
    },
  },
]

// ===== Queue Consumer =====

export async function handleQueueMessage(batch: MessageBatch, env: Env): Promise<void> {
  const service = new IngService({} as any, env)

  for (const message of batch.messages) {
    try {
      const msg = message.body as QueueMessage

      switch (msg.type) {
        case 'CREATE_TRIPLE':
          await service.createTriple(msg.payload)
          console.log(`Created triple: ${msg.payload.subject} ${msg.payload.predicate} ${msg.payload.object}`)
          break

        case 'DELETE_TRIPLE':
          await service.deleteTriple(msg.payload.id)
          console.log(`Deleted triple: ${msg.payload.id}`)
          break

        case 'INFER_TRIPLES':
          // TODO: Implement AI-powered triple inference
          console.log('Triple inference not yet implemented')
          break

        case 'SYNC_TO_GRAPH':
          // TODO: Implement entity sync to graph
          console.log('Graph sync not yet implemented')
          break

        default:
          console.warn('Unknown message type:', msg.type)
      }

      message.ack()
    } catch (error) {
      console.error('Error processing message:', error)
      message.retry()
    }
  }
}

// ===== Default Export =====

export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
