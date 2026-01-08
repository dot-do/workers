/**
 * DO Error Handling - Consistent Error Types for Durable Objects
 *
 * This module provides a comprehensive error hierarchy for the workers.do platform,
 * ensuring consistent error handling across HTTP, WebSocket, and RPC transports.
 *
 * Error Codes:
 * - AUTH_* - Authentication and authorization errors (401, 403)
 * - NOT_FOUND_* - Resource not found errors (404)
 * - VALIDATION_* - Input validation errors (400)
 * - CONFLICT_* - State conflict errors (409)
 * - RATE_LIMIT_* - Rate limiting errors (429)
 * - TIMEOUT_* - Timeout errors (408, 504)
 * - METHOD_* - Method-related errors (405)
 * - INTERNAL_* - Internal server errors (500)
 *
 * @example
 * ```typescript
 * import { NotFoundError, AuthenticationError } from 'dotdo/errors'
 *
 * // Throw typed errors
 * throw new NotFoundError('user', userId)
 *
 * // Check error types
 * if (error instanceof AuthenticationError) {
 *   // Handle auth failure
 * }
 *
 * // Serialize for HTTP response
 * return error.toResponse()
 * ```
 */

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all DO errors
 *
 * Provides consistent error structure with:
 * - Machine-readable error codes
 * - HTTP status codes
 * - Serialization for HTTP/WebSocket responses
 * - Optional metadata for debugging
 */
export class DOError extends Error {
  /** Machine-readable error code */
  readonly code: string

  /** HTTP status code */
  readonly statusCode: number

  /** Additional context for debugging */
  readonly details?: Record<string, unknown>

  /** Timestamp when error occurred */
  readonly timestamp: number

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DOError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = Date.now()

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to a plain object for serialization
   */
  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        timestamp: this.timestamp,
      },
    }
  }

  /**
   * Convert error to an HTTP Response
   */
  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Convert error to a WebSocket error message
   */
  toWebSocketMessage(requestId?: string | number): WebSocketErrorMessage {
    return {
      type: 'error',
      id: requestId,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    }
  }
}

// ============================================================================
// Authentication Errors (401)
// ============================================================================

/**
 * Authentication required error
 *
 * Thrown when a request requires authentication but none was provided.
 */
export class AuthenticationError extends DOError {
  constructor(
    message = 'Authentication required',
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_REQUIRED', 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Invalid credentials error
 *
 * Thrown when authentication credentials are invalid.
 */
export class InvalidCredentialsError extends DOError {
  constructor(
    message = 'Invalid credentials',
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_INVALID_CREDENTIALS', 401, details)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * Token expired error
 *
 * Thrown when an authentication token has expired.
 */
export class TokenExpiredError extends DOError {
  constructor(message = 'Token expired', details?: Record<string, unknown>) {
    super(message, 'AUTH_TOKEN_EXPIRED', 401, details)
    this.name = 'TokenExpiredError'
  }
}

// ============================================================================
// Authorization Errors (403)
// ============================================================================

/**
 * Permission denied error
 *
 * Thrown when a user is authenticated but lacks required permissions.
 */
export class AuthorizationError extends DOError {
  constructor(
    message = 'Permission denied',
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_FORBIDDEN', 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Insufficient permissions error
 *
 * Thrown when specific permissions are required but not present.
 */
export class InsufficientPermissionsError extends DOError {
  readonly requiredPermissions: string[]

  constructor(
    requiredPermissions: string[],
    message = 'Insufficient permissions',
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_INSUFFICIENT_PERMISSIONS', 403, {
      requiredPermissions,
      ...details,
    })
    this.name = 'InsufficientPermissionsError'
    this.requiredPermissions = requiredPermissions
  }
}

// ============================================================================
// Not Found Errors (404)
// ============================================================================

/**
 * Resource not found error
 *
 * Thrown when a requested resource doesn't exist.
 */
export class NotFoundError extends DOError {
  readonly resourceType: string
  readonly resourceId?: string

  constructor(
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ) {
    const message = resourceId
      ? `${resourceType} not found: ${resourceId}`
      : `${resourceType} not found`
    super(message, 'NOT_FOUND', 404, { resourceType, resourceId, ...details })
    this.name = 'NotFoundError'
    this.resourceType = resourceType
    this.resourceId = resourceId
  }
}

/**
 * Method not found error
 *
 * Thrown when an RPC method doesn't exist.
 */
export class MethodNotFoundError extends DOError {
  readonly methodName: string

  constructor(methodName: string, details?: Record<string, unknown>) {
    super(`Method not found: ${methodName}`, 'NOT_FOUND_METHOD', 404, {
      methodName,
      ...details,
    })
    this.name = 'MethodNotFoundError'
    this.methodName = methodName
  }
}

/**
 * Route not found error
 *
 * Thrown when an HTTP route doesn't exist.
 */
export class RouteNotFoundError extends DOError {
  readonly path: string
  readonly method: string

  constructor(
    path: string,
    method: string,
    details?: Record<string, unknown>
  ) {
    super(`Route not found: ${method} ${path}`, 'NOT_FOUND_ROUTE', 404, {
      path,
      method,
      ...details,
    })
    this.name = 'RouteNotFoundError'
    this.path = path
    this.method = method
  }
}

// ============================================================================
// Validation Errors (400)
// ============================================================================

/**
 * Validation error
 *
 * Thrown when input validation fails.
 */
export class ValidationError extends DOError {
  readonly field?: string
  readonly validationErrors?: ValidationFieldError[]

  constructor(
    message: string,
    fieldOrErrors?: string | ValidationFieldError[],
    details?: Record<string, unknown>
  ) {
    const isFieldErrors = Array.isArray(fieldOrErrors)
    super(message, 'VALIDATION_ERROR', 400, {
      ...(isFieldErrors
        ? { errors: fieldOrErrors }
        : fieldOrErrors
          ? { field: fieldOrErrors }
          : {}),
      ...details,
    })
    this.name = 'ValidationError'
    if (isFieldErrors) {
      this.validationErrors = fieldOrErrors
    } else {
      this.field = fieldOrErrors
    }
  }
}

/**
 * Invalid input error
 *
 * Thrown when request body or parameters are malformed.
 */
export class InvalidInputError extends DOError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_INVALID_INPUT', 400, details)
    this.name = 'InvalidInputError'
  }
}

/**
 * Missing required field error
 *
 * Thrown when a required field is not provided.
 */
export class MissingFieldError extends DOError {
  readonly fieldName: string

  constructor(fieldName: string, details?: Record<string, unknown>) {
    super(`Missing required field: ${fieldName}`, 'VALIDATION_MISSING_FIELD', 400, {
      fieldName,
      ...details,
    })
    this.name = 'MissingFieldError'
    this.fieldName = fieldName
  }
}

// ============================================================================
// Method Errors (405)
// ============================================================================

/**
 * Method not allowed error
 *
 * Thrown when an HTTP method is not allowed for a route.
 */
export class MethodNotAllowedError extends DOError {
  readonly method: string
  readonly allowedMethods?: string[]

  constructor(
    method: string,
    allowedMethods?: string[],
    details?: Record<string, unknown>
  ) {
    super(`Method not allowed: ${method}`, 'METHOD_NOT_ALLOWED', 405, {
      method,
      ...(allowedMethods && { allowedMethods }),
      ...details,
    })
    this.name = 'MethodNotAllowedError'
    this.method = method
    this.allowedMethods = allowedMethods
  }

  toResponse(): Response {
    const response = super.toResponse()
    if (this.allowedMethods) {
      const headers = new Headers(response.headers)
      headers.set('Allow', this.allowedMethods.join(', '))
      return new Response(response.body, {
        status: response.status,
        headers,
      })
    }
    return response
  }
}

// ============================================================================
// Conflict Errors (409)
// ============================================================================

/**
 * Conflict error
 *
 * Thrown when there's a state conflict (e.g., duplicate key, version mismatch).
 */
export class ConflictError extends DOError {
  readonly conflictType: string

  constructor(
    message: string,
    conflictType = 'GENERIC',
    details?: Record<string, unknown>
  ) {
    super(message, `CONFLICT_${conflictType}`, 409, details)
    this.name = 'ConflictError'
    this.conflictType = conflictType
  }
}

/**
 * Duplicate resource error
 *
 * Thrown when trying to create a resource that already exists.
 */
export class DuplicateError extends DOError {
  readonly resourceType: string
  readonly identifier?: string

  constructor(
    resourceType: string,
    identifier?: string,
    details?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resourceType} already exists: ${identifier}`
      : `${resourceType} already exists`
    super(message, 'CONFLICT_DUPLICATE', 409, {
      resourceType,
      identifier,
      ...details,
    })
    this.name = 'DuplicateError'
    this.resourceType = resourceType
    this.identifier = identifier
  }
}

/**
 * Invalid state error
 *
 * Thrown when an operation is not allowed in the current state.
 */
export class InvalidStateError extends DOError {
  readonly currentState: string
  readonly requiredState?: string

  constructor(
    message: string,
    currentState: string,
    requiredState?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT_INVALID_STATE', 409, {
      currentState,
      ...(requiredState && { requiredState }),
      ...details,
    })
    this.name = 'InvalidStateError'
    this.currentState = currentState
    this.requiredState = requiredState
  }
}

// ============================================================================
// Rate Limit Errors (429)
// ============================================================================

/**
 * Rate limit exceeded error
 *
 * Thrown when a client has made too many requests.
 */
export class RateLimitError extends DOError {
  readonly retryAfter?: number
  readonly limit?: number
  readonly remaining?: number

  constructor(
    message = 'Rate limit exceeded',
    options?: {
      retryAfter?: number
      limit?: number
      remaining?: number
    },
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, {
      ...options,
      ...details,
    })
    this.name = 'RateLimitError'
    this.retryAfter = options?.retryAfter
    this.limit = options?.limit
    this.remaining = options?.remaining
  }

  toResponse(): Response {
    const response = super.toResponse()
    const headers = new Headers(response.headers)
    if (this.retryAfter) {
      headers.set('Retry-After', String(this.retryAfter))
    }
    if (this.limit !== undefined) {
      headers.set('X-RateLimit-Limit', String(this.limit))
    }
    if (this.remaining !== undefined) {
      headers.set('X-RateLimit-Remaining', String(this.remaining))
    }
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  }
}

// ============================================================================
// Timeout Errors (408, 504)
// ============================================================================

/**
 * Request timeout error
 *
 * Thrown when a request takes too long to process.
 */
export class TimeoutError extends DOError {
  readonly timeoutMs: number

  constructor(
    message = 'Request timeout',
    timeoutMs?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT_REQUEST', 408, {
      ...(timeoutMs && { timeoutMs }),
      ...details,
    })
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs ?? 0
  }
}

/**
 * Gateway timeout error
 *
 * Thrown when an upstream service times out.
 */
export class GatewayTimeoutError extends DOError {
  readonly service?: string

  constructor(
    message = 'Gateway timeout',
    service?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT_GATEWAY', 504, {
      ...(service && { service }),
      ...details,
    })
    this.name = 'GatewayTimeoutError'
    this.service = service
  }
}

// ============================================================================
// Internal Errors (500)
// ============================================================================

/**
 * Internal server error
 *
 * Thrown for unexpected internal errors.
 */
export class InternalError extends DOError {
  readonly originalError?: Error

  constructor(
    message = 'Internal server error',
    originalError?: Error,
    details?: Record<string, unknown>
  ) {
    super(message, 'INTERNAL_ERROR', 500, details)
    this.name = 'InternalError'
    this.originalError = originalError
  }
}

/**
 * Service unavailable error
 *
 * Thrown when a service is temporarily unavailable.
 */
export class ServiceUnavailableError extends DOError {
  readonly retryAfter?: number

  constructor(
    message = 'Service unavailable',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, {
      ...(retryAfter && { retryAfter }),
      ...details,
    })
    this.name = 'ServiceUnavailableError'
    this.retryAfter = retryAfter
  }

  toResponse(): Response {
    const response = super.toResponse()
    if (this.retryAfter) {
      const headers = new Headers(response.headers)
      headers.set('Retry-After', String(this.retryAfter))
      return new Response(response.body, {
        status: response.status,
        headers,
      })
    }
    return response
  }
}

/**
 * Binding not available error
 *
 * Thrown when a required service binding is not configured.
 */
export class BindingNotAvailableError extends DOError {
  readonly bindingName: string

  constructor(bindingName: string, details?: Record<string, unknown>) {
    super(
      `Binding not available: ${bindingName}`,
      'INTERNAL_BINDING_UNAVAILABLE',
      500,
      { bindingName, ...details }
    )
    this.name = 'BindingNotAvailableError'
    this.bindingName = bindingName
  }
}

/**
 * Not implemented error
 *
 * Thrown when a feature is not yet implemented.
 */
export class NotImplementedError extends DOError {
  readonly feature: string

  constructor(feature: string, details?: Record<string, unknown>) {
    super(`Not implemented: ${feature}`, 'INTERNAL_NOT_IMPLEMENTED', 501, {
      feature,
      ...details,
    })
    this.name = 'NotImplementedError'
    this.feature = feature
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    timestamp: number
  }
}

/**
 * WebSocket error message format
 */
export interface WebSocketErrorMessage {
  type: 'error'
  id?: string | number
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Validation field error for detailed validation failures
 */
export interface ValidationFieldError {
  field: string
  message: string
  code?: string
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is a DOError
 */
export function isDOError(error: unknown): error is DOError {
  return error instanceof DOError
}

/**
 * Wrap an unknown error in a DOError
 *
 * Useful for catch blocks to ensure consistent error types.
 */
export function wrapError(error: unknown): DOError {
  if (error instanceof DOError) {
    return error
  }
  if (error instanceof Error) {
    return new InternalError(error.message, error)
  }
  return new InternalError(String(error))
}

/**
 * Convert an error to an HTTP Response
 *
 * Handles both DOError and generic Error types.
 */
export function errorToResponse(error: unknown): Response {
  if (error instanceof DOError) {
    return error.toResponse()
  }
  return wrapError(error).toResponse()
}

/**
 * Convert an error to a WebSocket message
 *
 * Handles both DOError and generic Error types.
 */
export function errorToWebSocketMessage(
  error: unknown,
  requestId?: string | number
): WebSocketErrorMessage {
  if (error instanceof DOError) {
    return error.toWebSocketMessage(requestId)
  }
  return wrapError(error).toWebSocketMessage(requestId)
}

/**
 * HTTP status code to error class mapping
 *
 * Use this to convert HTTP status codes to appropriate error types.
 */
export const statusCodeToError: Record<number, typeof DOError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: AuthorizationError,
  404: NotFoundError,
  405: MethodNotAllowedError,
  408: TimeoutError,
  409: ConflictError,
  429: RateLimitError,
  500: InternalError,
  501: NotImplementedError,
  503: ServiceUnavailableError,
  504: GatewayTimeoutError,
}

/**
 * Create an error from an HTTP status code
 */
export function createErrorFromStatus(
  statusCode: number,
  message?: string,
  details?: Record<string, unknown>
): DOError {
  const ErrorClass = statusCodeToError[statusCode] || DOError
  if (ErrorClass === NotFoundError) {
    return new NotFoundError('Resource', undefined, details)
  }
  return new ErrorClass(message, details as never)
}
