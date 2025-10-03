/**
 * Type definitions for MCP server
 */

export interface Env {
  // Service bindings
  DB: any // DB service RPC binding
  AI: any // AI service RPC binding
  AUTH: any // Auth service RPC binding
  QUEUE: any // Queue service RPC binding
  WORKFLOWS: any // Workflows service RPC binding

  // Environment variables
  POSTGRES_URL?: string
  ANTHROPIC_API_KEY?: string
  OPENAI_API_KEY?: string
}

export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export interface MCPRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id?: string | number | null
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}
