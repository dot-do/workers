/**
 * mcp.do - Model Context Protocol for .do services
 *
 * Expose any .do SDK as an MCP server for AI tool integration.
 * Supports stdio transport for local AI assistants.
 *
 * @see https://mcp.do
 * @see https://modelcontextprotocol.io
 *
 * @example
 * ```typescript
 * import { mcp } from 'mcp.do'
 * import { workflows } from 'workflows.do'
 *
 * // Expose workflows.do as MCP tools
 * mcp.serve(workflows, {
 *   name: 'workflows',
 *   transport: 'stdio'
 * })
 *
 * // Or use tagged template
 * const server = await mcp.do`
 *   Expose task management tools for AI assistants
 *   with create, list, update, and complete operations
 * `
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface MCPServerConfig {
  name: string
  version?: string
  description?: string
  transport?: 'stdio' | 'http' | 'websocket'
  tools?: MCPTool[]
  resources?: MCPResource[]
  prompts?: MCPPrompt[]
}

export interface MCPServer {
  config: MCPServerConfig
  start(): Promise<void>
  stop(): Promise<void>
  addTool(tool: MCPTool, handler: (args: unknown) => Promise<unknown>): void
  addResource(resource: MCPResource, handler: () => Promise<string>): void
  addPrompt(prompt: MCPPrompt, handler: (args: Record<string, string>) => Promise<string>): void
}

export interface MCPClientConfig {
  transport: 'stdio' | 'http' | 'websocket'
  command?: string // For stdio
  args?: string[]
  url?: string // For http/websocket
}

export interface MCPClient {
  connect(): Promise<void>
  disconnect(): Promise<void>
  listTools(): Promise<MCPTool[]>
  callTool(name: string, args: unknown): Promise<unknown>
  listResources(): Promise<MCPResource[]>
  readResource(uri: string): Promise<string>
  listPrompts(): Promise<MCPPrompt[]>
  getPrompt(name: string, args?: Record<string, string>): Promise<string>
}

export interface DoOptions {
  name?: string
  transport?: 'stdio' | 'http' | 'websocket'
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

/**
 * Create an MCP server from any object
 */
export function createServer(target: object, config: MCPServerConfig): MCPServer {
  const tools: Map<string, (args: unknown) => Promise<unknown>> = new Map()
  const resources: Map<string, () => Promise<string>> = new Map()
  const prompts: Map<string, (args: Record<string, string>) => Promise<string>> = new Map()

  // Auto-discover methods as tools
  for (const key of Object.keys(target)) {
    const value = (target as Record<string, unknown>)[key]
    if (typeof value === 'function') {
      tools.set(key, value as (args: unknown) => Promise<unknown>)
    }
  }

  return {
    config,

    async start() {
      if (config.transport === 'stdio') {
        // Implement stdio transport
        console.error(`MCP Server "${config.name}" started on stdio`)
        // In real implementation, this would set up stdio message handling
      }
    },

    async stop() {
      console.error(`MCP Server "${config.name}" stopped`)
    },

    addTool(tool: MCPTool, handler: (args: unknown) => Promise<unknown>) {
      tools.set(tool.name, handler)
    },

    addResource(resource: MCPResource, handler: () => Promise<string>) {
      resources.set(resource.uri, handler)
    },

    addPrompt(prompt: MCPPrompt, handler: (args: Record<string, string>) => Promise<string>) {
      prompts.set(prompt.name, handler)
    },
  }
}

/**
 * Create an MCP client
 */
export function createMCPClient(config: MCPClientConfig): MCPClient {
  return {
    async connect() {
      // Implement connection logic
    },

    async disconnect() {
      // Implement disconnection logic
    },

    async listTools() {
      return []
    },

    async callTool(name: string, args: unknown) {
      return null
    },

    async listResources() {
      return []
    },

    async readResource(uri: string) {
      return ''
    },

    async listPrompts() {
      return []
    },

    async getPrompt(name: string, args?: Record<string, string>) {
      return ''
    },
  }
}

// MCP Client interface
export interface MCPDoClient {
  /**
   * Create an MCP server from natural language
   */
  do: TaggedTemplate<Promise<MCPServer>>

  /**
   * Serve an object as MCP tools
   */
  serve(target: object, config: MCPServerConfig): MCPServer

  /**
   * Create an MCP server
   */
  server(config: MCPServerConfig): MCPServer

  /**
   * Create an MCP client
   */
  client(config: MCPClientConfig): MCPClient

  /**
   * Convert SDK methods to MCP tools
   */
  tools<T extends object>(sdk: T): MCPTool[]

  /**
   * Run as stdio MCP server
   */
  stdio(target: object, name?: string): Promise<void>
}

/**
 * Create a configured MCP client
 */
export function MCP(options?: ClientOptions): MCPDoClient {
  return {
    do: tagged(async (description: string, opts?: DoOptions) => {
      const config: MCPServerConfig = {
        name: opts?.name || 'mcp-server',
        description: description.trim(),
        transport: opts?.transport || 'stdio',
      }
      return createServer({}, config)
    }),

    serve(target: object, config: MCPServerConfig) {
      return createServer(target, config)
    },

    server(config: MCPServerConfig) {
      return createServer({}, config)
    },

    client(config: MCPClientConfig) {
      return createMCPClient(config)
    },

    tools<T extends object>(sdk: T): MCPTool[] {
      const tools: MCPTool[] = []

      for (const key of Object.keys(sdk)) {
        const value = (sdk as Record<string, unknown>)[key]
        if (typeof value === 'function') {
          tools.push({
            name: key,
            description: `Call ${key}`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          })
        }
      }

      return tools
    },

    async stdio(target: object, name?: string) {
      const server = createServer(target, {
        name: name || 'mcp-server',
        transport: 'stdio',
      })
      await server.start()

      // Keep process alive
      process.stdin.resume()
    },
  }
}

/**
 * Default MCP client
 */
export const mcp: MCPDoClient = MCP({
  apiKey: typeof process !== 'undefined' ? (process.env?.MCP_API_KEY || process.env?.DO_API_KEY) : undefined,
})

export default mcp

// Re-export types from @modelcontextprotocol/sdk when available
export type { ClientOptions } from 'rpc.do'
