import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, RpcRequest, RpcContext } from './types'
import { authenticate } from './auth'
import {
  CapnWebRegistry,
  parseRpcRequest,
  validateRpcRequest,
  createRpcError,
} from './capnweb'
import { registerMethods } from './methods'

/**
 * RPC Service - CapnWeb RPC Server with OAuth
 *
 * Provides a JSON-RPC 2.0 compatible interface for cross-service communication
 * with integrated OAuth authentication via OAUTH_SERVICE
 */
export class RpcService extends WorkerEntrypoint<Env> {
  public registry: CapnWebRegistry

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.registry = new CapnWebRegistry()
    registerMethods(this.registry)
  }

  /**
   * Execute RPC method (direct RPC interface)
   */
  async execute(method: string, params: any = {}, authToken?: string): Promise<any> {
    const request: RpcRequest = { method, params }

    // Create context
    const context: RpcContext = {
      env: this.env,
      request: new Request('https://rpc.do/rpc'),
    }

    // Authenticate if token provided
    if (authToken) {
      const auth = await authenticate(
        new Request('https://rpc.do/rpc', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        this.env
      )
      if (auth) {
        context.auth = auth
      }
    }

    const response = await this.registry.execute(request, context)

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.result
  }

  /**
   * List available RPC methods
   */
  async listMethods(): Promise<Array<{ name: string; description: string; requiresAuth: boolean }>> {
    return this.registry.getMethods().map((m) => ({
      name: m.name,
      description: m.description,
      requiresAuth: m.requiresAuth,
    }))
  }
}

/**
 * HTTP Interface (Hono)
 */
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'rpc',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
})

// Capabilities endpoint
app.get('/capabilities', async (c) => {
  const service = new RpcService(c.executionCtx, c.env)
  const methods = await service.listMethods()

  return c.json({
    service: 'rpc',
    protocol: 'capnweb',
    version: '0.1.0',
    methods,
  })
})

// RPC endpoint (JSON-RPC 2.0)
app.post('/rpc', async (c) => {
  try {
    const service = new RpcService(c.executionCtx, c.env)

    // Parse request
    const requestData = await parseRpcRequest(c.req.raw)

    // Authenticate
    const auth = await authenticate(c.req.raw, c.env)

    // Create context
    const context: RpcContext = {
      env: c.env,
      auth: auth || undefined,
      request: c.req.raw,
    }

    // Handle batch requests
    if (Array.isArray(requestData)) {
      const responses = await service.registry.executeBatch(requestData, context)
      return c.json(responses)
    }

    // Validate single request
    if (!validateRpcRequest(requestData)) {
      return c.json(
        createRpcError(-32600, 'Invalid Request', undefined, (requestData as any).id),
        400
      )
    }

    // Execute single request (type narrowed by validateRpcRequest)
    const response = await service.registry.execute(requestData as RpcRequest, context)

    // Return error status codes
    if (response.error) {
      const statusCode = response.error.code === -32000 ? 401 : 400
      return c.json(response, statusCode)
    }

    return c.json(response)
  } catch (error: any) {
    console.error('RPC endpoint error:', error)
    return c.json(
      createRpcError(-32700, 'Parse error', error.message),
      400
    )
  }
})

// JSON-RPC endpoint (alternative path)
app.post('/rpc/json', async (c) => {
  return app.fetch(new Request(c.req.url.replace('/rpc/json', '/rpc'), c.req.raw))
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      availableEndpoints: ['/health', '/capabilities', '/rpc', '/rpc/json'],
    },
    404
  )
})

// Error handler
app.onError((error, c) => {
  console.error('Server error:', error)
  return c.json(
    {
      error: 'Internal Server Error',
      message: error.message,
    },
    500
  )
})

export default {
  fetch: app.fetch,
}
