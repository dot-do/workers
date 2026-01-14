/**
 * Analytics Middleware
 * Captures request events and sends to Cloudflare Pipeline
 */

// Pipeline type for Cloudflare Pipelines
interface Pipeline {
  send(event: unknown): Promise<void>
}

export interface Env {
  analytics?: AnalyticsEngineDataset | Pipeline
}

export interface RequestEvent {
  timestamp: string
  worker_id: string
  app_id?: string
  method: string
  path: string
  status: number
  duration_ms: number
  user_agent?: string
  country?: string
  colo?: string
  request_id: string
}

/**
 * Generate unique request ID
 *
 * @returns Unique identifier for request
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Capture request analytics event
 *
 * @param request - HTTP request
 * @param response - HTTP response
 * @param workerId - Worker identifier
 * @param duration - Request duration in milliseconds
 * @param env - Worker environment bindings
 * @param ctx - Execution context for waitUntil
 */
export function captureRequestEvent(
  request: Request,
  response: Response,
  workerId: string,
  duration: number,
  env: Env,
  ctx: ExecutionContext
): void {
  // Use waitUntil to send analytics asynchronously (non-blocking)
  ctx.waitUntil(sendAnalyticsEvent(request, response, workerId, duration, env))
}

/**
 * Send analytics event to pipeline
 *
 * @param request - HTTP request
 * @param response - HTTP response
 * @param workerId - Worker identifier
 * @param duration - Request duration in milliseconds
 * @param env - Worker environment bindings
 */
async function sendAnalyticsEvent(
  request: Request,
  response: Response,
  workerId: string,
  duration: number,
  env: Env
): Promise<void> {
  if (!env.analytics) return

  try {
    const url = new URL(request.url)
    const cf = request.cf as IncomingRequestCfProperties | undefined

    // Build event object
    const event: RequestEvent = {
      timestamp: new Date().toISOString(),
      worker_id: workerId,
      app_id: request.headers.get('X-App-Id') || undefined,
      method: request.method,
      path: url.pathname,
      status: response.status,
      duration_ms: duration,
      user_agent: request.headers.get('User-Agent') || undefined,
      country: cf?.country || undefined,
      colo: cf?.colo || undefined,
      request_id: generateRequestId()
    }

    // Check if ANALYTICS is a Pipeline or Analytics Engine
    if ('send' in env.analytics) {
      // Cloudflare Pipeline
      await env.analytics.send(event as unknown)
    } else {
      // Analytics Engine (fallback)
      env.analytics.writeDataPoint({
        indexes: [workerId],
        blobs: [url.pathname, request.method, event.request_id],
        doubles: [response.status, duration]
      })
    }
  } catch (error) {
    // Log error but don't throw (analytics failures shouldn't break requests)
    console.error('Analytics error:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Analytics middleware wrapper
 *
 * Wraps a handler function to automatically capture analytics
 *
 * @param handler - Request handler function
 * @returns Wrapped handler with analytics
 */
export function withAnalytics(
  handler: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
): (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> {
  return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const startTime = Date.now()

    try {
      // Call original handler
      const response = await handler(request, env, ctx)
      const duration = Date.now() - startTime

      // Extract worker ID from response headers or use default
      const workerId = response.headers.get('X-Routed-To') || 'workers-proxy'

      // Capture analytics
      captureRequestEvent(request, response, workerId, duration, env, ctx)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Capture error event
      const errorResponse = new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
      captureRequestEvent(request, errorResponse, 'workers-proxy', duration, env, ctx)

      throw error
    }
  }
}

/**
 * Batch analytics events for efficiency
 *
 * Collects events and sends in batches to reduce overhead
 */
export class AnalyticsBatcher {
  private events: RequestEvent[] = []
  private batchSize: number
  private flushInterval: number
  private lastFlush: number
  private env: Env
  private ctx: ExecutionContext

  constructor(env: Env, ctx: ExecutionContext, batchSize = 100, flushInterval = 5000) {
    this.env = env
    this.ctx = ctx
    this.batchSize = batchSize
    this.flushInterval = flushInterval
    this.lastFlush = Date.now()
  }

  /**
   * Add event to batch
   *
   * @param event - Request event
   */
  add(event: RequestEvent): void {
    this.events.push(event)

    // Auto-flush if batch size reached or interval exceeded
    if (this.events.length >= this.batchSize || Date.now() - this.lastFlush >= this.flushInterval) {
      this.flush()
    }
  }

  /**
   * Flush all pending events
   */
  flush(): void {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []
    this.lastFlush = Date.now()

    // Send batch asynchronously
    this.ctx.waitUntil(this.sendBatch(eventsToSend))
  }

  /**
   * Send batch of events
   *
   * @param events - Array of request events
   */
  private async sendBatch(events: RequestEvent[]): Promise<void> {
    if (!this.env.analytics) return

    try {
      if ('send' in this.env.analytics) {
        // Pipeline supports batch sends
        for (const event of events) {
          await this.env.analytics.send(event as unknown)
        }
      } else {
        // Analytics Engine - send individually
        for (const event of events) {
          this.env.analytics.writeDataPoint({
            indexes: [event.worker_id],
            blobs: [event.path, event.method, event.request_id],
            doubles: [event.status, event.duration_ms]
          })
        }
      }
    } catch (error) {
      console.error('Batch analytics error:', error instanceof Error ? error.message : String(error))
    }
  }
}
