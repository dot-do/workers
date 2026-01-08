/**
 * Transport Layer Types
 *
 * This module defines the core interfaces for the transport abstraction layer
 * that separates protocol concerns from business logic in Durable Objects.
 *
 * ## Architecture
 * ```
 * Request -> TransportHandler -> InvocationRequest -> DO.invoke() -> InvocationResult -> TransportHandler -> Response
 * ```
 *
 * ## Design Principles
 * 1. Transport handlers translate protocol-specific requests to unified InvocationRequest
 * 2. DO.invoke() is the single entry point for all business logic
 * 3. Auth extraction is centralized in the transport layer
 * 4. Protocol details never leak into business logic
 *
 * @module transport/types
 */

/**
 * Unified invocation request that all transports convert to.
 *
 * This is the protocol-agnostic representation of an incoming request.
 * All transport handlers (HTTP, WebSocket, RPC) convert their specific
 * formats to this unified structure before calling DO.invoke().
 */
export interface InvocationRequest {
  /** Method/action to invoke */
  method: string
  /** Parameters for the invocation */
  params?: unknown
  /** Request ID for correlation (JSON-RPC id, correlation header, etc.) */
  id?: string | number | null
  /** Extracted authentication context */
  auth?: AuthContext
  /** Additional metadata from the transport */
  metadata?: InvocationMetadata
}

/**
 * Authentication context extracted from transport.
 *
 * Each transport handler extracts auth credentials from its protocol
 * (HTTP headers, WebSocket handshake, etc.) and normalizes to this format.
 */
export interface AuthContext {
  /** Authentication type (bearer, basic, api-key, etc.) */
  type: 'bearer' | 'basic' | 'api-key' | 'session' | 'none'
  /** The actual credential/token */
  credential?: string
  /** Decoded claims (for JWT tokens) */
  claims?: Record<string, unknown>
  /** User ID if authenticated */
  userId?: string
  /** Organization ID if available */
  orgId?: string
  /** Whether auth was successfully validated */
  isAuthenticated: boolean
}

/**
 * Additional metadata from the transport layer.
 */
export interface InvocationMetadata {
  /** Transport type that received the request */
  transport: 'http' | 'websocket' | 'rpc' | 'service-binding'
  /** Client IP address if available */
  clientIp?: string
  /** Request timestamp */
  timestamp: number
  /** Request trace ID for distributed tracing */
  traceId?: string
  /** User-Agent string */
  userAgent?: string
  /** Original request URL (for HTTP) */
  url?: string
  /** HTTP method (for HTTP requests) */
  httpMethod?: string
}

/**
 * Result of an invocation that transports convert to protocol-specific response.
 */
export interface InvocationResult<T = unknown> {
  /** Whether the invocation succeeded */
  success: boolean
  /** Result data (if success is true) */
  data?: T
  /** Error information (if success is false) */
  error?: InvocationError
  /** Request ID for correlation (echoed from request) */
  id?: string | number | null
  /** Additional result metadata */
  metadata?: ResultMetadata
}

/**
 * Standardized error format for invocation failures.
 */
export interface InvocationError {
  /** Error code (numeric for JSON-RPC compatibility) */
  code: number
  /** Human-readable error message */
  message: string
  /** Additional error data */
  data?: unknown
}

/**
 * Result metadata added by the invocation layer.
 */
export interface ResultMetadata {
  /** Execution duration in milliseconds */
  durationMs: number
  /** Timestamp when execution started */
  startedAt: number
  /** Timestamp when execution completed */
  completedAt: number
}

/**
 * Standard error codes (JSON-RPC compatible).
 *
 * Using JSON-RPC error codes as the standard since they're widely understood.
 */
export const ErrorCodes = {
  // JSON-RPC standard errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Custom error codes (application-specific range: -32000 to -32099)
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32002,
  NOT_FOUND: -32003,
  RATE_LIMITED: -32004,
  TIMEOUT: -32005,
  CONFLICT: -32006,
  PRECONDITION_FAILED: -32007,
  PAYLOAD_TOO_LARGE: -32008,
} as const

/**
 * Create a success result
 */
export function successResult<T>(data: T, id?: string | number | null): InvocationResult<T> {
  return {
    success: true,
    data,
    id,
  }
}

/**
 * Create an error result
 */
export function errorResult(
  code: number,
  message: string,
  id?: string | number | null,
  data?: unknown
): InvocationResult {
  return {
    success: false,
    error: { code, message, data },
    id,
  }
}

/**
 * Common error result creators
 */
export const Errors = {
  methodNotFound: (method: string, id?: string | number | null) =>
    errorResult(ErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`, id),

  invalidParams: (message: string, id?: string | number | null) =>
    errorResult(ErrorCodes.INVALID_PARAMS, message, id),

  unauthorized: (id?: string | number | null) =>
    errorResult(ErrorCodes.UNAUTHORIZED, 'Unauthorized', id),

  forbidden: (id?: string | number | null) =>
    errorResult(ErrorCodes.FORBIDDEN, 'Forbidden', id),

  internalError: (message: string, id?: string | number | null) =>
    errorResult(ErrorCodes.INTERNAL_ERROR, message, id),

  parseError: (id?: string | number | null) =>
    errorResult(ErrorCodes.PARSE_ERROR, 'Parse error', id),

  rateLimited: (id?: string | number | null) =>
    errorResult(ErrorCodes.RATE_LIMITED, 'Rate limit exceeded', id),

  timeout: (id?: string | number | null) =>
    errorResult(ErrorCodes.TIMEOUT, 'Request timeout', id),

  payloadTooLarge: (id?: string | number | null) =>
    errorResult(ErrorCodes.PAYLOAD_TOO_LARGE, 'Payload too large', id),
}
