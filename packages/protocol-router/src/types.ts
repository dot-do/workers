/**
 * Protocol Router Types
 *
 * Defines interfaces for multi-protocol worker routing
 */

import type { Hono } from 'hono'
import type { WorkerEntrypoint } from 'cloudflare:workers'

/**
 * RPC Handler
 *
 * Can be either:
 * - WorkerEntrypoint instance (for RPC via service bindings)
 * - Custom handler function
 */
export type RpcHandler = WorkerEntrypoint<any> | ((method: string, params: any, context: any) => Promise<any>)

/**
 * REST API Handler
 *
 * Hono application with REST routes
 */
export type RestHandler = Hono<any>

/**
 * MCP (Model Context Protocol) Handler
 *
 * Handles MCP JSON-RPC requests from AI agents
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  handler: (input: any, context: any) => Promise<any>
}

export type McpHandler = {
  tools: McpTool[]
  resources?: any[]
  prompts?: any[]
}

/**
 * GraphQL Handler
 *
 * GraphQL schema and execution (future)
 */
export type GraphQLHandler = {
  schema: any
  execute: (query: string, variables?: any, context?: any) => Promise<any>
}

/**
 * Documentation Handler
 *
 * Generates OpenAPI/AsyncAPI documentation
 */
export interface DocsConfig {
  title: string
  version: string
  description?: string
  contact?: {
    name?: string
    email?: string
    url?: string
  }
  license?: {
    name: string
    url?: string
  }
  servers?: Array<{
    url: string
    description?: string
  }>
}

export type DocsHandler = {
  config: DocsConfig
  generate: () => Promise<any>
}

/**
 * Protocol Router Configuration
 */
export interface ProtocolRouterConfig {
  /**
   * JSON-RPC 2.0 handler
   * Exposed at `/rpc`
   */
  rpc?: RpcHandler

  /**
   * REST API handler
   * Exposed at `/api/*`
   */
  api?: RestHandler

  /**
   * Model Context Protocol handler
   * Exposed at `/mcp`
   */
  mcp?: McpHandler

  /**
   * GraphQL handler (future)
   * Exposed at `/graphql`
   */
  graphql?: GraphQLHandler

  /**
   * Documentation generator
   * Exposed at `/docs`
   */
  docs?: DocsHandler

  /**
   * Custom middleware to run before protocol routing
   */
  middleware?: Array<(c: any, next: () => Promise<void>) => Promise<void>>

  /**
   * CORS configuration
   */
  cors?: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  }
}

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: any
  id?: string | number
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0'
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id?: string | number
}

/**
 * JSON-RPC 2.0 Error Codes
 */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/**
 * MCP Request
 */
export interface McpRequest {
  jsonrpc: '2.0'
  method: string
  params?: any
  id?: string | number
}

/**
 * MCP Response
 */
export interface McpResponse {
  jsonrpc: '2.0'
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id?: string | number
}
