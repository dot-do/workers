/**
 * DomainsDO - Durable Object for builder.domains
 *
 * Implements free domain management for builders:
 * - Domain claiming for free TLDs (hq.com.ai, app.net.ai, api.net.ai, hq.sb, io.sb, llc.st)
 * - Domain routing to workers
 * - Domain listing per organization
 * - Validation of domain formats
 *
 * @module @dotdo/workers-domains
 */

// ============================================================================
// Constants
// ============================================================================

export const FREE_TLDS = [
  'hq.com.ai',
  'app.net.ai',
  'api.net.ai',
  'hq.sb',
  'io.sb',
  'llc.st',
] as const

export type FreeTLD = typeof FREE_TLDS[number]

const MAX_SUBDOMAIN_LENGTH = 63
const MAX_DOMAIN_LENGTH = 253
const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX_REQUESTS = 100

// ============================================================================
// Type Definitions
// ============================================================================

export interface DomainRecord {
  id: string
  name: string
  orgId: string
  tld: string
  zoneId?: string
  workerId?: string
  routeId?: string
  status: 'pending' | 'active' | 'error'
  createdAt: number
  updatedAt: number
}

export interface RouteConfig {
  worker?: string
  workerScript?: string
  customOrigin?: string
}

export interface ListOptions {
  limit?: number
  offset?: number
  status?: 'pending' | 'active' | 'error'
  tld?: string
}

export interface ListAllOptions {
  limit?: number
  offset?: number
}

// Minimal storage interface for mock testing
interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number; start?: string; startAfter?: string }): Promise<Map<string, T>>
  transaction?<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface DomainsEnv {
  DOMAINS_DO?: unknown
  CLOUDFLARE?: {
    zones: {
      addDomain: (domain: string) => Promise<{ success: boolean; zone_id: string }>
      removeDomain: (zoneId: string) => Promise<{ success: boolean }>
    }
    workers: {
      createRoute: (zoneId: string, pattern: string, workerId: string) => Promise<{ success: boolean }>
      deleteRoute: (zoneId: string, routeId: string) => Promise<{ success: boolean }>
    }
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  // Remove any potential secrets or internal paths
  return message
    .replace(/SECRET_KEY=\S+/gi, '[REDACTED]')
    .replace(/API_KEY=\S+/gi, '[REDACTED]')
    .replace(/password=\S+/gi, '[REDACTED]')
    .replace(/\/etc\/\S+/gi, '[REDACTED]')
    .replace(/PATH=\S+/gi, '[REDACTED]')
    .slice(0, 200)
}

// ============================================================================
// DomainsDO Implementation
// ============================================================================

export class DomainsDO {
  protected readonly ctx: DOState
  protected readonly env: DomainsEnv

  // RPC method whitelist
  private readonly allowedMethods = new Set([
    'claim', 'release', 'route', 'unroute', 'get', 'getRoute', 'list', 'listAll',
    'count', 'countAll', 'isValidDomain', 'isFreeTLD', 'extractTLD', 'extractSubdomain'
  ])

  // Rate limiting
  private requestCounts: Map<string, { count: number; resetAt: number }> = new Map()

  constructor(ctx: DOState, env: DomainsEnv) {
    this.ctx = ctx
    this.env = env
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Check if a domain name is valid for our free TLDs
   */
  isValidDomain(domain: string): boolean {
    if (!domain || typeof domain !== 'string') {
      return false
    }

    // Reject domains with spaces (before or after trimming)
    if (domain.includes(' ')) {
      return false
    }

    const normalized = domain.toLowerCase().trim()

    // Check total length
    if (normalized.length > MAX_DOMAIN_LENGTH) {
      return false
    }

    // Extract TLD and subdomain
    const tld = this.extractTLD(normalized)
    if (!tld) {
      return false
    }

    const subdomain = this.extractSubdomain(normalized)
    if (!subdomain) {
      return false
    }

    // Check subdomain length
    if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
      return false
    }

    // Check subdomain format
    if (!VALID_SUBDOMAIN_PATTERN.test(subdomain)) {
      return false
    }

    // Check for consecutive hyphens
    if (subdomain.includes('--')) {
      return false
    }

    return true
  }

  /**
   * Check if a TLD is in our free tier
   */
  isFreeTLD(tld: string): boolean {
    if (!tld || typeof tld !== 'string') {
      return false
    }

    const normalized = tld.toLowerCase().trim()
    return FREE_TLDS.includes(normalized as FreeTLD)
  }

  /**
   * Extract the TLD from a domain name
   */
  extractTLD(domain: string): string | null {
    if (!domain || typeof domain !== 'string') {
      return null
    }

    const normalized = domain.toLowerCase().trim()

    // Check each free TLD
    for (const tld of FREE_TLDS) {
      if (normalized.endsWith(`.${tld}`)) {
        return tld
      }
    }

    return null
  }

  /**
   * Extract the subdomain from a domain name
   */
  extractSubdomain(domain: string): string | null {
    if (!domain || typeof domain !== 'string') {
      return null
    }

    const normalized = domain.toLowerCase().trim()
    const tld = this.extractTLD(normalized)

    if (!tld) {
      return null
    }

    const subdomain = normalized.slice(0, normalized.length - tld.length - 1)

    if (!subdomain) {
      return null
    }

    return subdomain
  }

  // ============================================================================
  // Domain Operations
  // ============================================================================

  /**
   * Claim a domain for an organization
   */
  async claim(domain: string, orgId: string): Promise<DomainRecord> {
    // Validate inputs
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain: domain is required')
    }

    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid org: orgId is required')
    }

    const normalized = domain.toLowerCase().trim()

    // Validate domain format
    if (!this.isValidDomain(normalized)) {
      throw new Error('Invalid domain format')
    }

    // Check if it's a free TLD
    const tld = this.extractTLD(normalized)
    if (!tld || !this.isFreeTLD(tld)) {
      throw new Error('Premium domain - upgrade required to use custom or premium TLDs')
    }

    // Use blockConcurrencyWhile to prevent race conditions
    return this.ctx.blockConcurrencyWhile(async () => {
      // Check if domain is already claimed
      const existingKey = `domain:${normalized}`
      const existing = await this.ctx.storage.get<DomainRecord>(existingKey)

      if (existing) {
        throw new Error('Domain already claimed')
      }

      // Create domain record
      const now = Date.now()
      const record: DomainRecord = {
        id: crypto.randomUUID(),
        name: normalized,
        orgId,
        tld,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }

      // Store domain by name
      await this.ctx.storage.put(existingKey, record)

      // Store index by org
      const orgIndexKey = `org:${orgId}:domain:${normalized}`
      await this.ctx.storage.put(orgIndexKey, record.id)

      return record
    })
  }

  /**
   * Release a domain
   */
  async release(domain: string, orgId: string): Promise<boolean> {
    if (!domain || typeof domain !== 'string') {
      return false
    }

    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid org: orgId is required')
    }

    const normalized = domain.toLowerCase().trim()
    const domainKey = `domain:${normalized}`

    return this.ctx.blockConcurrencyWhile(async () => {
      const existing = await this.ctx.storage.get<DomainRecord>(domainKey)

      if (!existing) {
        return false
      }

      // Check ownership
      if (existing.orgId !== orgId) {
        throw new Error('Not authorized: domain belongs to another organization')
      }

      // Delete domain record
      await this.ctx.storage.delete(domainKey)

      // Delete org index
      const orgIndexKey = `org:${orgId}:domain:${normalized}`
      await this.ctx.storage.delete(orgIndexKey)

      return true
    })
  }

  /**
   * Route a domain to a worker
   */
  async route(domain: string, config: RouteConfig, orgId: string): Promise<DomainRecord> {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain: domain is required')
    }

    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid org: orgId is required')
    }

    if (!config.worker || typeof config.worker !== 'string' || config.worker.trim() === '') {
      throw new Error('Invalid worker: worker name is required')
    }

    const normalized = domain.toLowerCase().trim()
    const domainKey = `domain:${normalized}`

    return this.ctx.blockConcurrencyWhile(async () => {
      const existing = await this.ctx.storage.get<DomainRecord>(domainKey)

      if (!existing) {
        throw new Error('Domain not found')
      }

      // Check ownership
      if (existing.orgId !== orgId) {
        throw new Error('Not authorized: domain belongs to another organization')
      }

      // Update domain record
      const updated: DomainRecord = {
        ...existing,
        workerId: config.worker,
        updatedAt: Date.now(),
      }

      await this.ctx.storage.put(domainKey, updated)

      return updated
    })
  }

  /**
   * Remove routing from a domain
   */
  async unroute(domain: string, orgId: string): Promise<DomainRecord> {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain: domain is required')
    }

    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid org: orgId is required')
    }

    const normalized = domain.toLowerCase().trim()
    const domainKey = `domain:${normalized}`

    return this.ctx.blockConcurrencyWhile(async () => {
      const existing = await this.ctx.storage.get<DomainRecord>(domainKey)

      if (!existing) {
        throw new Error('Domain not found')
      }

      // Check ownership
      if (existing.orgId !== orgId) {
        throw new Error('Not authorized: domain belongs to another organization')
      }

      // Update domain record
      const updated: DomainRecord = {
        ...existing,
        workerId: undefined,
        routeId: undefined,
        updatedAt: Date.now(),
      }

      await this.ctx.storage.put(domainKey, updated)

      return updated
    })
  }

  /**
   * Get a domain record
   */
  async get(domain: string): Promise<DomainRecord | null> {
    if (!domain || typeof domain !== 'string') {
      return null
    }

    const normalized = domain.toLowerCase().trim()
    const domainKey = `domain:${normalized}`

    const record = await this.ctx.storage.get<DomainRecord>(domainKey)
    return record ?? null
  }

  /**
   * Get route configuration for a domain
   */
  async getRoute(domain: string): Promise<RouteConfig | null> {
    const record = await this.get(domain)

    if (!record || !record.workerId) {
      return null
    }

    return {
      worker: record.workerId,
    }
  }

  /**
   * List domains for an organization
   */
  async list(orgId: string, options: ListOptions = {}): Promise<DomainRecord[]> {
    if (!orgId || typeof orgId !== 'string') {
      return []
    }

    const { limit = 100, offset = 0, status, tld } = options

    // Get all domains and filter by org
    const allDomains = await this.ctx.storage.list<DomainRecord>({ prefix: 'domain:' })
    let domains = Array.from(allDomains.values()).filter(d => d.orgId === orgId)

    // Apply filters
    if (status) {
      domains = domains.filter(d => d.status === status)
    }

    if (tld) {
      domains = domains.filter(d => d.tld === tld)
    }

    // Sort by created date (newest first)
    domains.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    return domains.slice(offset, offset + limit)
  }

  /**
   * List all domains (admin only)
   */
  async listAll(options: ListAllOptions = {}): Promise<DomainRecord[]> {
    const { limit = 100, offset = 0 } = options

    const allDomains = await this.ctx.storage.list<DomainRecord>({ prefix: 'domain:' })
    let domains = Array.from(allDomains.values())

    // Sort by created date (newest first)
    domains.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    return domains.slice(offset, offset + limit)
  }

  /**
   * Count domains for an organization
   */
  async count(orgId: string): Promise<number> {
    if (!orgId || typeof orgId !== 'string') {
      return 0
    }

    const allDomains = await this.ctx.storage.list<DomainRecord>({ prefix: 'domain:' })
    return Array.from(allDomains.values()).filter(d => d.orgId === orgId).length
  }

  /**
   * Count all domains
   */
  async countAll(): Promise<number> {
    const allDomains = await this.ctx.storage.list<DomainRecord>({ prefix: 'domain:' })
    return allDomains.size
  }

  // ============================================================================
  // RPC Interface
  // ============================================================================

  hasMethod(name: string): boolean {
    return this.allowedMethods.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    switch (method) {
      case 'claim':
        if (params.length < 2) {
          throw new Error('Invalid parameters: claim requires domain and orgId')
        }
        if (typeof params[0] !== 'string') {
          throw new Error('Invalid type for domain: expected string')
        }
        if (typeof params[1] !== 'string') {
          throw new Error('Invalid type for orgId: expected string')
        }
        return this.claim(params[0], params[1])

      case 'release':
        if (params.length < 2) {
          throw new Error('Invalid parameters: release requires domain and orgId')
        }
        if (typeof params[0] !== 'string') {
          throw new Error('Invalid type for domain: expected string')
        }
        if (typeof params[1] !== 'string') {
          throw new Error('Invalid type for orgId: expected string')
        }
        return this.release(params[0], params[1])

      case 'route':
        if (params.length < 3) {
          throw new Error('Invalid parameters: route requires domain, config, and orgId')
        }
        if (typeof params[0] !== 'string') {
          throw new Error('Invalid type for domain: expected string')
        }
        if (typeof params[2] !== 'string') {
          throw new Error('Invalid type for orgId: expected string')
        }
        return this.route(params[0], params[1] as RouteConfig, params[2])

      case 'unroute':
        if (params.length < 2) {
          throw new Error('Invalid parameters: unroute requires domain and orgId')
        }
        return this.unroute(params[0] as string, params[1] as string)

      case 'get':
        if (params.length < 1) {
          throw new Error('Invalid parameters: get requires domain')
        }
        return this.get(params[0] as string)

      case 'getRoute':
        if (params.length < 1) {
          throw new Error('Invalid parameters: getRoute requires domain')
        }
        return this.getRoute(params[0] as string)

      case 'list':
        if (params.length < 1) {
          throw new Error('Invalid parameters: list requires orgId')
        }
        return this.list(params[0] as string, params[1] as ListOptions)

      case 'listAll':
        return this.listAll(params[0] as ListAllOptions)

      case 'count':
        if (params.length < 1) {
          throw new Error('Invalid parameters: count requires orgId')
        }
        return this.count(params[0] as string)

      case 'countAll':
        return this.countAll()

      case 'isValidDomain':
        return this.isValidDomain(params[0] as string)

      case 'isFreeTLD':
        return this.isFreeTLD(params[0] as string)

      case 'extractTLD':
        return this.extractTLD(params[0] as string)

      case 'extractSubdomain':
        return this.extractSubdomain(params[0] as string)

      default:
        throw new Error(`Method not implemented: ${method}`)
    }
  }

  // ============================================================================
  // HTTP Fetch Handler
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Rate limiting
    const clientId = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!this.checkRateLimit(clientId)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    try {
      // Route: GET / - HATEOAS discovery
      if (path === '/' && request.method === 'GET') {
        return this.handleDiscovery()
      }

      // Route: POST /rpc - RPC endpoint
      if (path === '/rpc' && request.method === 'POST') {
        return this.handleRpc(request)
      }

      // Route: POST /rpc/batch - Batch RPC
      if (path === '/rpc/batch' && request.method === 'POST') {
        return this.handleBatchRpc(request)
      }

      // Route: REST API /api/domains
      if (path.startsWith('/api/domains')) {
        return this.handleRestApi(request, url, path)
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      const message = sanitizeError(error)
      return Response.json({ error: message }, { status: 500 })
    }
  }

  // ============================================================================
  // HTTP Handlers
  // ============================================================================

  private async handleDiscovery(): Promise<Response> {
    return Response.json({
      api: 'builder.domains',
      version: '1.0.0',
      links: {
        self: '/',
        rpc: '/rpc',
        batch: '/rpc/batch',
        domains: '/api/domains',
      },
      discover: {
        tlds: [...FREE_TLDS],
        methods: [
          { name: 'claim', description: 'Claim a domain for an organization' },
          { name: 'release', description: 'Release a domain' },
          { name: 'route', description: 'Route a domain to a worker' },
          { name: 'unroute', description: 'Remove routing from a domain' },
          { name: 'get', description: 'Get domain details' },
          { name: 'getRoute', description: 'Get route configuration for a domain' },
          { name: 'list', description: 'List domains for an organization' },
          { name: 'listAll', description: 'List all domains (admin)' },
          { name: 'count', description: 'Count domains for an organization' },
          { name: 'countAll', description: 'Count all domains' },
          { name: 'isValidDomain', description: 'Validate domain format' },
          { name: 'isFreeTLD', description: 'Check if TLD is free tier' },
          { name: 'extractTLD', description: 'Extract TLD from domain' },
          { name: 'extractSubdomain', description: 'Extract subdomain from domain' },
        ],
      },
    })
  }

  private async handleRpc(request: Request): Promise<Response> {
    let body: { method: string; params: unknown[] }

    try {
      body = await request.json() as { method: string; params: unknown[] }
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { method, params } = body
    const orgId = request.headers.get('X-Org-ID')

    if (!this.hasMethod(method)) {
      return Response.json({ error: `Method not allowed: ${method}` }, { status: 400 })
    }

    try {
      // Inject orgId for methods that need authorization
      if (['release', 'route', 'unroute'].includes(method) && orgId) {
        // Validate org authorization
        const domain = params[0] as string
        const record = await this.get(domain)
        if (record && record.orgId !== orgId) {
          return Response.json({ error: 'Not authorized' }, { status: 403 })
        }
      }

      const result = await this.invoke(method, params)
      return Response.json({ result })
    } catch (error) {
      return Response.json({ error: sanitizeError(error) }, { status: 400 })
    }
  }

  private async handleBatchRpc(request: Request): Promise<Response> {
    let batch: Array<{ method: string; params: unknown[] }>

    try {
      batch = await request.json() as Array<{ method: string; params: unknown[] }>
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const results = await Promise.all(
      batch.map(async ({ method, params }) => {
        try {
          if (!this.hasMethod(method)) {
            return { error: `Method not allowed: ${method}` }
          }
          const result = await this.invoke(method, params)
          return { result }
        } catch (error) {
          return { error: sanitizeError(error) }
        }
      })
    )

    return Response.json(results)
  }

  private async handleRestApi(request: Request, url: URL, path: string): Promise<Response> {
    const pathParts = path.replace('/api/domains', '').split('/').filter(Boolean)
    const domain = pathParts[0] ? decodeURIComponent(pathParts[0]) : null
    const action = pathParts[1]
    const orgId = request.headers.get('X-Org-ID') ?? url.searchParams.get('orgId')

    try {
      switch (request.method) {
        case 'GET':
          if (domain) {
            const record = await this.get(domain)
            if (!record) {
              return Response.json({ error: 'Domain not found' }, { status: 404 })
            }
            return Response.json(record)
          } else {
            if (!orgId) {
              return Response.json({ error: 'orgId required' }, { status: 400 })
            }
            const domains = await this.list(orgId)
            return Response.json(domains)
          }

        case 'POST':
          if (domain) {
            return Response.json({ error: 'POST to /api/domains, not specific domain' }, { status: 400 })
          }
          try {
            const body = await request.json() as { domain: string; orgId: string }
            const record = await this.claim(body.domain, body.orgId)
            return Response.json(record, { status: 201 })
          } catch (error) {
            return Response.json({ error: sanitizeError(error) }, { status: 400 })
          }

        case 'PUT':
          if (!domain) {
            return Response.json({ error: 'Domain required' }, { status: 400 })
          }
          if (action === 'route') {
            if (!orgId) {
              return Response.json({ error: 'X-Org-ID header required' }, { status: 400 })
            }
            try {
              const body = await request.json() as RouteConfig
              const record = await this.route(domain, body, orgId)
              return Response.json(record)
            } catch (error) {
              return Response.json({ error: sanitizeError(error) }, { status: 400 })
            }
          }
          return Response.json({ error: 'Unknown action' }, { status: 400 })

        case 'DELETE':
          if (!domain) {
            return Response.json({ error: 'Domain required' }, { status: 400 })
          }
          if (!orgId) {
            return Response.json({ error: 'X-Org-ID header required' }, { status: 400 })
          }
          try {
            const released = await this.release(domain, orgId)
            if (!released) {
              return Response.json({ error: 'Domain not found' }, { status: 404 })
            }
            return Response.json({ success: true })
          } catch (error) {
            const errorMessage = (error as Error).message
            if (errorMessage.includes('Not authorized')) {
              return Response.json({ error: errorMessage }, { status: 403 })
            }
            return Response.json({ error: sanitizeError(error) }, { status: 400 })
          }

        default:
          return Response.json({ error: 'Method not allowed' }, { status: 405 })
      }
    } catch (error) {
      const message = sanitizeError(error)
      return Response.json({ error: message }, { status: 500 })
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now()
    const record = this.requestCounts.get(clientId)

    if (!record || now > record.resetAt) {
      this.requestCounts.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      return true
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false
    }

    record.count++
    return true
  }
}
