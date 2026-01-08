/**
 * Multi-Tenant Types - Free-tier hosting with Static Assets
 *
 * Supports 100k+ sites from single deployment:
 * - Maximum 100,000 files in Static Assets
 * - Up to 25MB per file
 * - No additional billing beyond base Worker
 *
 * @module @dotdo/multi-tenant/types
 */

// ============================================================================
// Site Bundle Types
// ============================================================================

/**
 * Site bundle stored in Static Assets as JSONL
 *
 * Each site has three representations:
 * - module: Compiled JavaScript for dynamic execution
 * - mdx: Raw MDX source for editing/LLM consumption
 * - html: Pre-rendered HTML for fast delivery
 */
export interface SiteBundle {
  /** Compiled JavaScript module */
  module: string
  /** Raw MDX source */
  mdx: string
  /** Pre-rendered HTML */
  html: string
  /** Optional metadata */
  meta?: SiteMeta
}

/**
 * Site metadata for configuration and analytics
 */
export interface SiteMeta {
  /** Site name/slug */
  name: string
  /** Site title for display */
  title?: string
  /** Site description */
  description?: string
  /** Owner organization ID */
  orgId?: string
  /** Owner user ID */
  userId?: string
  /** Custom domain (if any) */
  customDomain?: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Site version for cache busting */
  version?: number
  /** Feature flags */
  features?: SiteFeatures
}

/**
 * Feature flags per site
 */
export interface SiteFeatures {
  /** Enable analytics tracking */
  analytics?: boolean
  /** Enable caching */
  caching?: boolean
  /** Enable authentication */
  auth?: boolean
  /** Enable API routes */
  api?: boolean
  /** Custom headers */
  customHeaders?: Record<string, string>
}

// ============================================================================
// Site Configuration Types
// ============================================================================

/**
 * Site configuration stored in KV
 *
 * Maps hostname to site name for lookup:
 * - my-site.workers.do -> my-site
 * - custom.example.com -> my-site (custom domain)
 */
export interface SiteConfig {
  /** Site name (maps to sites/{name}.jsonl) */
  name: string
  /** Hostname patterns this site responds to */
  hostnames: string[]
  /** Primary hostname */
  primaryHostname: string
  /** Whether site is enabled */
  enabled: boolean
  /** Site metadata */
  meta: SiteMeta
}

/**
 * Hostname mapping stored in KV
 */
export interface HostnameMapping {
  /** Site name this hostname maps to */
  siteName: string
  /** Whether this is the primary hostname */
  isPrimary: boolean
  /** Whether this is a custom domain */
  isCustomDomain: boolean
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to create a new site
 */
export interface CreateSiteRequest {
  /** Site name (becomes slug: my-site.workers.do) */
  name: string
  /** Site title */
  title?: string
  /** Site description */
  description?: string
  /** Initial MDX content */
  mdx?: string
  /** Custom domain (optional) */
  customDomain?: string
  /** Feature flags */
  features?: SiteFeatures
}

/**
 * Request to update a site
 */
export interface UpdateSiteRequest {
  /** Updated title */
  title?: string
  /** Updated description */
  description?: string
  /** Updated MDX content */
  mdx?: string
  /** Updated HTML content */
  html?: string
  /** Updated module content */
  module?: string
  /** Add custom domain */
  addCustomDomain?: string
  /** Remove custom domain */
  removeCustomDomain?: string
  /** Updated features */
  features?: Partial<SiteFeatures>
  /** Enable/disable site */
  enabled?: boolean
}

/**
 * Response after site creation/update
 */
export interface SiteResponse {
  /** Whether operation succeeded */
  success: boolean
  /** Site configuration */
  site: SiteConfig
  /** Operation message */
  message: string
  /** URLs to access site */
  urls: {
    primary: string
    all: string[]
  }
}

/**
 * Site list response
 */
export interface SiteListResponse {
  /** Array of sites */
  sites: SiteConfig[]
  /** Total count */
  total: number
  /** Pagination offset */
  offset: number
  /** Pagination limit */
  limit: number
}

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Worker environment bindings
 */
export interface MultiTenantEnv {
  /** Static Assets binding for site bundles */
  ASSETS: Fetcher
  /** KV namespace for site configurations */
  SITE_CONFIG: KVNamespace
  /** Durable Object binding for multi-tenant management */
  MULTI_TENANT: DurableObjectNamespace
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Analytics event for site access
 */
export interface SiteAccessEvent {
  /** Event timestamp */
  timestamp: number
  /** Site name */
  siteName: string
  /** Hostname accessed */
  hostname: string
  /** URL path */
  path: string
  /** HTTP method */
  method: string
  /** Response status */
  status: number
  /** Cache status */
  cache: 'HIT' | 'MISS'
  /** Content type served */
  contentType: 'html' | 'mdx' | 'module' | 'llms.txt'
  /** Cloudflare data center */
  colo: string
  /** ISO country code */
  country: string
  /** User ID (if authenticated) */
  userId?: string
  /** Anonymous ID (sqid-based) */
  anonymousId: string
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Multi-tenant error
 */
export class MultiTenantError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500
  ) {
    super(message)
    this.name = 'MultiTenantError'
  }
}

/**
 * Site not found error
 */
export class SiteNotFoundError extends MultiTenantError {
  constructor(site: string) {
    super(`Site not found: ${site}`, 'SITE_NOT_FOUND', 404)
  }
}

/**
 * Site already exists error
 */
export class SiteExistsError extends MultiTenantError {
  constructor(site: string) {
    super(`Site already exists: ${site}`, 'SITE_EXISTS', 409)
  }
}

/**
 * Invalid site name error
 */
export class InvalidSiteNameError extends MultiTenantError {
  constructor(name: string, reason: string) {
    super(`Invalid site name "${name}": ${reason}`, 'INVALID_SITE_NAME', 400)
  }
}

/**
 * Site disabled error
 */
export class SiteDisabledError extends MultiTenantError {
  constructor(site: string) {
    super(`Site is disabled: ${site}`, 'SITE_DISABLED', 503)
  }
}
