/**
 * rpc.do - Base CapnWeb RPC client for .do SDKs
 *
 * Provides strongly-typed RPC clients over multiple transports:
 * - HTTP REST (default)
 * - WebSocket (CapnWeb protocol)
 * - MCP JSON-RPC
 *
 * Each .do SDK (llm.do, services.do, etc.) uses this base client.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter at entry point
 * import 'rpc.do/env'
 * import { workflows } from 'workflows.do'
 *
 * // Node.js
 * import 'rpc.do/env/node'
 * import { workflows } from 'workflows.do'
 *
 * // Or pass env explicitly
 * import { Workflows } from 'workflows.do'
 * const workflows = Workflows({ env })
 * ```
 */

// =============================================================================
// Global Environment Provider
// =============================================================================

type EnvRecord = Record<string, string | undefined>
let globalEnv: EnvRecord | null = null

/**
 * Set the global environment for all .do SDKs
 * Call this once at your app's entry point
 *
 * @example
 * ```typescript
 * // Workers
 * import { env } from 'cloudflare:workers'
 * import { setEnv } from 'rpc.do'
 * setEnv(env)
 *
 * // Node.js
 * import { setEnv } from 'rpc.do'
 * setEnv(process.env)
 * ```
 */
export function setEnv(env: EnvRecord): void {
  globalEnv = env
}

/**
 * Get the global environment
 * Returns null if not set - SDKs should provide helpful error
 */
export function getEnv(): EnvRecord | null {
  return globalEnv
}

/**
 * Get a specific environment variable
 */
export function getEnvVar(key: string): string | undefined {
  return globalEnv?.[key]
}

/**
 * Check if environment is configured
 */
export function isEnvConfigured(): boolean {
  return globalEnv !== null
}

export interface ClientOptions {
  /** API key for authentication */
  apiKey?: string
  /** OAuth token for authentication */
  token?: string
  /** Base URL override (default: https://rpc.do) */
  baseURL?: string
  /** @deprecated Use baseURL instead */
  baseUrl?: string
  /** Transport: 'ws' | 'http' | 'auto' (default: 'auto' - tries WS first, falls back to HTTP) */
  transport?: 'ws' | 'http' | 'auto'
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** Retry configuration */
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
  /** Pass environment directly instead of using global */
  env?: Record<string, string | undefined>
  /** WS reconnection attempts (default: 3) */
  wsReconnectAttempts?: number
  /** WS reconnection delay in ms (default: 1000) */
  wsReconnectDelay?: number
  /** WS reconnection backoff period in ms (default: 5000) */
  wsBackoffPeriod?: number
}

/** Transport state */
export type TransportState = 'ws' | 'http' | 'auto' | 'connecting'

/** Transport change event */
export interface TransportChangeEvent {
  from: TransportState
  to: TransportState
  reason: string
}

/** Client with connection methods */
export interface ClientMethods {
  /** Check if WebSocket is connected */
  isConnected(): boolean
  /** Disconnect WebSocket */
  disconnect(): Promise<void>
  /** Close client and clean up resources */
  close(): Promise<void>
  /** Get current transport state */
  getTransport(): TransportState
  /** Set transport mode */
  setTransport(transport: 'ws' | 'http' | 'auto'): void
  /** Subscribe to transport changes */
  on(event: 'transportChange', handler: (event: TransportChangeEvent) => void): void
}

/**
 * Cloudflare Secrets Store binding interface
 */
export interface SecretsBinding {
  get(): Promise<string>
}

/** Default base URL for all .do RPC calls */
export const DEFAULT_BASE_URL = 'https://rpc.do'

/** Environment variable keys checked for API key (in order) */
const API_KEY_ENV_VARS = ['DO_API_KEY', 'DO_TOKEN', 'ORG_AI_API_KEY', 'ORG_AI_TOKEN']

/**
 * Get default API key from environment
 * Checks: DO_API_KEY, DO_TOKEN, ORG_AI_API_KEY, ORG_AI_TOKEN
 *
 * Uses global env set via setEnv() or falls back to passed env
 */
export async function getDefaultApiKey(envOverride?: Record<string, unknown>): Promise<string | undefined> {
  const env = envOverride || globalEnv

  if (env) {
    for (const key of API_KEY_ENV_VARS) {
      const binding = env[key]
      // Check for Cloudflare Secrets Store bindings (.get() method)
      if (binding && typeof (binding as SecretsBinding).get === 'function') {
        return (binding as SecretsBinding).get()
      }
      if (typeof binding === 'string' && binding) {
        return binding
      }
    }
  }

  return undefined
}

/**
 * Sync version for default client initialization
 * Uses global env set via setEnv()
 */
export function getDefaultApiKeySync(envOverride?: Record<string, string | undefined>): string | undefined {
  const env = envOverride || globalEnv

  if (env) {
    for (const key of API_KEY_ENV_VARS) {
      const value = env[key]
      if (typeof value === 'string' && value) {
        return value
      }
    }
  }

  return undefined
}

export interface RPCRequest {
  method: string
  params?: unknown[]
  id?: string | number
}

export interface RPCResponse<T = unknown> {
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id?: string | number
}

/**
 * Create a typed RPC client for a .do service
 *
 * @example
 * ```typescript
 * import { createClient } from 'rpc.do'
 *
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
    baseUrl,  // deprecated
    transport: initialTransport = 'auto',
    timeout = 30000,
    retry = { attempts: 3, delay: 1000, backoff: 'exponential' },
    env: envOverride,
    wsBackoffPeriod = 5000,
  } = options

  // Resolve base URL: explicit > deprecated > default
  const resolvedBaseURL = baseURL || baseUrl || DEFAULT_BASE_URL

  // Resolve API key: explicit > env override > global env
  const apiKey = explicitApiKey || getDefaultApiKeySync(envOverride)

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
  const pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  const transportChangeHandlers: Array<(event: TransportChangeEvent) => void> = []

  // Convert HTTP URL to WebSocket URL
  function toWsUrl(httpUrl: string): string {
    const url = httpUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
    return `${url}/ws/${service}`
  }

  // Emit transport change event
  function emitTransportChange(from: TransportState, to: TransportState, reason: string) {
    const event: TransportChangeEvent = { from, to, reason }
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
      if (wsConnection && wsConnection.readyState === 1) {
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
      ws.send(JSON.stringify(request))
    })
  }

  // Send via HTTP
  async function sendHttp(request: RPCRequest): Promise<unknown> {
    const response = await fetchWithRetry(
      `${resolvedBaseURL}/${service}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
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

  // Make RPC call with transport selection
  async function call(method: string, params: unknown[]): Promise<unknown> {
    const request: RPCRequest = {
      method,
      params,
      id: crypto.randomUUID(),
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
      return wsConnection !== null && wsConnection.readyState === 1
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

    getTransport(): TransportState {
      if (wsConnecting) return 'connecting'
      if (wsConnection && wsConnection.readyState === 1) return 'ws'
      if (currentTransport === 'auto') return 'auto'
      return currentTransport
    },

    setTransport(transport: 'ws' | 'http' | 'auto'): void {
      currentTransport = transport
    },

    on(event: 'transportChange', handler: (event: TransportChangeEvent) => void): void {
      if (event === 'transportChange') {
        transportChangeHandlers.push(handler)
      }
    },
  }

  // Create proxy that intercepts method calls and turns them into RPC requests
  return new Proxy(clientMethods as T & ClientMethods, {
    get(target, prop: string) {
      // Handle Promise methods
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

/**
 * RPC Error class
 */
export class RPCError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'RPCError'
  }
}

/** Custom error for 4xx responses that should not be retried */
class ClientError extends Error {
  constructor(public status: number, statusText: string) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'ClientError'
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { timeout: number; attempts?: number; delay?: number; backoff?: string }
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

/**
 * Create a client that auto-discovers endpoint from package name
 *
 * @example
 * ```typescript
 * // In llm.do package
 * export default createAutoClient<LLMClient>()
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
// SQL Proxy exports
// =============================================================================

export {
  createSqlProxy,
  createSqlHandler,
  withSqlProxy,
} from './sql-proxy.js'

export type {
  SerializableSqlQuery,
  SqlResult,
  SqlClientProxy,
  SqlTransformOptions,
  ParsedSqlTemplate,
} from './sql-proxy.js'

// =============================================================================
// Re-export all types for consumers
// =============================================================================

// Note: The following types are already exported above via 'export interface/type':
// - ClientOptions
// - TransportState
// - TransportChangeEvent
// - ClientMethods
// - RPCRequest
// - RPCResponse
// - RPCError (class)
