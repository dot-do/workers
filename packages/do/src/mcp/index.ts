/**
 * @dotdo/do/mcp - MCP Layer
 *
 * Model Context Protocol support with OAuth 2.1.
 * Provides tools for AI integration (search, fetch, do).
 */

/**
 * MCP tool definition
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

/**
 * MCP tools manifest
 */
export const MCP_TOOLS: McpTool[] = [
  {
    name: 'search',
    description: 'Search across all collections in the database',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        collection: { type: 'string', description: 'Optional: limit to specific collection' },
        limit: { type: 'number', description: 'Maximum number of results' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch',
    description: 'Fetch a document by ID or a URL',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Document ID (collection/id) or URL' },
      },
      required: ['target'],
    },
  },
  {
    name: 'do',
    description: 'Execute code in a secure sandbox with access to the database',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute' },
        timeout: { type: 'number', description: 'Execution timeout in ms' },
      },
      required: ['code'],
    },
  },
]

/**
 * MCP protocol handler
 */
export class McpHandler {
  private target: { search: Function; fetch: Function; do: Function }

  constructor(target: { search: Function; fetch: Function; do: Function }) {
    this.target = target
  }

  /**
   * Handle MCP request
   */
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace('/mcp', '').replace('/', '') || 'manifest'

    switch (path) {
      case 'manifest':
      case '':
        return this.handleManifest()

      case 'tools':
        return this.handleToolsList()

      default:
        if (path.startsWith('tools/')) {
          const toolName = path.replace('tools/', '')
          return this.handleToolCall(toolName, request)
        }
        return new Response('Not found', { status: 404 })
    }
  }

  /**
   * Return MCP manifest
   */
  private handleManifest(): Response {
    return Response.json({
      name: 'DO',
      version: '1.0.0',
      description: 'An agentic database that can DO anything',
      tools: MCP_TOOLS,
    })
  }

  /**
   * Return tools list
   */
  private handleToolsList(): Response {
    return Response.json({ tools: MCP_TOOLS })
  }

  /**
   * Handle tool call
   */
  private async handleToolCall(toolName: string, request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const tool = MCP_TOOLS.find((t) => t.name === toolName)
    if (!tool) {
      return new Response(`Tool not found: ${toolName}`, { status: 404 })
    }

    try {
      const body = await request.json()

      switch (toolName) {
        case 'search':
          const searchResult = await this.target.search(body.query, {
            collection: body.collection,
            limit: body.limit,
          })
          return Response.json({ result: searchResult })

        case 'fetch':
          const fetchResult = await this.target.fetch(body.target)
          return Response.json({ result: fetchResult })

        case 'do':
          const doResult = await this.target.do(body.code, {
            timeout: body.timeout,
          })
          return Response.json({ result: doResult })

        default:
          return new Response('Not implemented', { status: 501 })
      }
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }
}
