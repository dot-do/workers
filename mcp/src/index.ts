import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleMCPRequest } from './server'
import type { Env } from './types'

/**
 * MCP Server - Exposes all platform capabilities as AI-accessible tools
 *
 * Implements the Model Context Protocol (MCP) JSON-RPC 2.0 server
 * Provides 20+ tools organized by category for database, AI, auth, search, queue, and workflows
 */
export class MCPServer extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>()

    // CORS for browser clients
    app.use('*', cors())

    // MCP JSON-RPC endpoint
    app.post('/', async (c) => {
      return await handleMCPRequest(c)
    })

    // Health check
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        service: 'mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05'
      })
    })

    // Server info
    app.get('/', (c) => {
      return c.json({
        name: 'do-mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        description: 'MCP server exposing platform capabilities as AI-accessible tools',
        capabilities: {
          tools: {
            listChanged: true
          },
          resources: {
            subscribe: true,
            listChanged: true
          }
        },
        categories: [
          'Database Tools',
          'AI Tools',
          'Auth Tools',
          'Search Tools',
          'Queue Tools',
          'Workflow Tools'
        ],
        transport: ['http', 'sse', 'stdio']
      })
    })

    return app.fetch(request, c.env as Env)
  }
}

export default MCPServer
