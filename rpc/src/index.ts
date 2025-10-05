import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { protocolRouter } from '@dot-do/protocol-router'
import type { Env, RpcRequest, RpcContext } from './types'
import { authenticate } from './auth'
import { CapnWebRegistry } from './capnweb'
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
 * REST API Interface (Hono)
 */
const api = new Hono<{ Bindings: Env }>()

// Custom RPC methods endpoint (in addition to built-in /api/capabilities)
api.get('/methods', async (c) => {
  const service = new RpcService(c.executionCtx, c.env)
  const methods = await service.listMethods()

  return c.json({
    service: 'rpc',
    protocol: 'capnweb',
    version: '0.1.0',
    methods,
  })
})

/**
 * Custom RPC Handler
 * Maps JSON-RPC requests to CapnWeb registry
 */
async function handleRpc(method: string, params: any, context: any) {
  const service = new RpcService(context.executionCtx, context.env)

  // Handle built-in rpc.listMethods (lists CapnWeb methods)
  if (method === 'rpc.listMethods' || method === 'listMethods') {
    return await service.listMethods()
  }

  // Create RPC context
  const rpcContext: RpcContext = {
    env: context.env,
    request: context.req,
  }

  // Authenticate if Authorization header present
  if (context.req.headers.get('Authorization')) {
    const auth = await authenticate(context.req, context.env)
    if (auth) {
      rpcContext.auth = auth
    }
  }

  // Execute RPC method via CapnWeb registry
  const request: RpcRequest = { method, params }
  const response = await service.registry.execute(request, rpcContext)

  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.result
}

/**
 * Multi-Protocol Router
 */
const app = protocolRouter({
  // RPC protocol (JSON-RPC 2.0 via CapnWeb)
  rpc: handleRpc,

  // REST API routes
  api,

  // CORS configuration
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
  },
})

export default {
  fetch: app.fetch,
}
