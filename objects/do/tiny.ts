/**
 * dotdo/tiny - Minimal DO with no dependencies
 *
 * Smallest bundle size, no external deps, no auth.
 * Use when you need the lightest possible DO.
 */

export { DO } from './do-tiny'
export type { DOConfig, DOEnv } from './types'

// Error handling exports - included in tiny for consistent error handling
export {
  // Base error
  DOError,
  // Authentication errors (401)
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  // Authorization errors (403)
  AuthorizationError,
  InsufficientPermissionsError,
  // Not found errors (404)
  NotFoundError,
  MethodNotFoundError,
  RouteNotFoundError,
  // Validation errors (400)
  ValidationError,
  InvalidInputError,
  MissingFieldError,
  // Method errors (405)
  MethodNotAllowedError,
  // Conflict errors (409)
  ConflictError,
  DuplicateError,
  InvalidStateError,
  // Rate limit errors (429)
  RateLimitError,
  // Timeout errors (408, 504)
  TimeoutError,
  GatewayTimeoutError,
  // Internal errors (500, 501, 503)
  InternalError,
  ServiceUnavailableError,
  BindingNotAvailableError,
  NotImplementedError,
  // Utilities
  isDOError,
  wrapError,
  errorToResponse,
  errorToWebSocketMessage,
  createErrorFromStatus,
} from './errors'

export type {
  ErrorResponse,
  WebSocketErrorMessage,
  ValidationFieldError,
} from './errors'
