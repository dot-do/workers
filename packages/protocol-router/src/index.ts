/**
 * Protocol Router
 *
 * Multi-protocol routing for Cloudflare Workers
 * Exposes services via RPC, REST, MCP, GraphQL, and Docs endpoints
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ProtocolRouterConfig } from './types'
import { handleRpcRequest } from './rpc'
import { handleRestApi } from './rest'
import { handleMcpRequest } from './mcp'
import { handleDocsRequest } from './docs'
import { handleEventRequest } from './events'
import { handleAdminRequest } from './admin'
import { handleServiceRoute } from './service-routes'

export * from './types'
export * from './rpc'
export * from './rest'
export * from './mcp'
export * from './docs'
export * from './events'
export * from './admin'
export * from './service-routes'

/**
 * Create protocol router
 *
 * Returns a Hono app configured to route requests to appropriate protocol handlers
 *
 * @example
 * ```typescript
 * import { protocolRouter } from '@dot-do/protocol-router'
 *
 * const app = protocolRouter({
 *   rpc: new MyRpcService(ctx, env),
 *   api: createRestApi(env),
 *   mcp: {
 *     tools: [
 *       {
 *         name: 'my_tool',
 *         description: 'Does something useful',
 *         inputSchema: { type: 'object', properties: {...} },
 *         handler: async (input, context) => { ... }
 *       }
 *     ]
 *   },
 *   docs: {
 *     config: {
 *       title: 'My API',
 *       version: '1.0.0'
 *     },
 *     generate: async () => ({ ... }) // OpenAPI spec
 *   }
 * })
 *
 * export default { fetch: app.fetch }
 * ```
 */
export function protocolRouter(config: ProtocolRouterConfig): Hono {
  const app = new Hono()

  // Apply CORS if configured
  if (config.cors) {
    app.use(
      '*',
      cors({
        origin: config.cors.origin || '*',
        allowMethods: config.cors.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: config.cors.headers || ['Content-Type', 'Authorization'],
        credentials: config.cors.credentials ?? false,
      })
    )
  } else {
    // Default CORS
    app.use('*', cors())
  }

  // Apply custom middleware
  if (config.middleware) {
    for (const mw of config.middleware) {
      app.use('*', mw)
    }
  }

  // Health and capabilities moved to /api/health and /api/capabilities

  // Event capture endpoint - Analytics
  if (config.events) {
    app.get('/e', async (c) => {
      return await handleEventRequest(config.events!, c)
    })

    app.post('/e', async (c) => {
      return await handleEventRequest(config.events!, c)
    })
  }

  // Admin CLI endpoint - RESTful command line
  if (config.admin) {
    app.all('/$/*', async (c) => {
      return await handleAdminRequest(config.admin!, config.serviceRoutes, c)
    })
  }

  // RPC endpoint - JSON-RPC 2.0
  if (config.rpc) {
    app.post('/rpc', async (c) => {
      return await handleRpcRequest(config.rpc!, c, config)
    })
  }

  // REST API endpoint
  if (config.api) {
    app.route('/api', handleRestApi(config.api, config))
  }

  // MCP endpoint - Model Context Protocol
  if (config.mcp) {
    app.post('/mcp', async (c) => {
      return await handleMcpRequest(config.mcp!, c)
    })

    // MCP also supports GET for metadata
    app.get('/mcp', (c) => {
      return c.json({
        protocol: 'mcp',
        version: '2024-11-05',
        tools: config.mcp!.tools?.length || 0,
        resources: config.mcp!.resources?.length || 0,
        prompts: config.mcp!.prompts?.length || 0,
      })
    })
  }

  // GraphQL endpoint (future)
  if (config.graphql) {
    app.post('/graphql', async (c) => {
      const { query, variables, operationName } = await c.req.json()
      const result = await config.graphql!.execute(query, variables, c)
      return c.json(result)
    })

    // GraphQL Playground
    app.get('/graphql', (c) => {
      return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function () {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/graphql'
      })
    })
  </script>
</body>
</html>`)
    })
  }

  // Documentation endpoint
  if (config.docs) {
    app.get('/docs/*', async (c) => {
      return await handleDocsRequest(config.docs!, c)
    })

    // Redirect /docs to /docs/
    app.get('/docs', (c) => {
      return c.redirect('/docs/')
    })
  }

  // Direct service routing - Catch-all for /service.method and /service/method
  if (config.serviceRoutes) {
    app.all('*', async (c) => {
      return await handleServiceRoute(config.serviceRoutes!, c)
    })
  }

  // Default 404 handler
  app.notFound((c) => {
    const endpoints: (string | null)[] = [
      config.api ? '/api/health - Health check' : null,
      config.api ? '/api/capabilities - API capabilities' : null,
      config.events ? '/e - Analytics event capture' : null,
      config.admin ? '/$/* - Admin CLI' : null,
      config.rpc ? '/rpc - JSON-RPC 2.0' : null,
      config.api ? '/api - REST API' : null,
      config.mcp ? '/mcp - Model Context Protocol' : null,
      config.graphql ? '/graphql - GraphQL' : null,
      config.docs ? '/docs - API Documentation' : null,
    ]

    // Add service routes if configured
    if (config.serviceRoutes) {
      const services = Object.keys(config.serviceRoutes)
      endpoints.push(`/service.method - Direct service routing (${services.join(', ')})`)
    }

    return c.json(
      {
        error: 'Not Found',
        message: `Endpoint not found: ${c.req.path}`,
        availableEndpoints: endpoints.filter(Boolean),
      },
      404
    )
  })

  // Error handler
  app.onError((err, c) => {
    console.error('Protocol router error:', err)
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
      },
      500
    )
  })

  return app
}
