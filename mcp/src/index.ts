import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { protocolRouter } from '@dot-do/protocol-router'
import { handleMCPRequest } from './server'
import { authMiddleware, OAUTH_METADATA } from './auth'
import { generateDocs, generateDocsIndex, listDocs } from './docs/generator'
import type { Env } from './types'

/**
 * MCP Server - Exposes all platform capabilities as AI-accessible tools
 *
 * Implements the Model Context Protocol (MCP) JSON-RPC 2.0 server with OAuth 2.1 authentication
 * Provides 20+ tools organized by category for database, AI, auth, search, queue, and workflows
 */
export class MCPServer extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    // REST API for MCP-specific endpoints
    const api = new Hono<{ Bindings: Env }>()

    /**
     * Well-known OAuth protected resource metadata endpoint
     * MCP clients use this to discover OAuth authorization server
     */
    api.get('/.well-known/oauth-protected-resource', (c) => {
      return c.json(OAUTH_METADATA)
    })

    // Server info at root (no auth required)
    api.get('/', (c) => {
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
          'CLI Tools',
          'Code Execution'
        ],
        transport: ['http', 'sse', 'stdio'],
        documentation: {
          index: 'https://mcp.do/api/docs',
          primitives: listDocs().map(name => `https://mcp.do/api/${name}.md`)
        }
      })
    })

    /**
     * Documentation endpoints (no auth required)
     */

    // Documentation index
    api.get('/docs', (c) => {
      const docs = generateDocsIndex()
      return c.text(docs, 200, { 'Content-Type': 'text/markdown' })
    })

    // Root runtime documentation
    api.get('/$.md', (c) => {
      try {
        const docs = generateDocs('$')
        return c.text(docs, 200, { 'Content-Type': 'text/markdown' })
      } catch (error) {
        return c.text('Documentation not found', 404)
      }
    })

    // Primitive-specific documentation
    api.get('/:primitive.md', (c) => {
      const primitive = c.req.param('primitive')
      try {
        const docs = generateDocs(primitive)
        return c.text(docs, 200, { 'Content-Type': 'text/markdown' })
      } catch (error) {
        return c.text(`Documentation not found for primitive: ${primitive}`, 404)
      }
    })

    /**
     * MCP JSON-RPC endpoint at /mcp - REQUIRES AUTHENTICATION
     *
     * All MCP requests must include a valid OAuth 2.1 access token
     * in the Authorization header: Bearer <token>
     */
    api.post('/mcp', authMiddleware, async (c) => {
      return await handleMCPRequest(c)
    })

    // Use protocol router with custom REST API
    const app = protocolRouter({
      api,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
      },
    })

    return app.fetch(request, this.env)
  }
}

export default MCPServer
