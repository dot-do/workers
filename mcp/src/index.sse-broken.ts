import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { z } from 'zod'
import { listTools, callTool } from './tools'
import type { Env } from './types'

/**
 * Simple MCP Server without OAuth
 *
 * Exposes MCP tools via SSE endpoint at /sse
 * All tools are currently public (no authentication required)
 */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        tools: listTools(false).length
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // List tools (HTTP GET)
    if (url.pathname === '/tools') {
      const tools = listTools(false) // All tools public for now
      return new Response(JSON.stringify({ tools }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // MCP SSE endpoint
    if (url.pathname === '/sse') {
      return handleSSE(request, env)
    }

    // Root info
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'do-mcp-server',
        version: '1.0.0',
        protocol: 'mcp/2024-11-05',
        description: 'MCP server exposing platform capabilities as AI-accessible tools',
        endpoints: {
          sse: '/sse',
          tools: '/tools',
          health: '/health'
        },
        tools_count: listTools(false).length
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not Found', { status: 404 })
  }
}

/**
 * Handle SSE endpoint for MCP
 */
async function handleSSE(request: Request, env: Env): Promise<Response> {
  // Create MCP server
  const server = new McpServer({
    name: 'do-mcp-server',
    version: '1.0.0',
  })

  // Get all tools
  const tools = listTools(false) // All tools public for now

  // Register all tools
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      convertSchemaToZod(tool.inputSchema),
      async (input: any) => {
        try {
          // Create mock context
          const mockContext: any = {
            env,
            req: { header: () => null }
          }

          // Call tool
          const result = await callTool(tool.name, input, mockContext, null, false)

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          }
        }
      }
    )
  }

  // Create SSE transport
  const transport = new SSEServerTransport('/sse', request)

  // Connect server to transport
  await server.connect(transport)

  // Return SSE response
  return transport.response
}

/**
 * Convert JSON Schema to Zod schema
 */
function convertSchemaToZod(schema: any): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const p = prop as any
      let zodType: z.ZodTypeAny

      switch (p.type) {
        case 'string':
          zodType = z.string()
          if (p.description) zodType = zodType.describe(p.description)
          break
        case 'number':
          zodType = z.number()
          if (p.description) zodType = zodType.describe(p.description)
          break
        case 'boolean':
          zodType = z.boolean()
          if (p.description) zodType = zodType.describe(p.description)
          break
        case 'array':
          zodType = z.array(z.any())
          if (p.description) zodType = zodType.describe(p.description)
          break
        case 'object':
          zodType = z.record(z.any())
          if (p.description) zodType = zodType.describe(p.description)
          break
        default:
          zodType = z.any()
      }

      // Make optional if not in required array
      if (!schema.required || !schema.required.includes(key)) {
        zodType = zodType.optional()
      }

      shape[key] = zodType
    }
  }

  return z.object(shape)
}

// Export Durable Object classes
export { Sandbox } from '@cloudflare/sandbox'

// Keep DoMCPAgent export for migration compatibility (not currently used)
export { DoMCPAgent } from './mcp-agent'
