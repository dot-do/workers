/**
 * Events Protocol Handler
 *
 * Handles analytics event capture via /e endpoint
 * Supports both GET (1x1 pixel tracking) and POST (bulk events)
 */

import type { Context } from 'hono'
import type { AnalyticsEvent, EventHandler } from './types'

/**
 * Handle event capture request
 *
 * GET  /e?event=pageview&url=...  → 1x1 tracking pixel
 * POST /e with JSON body          → Bulk event capture
 */
export async function handleEventRequest(
  handler: EventHandler | { handler: EventHandler; analyticsService?: string },
  c: Context
): Promise<Response> {
  try {
    const method = c.req.method

    if (method === 'GET') {
      // Pixel tracking - parse query params
      const event: AnalyticsEvent = {
        name: c.req.query('event') || c.req.query('e') || 'pageview',
        properties: {},
        timestamp: Date.now(),
      }

      // Extract all query params as properties
      const url = new URL(c.req.url)
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'event' && key !== 'e') {
          event.properties![key] = value
        }
      }

      // Extract user/session from headers or cookies
      event.userId = c.req.header('X-User-ID') || c.req.query('user_id') || c.req.query('uid')
      event.sessionId = c.req.header('X-Session-ID') || c.req.query('session_id') || c.req.query('sid')

      // Call handler
      const actualHandler = typeof handler === 'function' ? handler : handler.handler
      await actualHandler(event, c)

      // Return 1x1 transparent GIF
      return new Response(
        Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64'
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    } else if (method === 'POST') {
      // Bulk event capture - parse JSON body
      const body = await c.req.json().catch(() => null)

      if (!body) {
        return c.json({ error: 'Invalid JSON body' }, 400)
      }

      // Support both single event and array of events
      const events: AnalyticsEvent[] = Array.isArray(body) ? body : [body]

      // Validate and normalize events
      for (const event of events) {
        if (!event.name) {
          return c.json({ error: 'Event name is required' }, 400)
        }

        // Add defaults
        event.timestamp = event.timestamp || Date.now()
        event.properties = event.properties || {}

        // Extract user/session from headers if not in event
        event.userId = event.userId || c.req.header('X-User-ID')
        event.sessionId = event.sessionId || c.req.header('X-Session-ID')
      }

      // Call handler for each event
      const actualHandler = typeof handler === 'function' ? handler : handler.handler
      await Promise.all(events.map((event) => actualHandler(event, c)))

      return c.json({
        success: true,
        count: events.length,
        timestamp: Date.now(),
      })
    } else {
      return c.json({ error: 'Method not allowed. Use GET or POST' }, 405)
    }
  } catch (error: any) {
    console.error('Event capture error:', error)
    return c.json(
      {
        error: 'Event capture failed',
        message: error.message,
      },
      500
    )
  }
}
