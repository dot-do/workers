/**
 * MultiTenantDO - Durable Object for multi-tenant site management
 *
 * Manages hostname-to-site mappings and site configurations.
 * Works with Static Assets to serve 100k+ sites from single deployment.
 *
 * Storage schema:
 * - site:{name} -> SiteConfig
 * - hostname:{hostname} -> HostnameMapping
 * - sites:list -> string[] (all site names)
 *
 * @module @dotdo/multi-tenant
 */

import type {
  SiteConfig,
  SiteMeta,
  SiteFeatures,
  HostnameMapping,
  CreateSiteRequest,
  UpdateSiteRequest,
  SiteResponse,
  SiteListResponse,
  MultiTenantEnv,
  SiteBundle,
} from './types.js'

import {
  MultiTenantError,
  SiteNotFoundError,
  SiteExistsError,
  InvalidSiteNameError,
  SiteDisabledError,
} from './types.js'

// ============================================================================
// Validation
// ============================================================================

/** Valid site name pattern: lowercase alphanumeric with hyphens */
const SITE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/

/** Reserved site names */
const RESERVED_NAMES = new Set([
  'www',
  'api',
  'admin',
  'static',
  'assets',
  'cdn',
  'docs',
  'app',
  'dashboard',
  'login',
  'auth',
  'oauth',
  'health',
  'status',
  '_',
])

/** Maximum site name length */
const MAX_NAME_LENGTH = 63

/** Default base domain */
const BASE_DOMAIN = 'workers.do'

function validateSiteName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new InvalidSiteNameError(name, 'name is required')
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new InvalidSiteNameError(name, `must be ${MAX_NAME_LENGTH} characters or less`)
  }

  if (!SITE_NAME_PATTERN.test(name)) {
    throw new InvalidSiteNameError(
      name,
      'must be lowercase alphanumeric with hyphens, cannot start or end with hyphen'
    )
  }

  if (RESERVED_NAMES.has(name)) {
    throw new InvalidSiteNameError(name, 'is a reserved name')
  }
}

function validateHostname(hostname: string): void {
  if (!hostname || typeof hostname !== 'string') {
    throw new MultiTenantError('Invalid hostname', 'INVALID_HOSTNAME', 400)
  }

  // Basic hostname validation
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
  if (!hostnamePattern.test(hostname)) {
    throw new MultiTenantError(`Invalid hostname: ${hostname}`, 'INVALID_HOSTNAME', 400)
  }
}

// ============================================================================
// DO Storage Interface
// ============================================================================

interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

// ============================================================================
// MultiTenantDO Implementation
// ============================================================================

export class MultiTenantDO {
  private readonly ctx: DOState
  private readonly env: MultiTenantEnv

  constructor(ctx: DOState, env: MultiTenantEnv) {
    this.ctx = ctx
    this.env = env
  }

  // ==========================================================================
  // Site Management
  // ==========================================================================

  /**
   * Create a new site
   */
  async createSite(request: CreateSiteRequest, userId?: string, orgId?: string): Promise<SiteResponse> {
    validateSiteName(request.name)

    // Check if site already exists
    const existingKey = `site:${request.name}`
    const existing = await this.ctx.storage.get<SiteConfig>(existingKey)
    if (existing) {
      throw new SiteExistsError(request.name)
    }

    const now = new Date().toISOString()
    const primaryHostname = `${request.name}.${BASE_DOMAIN}`

    // Create site metadata
    const meta: SiteMeta = {
      name: request.name,
      title: request.title,
      description: request.description,
      orgId,
      userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      features: request.features ?? {
        analytics: true,
        caching: true,
        auth: false,
        api: false,
      },
    }

    // Build hostname list
    const hostnames = [primaryHostname]
    if (request.customDomain) {
      validateHostname(request.customDomain)
      hostnames.push(request.customDomain)
      meta.customDomain = request.customDomain
    }

    // Create site config
    const config: SiteConfig = {
      name: request.name,
      hostnames,
      primaryHostname,
      enabled: true,
      meta,
    }

    // Store site config
    await this.ctx.storage.put(existingKey, config)

    // Store hostname mappings
    for (const hostname of hostnames) {
      const mapping: HostnameMapping = {
        siteName: request.name,
        isPrimary: hostname === primaryHostname,
        isCustomDomain: hostname !== primaryHostname,
      }
      await this.ctx.storage.put(`hostname:${hostname}`, mapping)
    }

    // Add to sites list
    const listKey = 'sites:list'
    const sitesList = (await this.ctx.storage.get<string[]>(listKey)) ?? []
    if (!sitesList.includes(request.name)) {
      sitesList.push(request.name)
      await this.ctx.storage.put(listKey, sitesList)
    }

    // Create initial bundle in Static Assets (via KV for now)
    const bundle: SiteBundle = {
      module: this.generateDefaultModule(request.name),
      mdx: request.mdx ?? this.generateDefaultMdx(request.name, request.title),
      html: this.generateDefaultHtml(request.name, request.title),
      meta,
    }

    // Store bundle config in KV (actual files go to Static Assets)
    await this.env.SITE_CONFIG.put(`bundle:${request.name}`, JSON.stringify(bundle))

    return {
      success: true,
      site: config,
      message: `Site "${request.name}" created successfully`,
      urls: {
        primary: `https://${primaryHostname}`,
        all: hostnames.map((h) => `https://${h}`),
      },
    }
  }

  /**
   * Get site configuration by name
   */
  async getSite(name: string): Promise<SiteConfig | null> {
    const key = `site:${name}`
    const config = await this.ctx.storage.get<SiteConfig>(key)
    return config ?? null
  }

  /**
   * Get site by hostname
   */
  async getSiteByHostname(hostname: string): Promise<SiteConfig | null> {
    const mappingKey = `hostname:${hostname}`
    const mapping = await this.ctx.storage.get<HostnameMapping>(mappingKey)

    if (!mapping) {
      return null
    }

    return this.getSite(mapping.siteName)
  }

  /**
   * Update a site
   */
  async updateSite(name: string, updates: UpdateSiteRequest): Promise<SiteResponse> {
    const config = await this.getSite(name)
    if (!config) {
      throw new SiteNotFoundError(name)
    }

    const now = new Date().toISOString()

    // Update metadata
    if (updates.title !== undefined) {
      config.meta.title = updates.title
    }
    if (updates.description !== undefined) {
      config.meta.description = updates.description
    }
    if (updates.features !== undefined) {
      config.meta.features = { ...config.meta.features, ...updates.features }
    }
    if (updates.enabled !== undefined) {
      config.enabled = updates.enabled
    }

    config.meta.updatedAt = now
    config.meta.version = (config.meta.version ?? 0) + 1

    // Handle custom domain changes
    if (updates.addCustomDomain) {
      validateHostname(updates.addCustomDomain)

      // Check if hostname is already mapped
      const existingMapping = await this.ctx.storage.get<HostnameMapping>(
        `hostname:${updates.addCustomDomain}`
      )
      if (existingMapping && existingMapping.siteName !== name) {
        throw new MultiTenantError(
          `Hostname ${updates.addCustomDomain} is already mapped to another site`,
          'HOSTNAME_IN_USE',
          409
        )
      }

      if (!config.hostnames.includes(updates.addCustomDomain)) {
        config.hostnames.push(updates.addCustomDomain)
        config.meta.customDomain = updates.addCustomDomain

        const mapping: HostnameMapping = {
          siteName: name,
          isPrimary: false,
          isCustomDomain: true,
        }
        await this.ctx.storage.put(`hostname:${updates.addCustomDomain}`, mapping)
      }
    }

    if (updates.removeCustomDomain) {
      const idx = config.hostnames.indexOf(updates.removeCustomDomain)
      if (idx !== -1 && updates.removeCustomDomain !== config.primaryHostname) {
        config.hostnames.splice(idx, 1)
        await this.ctx.storage.delete(`hostname:${updates.removeCustomDomain}`)

        if (config.meta.customDomain === updates.removeCustomDomain) {
          config.meta.customDomain = undefined
        }
      }
    }

    // Save updated config
    await this.ctx.storage.put(`site:${name}`, config)

    // Update bundle if content changed
    if (updates.mdx || updates.html || updates.module) {
      const bundleStr = await this.env.SITE_CONFIG.get(`bundle:${name}`)
      const bundle: SiteBundle = bundleStr
        ? JSON.parse(bundleStr)
        : { module: '', mdx: '', html: '', meta: config.meta }

      if (updates.mdx) bundle.mdx = updates.mdx
      if (updates.html) bundle.html = updates.html
      if (updates.module) bundle.module = updates.module
      bundle.meta = config.meta

      await this.env.SITE_CONFIG.put(`bundle:${name}`, JSON.stringify(bundle))
    }

    return {
      success: true,
      site: config,
      message: `Site "${name}" updated successfully`,
      urls: {
        primary: `https://${config.primaryHostname}`,
        all: config.hostnames.map((h) => `https://${h}`),
      },
    }
  }

  /**
   * Delete a site
   */
  async deleteSite(name: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getSite(name)
    if (!config) {
      throw new SiteNotFoundError(name)
    }

    // Delete hostname mappings
    for (const hostname of config.hostnames) {
      await this.ctx.storage.delete(`hostname:${hostname}`)
    }

    // Delete site config
    await this.ctx.storage.delete(`site:${name}`)

    // Remove from sites list
    const listKey = 'sites:list'
    const sitesList = (await this.ctx.storage.get<string[]>(listKey)) ?? []
    const idx = sitesList.indexOf(name)
    if (idx !== -1) {
      sitesList.splice(idx, 1)
      await this.ctx.storage.put(listKey, sitesList)
    }

    // Delete bundle from KV
    await this.env.SITE_CONFIG.delete(`bundle:${name}`)

    return {
      success: true,
      message: `Site "${name}" deleted successfully`,
    }
  }

  /**
   * List all sites
   */
  async listSites(offset = 0, limit = 20): Promise<SiteListResponse> {
    const listKey = 'sites:list'
    const sitesList = (await this.ctx.storage.get<string[]>(listKey)) ?? []

    const total = sitesList.length
    const paginatedNames = sitesList.slice(offset, offset + limit)

    const sites: SiteConfig[] = []
    for (const name of paginatedNames) {
      const config = await this.getSite(name)
      if (config) {
        sites.push(config)
      }
    }

    return {
      sites,
      total,
      offset,
      limit,
    }
  }

  // ==========================================================================
  // Content Serving
  // ==========================================================================

  /**
   * Get site bundle for serving
   */
  async getBundle(name: string): Promise<SiteBundle | null> {
    const bundleStr = await this.env.SITE_CONFIG.get(`bundle:${name}`)
    if (!bundleStr) {
      return null
    }

    try {
      return JSON.parse(bundleStr) as SiteBundle
    } catch {
      return null
    }
  }

  /**
   * Resolve hostname to site bundle
   */
  async resolveHostname(hostname: string): Promise<{ config: SiteConfig; bundle: SiteBundle } | null> {
    const config = await this.getSiteByHostname(hostname)
    if (!config) {
      return null
    }

    if (!config.enabled) {
      throw new SiteDisabledError(config.name)
    }

    const bundle = await this.getBundle(config.name)
    if (!bundle) {
      return null
    }

    return { config, bundle }
  }

  // ==========================================================================
  // Default Content Generation
  // ==========================================================================

  private generateDefaultModule(name: string): string {
    return `// ${name} - Generated module
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from ${name}!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
`
  }

  private generateDefaultMdx(name: string, title?: string): string {
    return `---
title: ${title ?? name}
description: Welcome to ${name}
---

# ${title ?? name}

Welcome to your new site powered by workers.do!

## Getting Started

Edit this MDX content to customize your site.

## Features

- **Static Assets**: Your site is served from Cloudflare's edge
- **Multi-tenant**: Part of the workers.do platform
- **Free tier**: No additional costs beyond base Worker
`
  }

  private generateDefaultHtml(name: string, title?: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ?? name}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: #1a1a1a; }
  </style>
</head>
<body>
  <h1>${title ?? name}</h1>
  <p>Welcome to your new site powered by workers.do!</p>
</body>
</html>
`
  }

  // ==========================================================================
  // HTTP Handler
  // ==========================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // API routes
      if (path.startsWith('/api/sites')) {
        return this.handleSiteApi(request, path)
      }

      // Health check
      if (path === '/health') {
        return Response.json({ status: 'healthy', timestamp: new Date().toISOString() })
      }

      // Content serving based on hostname
      const hostname = request.headers.get('Host') || url.hostname
      return this.serveContent(request, hostname, path)
    } catch (error) {
      if (error instanceof MultiTenantError) {
        return Response.json(
          { error: error.message, code: error.code },
          { status: error.status }
        )
      }

      console.error('MultiTenantDO error:', error)
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async handleSiteApi(request: Request, path: string): Promise<Response> {
    const method = request.method
    const pathParts = path.split('/').filter(Boolean)
    // pathParts: ['api', 'sites', ...rest]

    // GET /api/sites - list sites
    if (method === 'GET' && pathParts.length === 2) {
      const url = new URL(request.url)
      const offset = parseInt(url.searchParams.get('offset') ?? '0')
      const limit = parseInt(url.searchParams.get('limit') ?? '20')
      const result = await this.listSites(offset, limit)
      return Response.json(result)
    }

    // POST /api/sites - create site
    if (method === 'POST' && pathParts.length === 2) {
      const body = await request.json() as CreateSiteRequest
      const userId = request.headers.get('x-user-id') ?? undefined
      const orgId = request.headers.get('x-org-id') ?? undefined
      const result = await this.createSite(body, userId, orgId)
      return Response.json(result, { status: 201 })
    }

    // Site-specific routes: /api/sites/:name
    if (pathParts.length >= 3) {
      const siteName = pathParts[2]

      // GET /api/sites/:name
      if (method === 'GET' && pathParts.length === 3) {
        const site = await this.getSite(siteName)
        if (!site) {
          throw new SiteNotFoundError(siteName)
        }
        return Response.json(site)
      }

      // PATCH /api/sites/:name
      if (method === 'PATCH' && pathParts.length === 3) {
        const body = await request.json() as UpdateSiteRequest
        const result = await this.updateSite(siteName, body)
        return Response.json(result)
      }

      // DELETE /api/sites/:name
      if (method === 'DELETE' && pathParts.length === 3) {
        const result = await this.deleteSite(siteName)
        return Response.json(result)
      }

      // GET /api/sites/:name/bundle
      if (method === 'GET' && pathParts.length === 4 && pathParts[3] === 'bundle') {
        const bundle = await this.getBundle(siteName)
        if (!bundle) {
          throw new SiteNotFoundError(siteName)
        }
        return Response.json(bundle)
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  private async serveContent(request: Request, hostname: string, path: string): Promise<Response> {
    const result = await this.resolveHostname(hostname)

    if (!result) {
      return Response.json(
        { error: 'Site not found', hostname },
        { status: 404 }
      )
    }

    const { config, bundle } = result

    // Special route: /llms.txt - serve MDX for LLM consumption
    if (path === '/llms.txt') {
      return new Response(bundle.mdx, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Site': config.name,
        },
      })
    }

    // Content negotiation via Accept header
    const accept = request.headers.get('Accept') || ''

    // Serve HTML for browsers
    if (accept.includes('text/html')) {
      return new Response(bundle.html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Site': config.name,
          'X-Site-Version': String(config.meta.version ?? 1),
        },
      })
    }

    // Serve MDX for markdown clients
    if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
      return new Response(bundle.mdx, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'X-Site': config.name,
        },
      })
    }

    // Default: serve JavaScript module
    return new Response(bundle.module, {
      headers: {
        'Content-Type': 'application/javascript',
        'X-Site': config.name,
      },
    })
  }
}
