/**
 * Dynamic Dispatch Worker
 * Routes incoming requests to appropriate user workers in dispatch namespace
 *
 * This worker acts as a gateway/router for all requests, determining which
 * user worker (gateway, db, auth, etc.) should handle each request based on
 * hostname/path patterns.
 */

interface Env {
  // Dispatch namespace bindings
  PRODUCTION: DispatchNamespace
  STAGING: DispatchNamespace
  DEVELOPMENT: DispatchNamespace

  // Environment selector
  ENVIRONMENT: 'production' | 'staging' | 'development'
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)

      // Determine which namespace to use based on environment variable
      const namespaceKey = env.ENVIRONMENT.toUpperCase() as 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'
      const namespace = env[namespaceKey]

      if (!namespace) {
        console.error(`Namespace not found for environment: ${env.ENVIRONMENT}`)
        return new Response('Configuration error', { status: 500 })
      }

      // Route based on hostname/path
      const workerName = determineWorker(url)

      if (!workerName) {
        return new Response(
          JSON.stringify({
            error: 'Service not found',
            message: `No worker found for ${url.hostname}${url.pathname}`,
            available_services: ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue'],
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Get worker from namespace
      const worker = namespace.get(workerName)

      // Forward request to user worker
      const response = await worker.fetch(request)

      return response
    } catch (error: any) {
      // Handle "Worker not found" errors from namespace
      if (error.message?.includes('Worker not found') || error.message?.includes('does not exist')) {
        const url = new URL(request.url)
        const workerName = determineWorker(url)

        return new Response(
          JSON.stringify({
            error: 'Service not deployed',
            message: `Worker "${workerName}" not found in ${env.ENVIRONMENT} namespace`,
            hint: 'Service may not be deployed yet. Deploy via Deploy API.',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Generic error handling
      console.error('Dispatch error:', error)
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
}

/**
 * Determine which worker to route to based on URL
 *
 * Routing strategies:
 * 0. Versioned URLs: v1.gateway.do → gateway-v1, v2.db.do → db-v2
 * 1. International character domains (彡.io, 口.io, etc.)
 * 2. Subdomain-based: gateway.do → gateway worker
 * 3. Path-based: /api/db/* → db worker
 * 4. Domain-based: database.do, apis.do, etc.
 * 5. Default: api.do or do → gateway worker
 */
function determineWorker(url: URL): string | null {
  const hostname = url.hostname
  const path = url.pathname

  // List of valid worker services
  const validWorkers = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue', 'fn', 'agent', 'workflows']

  // Strategy 0: Versioned URL routing
  // Examples:
  //   - v1.gateway.do → gateway-v1
  //   - v2.db.do → db-v2
  //   - v1-alpha.gateway.do → gateway-v1-alpha
  const versionMatch = hostname.match(/^(v[\w-]+)\.([^\.]+)\./)
  if (versionMatch) {
    const [, version, service] = versionMatch
    if (validWorkers.includes(service)) {
      return `${service}-${version}`
    }
  }

  // Strategy 1: International character domain routing
  // Maps semantic character domains to services
  const internationalDomainMap: Record<string, string> = {
    '彡.io': 'db',       // Data Layer (彡 = shape/pattern/database)
    '口.io': 'db',       // Data Model - Nouns (口 = mouth/noun)
    '回.io': 'db',       // Data Model - Things (回 = rotation/thing)
    '入.io': 'fn',       // Functions (入 = enter/function)
    '巛.io': 'workflows', // Workflows (巛 = flow/river)
    '人.io': 'agent',    // Agents (人 = person/agent)
  }

  if (internationalDomainMap[hostname]) {
    return internationalDomainMap[hostname]
  }

  // Strategy 2: Standard domain routing
  // Maps standard domains to services
  const domainMap: Record<string, string> = {
    'database.do': 'db',
    'db.mw': 'db',
    'apis.do': 'gateway',  // apis.do routes through gateway
  }

  if (domainMap[hostname]) {
    return domainMap[hostname]
  }

  // Strategy 3: Subdomain-based routing
  // Examples:
  //   - gateway.do → gateway
  //   - db.do → db
  //   - auth.do → auth
  const subdomain = hostname.split('.')[0]
  if (validWorkers.includes(subdomain)) {
    return subdomain
  }

  // Strategy 4: Path-based routing
  // Examples:
  //   - /api/db/* → db
  //   - /api/auth/* → auth
  //   - /api/schedule/* → schedule
  const pathMatch = path.match(/^\/api\/([^\/]+)/)
  if (pathMatch) {
    const serviceName = pathMatch[1]
    if (validWorkers.includes(serviceName)) {
      return serviceName
    }
  }

  // Strategy 5: Default routing
  // Root domain or api subdomain defaults to gateway
  if (hostname === 'do' || hostname === 'api.do' || subdomain === 'api') {
    return 'gateway'
  }

  // No match found
  return null
}
