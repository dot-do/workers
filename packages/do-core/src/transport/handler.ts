/**
 * Transport Handler Interface
 *
 * This module defines the TransportHandler interface that all transport
 * implementations must conform to, along with the Invocable interface
 * that DOs must implement to work with transports.
 *
 * @module transport/handler
 */

import type {
  InvocationRequest,
  InvocationResult,
  AuthContext,
  InvocationMetadata,
} from './types.js'

/**
 * Transport handler interface.
 *
 * Transport handlers are responsible for:
 * 1. Receiving protocol-specific requests (HTTP, WebSocket, RPC)
 * 2. Extracting authentication credentials
 * 3. Converting to unified InvocationRequest format
 * 4. Calling the target's invoke() method
 * 5. Converting InvocationResult back to protocol-specific response
 *
 * @example
 * ```typescript
 * class MyHttpTransport implements TransportHandler {
 *   async handle(request: Request, target: Invocable): Promise<Response> {
 *     const invocation = await this.parseRequest(request)
 *     const result = await target.invoke(invocation)
 *     return this.createResponse(result)
 *   }
 * }
 * ```
 */
export interface TransportHandler<TInput = unknown, TOutput = unknown> {
  /** Transport type identifier */
  readonly type: 'http' | 'websocket' | 'rpc' | 'service-binding'

  /**
   * Handle an incoming request.
   *
   * @param input - Protocol-specific input (Request, WebSocket message, etc.)
   * @param target - The invocable target (DO instance)
   * @returns Protocol-specific output (Response, WebSocket message, etc.)
   */
  handle(input: TInput, target: Invocable): Promise<TOutput>

  /**
   * Extract authentication context from the request.
   *
   * @param input - Protocol-specific input
   * @returns Extracted auth context
   */
  extractAuth(input: TInput): Promise<AuthContext>

  /**
   * Extract metadata from the request.
   *
   * @param input - Protocol-specific input
   * @returns Request metadata
   */
  extractMetadata(input: TInput): InvocationMetadata
}

/**
 * Invocable interface that DOs must implement.
 *
 * This is the single entry point for all business logic. Transports convert
 * their protocol-specific requests to InvocationRequest and call this method.
 *
 * @example
 * ```typescript
 * class MyDO extends DOCore implements Invocable {
 *   async invoke(request: InvocationRequest): Promise<InvocationResult> {
 *     const handler = this.getHandler(request.method)
 *     if (!handler) {
 *       return Errors.methodNotFound(request.method, request.id)
 *     }
 *     return await handler(request)
 *   }
 * }
 * ```
 */
export interface Invocable {
  /**
   * Invoke a method on the DO.
   *
   * This is the unified entry point that all transports use.
   * The implementation should:
   * 1. Validate the request
   * 2. Check authentication/authorization if needed
   * 3. Route to the appropriate handler
   * 4. Execute and return the result
   *
   * @param request - The invocation request
   * @returns The invocation result
   */
  invoke(request: InvocationRequest): Promise<InvocationResult>
}

/**
 * Configuration for transport handlers.
 */
export interface TransportConfig {
  /** Maximum request body size in bytes */
  maxBodySize?: number
  /** Request timeout in milliseconds */
  timeout?: number
  /** Enable debug logging */
  debug?: boolean
  /** CORS allowed origins */
  corsOrigins?: string[]
  /** Custom headers to include in responses */
  customHeaders?: Record<string, string>
}

/**
 * Base class for transport handlers with common functionality.
 */
export abstract class BaseTransportHandler<TInput = unknown, TOutput = unknown>
  implements TransportHandler<TInput, TOutput>
{
  abstract readonly type: 'http' | 'websocket' | 'rpc' | 'service-binding'

  protected readonly config: TransportConfig

  constructor(config: TransportConfig = {}) {
    this.config = {
      maxBodySize: 1024 * 1024, // 1MB default
      timeout: 30000, // 30s default
      debug: false,
      corsOrigins: [],
      ...config,
    }
  }

  abstract handle(input: TInput, target: Invocable): Promise<TOutput>

  abstract extractAuth(input: TInput): Promise<AuthContext>

  abstract extractMetadata(input: TInput): InvocationMetadata

  /**
   * Log debug message if debug is enabled.
   */
  protected debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[Transport:${this.type}] ${message}`, data ?? '')
    }
  }

  /**
   * Check if origin is allowed for CORS.
   */
  protected isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true
    if (!this.config.corsOrigins || this.config.corsOrigins.length === 0) {
      return true // No restriction if not configured
    }
    return this.config.corsOrigins.includes(origin)
  }
}

/**
 * Auth extractor interface for pluggable authentication.
 *
 * Implementations can be registered with transport handlers to
 * support different authentication mechanisms.
 */
export interface AuthExtractor<TInput = unknown> {
  /** Auth type this extractor handles */
  readonly type: AuthContext['type']

  /**
   * Check if this extractor can handle the input.
   */
  canHandle(input: TInput): boolean

  /**
   * Extract credentials from the input.
   */
  extract(input: TInput): Promise<AuthContext>
}

/**
 * Bearer token auth extractor for HTTP requests.
 */
export class BearerAuthExtractor implements AuthExtractor<Request> {
  readonly type = 'bearer' as const

  canHandle(request: Request): boolean {
    const auth = request.headers.get('Authorization')
    return auth?.startsWith('Bearer ') ?? false
  }

  async extract(request: Request): Promise<AuthContext> {
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return { type: 'none', isAuthenticated: false }
    }

    const token = auth.slice(7) // Remove 'Bearer '
    return {
      type: 'bearer',
      credential: token,
      isAuthenticated: true, // Token present, validation is separate
    }
  }
}

/**
 * API key auth extractor for HTTP requests.
 */
export class ApiKeyAuthExtractor implements AuthExtractor<Request> {
  readonly type = 'api-key' as const

  private readonly headerName: string

  constructor(headerName = 'X-API-Key') {
    this.headerName = headerName
  }

  canHandle(request: Request): boolean {
    return request.headers.has(this.headerName)
  }

  async extract(request: Request): Promise<AuthContext> {
    const key = request.headers.get(this.headerName)
    if (!key) {
      return { type: 'none', isAuthenticated: false }
    }

    return {
      type: 'api-key',
      credential: key,
      isAuthenticated: true, // Key present, validation is separate
    }
  }
}
