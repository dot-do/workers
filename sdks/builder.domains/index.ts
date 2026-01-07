/**
 * builder.domains - Free Domains for Builders SDK
 *
 * @example
 * ```typescript
 * import { domains } from 'builder.domains'
 *
 * // Claim a free domain
 * await domains.claim('my-startup.hq.com.ai')
 *
 * // Configure routing
 * await domains.route('my-startup.hq.com.ai', {
 *   worker: 'my-worker',
 *   paths: { '/api': 'api-worker' }
 * })
 *
 * // List your domains
 * const myDomains = await domains.list()
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Domain {
  id: string
  name: string
  baseDomain: string
  status: 'active' | 'pending' | 'suspended'
  routing?: RouteConfig
  createdAt: Date
}

export interface RouteConfig {
  worker?: string
  paths?: Record<string, string>
  redirects?: Record<string, string>
  headers?: Record<string, string>
}

export interface BaseDomain {
  name: string
  tier: 'free' | 'premium'
  description?: string
  available: boolean
}

// Client interface
export interface DomainsClient {
  /**
   * Claim a domain (free tier: *.hq.com.ai, *.app.net.ai, *.api.net.ai, *.hq.sb, *.io.sb, *.llc.st)
   */
  claim(domain: string): Promise<Domain>

  /**
   * Release a claimed domain
   */
  release(domain: string): Promise<void>

  /**
   * Configure routing for a domain
   */
  route(domain: string, config: RouteConfig): Promise<Domain>

  /**
   * Get domain details
   */
  get(domain: string): Promise<Domain>

  /**
   * List your claimed domains
   */
  list(): Promise<Domain[]>

  /**
   * Check if a domain is available
   */
  check(domain: string): Promise<{ available: boolean; tier: 'free' | 'premium' }>

  /**
   * List available base domains
   */
  baseDomains(): Promise<BaseDomain[]>

  /**
   * Configure DNS for a domain
   */
  dns: {
    set(domain: string, records: Array<{ type: string; name: string; content: string; ttl?: number }>): Promise<void>
    get(domain: string): Promise<Array<{ type: string; name: string; content: string; ttl: number }>>
  }
}

/**
 * Create a configured Domains client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Domains } from 'builder.domains'
 * const domains = Domains({ apiKey: 'xxx' })
 * ```
 */
export function Domains(options?: ClientOptions): DomainsClient {
  return createClient<DomainsClient>('https://builder.domains', options)
}

/**
 * Default Domains client instance (camelCase)
 * For Workers: import 'rpc.do/env' first to enable env-based API key resolution
 *
 * @example
 * ```typescript
 * import { domains } from 'builder.domains'
 * await domains.claim('my-startup.hq.com.ai')
 * ```
 */
export const domains: DomainsClient = Domains()

// Named exports
export { Domains, domains }

// Default export = camelCase instance
export default domains

// Legacy alias
export const createDomains = Domains

// Re-export types
export type { ClientOptions } from 'rpc.do'
