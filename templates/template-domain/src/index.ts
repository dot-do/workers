/**
 * {{SERVICE_DESCRIPTION}}
 * @module {{SERVICE_NAME}}
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { BaseEnv } from '@dot-do/worker-types'
import { success, error } from '@dot-do/worker-utils'
import { cors, requestId, logger, errorHandler } from '@dot-do/worker-middleware'
import { createRpcInterface } from './rpc'
import { createMcpServer } from './mcp'
import { handleQueueMessage } from './queue'

/**
 * Environment bindings for {{SERVICE_NAME}}
 */
export interface Env extends BaseEnv {
  // Add service-specific bindings here
  // DB?: D1Database
  // KV?: KVNamespace
  // BUCKET?: R2Bucket
  // QUEUE?: Queue
}

/**
 * Worker entrypoint with RPC support
 */
export class {{SERVICE_CLASS}} extends WorkerEntrypoint<Env> {
  // RPC methods are defined here and exposed automatically

  /**
   * Example RPC method: Get item by ID
   */
  async getItem(id: string): Promise<{ id: string; name: string; createdAt: number } | null> {
    // TODO: Implement actual database query
    // const db = this.env.DB
    // return await db.getThing('{{NAMESPACE}}', id)

    // Placeholder implementation
    if (id === 'test') {
      return {
        id: 'test',
        name: 'Test Item',
        createdAt: Date.now(),
      }
    }
    return null
  }

  /**
   * Example RPC method: List items with pagination
   */
  async listItems(options: { page?: number; limit?: number } = {}): Promise<{ items: any[]; total: number; hasMore: boolean }> {
    const { page = 1, limit = 20 } = options

    // TODO: Implement actual database query
    // const db = this.env.DB
    // return await db.listThings('{{NAMESPACE}}', { page, limit })

    // Placeholder implementation
    return {
      items: [
        { id: 'test', name: 'Test Item', createdAt: Date.now() },
      ],
      total: 1,
      hasMore: false,
    }
  }

  /**
   * Example RPC method: Create item
   */
  async createItem(data: { name: string }): Promise<{ id: string; name: string; createdAt: number }> {
    // TODO: Implement actual database insert
    // const db = this.env.DB
    // return await db.createThing('{{NAMESPACE}}', data)

    // Placeholder implementation
    return {
      id: crypto.randomUUID(),
      name: data.name,
      createdAt: Date.now(),
    }
  }

  /**
   * Example RPC method: Update item
   */
  async updateItem(id: string, data: { name?: string }): Promise<{ id: string; name: string; updatedAt: number } | null> {
    // TODO: Implement actual database update
    // const db = this.env.DB
    // return await db.updateThing('{{NAMESPACE}}', id, data)

    // Placeholder implementation
    if (id === 'test') {
      return {
        id: 'test',
        name: data.name || 'Test Item',
        updatedAt: Date.now(),
      }
    }
    return null
  }

  /**
   * Example RPC method: Delete item
   */
  async deleteItem(id: string): Promise<boolean> {
    // TODO: Implement actual database delete
    // const db = this.env.DB
    // return await db.deleteThing('{{NAMESPACE}}', id)

    // Placeholder implementation
    return true
  }
}

/**
 * HTTP API using Hono
 */
const app = new Hono<{ Bindings: Env }>()

// Apply middleware
app.use('*', cors())
app.use('*', requestId())
app.use('*', logger())
app.use('*', errorHandler())

// Health check
app.get('/health', (c) => c.json(success({ status: 'ok', service: '{{SERVICE_NAME}}' })))

// RPC routes (expose RPC methods as HTTP endpoints)
app.get('/items/:id', async (c) => {
  const service = new {{SERVICE_CLASS}}(c.env.ctx, c.env)
  const item = await service.getItem(c.req.param('id'))

  if (!item) {
    return error('NOT_FOUND', 'Item not found', undefined, 404)
  }

  return c.json(success(item))
})

app.get('/items', async (c) => {
  const service = new {{SERVICE_CLASS}}(c.env.ctx, c.env)
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20

  const result = await service.listItems({ page, limit })
  return c.json(success(result))
})

app.post('/items', async (c) => {
  const service = new {{SERVICE_CLASS}}(c.env.ctx, c.env)
  const body = await c.req.json()

  // TODO: Add validation with Zod
  const item = await service.createItem(body)
  return c.json(success(item), 201)
})

app.put('/items/:id', async (c) => {
  const service = new {{SERVICE_CLASS}}(c.env.ctx, c.env)
  const body = await c.req.json()

  const item = await service.updateItem(c.req.param('id'), body)

  if (!item) {
    return error('NOT_FOUND', 'Item not found', undefined, 404)
  }

  return c.json(success(item))
})

app.delete('/items/:id', async (c) => {
  const service = new {{SERVICE_CLASS}}(c.env.ctx, c.env)
  const deleted = await service.deleteItem(c.req.param('id'))

  if (!deleted) {
    return error('NOT_FOUND', 'Item not found', undefined, 404)
  }

  return c.json(success({ deleted: true }))
})

// MCP endpoint
app.all('/mcp', async (c) => {
  const mcpServer = createMcpServer(c.env)
  // TODO: Implement MCP request handling
  return c.json({ error: 'MCP not yet implemented' }, 501)
})

/**
 * Export default fetch handler
 */
export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
