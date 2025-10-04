/**
 * Workers for Platforms (WFP) routing logic
 *
 * Distinguishes between internal services and user-deployed workers
 * in dispatch namespaces.
 */

import type { Env, RouteConfig } from '../types'

/**
 * Internal services (platform infrastructure)
 */
const INTERNAL_SERVICES = new Set([
  'api',
  'gateway',
  'db',
  'auth',
  'schedule',
  'webhooks',
  'email',
  'mcp',
  'queue',
  'do',
  'dispatcher',
  'deploy',
  'ai',
  'embeddings',
  'pipeline',
  'analytics',
])

/**
 * Check if a service is internal (platform) or user worker (WFP)
 */
export function isInternalService(serviceName: string): boolean {
  return INTERNAL_SERVICES.has(serviceName)
}

/**
 * Determine if request should be routed to internal service or user worker
 *
 * @param url - Request URL
 * @param env - Worker environment
 * @returns Route configuration with WFP metadata
 */
export async function determineWfpRoute(url: URL, env: Env): Promise<RouteConfig | null> {
  const { hostname, pathname } = url

  // Extract service name from subdomain or path
  const serviceName = extractServiceName(hostname, pathname)
  if (!serviceName) return null

  // Check if it's an internal service
  if (isInternalService(serviceName)) {
    // Route to internal service binding
    const binding = getInternalServiceBinding(serviceName)
    if (!binding) return null

    return {
      service: serviceName,
      binding,
      path: pathname,
      requiresAuth: getDefaultAuthRequirement(serviceName),
      requiresAdmin: false,
      metadata: {
        type: 'internal',
        serviceName,
      },
    }
  }

  // It's a user worker - route via dispatch namespace
  const namespace = determineNamespace(env, hostname)

  return {
    service: serviceName,
    binding: 'DISPATCH_NAMESPACE', // Special binding for WFP
    path: pathname,
    requiresAuth: true, // User workers require auth by default
    requiresAdmin: false,
    metadata: {
      type: 'user_worker',
      serviceName,
      namespace,
    },
  }
}

/**
 * Route request to user worker in dispatch namespace
 */
export async function routeToUserWorker(
  request: Request,
  serviceName: string,
  namespace: string,
  env: Env
): Promise<Response> {
  try {
    // Get the appropriate dispatch namespace binding
    const dispatchNamespace = getDispatchNamespace(namespace, env)
    if (!dispatchNamespace) {
      return new Response(
        JSON.stringify({
          error: 'Namespace not found',
          message: `Dispatch namespace "${namespace}" not configured`,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the user worker from the namespace
    const worker = dispatchNamespace.get(serviceName)

    // Forward request to user worker
    const response = await worker.fetch(request)
    return response
  } catch (error) {
    console.error('[WFP] User worker error:', error)

    // Check if it's a "Worker not found" error
    if (error instanceof Error && error.message.includes('Worker not found')) {
      return new Response(
        JSON.stringify({
          error: 'Service not deployed',
          message: `Worker "${serviceName}" not found in ${namespace} namespace`,
          hint: 'Deploy this worker via the Deploy API',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'User worker error',
        message: error instanceof Error ? error.message : 'Unknown error',
        service: serviceName,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Extract service name from hostname or pathname
 */
function extractServiceName(hostname: string, pathname: string): string | null {
  // Strategy 1: Subdomain (service.do)
  const subdomain = hostname.split('.')[0]
  if (subdomain && subdomain !== 'api' && subdomain !== 'www') {
    return subdomain
  }

  // Strategy 2: Path (/api/service/*)
  const pathMatch = pathname.match(/^\/api\/([^\/]+)/)
  if (pathMatch) {
    return pathMatch[1]
  }

  return null
}

/**
 * Get internal service binding name
 */
function getInternalServiceBinding(serviceName: string): string | null {
  const bindings: Record<string, string> = {
    api: 'API_SERVICE',
    gateway: 'GATEWAY_SERVICE',
    db: 'DB_SERVICE',
    auth: 'AUTH_SERVICE',
    schedule: 'SCHEDULE_SERVICE',
    webhooks: 'WEBHOOKS_SERVICE',
    email: 'EMAIL_SERVICE',
    mcp: 'MCP_SERVICE',
    queue: 'QUEUE_SERVICE',
    do: 'DO_SERVICE',
    dispatcher: 'DISPATCHER_SERVICE',
    deploy: 'DEPLOY_SERVICE',
    ai: 'AI_SERVICE',
    embeddings: 'EMBEDDINGS_SERVICE',
    pipeline: 'PIPELINE_SERVICE',
    analytics: 'ANALYTICS_SERVICE',
  }

  return bindings[serviceName] || null
}

/**
 * Get default auth requirement for internal service
 */
function getDefaultAuthRequirement(serviceName: string): boolean {
  // Public services (no auth required)
  const publicServices = new Set(['auth', 'mcp', 'webhooks'])
  return !publicServices.has(serviceName)
}

/**
 * Determine which dispatch namespace to use based on hostname
 */
function determineNamespace(env: Env, hostname: string): string {
  // Production by default
  if (hostname.endsWith('.do')) {
    return 'production'
  }

  // Staging
  if (hostname.endsWith('.staging.do')) {
    return 'staging'
  }

  // Development
  if (hostname.endsWith('.dev.do') || hostname === 'localhost') {
    return 'development'
  }

  // Default to environment variable
  return env.ENVIRONMENT || 'production'
}

/**
 * Get dispatch namespace binding
 */
function getDispatchNamespace(namespace: string, env: Env): any {
  const namespaces: Record<string, string> = {
    production: 'PRODUCTION',
    staging: 'STAGING',
    development: 'DEVELOPMENT',
  }

  const bindingName = namespaces[namespace]
  return bindingName ? env[bindingName] : null
}
