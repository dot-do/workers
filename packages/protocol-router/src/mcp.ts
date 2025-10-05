/**
 * MCP (Model Context Protocol) Handler
 *
 * Handles MCP JSON-RPC requests from AI agents
 * Spec: https://spec.modelcontextprotocol.io/
 */

import type { Context } from 'hono'
import type { McpHandler, McpRequest, McpResponse } from './types'

/**
 * Create MCP error response
 */
export function createMcpError(code: number, message: string, data?: any, id?: string | number): McpResponse {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data,
    },
    id,
  }
}

/**
 * Create MCP success response
 */
export function createMcpSuccess(result: any, id?: string | number): McpResponse {
  return {
    jsonrpc: '2.0',
    result,
    id,
  }
}

/**
 * Validate MCP request
 */
export function validateMcpRequest(data: any): data is McpRequest {
  return (
    data &&
    typeof data === 'object' &&
    data.jsonrpc === '2.0' &&
    typeof data.method === 'string'
  )
}

/**
 * Handle MCP request
 */
export async function handleMcpRequest(handler: McpHandler, c: Context): Promise<Response> {
  try {
    // Parse request body
    const body = await c.req.json().catch(() => null)

    if (!body) {
      return c.json(createMcpError(-32700, 'Parse error'), 400)
    }

    if (!validateMcpRequest(body)) {
      return c.json(createMcpError(-32600, 'Invalid Request'), 400)
    }

    // Handle MCP protocol methods
    switch (body.method) {
      case 'initialize':
        return c.json(
          createMcpSuccess(
            {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: handler.tools ? { listChanged: false } : undefined,
                resources: handler.resources ? { subscribe: false, listChanged: false } : undefined,
                prompts: handler.prompts ? { listChanged: false } : undefined,
              },
              serverInfo: {
                name: c.env?.SERVICE_NAME || 'worker',
                version: c.env?.SERVICE_VERSION || '1.0.0',
              },
            },
            body.id
          )
        )

      case 'tools/list':
        if (!handler.tools) {
          return c.json(createMcpError(-32601, 'Method not found: tools/list', undefined, body.id))
        }
        return c.json(
          createMcpSuccess(
            {
              tools: handler.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
              })),
            },
            body.id
          )
        )

      case 'tools/call':
        if (!handler.tools) {
          return c.json(createMcpError(-32601, 'Method not found: tools/call', undefined, body.id))
        }

        const toolName = body.params?.name
        if (!toolName) {
          return c.json(createMcpError(-32602, 'Invalid params: name is required', undefined, body.id))
        }

        const tool = handler.tools.find((t) => t.name === toolName)
        if (!tool) {
          return c.json(createMcpError(-32601, `Tool not found: ${toolName}`, undefined, body.id))
        }

        try {
          const result = await tool.handler(body.params?.arguments || {}, c)
          return c.json(
            createMcpSuccess(
              {
                content: [
                  {
                    type: 'text',
                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                  },
                ],
              },
              body.id
            )
          )
        } catch (error: any) {
          return c.json(createMcpError(-32603, 'Tool execution error', error.message, body.id))
        }

      case 'resources/list':
        if (!handler.resources) {
          return c.json(createMcpError(-32601, 'Method not found: resources/list', undefined, body.id))
        }
        return c.json(createMcpSuccess({ resources: handler.resources }, body.id))

      case 'prompts/list':
        if (!handler.prompts) {
          return c.json(createMcpError(-32601, 'Method not found: prompts/list', undefined, body.id))
        }
        return c.json(createMcpSuccess({ prompts: handler.prompts }, body.id))

      default:
        return c.json(createMcpError(-32601, `Method not found: ${body.method}`, undefined, body.id))
    }
  } catch (error: any) {
    console.error('MCP handler error:', error)
    return c.json(createMcpError(-32603, 'Internal error', error.message), 500)
  }
}
