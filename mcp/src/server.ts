import type { Context } from 'hono'
import { authenticateRequest } from './auth'
import { listTools, callTool } from './tools'
import { listResources, readResource } from './resources'
import type { Env, MCPRequest, MCPResponse } from './types'
import { trackToolExecution } from './metrics'

/**
 * MCP JSON-RPC 2.0 Server Implementation
 *
 * Handles initialize, tools/list, tools/call, resources/list, resources/read
 * All tool calls automatically tracked with CapnWeb performance metrics
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
          // Track tool execution with automatic metrics
          const result = await trackToolExecution(
            toolName,
            authenticated,
            user?.id,
            async () => await callTool(toolName, toolArgs || {}, c, user, authenticated)
          )

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
 *
 * TEMPORARILY DISABLED: All tools are public since there's no data in the DB yet
 *
 * TODO: Re-enable authentication once OAuth is fully implemented:
 * - Free tools: db_search, memory_*, search_docs, ai_models
 * - Authenticated tools: ai_generate, ai_stream, ai_embed, ai_analyze, code_*, runtime_*, sandbox_*, workflow_*, queue_*
 * - Admin-only tools: auth_*, db_upsert, db_delete
 */
function requiresAuth(toolName: string): boolean {
  // TEMPORARILY: All tools are public
  return false

  // ORIGINAL CODE (to be restored):
  // const publicTools = [
  //   'db_search',
  //   'memory_create_entities', 'memory_create_relations', 'memory_add_observations',
  //   'memory_delete_entities', 'memory_delete_observations', 'memory_delete_relations',
  //   'memory_read_graph', 'memory_search_nodes',
  //   'search_docs',
  //   'ai_models'
  // ]
  // return !publicTools.includes(toolName)
}
