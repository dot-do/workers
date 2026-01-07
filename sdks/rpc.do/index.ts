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
): T {
  const {
    apiKey: explicitApiKey,
    token,
    baseURL,
    baseUrl,  // deprecated
    transport = 'auto',
    timeout = 30000,
    retry = { attempts: 3, delay: 1000, backoff: 'exponential' },
    env: envOverride,
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
