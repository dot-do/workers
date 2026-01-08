/**
 * builder.domains - Free Domains SDK
 *
 * Strongly-typed client for the builder.domains free domain management service.
 *
 * @example
 * ```typescript
 * import { domains } from 'builder.domains'
 *
 * // Claim a free domain
 * await domains.claim('my-startup.hq.com.ai')
 *
 * // Route it to a worker
 * await domains.route('my-startup.hq.com.ai', { worker: 'my-worker' })
 *
 * // List your domains
 * const myDomains = await domains.list()
 *
 * // Or with custom options
 * import { Domains } from 'builder.domains'
 * const myDomains = Domains({ apiKey: 'xxx' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// =============================================================================
// Constants
// =============================================================================

/**
 * Free TLDs available for builders
 */
export const FREE_TLDS = [
  'hq.com.ai',
  'app.net.ai',
  'api.net.ai',
  'hq.sb',
  'io.sb',
  'llc.st',
] as const

export type FreeTLD = (typeof FREE_TLDS)[number]

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Domain record representing a claimed domain
 */
export interface DomainRecord {
  /** Unique identifier for the domain record */
  id: string
  /** The full domain name (e.g., 'my-startup.hq.com.ai') */
  name: string
  /** Organization ID that owns this domain */
  orgId: string
  /** The TLD portion (e.g., 'hq.com.ai') */
  tld: string
  /** Cloudflare zone ID if configured */
  zoneId?: string
  /** Worker ID if routed */
  workerId?: string
  /** Route ID if routed */
  routeId?: string
  /** Domain status */
  status: 'pending' | 'active' | 'error'
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
}

/**
 * Configuration for routing a domain to a worker
 */
export interface RouteConfig {
  /** Worker name to route traffic to */
  worker?: string
  /** Worker script name (alternative to worker) */
  workerScript?: string
  /** Custom origin URL for proxying */
  customOrigin?: string
}

/**
 * Options for listing domains
 */
export interface ListOptions {
  /** Maximum number of domains to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Filter by status */
  status?: 'pending' | 'active' | 'error'
  /** Filter by TLD */
  tld?: string
}

/**
 * DNS record configuration
 */
export interface DNSRecord {
  /** Record type (A, AAAA, CNAME, TXT, etc.) */
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS'
  /** Record name (subdomain or @ for root) */
  name: string
  /** Record value */
  content: string
  /** TTL in seconds (1 = automatic) */
  ttl?: number
  /** Priority (for MX records) */
  priority?: number
  /** Whether the record is proxied through Cloudflare */
  proxied?: boolean
}

/**
 * Domain availability check result
 */
export interface AvailabilityResult {
  /** The domain that was checked */
  domain: string
  /** Whether the domain is available */
  available: boolean
  /** Current owner org ID if claimed */
  ownerId?: string
}

/**
 * Base domain information
 */
export interface BaseDomain {
  /** The TLD (e.g., 'hq.com.ai') */
  tld: FreeTLD
  /** Human-readable description */
  description: string
  /** Whether this TLD is currently available for claiming */
  available: boolean
}

// =============================================================================
// DNS Client Interface
// =============================================================================

/**
 * DNS management client for a domain
 */
export interface DNSClient {
  /**
   * Set a DNS record for the domain
   * @param domain - The domain to configure
   * @param record - DNS record configuration
   */
  set(domain: string, record: DNSRecord): Promise<DNSRecord>

  /**
   * Get DNS records for a domain
   * @param domain - The domain to query
   * @param type - Optional record type filter
   */
  get(domain: string, type?: DNSRecord['type']): Promise<DNSRecord[]>

  /**
   * Delete a DNS record
   * @param domain - The domain
   * @param recordId - The record ID to delete
   */
  delete(domain: string, recordId: string): Promise<boolean>
}

// =============================================================================
// Main Client Interface
// =============================================================================

/**
 * Domains client interface for managing free domains
 */
export interface DomainsClient {
  /**
   * Claim a free domain for your organization
   * @param domain - Full domain name (e.g., 'my-startup.hq.com.ai')
   * @returns The claimed domain record
   *
   * @example
   * ```typescript
   * const record = await domains.claim('my-startup.hq.com.ai')
   * console.log(record.status) // 'active'
   * ```
   */
  claim(domain: string): Promise<DomainRecord>

  /**
   * Release a domain (give up ownership)
   * @param domain - Full domain name to release
   * @returns True if released successfully
   *
   * @example
   * ```typescript
   * await domains.release('my-startup.hq.com.ai')
   * ```
   */
  release(domain: string): Promise<boolean>

  /**
   * Configure routing for a domain
   * @param domain - Full domain name
   * @param config - Routing configuration
   * @returns Updated domain record
   *
   * @example
   * ```typescript
   * await domains.route('my-startup.hq.com.ai', { worker: 'my-api' })
   * ```
   */
  route(domain: string, config: RouteConfig): Promise<DomainRecord>

  /**
   * Remove routing from a domain
   * @param domain - Full domain name
   * @returns Updated domain record
   */
  unroute(domain: string): Promise<DomainRecord>

  /**
   * Get details for a specific domain
   * @param domain - Full domain name
   * @returns Domain record or null if not found
   *
   * @example
   * ```typescript
   * const record = await domains.get('my-startup.hq.com.ai')
   * if (record) {
   *   console.log(record.workerId) // 'my-api'
   * }
   * ```
   */
  get(domain: string): Promise<DomainRecord | null>

  /**
   * Get routing configuration for a domain
   * @param domain - Full domain name
   * @returns Route configuration or null
   */
  getRoute(domain: string): Promise<RouteConfig | null>

  /**
   * List all domains for the current organization
   * @param options - Optional filters and pagination
   * @returns Array of domain records
   *
   * @example
   * ```typescript
   * const allDomains = await domains.list()
   * const activeDomains = await domains.list({ status: 'active' })
   * ```
   */
  list(options?: ListOptions): Promise<DomainRecord[]>

  /**
   * Count domains for the current organization
   * @returns Number of domains
   */
  count(): Promise<number>

  /**
   * Check if a domain is available for claiming
   * @param domain - Full domain name to check
   * @returns Availability result
   *
   * @example
   * ```typescript
   * const result = await domains.check('my-startup.hq.com.ai')
   * if (result.available) {
   *   await domains.claim('my-startup.hq.com.ai')
   * }
   * ```
   */
  check(domain: string): Promise<AvailabilityResult>

  /**
   * List available base domains (free TLDs)
   * @returns Array of available TLDs with descriptions
   *
   * @example
   * ```typescript
   * const tlds = await domains.baseDomains()
   * // [{ tld: 'hq.com.ai', description: 'Startup HQ domains', available: true }, ...]
   * ```
   */
  baseDomains(): Promise<BaseDomain[]>

  /**
   * Validate a domain name format
   * @param domain - Domain name to validate
   * @returns True if the domain format is valid
   */
  isValidDomain(domain: string): Promise<boolean>

  /**
   * Check if a TLD is in the free tier
   * @param tld - TLD to check
   * @returns True if the TLD is free
   */
  isFreeTLD(tld: string): Promise<boolean>

  /**
   * Extract the TLD from a full domain name
   * @param domain - Full domain name
   * @returns The TLD portion or null
   */
  extractTLD(domain: string): Promise<string | null>

  /**
   * Extract the subdomain from a full domain name
   * @param domain - Full domain name
   * @returns The subdomain portion or null
   */
  extractSubdomain(domain: string): Promise<string | null>

  /**
   * DNS management operations
   */
  dns: DNSClient
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a configured Domains client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Domains } from 'builder.domains'
 *
 * // With explicit API key
 * const domains = Domains({ apiKey: 'xxx' })
 *
 * // With custom endpoint
 * const domains = Domains({ baseURL: 'https://custom.builder.domains' })
 * ```
 */
export function Domains(options?: ClientOptions): DomainsClient {
  return createClient<DomainsClient>('https://builder.domains', options)
}

// =============================================================================
// Default Instance
// =============================================================================

/**
 * Default Domains client instance (camelCase)
 * For Workers: import 'rpc.do/env' first to enable env-based API key resolution
 *
 * @example
 * ```typescript
 * import { domains } from 'builder.domains'
 *
 * await domains.claim('my-startup.hq.com.ai')
 * await domains.route('my-startup.hq.com.ai', { worker: 'my-worker' })
 * const myDomains = await domains.list()
 * ```
 */
export const domains: DomainsClient = Domains()

// =============================================================================
// Exports
// =============================================================================

// Default export = camelCase instance
export default domains

// Legacy alias
export const createDomains = Domains

// Re-export types
export type { ClientOptions } from 'rpc.do'
