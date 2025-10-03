import type { Context } from 'hono'
import { authenticateRequest } from './auth'
import { listTools, callTool } from './tools'
import { listResources, readResource } from './resources'
import type { Env, MCPRequest, MCPResponse } from './types'

/**
 * MCP JSON-RPC 2.0 Server Implementation
 *
 * Handles initialize, tools/list, tools/call, resources/list, resources/read
 */
export async function handleMCPRequest(c: Context<{ Bindings: Env }>): Promise<Response> {
  // Authenticate request
  const { authenticated, user } = await authenticateRequest(c)

  try {
    const request: MCPRequest = await c.req.json()
    const { jsonrpc, method, params, id } = request

    // Validate JSON-RPC 2.0
    if (jsonrpc !== '2.0') {
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request - must use JSON-RPC 2.0'
        },
        id
      })
    }

    console.log(`[MCP] Method: ${method} (authenticated: ${authenticated}, user: ${user?.email || 'anonymous'})`)

    switch (method) {
      case 'initialize': {
        return c.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: true, listChanged: true }
            },
            serverInfo: {
              name: 'do-mcp-server',
              version: '1.0.0'
            }
          },
          id
        })
      }

      case 'tools/list': {
        const tools = listTools(authenticated)
        return c.json({
          jsonrpc: '2.0',
          result: { tools },
          id
        })
      }

      case 'tools/call': {
        const { name: toolName, arguments: toolArgs } = params || {}

        if (!toolName) {
          return c.json({
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Invalid params: tool name required'
            },
            id
          })
        }

        // Check authentication for protected tools
        if (!authenticated && requiresAuth(toolName)) {
          return c.json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Authentication required',
              data: { tool: toolName }
            },
            id
          }, 401)
        }

        try {
          const result = await callTool(toolName, toolArgs || {}, c, user, authenticated)
          return c.json({
            jsonrpc: '2.0',
            result,
            id
          })
        } catch (error) {
          console.error('[MCP] Tool execution error:', error)
          return c.json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: error instanceof Error ? error.message : 'Tool execution failed',
              data: { tool: toolName }
            },
            id
          })
        }
      }

      case 'resources/list': {
        const resources = listResources()
        return c.json({
          jsonrpc: '2.0',
          result: { resources },
          id
        })
      }

      case 'resources/read': {
        const { uri } = params || {}

        if (!uri) {
          return c.json({
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Invalid params: uri required'
            },
            id
          })
        }

        try {
          const content = await readResource(uri, c)
          return c.json({
            jsonrpc: '2.0',
            result: { contents: [content] },
            id
          })
        } catch (error) {
          return c.json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Resource not found',
              data: { uri }
            },
            id
          })
        }
      }

      default: {
        return c.json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id
        })
      }
    }
  } catch (error) {
    console.error('[MCP] Server error:', error)
    return c.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      },
      id: null
    }, 500)
  }
}

/**
 * Check if tool requires authentication
 */
function requiresAuth(toolName: string): boolean {
  const publicTools = ['db_search']
  return !publicTools.includes(toolName)
}
