/**
 * Type definitions for MCP server
 */

import type { Sandbox } from '@cloudflare/sandbox'
import type { DurableObjectNamespace } from '@cloudflare/workers-types'

export interface Env {
  // Service bindings
  DB: any // DB service RPC binding
  DO: any // DO service RPC binding (code execution)
  AI: any // AI service RPC binding
  AUTH: any // Auth service RPC binding
  QUEUE: any // Queue service RPC binding
  WORKFLOWS: any // Workflows service RPC binding

  // Durable Objects
  SANDBOX?: DurableObjectNamespace<Sandbox> // Sandbox instances for Python/JS execution

  // KV namespace
  KV?: KVNamespace // Cache for sandbox metadata

  // D1 databases
  WORKER_REGISTRY_DB?: D1Database // Dynamic worker registry

  // Environment variables
  POSTGRES_URL?: string
  ANTHROPIC_API_KEY?: string
  OPENAI_API_KEY?: string
  SANDBOX_TIMEOUT_MS?: string
  MAX_SANDBOX_INSTANCES?: string
  LOG_LEVEL?: string
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

// Sandbox-specific types
export interface SandboxExecResult {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

export interface ISandboxManager {
  createSandbox(id: string, envVars?: Record<string, string>): Promise<void>
  executeCode(sandboxId: string, code: string, language: 'python' | 'javascript', contextId?: string): Promise<SandboxExecResult>
  writeFile(sandboxId: string, path: string, content: string): Promise<void>
  readFile(sandboxId: string, path: string): Promise<string>
  runCommand(sandboxId: string, command: string, args?: string[]): Promise<SandboxExecResult>
  gitClone(sandboxId: string, repoUrl: string, branch?: string): Promise<void>
  deleteSandbox(sandboxId: string): Promise<void>
  listSandboxes(): string[]
}
