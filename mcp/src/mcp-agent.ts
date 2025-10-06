import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { OAuthProps } from './oauth-handler'
import type { Env } from './types'
import { listTools } from './tools'

/**
 * DoMCPAgent - Durable Object MCP Server with OAuth authentication
 *
 * Each authenticated user gets their own Durable Object instance
 * with tools filtered by their permissions (roles, scopes, etc.)
 */
export class DoMCPAgent extends McpAgent<Env, unknown, OAuthProps> {
  server = new McpServer({
    name: 'do-mcp-server',
    version: '1.0.0',
  })

  async init() {
    // Get user permissions from OAuth props
    const permissions = this.props?.permissions || []
    const user = this.props?.user

    console.log(`[MCP Agent] Initializing for user: ${user?.email}, permissions:`, permissions)

    // Get all tools (currently all public, but ready for permission filtering)
    const tools = listTools(true) // Pass true for authenticated

    // Register all tools with the MCP server
    for (const tool of tools) {
      this.server.tool(
        tool.name,
        tool.description,
        // Convert MCP tool schema to Zod schema
        this.convertSchemaToZod(tool.inputSchema),
        async (input: any) => {
          // Call the appropriate tool handler
          try {
            const result = await this.callTool(tool.name, input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          } catch (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            }
          }
        }
      )
    }

    console.log(`[MCP Agent] Registered ${tools.length} tools`)
  }

  /**
   * Convert JSON Schema to Zod schema for tool validation
   */
  private convertSchemaToZod(schema: any): z.ZodObject<any> {
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

  /**
   * Call tool by name
   */
  private async callTool(name: string, args: any): Promise<any> {
    // Import the tool handler dynamically
    const { callTool } = await import('./tools')

    // Create a mock context object with env bindings
    const mockContext: any = {
      env: this.env,
      req: {
        header: () => null,
      },
    }

    // Create mock user from OAuth props
    const mockUser = this.props?.user
      ? {
          id: this.props.user.id,
          email: this.props.user.email,
          name: `${this.props.user.firstName || ''} ${this.props.user.lastName || ''}`.trim(),
          permissions: this.props.permissions,
        }
      : null

    return await callTool(name, args, mockContext, mockUser, !!mockUser)
  }
}
