/**
 * rpc.do - Base CapnWeb RPC client for .do SDKs
 *
 * Provides strongly-typed RPC clients over multiple transports:
 * - HTTP REST (default)
 * - WebSocket (CapnWeb protocol)
 * - MCP JSON-RPC
 *
 * Each .do SDK (llm.do, services.do, etc.) uses this base client.
 */

export interface ClientOptions {
  /** API key for authentication */
  apiKey?: string
  /** OAuth token for authentication */
  token?: string
  /** Base URL override (default: derived from package name) */
  baseUrl?: string
  /** Transport: 'http' | 'websocket' | 'auto' (default: 'auto') */
  transport?: 'http' | 'websocket' | 'auto'
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** Retry configuration */
  retry?: {
    attempts?: number
    delay?: number
    backoff?: 'linear' | 'exponential'
  }
}

/**
 * Cloudflare Secrets Store binding interface
 */
export interface SecretsBinding {
  get(): Promise<string>
}

/**
 * Get default API key from environment
 * Checks: DO_API_KEY, DO_TOKEN, ORG_AI_API_KEY, ORG_AI_TOKEN
 *
 * Supports:
 * - Cloudflare Secrets Store (.get() method)
 * - Cloudflare Workers env bindings
 * - Node.js process.env
 */
export async function getDefaultApiKey(cfEnv?: Record<string, unknown>): Promise<string | undefined> {
  // Try Cloudflare Workers env (passed in)
  if (cfEnv) {
    // Check for Cloudflare Secrets Store bindings (.get() method)
    const secretBindings = ['DO_API_KEY', 'DO_TOKEN', 'ORG_AI_API_KEY', 'ORG_AI_TOKEN']
    for (const key of secretBindings) {
      const binding = cfEnv[key]
      if (binding && typeof (binding as SecretsBinding).get === 'function') {
        return (binding as SecretsBinding).get()
      }
      if (typeof binding === 'string') {
        return binding
      }
    }
  }

  // Try Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.DO_API_KEY ||
      process.env.DO_TOKEN ||
      process.env.ORG_AI_API_KEY ||
      process.env.ORG_AI_TOKEN
    )
  }

  return undefined
}

/**
 * Sync version for default client initialization
 * (only works with string env vars, not Secrets Store)
 */
export function getDefaultApiKeySync(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.DO_API_KEY ||
      process.env.DO_TOKEN ||
      process.env.ORG_AI_API_KEY ||
      process.env.ORG_AI_TOKEN
    )
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
  endpoint: string,
  options: ClientOptions = {}
): T {
  const {
    apiKey,
    token,
    baseUrl = endpoint,
    transport = 'auto',
    timeout = 30000,
    retry = { attempts: 3, delay: 1000, backoff: 'exponential' },
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Create proxy that intercepts method calls and turns them into RPC requests
  return new Proxy({} as T, {
    get(_target, prop: string) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return undefined
      }

      // Return a function that makes the RPC call
      return async (...args: unknown[]) => {
        const request: RPCRequest = {
          method: prop,
          params: args,
          id: crypto.randomUUID(),
        }

        // HTTP transport (default)
        const response = await fetchWithRetry(
          `${baseUrl}/rpc`,
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

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
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
): T {
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
