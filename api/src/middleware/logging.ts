/**
 * Request/response logging middleware
 */

import type { ApiContext } from '../types'
import { getClientIp, getUserAgent } from '../utils'

/**
 * Log incoming request
 */
export function logRequest(request: Request, ctx: ApiContext): void {
  const url = new URL(request.url)
  const ip = getClientIp(request)
  const userAgent = getUserAgent(request)

  console.log(
    JSON.stringify({
      type: 'request',
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      hostname: url.hostname,
      ip,
      userAgent,
      userId: ctx.auth?.userId,
    })
  )
}

/**
 * Log outgoing response
 */
export function logResponse(request: Request, response: Response, ctx: ApiContext): void {
  const duration = Date.now() - ctx.startTime
  const url = new URL(request.url)

  console.log(
    JSON.stringify({
      type: 'response',
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      status: response.status,
      duration,
      userId: ctx.auth?.userId,
    })
  )

  // Log to analytics queue (async, don't await)
  ctx.executionCtx.waitUntil(
    logToAnalytics({
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      hostname: url.hostname,
      status: response.status,
      duration,
      userId: ctx.auth?.userId,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    }, ctx)
  )
}

/**
 * Add metrics headers to response
 */
export function addMetrics(response: Response, ctx: ApiContext): Response {
  const duration = Date.now() - ctx.startTime

  const newResponse = new Response(response.body, response)
  newResponse.headers.set('X-Request-Id', ctx.requestId)
  newResponse.headers.set('X-Response-Time', `${duration}ms`)

  if (ctx.rateLimitInfo) {
    newResponse.headers.set('X-RateLimit-Limit', ctx.rateLimitInfo.limit.toString())
    newResponse.headers.set('X-RateLimit-Remaining', ctx.rateLimitInfo.remaining.toString())
    newResponse.headers.set('X-RateLimit-Reset', new Date(ctx.rateLimitInfo.reset).toISOString())
  }

  return newResponse
}

/**
 * Log request/response data to analytics service
 */
async function logToAnalytics(data: any, ctx: ApiContext): Promise<void> {
  try {
    // Send to analytics queue for async processing
    // This will be processed by the analytics worker
    await ctx.env.QUEUE_SERVICE.send('analytics', data)
  } catch (error) {
    console.error('[Logging] Failed to log to analytics:', error)
  }
}
