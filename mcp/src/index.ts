import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleMCPRequest } from './server'
import { authMiddleware, optionalAuthMiddleware, OAUTH_METADATA } from './auth'
import type { Env } from './types'

/**
 * MCP Server - Exposes all platform capabilities as AI-accessible tools
 *
 * Implements the Model Context Protocol (MCP) JSON-RPC 2.0 server with OAuth 2.1 authentication
 * Provides 20+ tools organized by category for database, AI, auth, search, queue, and workflows
 */
export class MCPServer extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const app = new Hono<{ Bindings: Env }>()

    // CORS for browser clients
    app.use('*', cors())

    /**
     * Well-known OAuth protected resource metadata endpoint
     * MCP clients use this to discover OAuth authorization server
     */
    app.get('/.well-known/oauth-protected-resource', (c) => {
      return c.json(OAUTH_METADATA)
    })

    // Health check (no auth required)
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        service: 'mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        oauth: 'enabled'
      })
    })

    // Server info (no auth required)
    app.get('/', (c) => {
      return c.json({
        name: 'mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        description: 'MCP server exposing platform capabilities as AI-accessible tools',
        authentication: {
          type: 'oauth2.1',
          discovery: 'https://mcp.do/.well-known/oauth-protected-resource',
          authorization_endpoint: OAUTH_METADATA.authorization_endpoint,
          token_endpoint: OAUTH_METADATA.token_endpoint,
        },
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
          'Workflow Tools',
          'CLI Tools'
        ],
        transport: ['http', 'sse', 'stdio']
      })
    })

    /**
     * MCP JSON-RPC endpoint - REQUIRES AUTHENTICATION
     *
     * All MCP requests must include a valid OAuth 2.1 access token
     * in the Authorization header: Bearer <token>
     */
    app.post('/', authMiddleware, async (c) => {
      return await handleMCPRequest(c)
    })

    return app.fetch(request, this.env)
  }
}

export default MCPServer
