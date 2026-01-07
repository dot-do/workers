/**
 * RouterDO - Durable Object for hostname-based routing
 *
 * Implements multi-tenant hostname routing with:
 * - Hostname pattern matching (exact and wildcard)
 * - Path-based route matching with priorities
 * - Request forwarding with header manipulation
 * - Health check endpoints
 * - URL rewriting support
 *
 * @module router
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface RouteConfig {
  pattern: string
  target: string
  methods?: string[]
  headers?: Record<string, string>
  rewrite?: boolean
  priority?: number
}

export interface HostnameConfig {
  hostname: string
  routes: RouteConfig[]
  defaultTarget?: string
  enabled?: boolean
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime?: number
  version?: string
  checks?: Record<string, {
    status: 'pass' | 'fail' | 'warn'
    message?: string
    duration?: number
  }>
}

interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface RouterEnv {
  ROUTER_DO?: unknown
  DATABASE_DO?: unknown
  FUNCTIONS_DO?: unknown
  ROUTE_CONFIG?: {
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string) => Promise<void>
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

const HOSTNAME_PATTERN = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(:[\d]+)?$/
const MULTI_WILDCARD_PATTERN = /^(\*\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(:[\d]+)?$/

function validateHostname(hostname: string): void {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Invalid hostname: hostname is required')
  }

  // Allow localhost with port
  if (hostname.startsWith('localhost:')) {
    return
  }

  // Check for invalid characters
  if (hostname.includes('..')) {
    throw new Error('Invalid hostname: cannot contain consecutive dots')
  }

  // Check against patterns
  const isValid = HOSTNAME_PATTERN.test(hostname) || MULTI_WILDCARD_PATTERN.test(hostname)
  if (!isValid && hostname !== 'localhost') {
    throw new Error(`Invalid hostname: ${hostname}`)
  }
}

function validateRoutePattern(pattern: string): void {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('Invalid pattern: pattern is required')
  }

  if (!pattern.startsWith('/')) {
    throw new Error('Invalid pattern: must start with /')
  }
}

function validateTarget(target: string): void {
  if (!target || typeof target !== 'string') {
    throw new Error('Target is required')
  }
}

// ============================================================================
// Route Matching Utilities
// ============================================================================

interface CompiledPattern {
  regex: RegExp
  isExact: boolean
  segments: number
  hasWildcard: boolean
  priority: number
}

function compilePattern(pattern: string, priority: number = 0): CompiledPattern {
  const segments = pattern.split('/').filter(Boolean).length
  const hasWildcard = pattern.includes('*') || pattern.includes(':')
  const isExact = !hasWildcard

  // Convert pattern to regex - build char by char to avoid escaping issues
  let regexStr = ''
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]

    if (char === '*') {
      // * matches any path segment(s)
      regexStr += '(.*)'
      i++
    } else if (char === ':') {
      // :param matches a single path segment
      let paramName = ''
      i++ // skip the :
      while (i < pattern.length && /[a-zA-Z0-9_]/.test(pattern[i])) {
        paramName += pattern[i]
        i++
      }
      regexStr += '([^/]+)'
    } else if ('.+?^${}()|[]\\'.includes(char)) {
      // Escape special regex chars
      regexStr += '\\' + char
      i++
    } else {
      regexStr += char
      i++
    }
  }

  // Always anchor the pattern
  regexStr = `^${regexStr}$`

  return {
    regex: new RegExp(regexStr),
    isExact,
    segments,
    hasWildcard,
    priority
  }
}

function matchesPattern(path: string, compiledPattern: CompiledPattern): boolean {
  return compiledPattern.regex.test(path)
}

// Sort routes by specificity
function sortRoutesBySpecificity(routes: Array<RouteConfig & { compiled: CompiledPattern }>): void {
  routes.sort((a, b) => {
    // Higher priority first
    if (a.compiled.priority !== b.compiled.priority) {
      return b.compiled.priority - a.compiled.priority
    }
    // Exact matches before wildcards
    if (a.compiled.isExact !== b.compiled.isExact) {
      return a.compiled.isExact ? -1 : 1
    }
    // More segments first (more specific)
    if (a.compiled.segments !== b.compiled.segments) {
      return b.compiled.segments - a.compiled.segments
    }
    // Non-wildcards before wildcards
    if (a.compiled.hasWildcard !== b.compiled.hasWildcard) {
      return a.compiled.hasWildcard ? 1 : -1
    }
    return 0
  })
}

// ============================================================================
// Hostname Matching Utilities
// ============================================================================

function compileHostnamePattern(hostname: string): RegExp {
  // Handle multi-level wildcards like *.*.workers.do
  // First escape special regex chars, but handle * specially
  let regexStr = ''
  for (let i = 0; i < hostname.length; i++) {
    const char = hostname[i]
    if (char === '*') {
      regexStr += '([^.]+)'
    } else if ('.+?^${}()|[]\\'.includes(char)) {
      regexStr += '\\' + char
    } else {
      regexStr += char
    }
  }

  return new RegExp(`^${regexStr}$`, 'i')
}

function matchesHostname(hostname: string, pattern: string): boolean {
  // Exact match
  if (hostname.toLowerCase() === pattern.toLowerCase()) {
    return true
  }

  // Wildcard match
  if (pattern.includes('*')) {
    const regex = compileHostnamePattern(pattern)
    return regex.test(hostname)
  }

  return false
}

// ============================================================================
// RouterDO Implementation
// ============================================================================

export class RouterDO {
  protected readonly ctx: DOState
  protected readonly env: RouterEnv

  // Startup time for uptime calculation
  private readonly startTime: number

  // Version
  private readonly version = '1.0.0'

  // Health check cache
  private healthCache: { result: HealthStatus; timestamp: number } | null = null
  private readonly healthCacheTTL = 5000 // 5 seconds

  // Target health cache
  private targetHealthCache: Map<string, { healthy: boolean; timestamp: number }> = new Map()
  private readonly targetHealthCacheTTL = 10000 // 10 seconds

  // Hop-by-hop headers that should not be forwarded
  private readonly hopByHopHeaders = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade'
  ])

  constructor(ctx: DOState, env: RouterEnv) {
    this.ctx = ctx
    this.env = env
    this.startTime = Date.now()
  }

  // ============================================================================
  // Hostname Configuration Management
  // ============================================================================

  async registerHostname(config: HostnameConfig): Promise<void> {
    validateHostname(config.hostname)

    // Validate all routes
    for (const route of config.routes) {
      validateRoutePattern(route.pattern)
      if (route.target) {
        // Target can be empty for rewrites
        validateTarget(route.target)
      }
    }

    // Store hostname config
    const key = `hostname:${config.hostname}`
    await this.ctx.storage.put(key, config)

    // Track hostname in list
    const hostnamesKey = 'hostnames:list'
    const existingList = await this.ctx.storage.get<string[]>(hostnamesKey) ?? []
    if (!existingList.includes(config.hostname)) {
      existingList.push(config.hostname)
      await this.ctx.storage.put(hostnamesKey, existingList)
    }
  }

  async getHostnameConfig(hostname: string): Promise<HostnameConfig | null> {
    const key = `hostname:${hostname}`
    const config = await this.ctx.storage.get<HostnameConfig>(key)
    return config ?? null
  }

  async listHostnames(): Promise<string[]> {
    const hostnamesKey = 'hostnames:list'
    const list = await this.ctx.storage.get<string[]>(hostnamesKey)
    return list ?? []
  }

  async removeHostname(hostname: string): Promise<boolean> {
    const key = `hostname:${hostname}`
    const existing = await this.ctx.storage.get<HostnameConfig>(key)

    if (!existing) {
      return false
    }

    await this.ctx.storage.delete(key)

    // Remove from list
    const hostnamesKey = 'hostnames:list'
    const existingList = await this.ctx.storage.get<string[]>(hostnamesKey) ?? []
    const index = existingList.indexOf(hostname)
    if (index !== -1) {
      existingList.splice(index, 1)
      await this.ctx.storage.put(hostnamesKey, existingList)
    }

    return true
  }

  async resolveHostname(hostname: string): Promise<string | null> {
    const config = await this.matchHostnamePattern(hostname)
    return config?.defaultTarget ?? null
  }

  async matchHostnamePattern(hostname: string): Promise<HostnameConfig | null> {
    // First try exact match
    const exactConfig = await this.getHostnameConfig(hostname)
    if (exactConfig) {
      return exactConfig
    }

    // Try wildcard patterns
    const hostnames = await this.listHostnames()
    const wildcardHostnames = hostnames.filter(h => h.includes('*'))

    // Sort by specificity (more specific patterns first)
    wildcardHostnames.sort((a, b) => {
      const aWildcards = (a.match(/\*/g) || []).length
      const bWildcards = (b.match(/\*/g) || []).length
      // Fewer wildcards = more specific
      if (aWildcards !== bWildcards) {
        return aWildcards - bWildcards
      }
      // More segments = more specific
      return b.split('.').length - a.split('.').length
    })

    for (const pattern of wildcardHostnames) {
      if (matchesHostname(hostname, pattern)) {
        // Check if segment count matches for single-level wildcards
        const patternSegments = pattern.split('.')
        const hostnameSegments = hostname.split('.')

        // For single wildcard patterns like *.workers.do
        // the hostname must have the same number of segments
        if (patternSegments.length === hostnameSegments.length) {
          return await this.getHostnameConfig(pattern)
        }
      }
    }

    return null
  }

  // ============================================================================
  // Route Management
  // ============================================================================

  async addRoute(hostname: string, route: RouteConfig): Promise<void> {
    const config = await this.getHostnameConfig(hostname)

    if (!config) {
      throw new Error(`Hostname not found: ${hostname}`)
    }

    validateRoutePattern(route.pattern)
    if (!route.target) {
      throw new Error('Target is required')
    }

    config.routes.push(route)
    await this.ctx.storage.put(`hostname:${hostname}`, config)
  }

  async removeRoute(hostname: string, pattern: string): Promise<boolean> {
    const config = await this.getHostnameConfig(hostname)

    if (!config) {
      throw new Error(`Hostname not found: ${hostname}`)
    }

    const index = config.routes.findIndex(r => r.pattern === pattern)
    if (index === -1) {
      return false
    }

    config.routes.splice(index, 1)
    await this.ctx.storage.put(`hostname:${hostname}`, config)
    return true
  }

  async listRoutes(hostname: string): Promise<RouteConfig[]> {
    const config = await this.getHostnameConfig(hostname)

    if (!config) {
      throw new Error(`Hostname not found: ${hostname}`)
    }

    return config.routes
  }

  async matchRoute(hostname: string, path: string, method?: string): Promise<RouteConfig | null> {
    const config = await this.matchHostnamePattern(hostname)

    if (!config) {
      return null
    }

    // Compile and sort routes
    const routesWithCompiled = config.routes.map(route => ({
      ...route,
      compiled: compilePattern(route.pattern, route.priority ?? 0)
    }))

    sortRoutesBySpecificity(routesWithCompiled)

    // Find matching route
    for (const route of routesWithCompiled) {
      if (!matchesPattern(path, route.compiled)) {
        continue
      }

      // Check method restriction
      if (route.methods && route.methods.length > 0 && method) {
        if (!route.methods.includes(method.toUpperCase())) {
          continue
        }
      }

      return {
        pattern: route.pattern,
        target: route.target,
        methods: route.methods,
        headers: route.headers,
        rewrite: route.rewrite,
        priority: route.priority
      }
    }

    return null
  }

  // ============================================================================
  // Request Forwarding
  // ============================================================================

  async forward(request: Request, target: string): Promise<Response> {
    // In a real implementation, this would forward to the target worker/service
    // For now, return a mock response indicating successful routing
    return new Response(JSON.stringify({
      routed: true,
      target,
      originalUrl: request.url,
      method: request.method
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Routed-By': 'RouterDO',
        'X-Routed-To': target
      }
    })
  }

  rewriteUrl(request: Request, route: RouteConfig): Request {
    const url = new URL(request.url)

    if (route.rewrite === false) {
      return request
    }

    // Strip the matched prefix from the path
    let newPath = url.pathname

    // Extract the prefix to strip (everything before the wildcard or param)
    const wildcardIndex = route.pattern.indexOf('*')
    const paramIndex = route.pattern.indexOf(':')

    if (wildcardIndex !== -1) {
      // For patterns like /v1/* -> strip /v1
      const prefix = route.pattern.substring(0, wildcardIndex)
      if (newPath.startsWith(prefix)) {
        newPath = newPath.substring(prefix.length) || '/'
      }
    } else if (paramIndex !== -1) {
      // For patterns with params, keep the path as-is
      // The params would be extracted separately
    }

    // Ensure path starts with /
    if (!newPath.startsWith('/')) {
      newPath = '/' + newPath
    }

    url.pathname = newPath

    // Build request options - add duplex for requests with body
    const requestInit: RequestInit & { duplex?: string } = {
      method: request.method,
      headers: request.headers,
      redirect: request.redirect
    }

    // Only include body if method supports it
    if (request.body && !['GET', 'HEAD'].includes(request.method)) {
      requestInit.body = request.body
      requestInit.duplex = 'half'
    }

    return new Request(url.toString(), requestInit)
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  async getHealth(): Promise<HealthStatus> {
    // Check cache
    if (this.healthCache && (Date.now() - this.healthCache.timestamp) < this.healthCacheTTL) {
      return this.healthCache.result
    }

    const now = new Date().toISOString()
    const uptime = Date.now() - this.startTime

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message?: string; duration?: number }> = {}

    // Check storage
    const storageStart = Date.now()
    try {
      await this.ctx.storage.get('__health_check__')
      checks['storage'] = {
        status: 'pass',
        duration: Date.now() - storageStart
      }
    } catch (error) {
      checks['storage'] = {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Storage error',
        duration: Date.now() - storageStart
      }
      overallStatus = 'unhealthy'
    }

    // Check targets
    const targetHealth = await this.listTargetHealth()
    const totalTargets = Object.keys(targetHealth).length
    const healthyTargets = Object.values(targetHealth).filter(Boolean).length

    if (totalTargets > 0) {
      if (healthyTargets === 0) {
        checks['targets'] = {
          status: 'fail',
          message: 'All targets unhealthy'
        }
        overallStatus = 'degraded'
      } else if (healthyTargets < totalTargets) {
        checks['targets'] = {
          status: 'warn',
          message: `${healthyTargets}/${totalTargets} targets healthy`
        }
        if (overallStatus === 'healthy') {
          overallStatus = 'degraded'
        }
      } else {
        checks['targets'] = {
          status: 'pass'
        }
      }
    }

    const result: HealthStatus = {
      status: overallStatus,
      timestamp: now,
      uptime,
      version: this.version,
      checks
    }

    // Cache result
    this.healthCache = {
      result,
      timestamp: Date.now()
    }

    return result
  }

  async checkTarget(target: string): Promise<boolean> {
    // Check cache
    const cached = this.targetHealthCache.get(target)
    if (cached && (Date.now() - cached.timestamp) < this.targetHealthCacheTTL) {
      return cached.healthy
    }

    // Check if target is configured
    const hostnames = await this.listHostnames()
    let targetExists = false

    for (const hostname of hostnames) {
      const config = await this.getHostnameConfig(hostname)
      if (config?.routes.some(r => r.target === target || r.target?.includes(target))) {
        targetExists = true
        break
      }
      if (config?.defaultTarget === target) {
        targetExists = true
        break
      }
    }

    // In a real implementation, we would actually probe the target
    // For now, return true if target exists, false otherwise
    const healthy = targetExists

    // Cache result
    this.targetHealthCache.set(target, {
      healthy,
      timestamp: Date.now()
    })

    return healthy
  }

  async listTargetHealth(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {}
    const hostnames = await this.listHostnames()

    const targets = new Set<string>()

    for (const hostname of hostnames) {
      const config = await this.getHostnameConfig(hostname)
      if (!config) continue

      for (const route of config.routes) {
        if (route.target) {
          // Handle comma-separated targets
          const routeTargets = route.target.split(',').map(t => t.trim())
          routeTargets.forEach(t => targets.add(t))
        }
      }

      if (config.defaultTarget) {
        const defaultTargets = config.defaultTarget.split(',').map(t => t.trim())
        defaultTargets.forEach(t => targets.add(t))
      }
    }

    for (const target of targets) {
      result[target] = await this.checkTarget(target)
    }

    return result
  }

  // ============================================================================
  // HTTP Fetch Handler
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Health check endpoints (always available)
    if (path === '/health') {
      return this.handleHealthCheck()
    }
    if (path === '/health/live') {
      return this.handleLivenessCheck()
    }
    if (path === '/health/ready') {
      return this.handleReadinessCheck()
    }
    if (path === '/health/targets') {
      return this.handleTargetsHealth()
    }
    if (path.startsWith('/health/targets/')) {
      const target = path.substring('/health/targets/'.length)
      return this.handleTargetHealth(target)
    }

    // Get hostname from request
    const hostname = request.headers.get('Host') || url.hostname

    // Find hostname configuration
    const config = await this.matchHostnamePattern(hostname)

    if (!config) {
      return Response.json({ error: 'Hostname not found', hostname }, { status: 404 })
    }

    // Check if hostname is enabled
    if (config.enabled === false) {
      return Response.json({ error: 'Service unavailable', hostname }, { status: 503 })
    }

    // Find matching route
    const route = await this.matchRoute(hostname, path, request.method)

    // Check for method not allowed scenario
    if (!route) {
      // Check if any route matches the path but not the method
      const anyMethodRoute = await this.matchRoute(hostname, path)
      if (anyMethodRoute && anyMethodRoute.methods && anyMethodRoute.methods.length > 0) {
        // Path matches but method doesn't
        return Response.json(
          { error: 'Method not allowed', allowedMethods: anyMethodRoute.methods },
          {
            status: 405,
            headers: { 'Allow': anyMethodRoute.methods.join(', ') }
          }
        )
      }

      // Try default target
      if (config.defaultTarget) {
        return this.forward(request, config.defaultTarget)
      }

      return Response.json({ error: 'No route found', path }, { status: 404 })
    }

    // Rewrite URL if needed
    const finalRequest = route.rewrite !== false
      ? this.rewriteUrl(request, route)
      : request

    // Add forwarding headers
    const forwardingHeaders = new Headers(finalRequest.headers)

    // Add X-Forwarded-* headers
    const existingForwardedFor = forwardingHeaders.get('X-Forwarded-For')
    const clientIP = request.headers.get('cf-connecting-ip') || '127.0.0.1'
    forwardingHeaders.set('X-Forwarded-For', existingForwardedFor
      ? `${existingForwardedFor}, ${clientIP}`
      : clientIP
    )
    forwardingHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
    forwardingHeaders.set('X-Forwarded-Host', hostname)

    // Add custom headers from route config
    if (route.headers) {
      for (const [key, value] of Object.entries(route.headers)) {
        forwardingHeaders.set(key, value)
      }
    }

    // Strip hop-by-hop headers
    for (const header of this.hopByHopHeaders) {
      forwardingHeaders.delete(header)
    }

    // Forward the request - build request init with proper duplex handling
    const forwardInit: RequestInit & { duplex?: string } = {
      method: finalRequest.method,
      headers: forwardingHeaders,
      redirect: finalRequest.redirect
    }

    // Only include body if method supports it
    if (finalRequest.body && !['GET', 'HEAD'].includes(finalRequest.method)) {
      forwardInit.body = finalRequest.body
      forwardInit.duplex = 'half'
    }

    return this.forward(
      new Request(finalRequest.url, forwardInit),
      route.target
    )
  }

  // ============================================================================
  // Health Check Handlers
  // ============================================================================

  private async handleHealthCheck(): Promise<Response> {
    try {
      const health = await this.getHealth()
      const status = health.status === 'healthy' ? 200 : 503
      return Response.json(health, {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return Response.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private async handleLivenessCheck(): Promise<Response> {
    // Liveness is lightweight - just confirm the DO is running
    return Response.json(
      { status: 'alive', timestamp: new Date().toISOString() },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  private async handleReadinessCheck(): Promise<Response> {
    try {
      // Check if we can access storage
      await this.ctx.storage.get('__ready_check__')
      return Response.json(
        { status: 'ready', timestamp: new Date().toISOString() },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return Response.json(
        { status: 'not ready', timestamp: new Date().toISOString() },
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private async handleTargetsHealth(): Promise<Response> {
    const targets = await this.listTargetHealth()
    return Response.json(targets, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async handleTargetHealth(target: string): Promise<Response> {
    // Check if target exists
    const healthy = await this.checkTarget(target)

    // If target doesn't exist in any route, return 404
    const hostnames = await this.listHostnames()
    let targetExists = false

    for (const hostname of hostnames) {
      const config = await this.getHostnameConfig(hostname)
      if (config?.routes.some(r => r.target === target || r.target?.includes(target))) {
        targetExists = true
        break
      }
      if (config?.defaultTarget === target) {
        targetExists = true
        break
      }
    }

    if (!targetExists) {
      return Response.json(
        { error: 'Target not found', target },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return Response.json(
      { healthy, target },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
