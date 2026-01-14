/**
 * Request Router for Workers for Platforms
 * Routes incoming requests to appropriate deployed workers
 *
 * Key optimization: O(1) lookup via DeploymentsStore
 */

import type { DeploymentsStore, DeploymentRecord } from './dispatch'

export interface Env {
  apps: DispatchNamespace
  deployments: KVNamespace
  deploymentsStore?: DeploymentsStore
}

export interface RouteMatch {
  workerId: string
  path: string
  matched: boolean
}

/**
 * Extract app ID from URL
 *
 * Supports three patterns (checked in order):
 * 1. Subdomain: {app-id}.apps.workers.do/{path}
 * 2. Path-based: apps.workers.do/{app-id}/{path}
 * 3. Thing Context: {id}.{type}.{ns}.do/{path} (e.g., platform-docs.documentation.docs.do)
 *
 * Note: Subdomain and path-based patterns are checked first to avoid conflicts
 * with the Thing Context pattern.
 *
 * @param url - Request URL
 * @returns App ID and remaining path, or null if not matched
 */
export function extractAppId(url: URL): { appId: string; path: string; context?: { ns: string; type: string; id: string } } | null {
  const hostname = url.hostname
  const pathname = url.pathname

  // Pattern 1: Subdomain routing (app-id.apps.workers.do)
  // Check this BEFORE Thing context to avoid conflicts
  const subdomainMatch = hostname.match(/^([^.]+)\.apps\.workers\.do$/)
  if (subdomainMatch) {
    return {
      appId: subdomainMatch[1],
      path: pathname
    }
  }

  // Pattern 2: Path-based routing (apps.workers.do/app-id/...)
  const pathMatch = pathname.match(/^\/([^\/]+)(.*)$/)
  if (hostname === 'apps.workers.do' && pathMatch) {
    return {
      appId: pathMatch[1],
      path: pathMatch[2] || '/'
    }
  }

  // Pattern 3: Thing context routing (id.type.ns.do)
  // Check this LAST to avoid matching platform-specific patterns
  const thingContextMatch = hostname.match(/^([^.]+)\.([^.]+)\.([^.]+)\.do$/)
  if (thingContextMatch) {
    const [, id, type, ns] = thingContextMatch
    return {
      appId: `${id}-${type}-${ns}`,
      path: pathname,
      context: { ns, type, id }
    }
  }

  return null
}

/**
 * Route request to appropriate worker
 *
 * @param request - Incoming HTTP request
 * @param env - Worker environment bindings
 * @returns Response from routed worker or error response
 */
export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  // Extract app ID from URL
  const match = extractAppId(url)
  if (!match) {
    return new Response(
      JSON.stringify({
        error: 'Invalid URL format',
        message: 'URL must match pattern: {app-id}.apps.workers.do or apps.workers.do/{app-id}',
        examples: ['my-app.apps.workers.do', 'apps.workers.do/my-app']
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const { appId, path, context } = match

  try {
    // Look up worker ID by app name or context
    const workerId = await resolveAppIdToWorkerId(appId, env, context)
    if (!workerId) {
      return new Response(
        JSON.stringify({
          error: 'App not found',
          appId,
          context,
          message: `No deployment found for app: ${appId}`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create new request with rewritten path
    const workerRequest = new Request(new URL(path, 'https://worker.internal'), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      cf: request.cf
    })

    // Add routing metadata headers
    workerRequest.headers.set('X-App-Id', appId)
    workerRequest.headers.set('X-Worker-Id', workerId)
    workerRequest.headers.set('X-Original-Host', url.hostname)
    workerRequest.headers.set('X-Original-Path', url.pathname)

    // Add Thing context headers if available
    if (context) {
      workerRequest.headers.set('X-Context-Ns', context.ns)
      workerRequest.headers.set('X-Context-Type', context.type)
      workerRequest.headers.set('X-Context-Id', context.id)
    }

    // Dispatch to worker in WfP namespace
    const response = await env.apps.get(workerId).fetch(workerRequest)

    // Add routing info headers to response
    const modifiedResponse = new Response(response.body, response)
    modifiedResponse.headers.set('X-Routed-To', workerId)
    modifiedResponse.headers.set('X-App-Id', appId)

    return modifiedResponse
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Routing error:', {
      appId,
      path,
      error: errorMessage,
      url: request.url
    })

    return new Response(
      JSON.stringify({
        error: 'Routing failed',
        appId,
        message: errorMessage
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Resolve app ID to worker ID
 *
 * Uses O(1) lookup via DeploymentsStore when available,
 * falls back to KV scan for backwards compatibility.
 *
 * @param appId - Application identifier
 * @param env - Worker environment bindings
 * @param context - Optional Thing context for context-based routing
 * @returns Worker ID or null if not found
 */
async function resolveAppIdToWorkerId(
  appId: string,
  env: Env,
  context?: { ns: string; type: string; id: string }
): Promise<string | null> {
  try {
    // Use O(1) lookup via DeploymentsStore if available
    if (env.deploymentsStore) {
      const deployment = await env.deploymentsStore.getByName(appId)
      if (deployment) {
        return deployment.workerId
      }
      // If not found by name, the app doesn't exist
      return null
    }

    // Fallback to KV-based lookup for backwards compatibility
    // If context is provided, try context-based lookup first
    if (context) {
      const { keys } = await env.deployments.list({ prefix: 'deploy:' })

      for (const key of keys) {
        const data = (await env.deployments.get(key.name, 'json')) as any
        if (
          data &&
          data.context &&
          data.context.ns === context.ns &&
          data.context.type === context.type &&
          data.context.id === context.id
        ) {
          return data.workerId
        }
      }
    }

    // Try direct lookup (if app ID is the worker ID)
    const directLookup = await env.deployments.get(`deploy:${appId}`, 'json')
    if (directLookup) {
      return appId
    }

    // Search by name (scan all deployments)
    const { keys } = await env.deployments.list({ prefix: 'deploy:' })

    for (const key of keys) {
      const data = (await env.deployments.get(key.name, 'json')) as any
      if (data && data.name === appId) {
        return data.workerId
      }
    }

    return null
  } catch (error) {
    console.error('Error resolving app ID:', error)
    return null
  }
}

/**
 * Check if request is for a static asset
 *
 * @param path - Request path
 * @returns True if request is for a static asset
 */
export function isStaticAsset(path: string): boolean {
  const staticExtensions = [
    '.html',
    '.css',
    '.js',
    '.mjs',
    '.json',
    '.xml',
    '.txt',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
    '.pdf',
    '.zip',
    '.webmanifest'
  ]

  const extension = path.split('.').pop()?.toLowerCase()
  return extension ? staticExtensions.includes(`.${extension}`) : false
}

/**
 * Generate cache headers for static assets
 *
 * @param path - Request path
 * @returns Cache control headers
 */
export function getCacheHeaders(path: string): Record<string, string> {
  // Immutable assets (with hash in filename)
  if (path.match(/\.[a-f0-9]{8,}\.(css|js|jpg|png|webp|woff2?)$/i)) {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      Vary: 'Accept-Encoding'
    }
  }

  // Regular static assets
  if (isStaticAsset(path)) {
    return {
      'Cache-Control': 'public, max-age=3600',
      Vary: 'Accept-Encoding'
    }
  }

  // Dynamic content
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    Vary: 'Accept-Encoding'
  }
}
