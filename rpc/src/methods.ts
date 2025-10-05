import { z } from 'zod'
import type { CapnWebRegistry } from './capnweb'

/**
 * Register all RPC methods
 */
export function registerMethods(registry: CapnWebRegistry): void {
  // System methods
  registry.register({
    name: 'system.ping',
    description: 'Test RPC connectivity',
    requiresAuth: false,
    handler: async () => ({ pong: true, timestamp: Date.now() }),
  })

  registry.register({
    name: 'system.info',
    description: 'Get system information',
    requiresAuth: false,
    handler: async () => ({
      service: 'rpc',
      version: '0.1.0',
      protocol: 'capnweb',
      uptime: Date.now(),
    }),
  })

  // Authentication methods
  registry.register({
    name: 'auth.whoami',
    description: 'Get current user info',
    requiresAuth: true,
    handler: async (_params, context) => {
      if (!context.auth) {
        throw new Error('Not authenticated')
      }
      return {
        userId: context.auth.userId,
        email: context.auth.email,
        name: context.auth.name,
        organizationId: context.auth.organizationId,
      }
    },
  })

  // Database methods (proxy to DB_SERVICE)
  registry.register({
    name: 'db.get',
    description: 'Get entity by namespace and ID',
    requiresAuth: true,
    schema: z.object({
      ns: z.string(),
      id: z.string(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.get(params.ns, params.id)
    },
  })

  registry.register({
    name: 'db.list',
    description: 'List entities in namespace',
    requiresAuth: true,
    schema: z.object({
      ns: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.list(params.ns, {
        limit: params.limit,
        offset: params.offset,
      })
    },
  })

  registry.register({
    name: 'db.upsert',
    description: 'Create or update entity',
    requiresAuth: true,
    schema: z.object({
      ns: z.string(),
      id: z.string(),
      type: z.string(),
      data: z.record(z.any()),
      content: z.string().optional(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.upsert({
        ns: params.ns,
        id: params.id,
        type: params.type,
        data: params.data,
        content: params.content,
      })
    },
  })

  registry.register({
    name: 'db.delete',
    description: 'Delete entity',
    requiresAuth: true,
    schema: z.object({
      ns: z.string(),
      id: z.string(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.del(params.ns, params.id)
    },
  })

  registry.register({
    name: 'db.search',
    description: 'Search entities',
    requiresAuth: true,
    schema: z.object({
      query: z.string(),
      ns: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().optional(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.search(params.query, {
        ns: params.ns,
        type: params.type,
        limit: params.limit,
      })
    },
  })

  // Relationship methods
  registry.register({
    name: 'db.relationships',
    description: 'Get entity relationships',
    requiresAuth: true,
    schema: z.object({
      ns: z.string(),
      id: z.string(),
      type: z.string().optional(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.queryRelationships(params.ns, params.id, {
        type: params.type,
      })
    },
  })

  registry.register({
    name: 'db.createRelationship',
    description: 'Create relationship between entities',
    requiresAuth: true,
    schema: z.object({
      fromNs: z.string(),
      fromId: z.string(),
      toNs: z.string(),
      toId: z.string(),
      type: z.string(),
      properties: z.record(z.any()).optional(),
    }),
    handler: async (params, context) => {
      return await context.env.DB_SERVICE.upsertRelationship({
        fromNs: params.fromNs,
        fromId: params.fromId,
        toNs: params.toNs,
        toId: params.toId,
        type: params.type,
        properties: params.properties,
      })
    },
  })

  // Batch operations
  registry.register({
    name: 'db.batchGet',
    description: 'Get multiple entities',
    requiresAuth: true,
    schema: z.object({
      entities: z.array(z.object({
        ns: z.string(),
        id: z.string(),
      })),
    }),
    handler: async (params, context) => {
      const results = await Promise.all(
        params.entities.map((e: { ns: string; id: string }) =>
          context.env.DB_SERVICE.get(e.ns, e.id)
        )
      )
      return { entities: results }
    },
  })

  registry.register({
    name: 'db.batchUpsert',
    description: 'Create or update multiple entities',
    requiresAuth: true,
    schema: z.object({
      entities: z.array(z.object({
        ns: z.string(),
        id: z.string(),
        type: z.string(),
        data: z.record(z.any()),
        content: z.string().optional(),
      })),
    }),
    handler: async (params, context) => {
      const results = await Promise.all(
        params.entities.map((e: { ns: string; id: string; type: string; data: Record<string, any>; content?: string }) =>
          context.env.DB_SERVICE.upsert(e)
        )
      )
      return { entities: results }
    },
  })
}
