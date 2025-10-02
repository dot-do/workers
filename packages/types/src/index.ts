/**
 * Shared TypeScript types for all Workers services
 * @module @dot-do/worker-types
 */

/**
 * Base environment interface that all Workers extend
 */
export interface BaseEnv {
  // Database bindings
  DB?: D1Database

  // KV namespaces
  KV?: KVNamespace
  CACHE?: KVNamespace

  // R2 buckets
  BUCKET?: R2Bucket

  // Queue bindings
  QUEUE?: Queue

  // Service bindings (RPC)
  AI_SERVICE?: any
  DB_SERVICE?: any
  AUTH_SERVICE?: any

  // Secrets
  ANTHROPIC_API_KEY?: string
  OPENAI_API_KEY?: string

  // Configuration
  ENVIRONMENT?: 'development' | 'staging' | 'production'
}

/**
 * Context passed to all handlers
 */
export interface WorkerContext {
  waitUntil: (promise: Promise<any>) => void
  passThroughOnException: () => void
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

/**
 * Standard error format
 */
export interface ApiError {
  code: string
  message: string
  details?: unknown
  stack?: string
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: number
  requestId?: string
  version?: string
  cached?: boolean
}

/**
 * RPC method definition
 */
export interface RpcMethod<TInput = any, TOutput = any> {
  name: string
  input: TInput
  output: TOutput
}

/**
 * Queue message format
 */
export interface QueueMessage<T = any> {
  id: string
  timestamp: number
  type: string
  data: T
  retry?: number
}

/**
 * MCP tool definition
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: object
  handler: (input: any) => Promise<any>
}

/**
 * MCP resource definition
 */
export interface McpResource {
  uri: string
  name: string
  description: string
  mimeType?: string
  handler: () => Promise<any>
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * Filter operators
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'exists'

/**
 * Generic filter
 */
export interface Filter {
  field: string
  operator: FilterOperator
  value: any
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort parameter
 */
export interface SortParam {
  field: string
  direction: SortDirection
}

/**
 * Query parameters
 */
export interface QueryParams {
  filters?: Filter[]
  sort?: SortParam[]
  pagination?: PaginationParams
}
