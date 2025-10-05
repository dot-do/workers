/**
 * Admin CLI Protocol Handler
 *
 * Handles RESTful admin commands via /$/* endpoints
 * Examples:
 *   /$.db.query → service: db, method: query
 *   /$/db/query → service: db, method: query
 *   /$.ai.models.list → service: ai, method: models.list
 */

import type { Context } from 'hono'
import type { AdminConfig, ServiceRoutesConfig } from './types'

/**
 * Parse admin CLI path
 *
 * Supports two formats:
 * - Dot notation: /$.service.method → { service: 'service', method: 'method' }
 * - Slash notation: $/service/method → { service: 'service', method: 'method' }
 *
 * @param path - The request path (e.g., '/$.db.query' or '$/db/query')
 * @returns Parsed service and method, or null if invalid
 */
export function parseAdminPath(path: string): { service: string; method: string } | null {
  // Remove leading slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  // Must start with $
  if (!cleanPath.startsWith('$')) {
    return null
  }

  // Remove $ prefix
  const withoutDollar = cleanPath.slice(1)

  // Handle both dot and slash notation
  if (withoutDollar.startsWith('.')) {
    // Dot notation: $.db.query → db.query
    const parts = withoutDollar.slice(1).split('.')
    if (parts.length < 2) return null

    const service = parts[0]
    const method = parts.slice(1).join('.')

    return { service, method }
  } else if (withoutDollar.startsWith('/')) {
    // Slash notation: $/db/query → db/query
    const parts = withoutDollar.slice(1).split('/')
    if (parts.length < 2) return null

    const service = parts[0]
    const method = parts.slice(1).join('.')

    return { service, method }
  }

  return null
}

/**
 * Handle admin CLI request
 *
 * Authenticates user, parses path, looks up service binding, and executes method
 */
export async function handleAdminRequest(
  config: AdminConfig,
  serviceRoutes: ServiceRoutesConfig | undefined,
  c: Context
): Promise<Response> {
  try {
    // Check if admin is enabled
    if (!config.enabled) {
      return c.json(
        {
          error: 'Admin CLI is disabled',
          message: 'Contact administrator to enable admin CLI',
        },
        403
      )
    }

    // Check authentication if required
    if (config.requireAuth !== false) {
      const authHeader = c.req.header('Authorization')

      if (!authHeader) {
        return c.json(
          {
            error: 'Unauthorized',
            message: 'Authorization header required for admin CLI',
          },
          401
        )
      }

      // TODO: Validate auth token via AUTH_SERVICE
      // For now, just check that header exists
    }

    // Parse admin path
    const parsed = parseAdminPath(c.req.path)

    if (!parsed) {
      return c.json(
        {
          error: 'Invalid admin CLI path',
          message: 'Expected format: /$.service.method or $/service/method',
          examples: ['/$.db.query', '/$/db/query', '/$.ai.models.list'],
        },
        400
      )
    }

    const { service, method } = parsed

    // Check if service is allowed
    if (config.allowedServices && !config.allowedServices.includes(service)) {
      return c.json(
        {
          error: 'Service not allowed',
          message: `Service '${service}' is not in the allowed list`,
          allowedServices: config.allowedServices,
        },
        403
      )
    }

    // Look up service binding
    if (!serviceRoutes || !serviceRoutes[service]) {
      return c.json(
        {
          error: 'Service not found',
          message: `No service binding found for '${service}'`,
          availableServices: serviceRoutes ? Object.keys(serviceRoutes) : [],
        },
        404
      )
    }

    const bindingName = serviceRoutes[service]
    const serviceBinding = (c.env as any)[bindingName]

    if (!serviceBinding) {
      return c.json(
        {
          error: 'Service binding not found',
          message: `Environment binding '${bindingName}' not found`,
        },
        500
      )
    }

    // Parse request body for method params
    let params: any = {}

    if (c.req.method === 'POST' || c.req.method === 'PUT') {
      try {
        params = await c.req.json()
      } catch (error) {
        return c.json(
          {
            error: 'Invalid JSON body',
            message: 'Request body must be valid JSON',
          },
          400
        )
      }
    } else if (c.req.method === 'GET') {
      // Use query params as method params
      params = Object.fromEntries(new URL(c.req.url).searchParams.entries())
    }

    // Execute RPC method
    const serviceMethod = serviceBinding[method]

    if (!serviceMethod || typeof serviceMethod !== 'function') {
      return c.json(
        {
          error: 'Method not found',
          message: `Service '${service}' does not have method '${method}'`,
        },
        404
      )
    }

    // Call the method with params
    const result = await serviceMethod.call(serviceBinding, params)

    return c.json({
      success: true,
      service,
      method,
      result,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('Admin CLI error:', error)
    return c.json(
      {
        error: 'Admin CLI execution failed',
        message: error.message,
        stack: error.stack,
      },
      500
    )
  }
}
