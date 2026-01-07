/**
 * @dotdo/rpc - Universal RPC Wrapper
 *
 * Wrap any npm package as a multi-transport worker:
 * - Workers RPC (service bindings)
 * - REST (GET /api/method?arg=val)
 * - CapnWeb (WebSocket RPC)
 * - MCP JSON-RPC 2.0
 *
 * Usage:
 * ```typescript
 * import * as jose from 'jose'
 * import { RPC } from '@dotdo/rpc'
 * export default RPC(jose)
 * ```
 */

import { Hono } from 'hono'

type RPCTarget = object | (new (...args: any[]) => any)

interface RPCOptions {
  /** Prefix for REST API routes */
  prefix?: string
  /** Enable CapnWeb WebSocket transport */
  capnweb?: boolean
  /** Enable MCP JSON-RPC transport */
  mcp?: boolean
}

/**
 * Wrap any object, class, or namespace as a multi-transport RPC worker
 */
export function RPC<T extends RPCTarget>(
  target: T,
  options?: RPCOptions
): { fetch: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response> } {
  const app = new Hono()
  const prefix = options?.prefix ?? '/api'

  // Get all methods from target
  const methods = getAllMethods(target)

  // REST transport: GET/POST /api/:method
  app.all(`${prefix}/:method`, async (c) => {
    const methodName = c.req.param('method')
    const method = methods[methodName]

    if (!method) {
      return c.json({ error: `Method ${methodName} not found` }, 404)
    }

    // Get args from query params or body
    let args: any[] = []
    if (c.req.method === 'GET') {
      const params = Object.fromEntries(new URL(c.req.url).searchParams)
      args = Object.values(params)
    } else {
      const body = await c.req.json().catch(() => ({}))
      args = Array.isArray(body) ? body : body.args ?? [body]
    }

    try {
      const result = await method(...args)
      return c.json({ result })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // MCP JSON-RPC transport
  if (options?.mcp !== false) {
    app.post('/mcp', async (c) => {
      const { jsonrpc, method, params, id } = await c.req.json()

      if (jsonrpc !== '2.0') {
        return c.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id })
      }

      const fn = methods[method]
      if (!fn) {
        return c.json({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id })
      }

      try {
        const args = Array.isArray(params) ? params : params ? [params] : []
        const result = await fn(...args)
        return c.json({ jsonrpc: '2.0', result, id })
      } catch (error) {
        return c.json({ jsonrpc: '2.0', error: { code: -32000, message: String(error) }, id })
      }
    })
  }

  // Root returns available methods
  app.get('/', (c) => {
    return c.json({
      methods: Object.keys(methods),
      transports: ['rest', 'mcp', 'capnweb', 'workers-rpc'],
    })
  })

  return {
    fetch: app.fetch,
    // Workers RPC: methods are directly callable
    ...methods,
  } as any
}

function getAllMethods(target: any): Record<string, Function> {
  const methods: Record<string, Function> = {}

  // Handle class instances and plain objects
  const obj = typeof target === 'function' ? target.prototype : target

  for (const key of Object.getOwnPropertyNames(obj)) {
    if (key === 'constructor') continue
    const val = obj[key]
    if (typeof val === 'function') {
      methods[key] = val.bind(target)
    }
  }

  // Also check the target itself for static methods
  for (const key of Object.keys(target)) {
    const val = target[key]
    if (typeof val === 'function') {
      methods[key] = val.bind(target)
    }
  }

  return methods
}

export default RPC
