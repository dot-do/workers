/**
 * @dotdo/rpc-client - Base CapnWeb RPC Client Infrastructure
 *
 * The foundation for all .do SDKs, providing:
 * - HTTP REST transport (default)
 * - WebSocket CapnWeb transport for real-time
 * - MCP JSON-RPC 2.0 support
 * - Auto-discovery from package name (llm.do -> https://llm.do)
 * - Retry with exponential backoff
 * - Timeout handling
 * - Type-safe proxy-based client generation
 *
 * @example
 * ```typescript
 * import { createClient, getDefaultApiKey } from '@dotdo/rpc-client'
 *
 * interface MyAPI {
 *   hello(name: string): Promise<string>
 *   getData(): Promise<Data>
 * }
 *
 * const client = createClient<MyAPI>('https://my.do')
 * const result = await client.hello('world')
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports
// =============================================================================

export {
  setEnv,
  getEnv,
  getEnvVar,
  isEnvConfigured,
  type EnvRecord,
} from './env.js'

export {
  getDefaultApiKey,
  getDefaultApiKeySync,
  API_KEY_ENV_VARS,
  type SecretsBinding,
} from './auth.js'

export {
  HTTPTransport,
  WebSocketTransport,
  type Transport,
  type TransportOptions,
  type TransportState,
  type TransportChangeEvent,
} from './transport.js'

// =============================================================================
// Client Options
// =============================================================================

/**
 * Options for creating an RPC client
 */
export interface ClientOptions {
  /** API key for authentication */
  apiKey?: string
  /** OAuth token for authentication */
  token?: string
  /** Base URL override (default: auto-discovered from service name) */
  baseURL?: string
  /** @deprecated Use baseURL instead */
  baseUrl?: string
  /** Transport: 'ws' | 'http' | 'auto' (default: 'auto' - tries WS first, falls back to HTTP) */
  transport?: 'ws' | 'http' | 'auto'
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** Retry configuration */
  retry?: RetryOptions
  /** Pass environment directly instead of using global */
  env?: Record<string, string | undefined>
  /** WS reconnection attempts (default: 3) */
  wsReconnectAttempts?: number
  /** WS reconnection delay in ms (default: 1000) */
  wsReconnectDelay?: number
  /** WS backoff period in ms after failure (default: 5000) */
  wsBackoffPeriod?: number
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Number of retry attempts (default: 3) */
  attempts?: number
  /** Initial delay between retries in ms (default: 1000) */
  delay?: number
  /** Backoff strategy: 'linear' or 'exponential' (default: 'exponential') */
  backoff?: 'linear' | 'exponential'
}

/**
 * Client connection methods
 */
export interface ClientMethods {
  /** Check if WebSocket is connected */
  isConnected(): boolean
  /** Disconnect WebSocket */
  disconnect(): Promise<void>
  /** Close client and clean up resources */
  close(): Promise<void>
  /** Get current transport state */
  getTransport(): 'ws' | 'http' | 'auto' | 'connecting'
  /** Set transport mode */
  setTransport(transport: 'ws' | 'http' | 'auto'): void
  /** Subscribe to transport changes */
  on(event: 'transportChange', handler: (event: { from: string; to: string; reason: string }) => void): void
}

// =============================================================================
// RPC Request/Response Types
// =============================================================================

/**
 * JSON-RPC 2.0 request format
 */
export interface RPCRequest {
  jsonrpc?: '2.0'
  method: string
  params?: unknown[] | Record<string, unknown>
  id?: string | number
}

/**
 * JSON-RPC 2.0 response format
 */
export interface RPCResponse<T = unknown> {
  jsonrpc?: '2.0'
  result?: T
  error?: RPCErrorData
  id?: string | number
}

/**
 * JSON-RPC 2.0 error data
 */
export interface RPCErrorData {
  code: number
  message: string
  data?: unknown
}

// =============================================================================
// RPC Error
// =============================================================================

/**
 * RPC Error class for typed error handling
 */
export class RPCError extends Error {
  public readonly code: number
  public readonly data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'RPCError'
    this.code = code
    this.data = data

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, RPCError.prototype)
  }

  toJSON(): RPCErrorData {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    }
  }
}

/**
 * Client error for 4xx responses that should not be retried
 */
export class ClientError extends Error {
  public readonly status: number

  constructor(status: number, statusText: string) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'ClientError'
    this.status = status
    Object.setPrototypeOf(this, ClientError.prototype)
  }
}

// =============================================================================
// Fetch with Retry
// =============================================================================

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: {
    timeout: number
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
): Promise<Response> {
  const { timeout, attempts = 3, delay = 1000, backoff = 'exponential' } = options

  let lastError: Error | undefined

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return response
      }

      // Don't retry client errors (4xx) - throw immediately
      if (response.status >= 400 && response.status < 500) {
        throw new ClientError(response.status, response.statusText)
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      // Don't retry 4xx client errors
      if (error instanceof ClientError) {
        throw error
      }
      lastError = error as Error
    }

    // Wait before retrying
    if (i < attempts - 1) {
      const waitTime = backoff === 'exponential' ? delay * Math.pow(2, i) : delay
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError
}

// =============================================================================
// Create Client
// =============================================================================

import { getDefaultApiKeySync } from './auth.js'

/**
 * Create a typed RPC client for a .do service
 *
 * @param service - Service URL (e.g., 'https://my-service.do') or service name (e.g., 'my-service.do')
 * @param options - Client configuration options
 * @returns A typed proxy client with all methods from T
 *
 * @example
 * ```typescript
 * interface MyAPI {
 *   hello(name: string): Promise<string>
 *   getData(): Promise<Data>
 * }
 *
 * const client = createClient<MyAPI>('https://my-service.do')
 * const result = await client.hello('world')
 * ```
 */
export function createClient<T extends object>(
  service: string,
  options: ClientOptions = {}
): T & ClientMethods {
  const {
    apiKey: explicitApiKey,
    token,
    baseURL,
    baseUrl,
    transport: initialTransport = 'auto',
    timeout = 30000,
    retry = { attempts: 3, delay: 1000, backoff: 'exponential' },
    env: envOverride,
    wsBackoffPeriod = 5000,
  } = options

  // Resolve base URL: explicit > deprecated > service URL > auto-discover
  let resolvedBaseURL: string
  if (baseURL) {
    resolvedBaseURL = baseURL
  } else if (baseUrl) {
    resolvedBaseURL = baseUrl
  } else if (service.startsWith('http://') || service.startsWith('https://')) {
    resolvedBaseURL = service
  } else {
    // Auto-discover: 'llm.do' -> 'https://llm.do'
    resolvedBaseURL = `https://${service}`
  }

  // Resolve API key: explicit > env override > global env
  const apiKey = explicitApiKey || getDefaultApiKeySync(envOverride)

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Transport state
  let currentTransport: 'ws' | 'http' | 'auto' = initialTransport
  let wsConnection: WebSocket | null = null
  let wsConnecting = false
  let wsFailedAt: number | null = null
  const pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  const transportChangeHandlers: Array<(event: { from: string; to: string; reason: string }) => void> = []

  // Convert HTTP URL to WebSocket URL
  function toWsUrl(httpUrl: string): string {
    const url = httpUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
    return `${url}/ws`
  }

  // Emit transport change event
  function emitTransportChange(from: string, to: string, reason: string) {
    const event = { from, to, reason }
    for (const handler of transportChangeHandlers) {
      try {
        handler(event)
      } catch {
        // Ignore handler errors
      }
    }
  }

  // Connect WebSocket
  function connectWs(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        resolve(wsConnection)
        return
      }

      wsConnecting = true
      const wsUrl = toWsUrl(resolvedBaseURL)
      const ws = new WebSocket(wsUrl)

      const connectTimeout = setTimeout(() => {
        ws.close()
        wsConnecting = false
        reject(new Error('WebSocket connection timeout'))
      }, timeout)

      ws.onopen = () => {
        clearTimeout(connectTimeout)
        wsConnecting = false
        wsConnection = ws
        wsFailedAt = null
        resolve(ws)
      }

      ws.onerror = () => {
        clearTimeout(connectTimeout)
        wsConnecting = false
        wsFailedAt = Date.now()
        reject(new Error('WebSocket connection failed'))
      }

      ws.onclose = () => {
        wsConnection = null
        wsConnecting = false
      }

      ws.onmessage = (event) => {
        try {
          const response: RPCResponse = JSON.parse(event.data as string)
          const pending = pendingRequests.get(response.id!)
          if (pending) {
            clearTimeout(pending.timeout)
            pendingRequests.delete(response.id!)
            if (response.error) {
              pending.reject(new RPCError(response.error.code, response.error.message, response.error.data))
            } else {
              pending.resolve(response.result)
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    })
  }

  // Send via WebSocket
  async function sendWs(request: RPCRequest): Promise<unknown> {
    const ws = await connectWs()

    return new Promise((resolve, reject) => {
      const requestTimeout = setTimeout(() => {
        pendingRequests.delete(request.id!)
        reject(new Error('WebSocket request timeout'))
      }, timeout)

      pendingRequests.set(request.id!, { resolve, reject, timeout: requestTimeout })
      ws.send(JSON.stringify({ jsonrpc: '2.0', ...request }))
    })
  }

  // Send via HTTP
  async function sendHttp(request: RPCRequest): Promise<unknown> {
    const response = await fetchWithRetry(
      resolvedBaseURL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', ...request }),
      },
      { timeout, ...retry }
    )

    const data: RPCResponse = await response.json()

    if (data.error) {
      throw new RPCError(data.error.code, data.error.message, data.error.data)
    }

    return data.result
  }

  // Should attempt WS connection?
  function shouldAttemptWs(): boolean {
    if (currentTransport === 'http') return false
    if (currentTransport === 'ws') return true
    // Auto mode: try WS unless recently failed
    if (wsFailedAt && Date.now() - wsFailedAt < wsBackoffPeriod) return false
    return true
  }

  // Generate unique request ID
  function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  // Make RPC call with transport selection
  async function call(method: string, params: unknown[]): Promise<unknown> {
    const request: RPCRequest = {
      method,
      params,
      id: generateId(),
    }

    // HTTP only
    if (currentTransport === 'http') {
      return sendHttp(request)
    }

    // WS only
    if (currentTransport === 'ws') {
      return sendWs(request)
    }

    // Auto: try WS, fallback to HTTP
    if (shouldAttemptWs()) {
      try {
        return await sendWs(request)
      } catch (wsError) {
        wsFailedAt = Date.now()
        emitTransportChange('ws', 'http', (wsError as Error).message)
        return sendHttp(request)
      }
    } else {
      return sendHttp(request)
    }
  }

  // Client methods
  const clientMethods: ClientMethods = {
    isConnected(): boolean {
      return wsConnection !== null && wsConnection.readyState === WebSocket.OPEN
    },

    async disconnect(): Promise<void> {
      if (wsConnection) {
        wsConnection.close()
        wsConnection = null
      }
      // Cancel all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Connection closed'))
        pendingRequests.delete(id)
      }
    },

    async close(): Promise<void> {
      await this.disconnect()
    },

    getTransport(): 'ws' | 'http' | 'auto' | 'connecting' {
      if (wsConnecting) return 'connecting'
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return 'ws'
      if (currentTransport === 'auto') return 'auto'
      return currentTransport
    },

    setTransport(transport: 'ws' | 'http' | 'auto'): void {
      currentTransport = transport
    },

    on(event: 'transportChange', handler: (event: { from: string; to: string; reason: string }) => void): void {
      if (event === 'transportChange') {
        transportChangeHandlers.push(handler)
      }
    },
  }

  // Create proxy that intercepts method calls and turns them into RPC requests
  return new Proxy(clientMethods as T & ClientMethods, {
    get(target, prop: string) {
      // Handle Promise methods (prevents unwanted Promise behavior)
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined
      }

      // Handle client methods
      if (prop in target) {
        return (target as Record<string, unknown>)[prop]
      }

      // Return a function that makes the RPC call
      return async (...args: unknown[]) => {
        return call(prop, args)
      }
    },
  })
}

// =============================================================================
// Auto-Discovery Client
// =============================================================================

/**
 * Create a client that auto-discovers endpoint from package name
 *
 * @param packageName - Package name (e.g., 'llm.do', 'payments.do')
 * @param options - Client configuration options
 * @returns A typed proxy client
 *
 * @example
 * ```typescript
 * // In llm.do package
 * export default createAutoClient<LLMClient>('llm.do')
 * // Endpoint will be https://llm.do
 * ```
 */
export function createAutoClient<T extends object>(
  packageName: string,
  options: ClientOptions = {}
): T & ClientMethods {
  const endpoint = `https://${packageName}`
  return createClient<T>(endpoint, options)
}

// =============================================================================
// MCP JSON-RPC Client
// =============================================================================

/**
 * MCP (Model Context Protocol) JSON-RPC client
 *
 * Creates a client specifically for MCP-compatible endpoints.
 *
 * @param endpoint - MCP server endpoint
 * @param options - Client configuration options
 */
export function createMCPClient<T extends object>(
  endpoint: string,
  options: ClientOptions = {}
): T & ClientMethods {
  return createClient<T>(endpoint, {
    ...options,
    // MCP uses HTTP by default
    transport: options.transport || 'http',
  })
}
