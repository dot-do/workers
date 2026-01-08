/**
 * dotdo - An agentic database that can DO anything
 *
 * The base Durable Object class with:
 * - Drizzle ORM for SQLite
 * - Better Auth integration (optional)
 * - AI agent built in
 * - Multi-transport: HTTP, WebSocket, Workers RPC, CapnWeb
 */

export { DO } from './do'
export { schema } from './schema'
export type { DOConfig, DOEnv } from './types'

// Error handling exports
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
