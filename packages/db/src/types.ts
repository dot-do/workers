/**
 * Core types for @dotdo/db
 */

// ============================================================================
// RpcTarget Types
// ============================================================================

/**
 * Method allowlist for RpcTarget
 */
export type AllowedMethods = Set<string>

/**
 * RPC request format
 */
export interface RpcRequest {
  id: string
  method: string
  params: unknown[]
}

/**
 * RPC response format
 */
export interface RpcResponse {
  id: string
  result?: unknown
  error?: string
}

// ============================================================================
// CRUD Types
// ============================================================================

/**
 * Options for listing documents
 */
export interface ListOptions {
  limit?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  filter?: Record<string, unknown>
}

/**
 * Document with ID
 */
export interface Document {
  id: string
  [key: string]: unknown
}

// ============================================================================
// MCP Tool Types
// ============================================================================

/**
 * Options for search tool
 */
export interface SearchOptions {
  limit?: number
  collections?: string[]
  fuzzy?: boolean
}

/**
 * Search result
 */
export interface SearchResult {
  id: string
  collection: string
  score: number
  document: Document
}

/**
 * Options for fetch tool
 */
export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

/**
 * Fetch result
 */
export interface FetchResult {
  status: number
  headers: Record<string, string>
  body: unknown
  url: string
}

/**
 * Options for do (execute) tool
 */
export interface DoOptions {
  timeout?: number
  memory?: number
  env?: Record<string, unknown>
}

/**
 * Do (execute) result
 */
export interface DoResult {
  success: boolean
  result?: unknown
  error?: string
  logs?: string[]
  duration: number
}

// ============================================================================
// Transport Types
// ============================================================================

/**
 * Transport type for multi-transport support
 */
export type TransportType = 'workers-rpc' | 'http' | 'websocket' | 'mcp'

/**
 * Transport context passed to handlers
 */
export interface TransportContext {
  type: TransportType
  request?: Request
  ws?: WebSocket
  metadata?: Record<string, unknown>
}

// ============================================================================
// Auth Types
// ============================================================================

/**
 * Auth context for authenticated requests
 */
export interface AuthContext {
  userId?: string
  organizationId?: string
  permissions?: string[]
  token?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// WebSocket Hibernation Types
// ============================================================================

/**
 * WebSocket message handler
 */
export type WebSocketMessageHandler = (
  ws: WebSocket,
  message: string | ArrayBuffer
) => Promise<void>

/**
 * WebSocket close handler
 */
export type WebSocketCloseHandler = (
  ws: WebSocket,
  code: number,
  reason: string,
  wasClean: boolean
) => Promise<void>

/**
 * WebSocket error handler
 */
export type WebSocketErrorHandler = (
  ws: WebSocket,
  error: unknown
) => Promise<void>
