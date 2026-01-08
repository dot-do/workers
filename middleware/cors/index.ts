import { createMiddleware } from 'hono/factory'
import type { Context, MiddlewareHandler } from 'hono'

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => string | null)
  allowMethods?: string[]
  allowHeaders?: string[]
  exposeHeaders?: string[]
  maxAge?: number
  credentials?: boolean
}

/**
 * CORS middleware for Hono applications
 */
export function cors(options: CorsOptions = {}): MiddlewareHandler {
  const {
    origin = '*',
    allowMethods = ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    allowHeaders = [],
    exposeHeaders = [],
    maxAge,
    credentials = false,
  } = options

  return createMiddleware(async (c, next) => {
    const requestOrigin = c.req.header('Origin')

    // Determine allowed origin
    let allowedOrigin: string | null = null

    if (typeof origin === 'function') {
      // Dynamic origin function
      if (requestOrigin) {
        allowedOrigin = origin(requestOrigin)
      }
    } else if (Array.isArray(origin)) {
      // Multiple allowed origins
      if (requestOrigin && origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin
      }
    } else if (origin === '*') {
      // Allow all origins
      allowedOrigin = '*'
    } else {
      // Single origin
      allowedOrigin = origin
    }

    // Handle preflight request
    if (c.req.method === 'OPTIONS') {
      const response = new Response(null, { status: 204 })

      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      }

      if (credentials && allowedOrigin !== '*') {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }

      if (allowMethods.length > 0) {
        response.headers.set(
          'Access-Control-Allow-Methods',
          allowMethods.join(', ')
        )
      }

      // Get requested headers from preflight
      const requestHeaders = c.req.header('Access-Control-Request-Headers')
      if (requestHeaders) {
        if (allowHeaders.length > 0) {
          response.headers.set(
            'Access-Control-Allow-Headers',
            allowHeaders.join(', ')
          )
        } else {
          // Echo back requested headers
          response.headers.set('Access-Control-Allow-Headers', requestHeaders)
        }
      }

      if (maxAge !== undefined) {
        response.headers.set('Access-Control-Max-Age', maxAge.toString())
      }

      return response
    }

    // Handle actual request
    await next()

    // Set CORS headers on response
    if (allowedOrigin) {
      c.header('Access-Control-Allow-Origin', allowedOrigin)
    }

    if (credentials && allowedOrigin !== '*') {
      c.header('Access-Control-Allow-Credentials', 'true')
    }

    if (exposeHeaders.length > 0) {
      c.header('Access-Control-Expose-Headers', exposeHeaders.join(', '))
    }
  })
}
