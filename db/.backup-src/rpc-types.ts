/**
 * RPC Types - Copied from apis.do for use in db service
 *
 * These types define the RPC interface for service-to-service communication.
 * Source: /sdk/packages/apis.do/src/types.ts
 */

// ============================================================================
// RPC Core Types
// ============================================================================

/**
 * RPC Request
 */
export interface RpcRequest {
  /** Method name or path segments */
  method: string | any[]
  /** Method arguments */
  args: any[]
  /** Request ID for tracing */
  requestId?: string
  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Response
 */
export interface RpcResponse<T = any> {
  /** Response data */
  data?: T
  /** Error information */
  error?: RpcError
  /** Request ID (for correlation) */
  requestId?: string
  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Error
 */
export interface RpcError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error details */
  details?: any
  /** Stack trace (development only) */
  stack?: string
}

// ============================================================================
// RPC Server Types
// ============================================================================

/**
 * RPC Handler - Function that handles RPC requests
 */
export type RpcHandler<T = any> = (
  request: RpcRequest,
  context: RpcContext
) => Promise<RpcResponse<T>>

/**
 * RPC Context - Available to RPC handlers
 */
export interface RpcContext {
  /** Request ID */
  requestId: string
  /** Environment bindings */
  env: any
  /** Execution context */
  executionCtx?: any
  /** Authentication info */
  auth?: {
    userId?: string
    roles?: string[]
    metadata?: Record<string, any>
  }
  /** Request metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Method Definition
 */
export interface RpcMethod {
  /** Method name */
  name: string
  /** Handler function */
  handler: RpcHandler
  /** Input schema (optional, for validation) */
  inputSchema?: any
  /** Output schema (optional, for validation) */
  outputSchema?: any
  /** Whether authentication is required */
  requiresAuth?: boolean
  /** Required roles */
  requiredRoles?: string[]
}

/**
 * RPC Service Definition
 */
export interface RpcService {
  /** Service name */
  name: string
  /** Service version */
  version: string
  /** RPC methods */
  methods: RpcMethod[]
  /** Service metadata */
  metadata?: Record<string, any>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to create an RPC method
 */
export function createRpcMethod(
  name: string,
  handler: RpcHandler,
  options?: {
    inputSchema?: any
    outputSchema?: any
    requiresAuth?: boolean
    requiredRoles?: string[]
  }
): RpcMethod {
  return {
    name,
    handler,
    ...options,
  }
}

/**
 * Create RPC success response
 */
export function createSuccessResponse<T>(data: T, requestId?: string): RpcResponse<T> {
  return {
    data,
    requestId,
  }
}

/**
 * Create RPC error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): RpcResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    requestId,
  }
}
