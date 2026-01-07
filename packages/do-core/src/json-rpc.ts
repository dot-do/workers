/**
 * JSON-RPC Handler for Cloudflare Workers
 *
 * This implementation is designed to work with Workers runtime,
 * reading configuration from env bindings (NOT process.env).
 */

/**
 * JSON-RPC configuration interface
 * Configuration comes from Workers env bindings, not process.env
 */
export interface JsonRpcConfig {
  /** Maximum request body size in bytes */
  maxBodySize: number
  /** Request timeout in milliseconds */
  timeout: number
  /** Enable debug logging */
  debug: boolean
  /** API key for authentication (from secrets) */
  apiKey?: string
  /** Custom headers to include in responses */
  corsOrigins: string[]
}

/**
 * Workers environment bindings for JSON-RPC
 */
export interface JsonRpcEnv {
  /** API key secret binding */
  API_KEY?: string
  /** Debug mode flag */
  DEBUG?: string
  /** Max body size configuration */
  MAX_BODY_SIZE?: string
  /** Request timeout configuration */
  REQUEST_TIMEOUT?: string
  /** CORS allowed origins */
  CORS_ORIGINS?: string
  /** Generic bindings */
  [key: string]: unknown
}

/**
 * JSON-RPC request structure
 */
interface JsonRpcRequest {
  jsonrpc: string
  method: string
  params?: unknown
  id?: string | number | null
}

/**
 * JSON-RPC error codes
 */
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

/**
 * JSON-RPC handler interface
 */
export interface JsonRpcHandler {
  /**
   * Handle a JSON-RPC request
   * @param request - The incoming Request object
   * @param env - Workers environment bindings (NOT process.env)
   * @returns JSON-RPC response
   */
  handle(request: Request, env: JsonRpcEnv): Promise<Response>

  /**
   * Get configuration from Workers env bindings
   * @param env - Workers environment bindings
   * @returns Parsed configuration object
   */
  getConfig(env: JsonRpcEnv): JsonRpcConfig
}

/**
 * Built-in methods
 */
const BUILT_IN_METHODS: Record<string, (params: unknown) => unknown> = {
  ping: () => 'pong',
  echo: (params: unknown) => {
    if (Array.isArray(params) && params.length > 0) {
      return params[0]
    }
    return params
  },
  generateId: () => crypto.randomUUID(),
}

/**
 * JSON-RPC Handler Implementation
 * Reads all configuration from Workers env bindings, never from process.env
 */
class JsonRpcHandlerImpl implements JsonRpcHandler {
  /**
   * Get configuration from Workers env bindings only
   * Never reads from process.env
   */
  getConfig(env: JsonRpcEnv): JsonRpcConfig {
    // Default values
    const defaults: JsonRpcConfig = {
      maxBodySize: 1024 * 1024, // 1MB
      timeout: 30000, // 30s
      debug: false,
      apiKey: undefined,
      corsOrigins: [],
    }

    // Parse from env bindings only (NEVER from process.env)
    return {
      maxBodySize: env.MAX_BODY_SIZE ? parseInt(env.MAX_BODY_SIZE, 10) : defaults.maxBodySize,
      timeout: env.REQUEST_TIMEOUT ? parseInt(env.REQUEST_TIMEOUT, 10) : defaults.timeout,
      debug: env.DEBUG === 'true',
      apiKey: env.API_KEY,
      corsOrigins: env.CORS_ORIGINS
        ? env.CORS_ORIGINS.split(',').map((s) => s.trim())
        : defaults.corsOrigins,
    }
  }

  /**
   * Handle a JSON-RPC request
   */
  async handle(request: Request, env: JsonRpcEnv): Promise<Response> {
    const config = this.getConfig(env)
    const origin = request.headers.get('Origin')

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return this.handlePreflight(origin, config)
    }

    // Debug logging
    if (config.debug) {
      console.log(`[JSON-RPC] ${request.method} ${request.url}`)
    }

    // Check body size
    const contentLength = request.headers.get('Content-Length')
    if (contentLength && parseInt(contentLength, 10) > config.maxBodySize) {
      return new Response('Payload Too Large', { status: 413 })
    }

    // Read and parse body
    let body: string
    try {
      body = await request.text()
    } catch {
      return new Response('Payload Too Large', { status: 413 })
    }

    // Check body size after reading
    if (body.length > config.maxBodySize) {
      return new Response('Payload Too Large', { status: 413 })
    }

    // Parse JSON
    let parsed: JsonRpcRequest | JsonRpcRequest[]
    try {
      parsed = JSON.parse(body)
    } catch {
      return this.jsonResponse(
        {
          jsonrpc: '2.0',
          error: { code: JSON_RPC_ERRORS.PARSE_ERROR, message: 'Parse error' },
          id: null,
        },
        origin,
        config
      )
    }

    // Check authentication if API_KEY is configured AND Authorization header is provided
    // If no Authorization header, allow the request (public methods)
    // If Authorization header is provided, it must match the API_KEY
    const authHeader = request.headers.get('Authorization')
    if (config.apiKey && authHeader) {
      const providedKey = authHeader.replace('Bearer ', '')

      if (providedKey !== config.apiKey) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    // Handle batch requests
    if (Array.isArray(parsed)) {
      const results = await Promise.all(
        parsed.map((req) => this.processRequest(req, config))
      )
      return this.jsonResponse(results, origin, config)
    }

    // Handle single request
    const result = await this.processRequest(parsed, config)
    return this.jsonResponse(result, origin, config)
  }

  /**
   * Process a single JSON-RPC request
   */
  private async processRequest(
    request: JsonRpcRequest,
    config: JsonRpcConfig
  ): Promise<object> {
    const { method, params, id } = request

    // Check if method exists
    if (!BUILT_IN_METHODS[method]) {
      return {
        jsonrpc: '2.0',
        error: { code: JSON_RPC_ERRORS.METHOD_NOT_FOUND, message: 'Method not found' },
        id: id ?? null,
      }
    }

    try {
      const result = await BUILT_IN_METHODS[method](params)
      if (config.debug) {
        console.log(`[JSON-RPC] ${method} -> ${JSON.stringify(result)}`)
      }
      return {
        jsonrpc: '2.0',
        result,
        id: id ?? null,
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: id ?? null,
      }
    }
  }

  /**
   * Handle CORS preflight request
   */
  private handlePreflight(origin: string | null, config: JsonRpcConfig): Response {
    const headers: HeadersInit = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }

    if (origin && this.isOriginAllowed(origin, config)) {
      headers['Access-Control-Allow-Origin'] = origin
    }

    return new Response(null, { status: 204, headers })
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string, config: JsonRpcConfig): boolean {
    if (config.corsOrigins.length === 0) {
      return true // No CORS restriction if not configured
    }
    return config.corsOrigins.includes(origin)
  }

  /**
   * Create a JSON response with CORS headers
   */
  private jsonResponse(
    body: object,
    origin: string | null,
    config: JsonRpcConfig
  ): Response {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (origin && this.isOriginAllowed(origin, config)) {
      headers['Access-Control-Allow-Origin'] = origin
    }

    return new Response(JSON.stringify(body), { headers })
  }
}

/**
 * Factory function to create JSON-RPC handler
 */
export function createJsonRpcHandler(): JsonRpcHandler {
  return new JsonRpcHandlerImpl()
}
