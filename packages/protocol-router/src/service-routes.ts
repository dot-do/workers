/**
 * Direct Service Routes Handler
 *
 * Handles direct service routing via /service.method or /service/method
 * Examples:
 *   /db.query → service: db, method: query
 *   /db/query → service: db, method: query
 *   /ai.models.list → service: ai, method: models.list
 *   /ai/models/list → service: ai, method: models.list
 */

import type { Context } from 'hono'
import type { ServiceRoutesConfig } from './types'

/**
 * Parse service route path
 *
 * Supports two formats:
 * - Dot notation: /service.method → { service: 'service', method: 'method' }
 * - Slash notation: /service/method → { service: 'service', method: 'method' }
 *
 * @param path - The request path (e.g., '/db.query' or '/db/query')
 * @param serviceNames - List of known service names to match against
 * @returns Parsed service and method, or null if invalid
 */
export function parseServicePath(path: string, serviceNames: string[]): { service: string; method: string } | null {
  // Remove leading slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  if (!cleanPath) {
    return null
  }

  // Try to match against known service names
  for (const serviceName of serviceNames) {
    // Check dot notation: db.query
    if (cleanPath.startsWith(serviceName + '.')) {
      const method = cleanPath.slice(serviceName.length + 1)
      if (method) {
        return { service: serviceName, method }
      }
    }

    // Check slash notation: db/query
    if (cleanPath.startsWith(serviceName + '/')) {
      const methodPath = cleanPath.slice(serviceName.length + 1)
      if (methodPath) {
        // Convert slashes to dots for nested methods: db/models/list → models.list
        const method = methodPath.replace(/\//g, '.')
        return { service: serviceName, method }
      }
    }
  }

  return null
}

/**
 * Handle direct service routing request
 *
 * Parses path, looks up service binding, and executes method via RPC
 */
export async function handleServiceRoute(serviceRoutes: ServiceRoutesConfig, c: Context): Promise<Response> {
  try {
    const serviceNames = Object.keys(serviceRoutes)

    // Parse service route path
    const parsed = parseServicePath(c.req.path, serviceNames)

    if (!parsed) {
      return c.json(
        {
          error: 'Invalid service route',
          message: 'Expected format: /service.method or /service/method',
          availableServices: serviceNames,
          examples: [`/${serviceNames[0]}.query`, `/${serviceNames[0]}/query`],
        },
        400
      )
    }

    const { service, method } = parsed

    // Look up service binding
    const bindingName = serviceRoutes[service]
    const serviceBinding = (c.env as any)[bindingName]

    if (!serviceBinding) {
      return c.json(
        {
          error: 'Service binding not found',
          message: `Environment binding '${bindingName}' not found for service '${service}'`,
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
    console.error('Service route error:', error)
    return c.json(
      {
        error: 'Service route execution failed',
        message: error.message,
        stack: error.stack,
      },
      500
    )
  }
}
