/**
 * REST Protocol Handler
 *
 * Mounts Hono REST API application with built-in health and capabilities
 */

import type { Hono } from 'hono'
import type { RestHandler, ProtocolRouterConfig } from './types'

/**
 * Mount REST API handler
 *
 * Injects /health and /capabilities endpoints before user routes
 */
export function handleRestApi(handler: RestHandler, config: ProtocolRouterConfig): Hono {
  // Add built-in routes at the beginning
  handler.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      protocols: {
        rpc: !!config.rpc,
        api: !!config.api,
        mcp: !!config.mcp,
        graphql: !!config.graphql,
        docs: !!config.docs,
        events: !!config.events,
        admin: !!config.admin,
        serviceRoutes: !!config.serviceRoutes,
      },
    })
  })

  handler.get('/capabilities', (c) => {
    const capabilities: any = {
      protocols: [],
    }

    if (config.rpc) {
      capabilities.protocols.push({
        name: 'rpc',
        version: '2.0',
        spec: 'JSON-RPC 2.0',
        endpoint: '/rpc',
      })
    }

    if (config.api) {
      capabilities.protocols.push({
        name: 'rest',
        spec: 'REST API',
        endpoint: '/api',
      })
    }

    if (config.mcp) {
      capabilities.protocols.push({
        name: 'mcp',
        version: '2024-11-05',
        spec: 'Model Context Protocol',
        endpoint: '/mcp',
        tools: config.mcp.tools?.length || 0,
      })
    }

    if (config.graphql) {
      capabilities.protocols.push({
        name: 'graphql',
        spec: 'GraphQL',
        endpoint: '/graphql',
      })
    }

    if (config.docs) {
      capabilities.protocols.push({
        name: 'docs',
        spec: 'OpenAPI 3.1',
        endpoint: '/docs',
      })
    }

    if (config.events) {
      capabilities.protocols.push({
        name: 'events',
        spec: 'Analytics Event Capture',
        endpoint: '/e',
      })
    }

    if (config.admin) {
      capabilities.protocols.push({
        name: 'admin',
        spec: 'Admin CLI',
        endpoint: '/$',
      })
    }

    if (config.serviceRoutes) {
      capabilities.serviceRoutes = Object.keys(config.serviceRoutes)
    }

    return c.json(capabilities)
  })

  return handler
}
