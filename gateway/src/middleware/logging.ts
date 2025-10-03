/**
 * Logging Middleware
 *
 * Provides:
 * - Request/response logging with structured format
 * - Request ID generation and tracking
 * - Performance metrics (latency, size)
 * - Error logging with stack traces
 */

import type { GatewayContext } from '../types'

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    'unknown'
  )
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
  ]

  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Log request start
 */
export function logRequest(request: Request, ctx: GatewayContext): void {
  const url = new URL(request.url)

  const log = {
    level: 'info',
    type: 'request',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('User-Agent') || undefined,
    ip: getClientIp(request),
    userId: ctx.auth?.userId,
    organizationId: ctx.auth?.organizationId,
  }

  console.log(JSON.stringify(log))
}

/**
 * Log response completion
 */
export function logResponse(
  request: Request,
  response: Response,
  ctx: GatewayContext,
  error?: Error
): void {
  const url = new URL(request.url)
  const duration = Date.now() - ctx.startTime

  const log = {
    level: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
    type: 'response',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration: `${duration}ms`,
    userId: ctx.auth?.userId,
    ...(error && {
      error: error.message,
      stack: error.stack,
    }),
  }

  console.log(JSON.stringify(log))
}

/**
 * Log error
 */
export function logError(error: Error, ctx: GatewayContext): void {
  const log = {
    level: 'error',
    type: 'error',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    userId: ctx.auth?.userId,
  }

  console.error(JSON.stringify(log))
}

/**
 * Add request/response size headers
 */
export function addMetricsHeaders(response: Response, ctx: GatewayContext): Response {
  const duration = Date.now() - ctx.startTime

  const headers = new Headers(response.headers)
  headers.set('X-Request-ID', ctx.requestId)
  headers.set('X-Response-Time', `${duration}ms`)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
