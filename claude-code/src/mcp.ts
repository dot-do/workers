/**
 * MCP Server for Claude Code Service
 *
 * Exposes Claude Code capabilities as MCP tools for AI agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Env } from './index'

export interface MCPServerContext {
  env: Env
  ctx: ExecutionContext
}

/**
 * Create MCP server instance with Claude Code tools
 */
export function createMCPServer(context: MCPServerContext) {
  const server = new Server(
    { name: 'claude-code', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'generate_code',
        description: 'Generate code from a natural language prompt',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Natural language description of code to generate' },
            options: {
              type: 'object',
              properties: {
                model: { type: 'string', description: 'Claude model to use', default: 'claude-sonnet-4-5-20250929' },
                maxTokens: { type: 'number', description: 'Maximum tokens in response', default: 4096 },
                temperature: { type: 'number', description: 'Sampling temperature 0-1', default: 0.7 },
                system: { type: 'string', description: 'System prompt override' }
              }
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'analyze_code',
        description: 'Analyze code with specific focus areas',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            analysis: { type: 'string', description: 'What to analyze (e.g., "security issues", "performance bottlenecks")' }
          },
          required: ['code', 'analysis']
        }
      },
      {
        name: 'explain_code',
        description: 'Explain what code does and how it works',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to explain' }
          },
          required: ['code']
        }
      },
      {
        name: 'refactor_code',
        description: 'Refactor code based on specific instructions',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to refactor' },
            instructions: { type: 'string', description: 'Refactoring instructions (e.g., "extract reusable functions", "improve naming")' }
          },
          required: ['code', 'instructions']
        }
      },
      {
        name: 'fix_code',
        description: 'Fix broken code given an error message',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Broken code' },
            error: { type: 'string', description: 'Error message or description' }
          },
          required: ['code', 'error']
        }
      },
      {
        name: 'review_code',
        description: 'Review code for issues and provide suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to review' },
            focus: { type: 'string', description: 'Optional focus area (e.g., "security", "performance")' }
          },
          required: ['code']
        }
      }
    ]
  }))

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: any

      // Execute the requested tool
      switch (name) {
        case 'generate_code': {
          const response = await fetch('https://claude-code.internal/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: args.prompt, options: args.options })
          })
          result = await response.json()
          break
        }

        case 'analyze_code': {
          const response = await fetch('https://claude-code.internal/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: args.code, analysis: args.analysis })
          })
          result = await response.json()
          break
        }

        case 'explain_code': {
          const response = await fetch('https://claude-code.internal/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: args.code })
          })
          result = await response.json()
          break
        }

        case 'refactor_code': {
          const response = await fetch('https://claude-code.internal/refactor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: args.code, instructions: args.instructions })
          })
          result = await response.json()
          break
        }

        case 'fix_code': {
          const response = await fetch('https://claude-code.internal/fix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: args.code, error: args.error })
          })
          result = await response.json()
          break
        }

        case 'review_code': {
          const response = await fetch('https://claude-code.internal/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: args.code, focus: args.focus })
          })
          result = await response.json()
          break
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      }
    }
  })

  return server
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer(context: MCPServerContext) {
  const server = createMCPServer(context)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.log('Claude Code MCP server running on stdio')
}
