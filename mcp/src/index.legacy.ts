import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleMCPRequest } from './server'
import { listTools } from './tools'
import type { Env } from './types'

// Export Sandbox Durable Object class for real code execution
export { Sandbox } from '@cloudflare/sandbox'

/**
 * MCP Server - Exposes all platform capabilities as AI-accessible tools
 *
 * Implements the Model Context Protocol (MCP) JSON-RPC 2.0 server
 * Provides 20+ tools organized by category for runtime, database, AI, auth, search, queue, workflows, and sandboxes
 * Includes runtime execution tools with CapnWeb queuing for maximum performance
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
          'Runtime Tools',
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

    // OAuth Discovery Endpoints - TEMPORARILY DISABLED
    // These endpoints advertise OAuth support but the full OAuth server is not yet implemented
    // Uncomment once we implement: client registration (RFC 7591), authorize, and token endpoints
    //
    // TODO: Implement full OAuth 2.1 server with:
    // - Dynamic client registration (RFC 7591) for ChatGPT and other clients
    // - Authorization endpoint with PKCE (RFC 7636)
    // - Token endpoint with refresh tokens
    // - Client credentials storage in database
    // - Admin-only access control for authenticated tools
    //
    // app.get('/.well-known/oauth-protected-resource', (c) => {
    //   return c.json({
    //     resource: 'https://mcp.do',
    //     authorization_servers: ['https://auth.do'],
    //     bearer_methods_supported: ['header'],
    //     resource_documentation: 'https://docs.do/mcp',
    //     resource_signing_alg_values_supported: ['RS256'],
    //     scopes_supported: ['read', 'write', 'admin']
    //   })
    // })
    //
    // app.get('/.well-known/oauth-authorization-server', (c) => {
    //   return c.json({
    //     issuer: 'https://auth.do',
    //     authorization_endpoint: 'https://auth.do/authorize',
    //     token_endpoint: 'https://auth.do/token',
    //     token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    //     response_types_supported: ['code'],
    //     grant_types_supported: ['authorization_code', 'refresh_token'],
    //     code_challenge_methods_supported: ['S256'],
    //     scopes_supported: ['read', 'write', 'admin'],
    //     service_documentation: 'https://docs.do/oauth'
    //   })
    // })

    // List tools via HTTP GET (for easier integration)
    app.get('/tools', (c) => {
      // Check for Authorization header
      const authHeader = c.req.header('Authorization')
      const authenticated = !!authHeader && authHeader.startsWith('Bearer ')

      const tools = listTools(authenticated)
      return c.json({ tools })
    })

    // Get specific tool details
    app.get('/tools/:name', (c) => {
      const name = c.req.param('name')
      const authHeader = c.req.header('Authorization')
      const authenticated = !!authHeader && authHeader.startsWith('Bearer ')

      const tools = listTools(authenticated)
      const tool = tools.find(t => t.name === name)

      if (!tool) {
        return c.json({ error: 'Tool not found' }, 404)
      }

      return c.json({ tool })
    })

    return app.fetch(request, this.env)
  }
}

export default MCPServer
