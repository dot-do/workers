/**
 * apis.as - Create and manage APIs
 *
 * Define, deploy, and manage APIs with automatic documentation.
 * apis.as/users, apis.as/products, apis.as/orders
 *
 * @see https://apis.as
 *
 * @example
 * ```typescript
 * import { apis } from 'apis.as'
 *
 * // Create an API from schema
 * const api = await apis.create({
 *   name: 'users-api',
 *   schema: {
 *     '/users': {
 *       get: { response: 'User[]' },
 *       post: { body: 'CreateUser', response: 'User' }
 *     }
 *   }
 * })
 *
 * // Generate SDK from API
 * const sdk = await apis.sdk('users-api', { language: 'typescript' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface EndpointConfig {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Request body schema */
  body?: string | Record<string, unknown>
  /** Query parameters */
  query?: Record<string, string>
  /** Response schema */
  response?: string | Record<string, unknown>
  /** Description */
  description?: string
  /** Authentication required */
  auth?: boolean
  /** Rate limit */
  rateLimit?: number
}

export interface ApiSchema {
  [path: string]: {
    get?: EndpointConfig
    post?: EndpointConfig
    put?: EndpointConfig
    patch?: EndpointConfig
    delete?: EndpointConfig
  }
}

export interface ApiConfig {
  /** API name/slug */
  name: string
  /** Display name */
  displayName?: string
  /** API description */
  description?: string
  /** Version */
  version?: string
  /** Base path */
  basePath?: string
  /** Schema definition */
  schema?: ApiSchema
  /** OpenAPI spec URL or object */
  openapi?: string | Record<string, unknown>
  /** Authentication method */
  auth?: 'api-key' | 'oauth' | 'jwt' | 'none'
  /** CORS configuration */
  cors?: boolean | { origins: string[] }
}

export interface Api {
  id: string
  name: string
  displayName?: string
  description?: string
  version: string
  url: string
  docsUrl: string
  status: 'active' | 'deprecated' | 'disabled'
  endpoints: number
  createdAt: Date
  updatedAt: Date
}

export interface ApiMetrics {
  requests: number
  successRate: number
  avgLatency: number
  errorsByEndpoint: Record<string, number>
  topEndpoints: Array<{ path: string; count: number }>
  period: string
}

export interface SdkConfig {
  /** Target language */
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'curl'
  /** Package name */
  packageName?: string
  /** Include types */
  includeTypes?: boolean
}

export interface GeneratedSdk {
  language: string
  code: string
  files: Array<{ name: string; content: string }>
  installCommand: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  permissions: string[]
  createdAt: Date
  lastUsed?: Date
}

// Client interface
export interface ApisAsClient {
  /**
   * Create an API
   */
  create(config: ApiConfig): Promise<Api>

  /**
   * Get API details
   */
  get(name: string): Promise<Api>

  /**
   * List all APIs
   */
  list(options?: { status?: Api['status']; limit?: number }): Promise<Api[]>

  /**
   * Update an API
   */
  update(name: string, config: Partial<ApiConfig>): Promise<Api>

  /**
   * Delete an API
   */
  delete(name: string): Promise<void>

  /**
   * Get API metrics
   */
  metrics(name: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<ApiMetrics>

  /**
   * Generate SDK from API
   */
  sdk(name: string, config: SdkConfig): Promise<GeneratedSdk>

  /**
   * Get OpenAPI spec
   */
  openapi(name: string): Promise<Record<string, unknown>>

  /**
   * Import from OpenAPI spec
   */
  import(spec: string | Record<string, unknown>, options?: { name?: string }): Promise<Api>

  /**
   * Create an API key
   */
  createKey(apiName: string, options: { name: string; permissions?: string[] }): Promise<ApiKey & { key: string }>

  /**
   * List API keys
   */
  keys(apiName: string): Promise<ApiKey[]>

  /**
   * Revoke an API key
   */
  revokeKey(apiName: string, keyId: string): Promise<void>

  /**
   * Test an endpoint
   */
  test(apiName: string, path: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<{ status: number; body: unknown; latency: number }>

  /**
   * Deploy API changes
   */
  deploy(name: string): Promise<Api>
}

/**
 * Create a configured apis.as client
 */
export function Apis(options?: ClientOptions): ApisAsClient {
  return createClient<ApisAsClient>('https://apis.as', options)
}

/**
 * Default apis.as client instance
 */
export const apis: ApisAsClient = Apis({
  apiKey: typeof process !== 'undefined' ? (process.env?.APIS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: ApiConfig) => apis.create(config)
export const list = (options?: { status?: Api['status']; limit?: number }) => apis.list(options)

export default apis

// Re-export types
export type { ClientOptions } from 'rpc.do'
