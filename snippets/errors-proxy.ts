/**
 * Errors Proxy Snippet
 *
 * Receives events from @headlessly/errors SDK and forwards to:
 * 1. Sentry (original destination)
 * 2. events.do for datalake storage
 *
 * Runs as a Cloudflare Snippet with strict constraints:
 * - < 5ms CPU
 * - < 32KB compressed
 * - No bindings
 * - Max 2 subrequests (Pro) / 5 (Enterprise)
 */

interface ErrorEvent {
  type: string
  eventId: string
  timestamp: string
  level?: string
  logger?: string
  platform?: string
  serverName?: string
  release?: string
  environment?: string
  transaction?: string
  message?: string
  exception?: {
    values: Array<{
      type: string
      value: string
      stacktrace?: {
        frames: Array<{
          filename?: string
          function?: string
          lineno?: number
          colno?: number
        }>
      }
    }>
  }
  breadcrumbs?: Array<{
    type?: string
    category?: string
    message?: string
    level?: string
    timestamp?: string
  }>
  user?: {
    id?: string
    email?: string
    username?: string
    ip_address?: string
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  contexts?: Record<string, Record<string, unknown>>
  spans?: Array<{
    traceId: string
    spanId: string
    parentSpanId?: string
    op?: string
    description?: string
    status?: string
    startTimestamp: number
    endTimestamp?: number
  }>
}

interface ErrorsPayload {
  events: ErrorEvent[]
  apiKey?: string
}

// Events.do endpoint for datalake
const EVENTS_ENDPOINT = 'https://events.do/ingest'

/**
 * Parse Sentry DSN
 */
function parseDsn(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const projectId = url.pathname.slice(1)
    const host = `${url.protocol}//${url.host}`
    return { publicKey, host, projectId }
  } catch {
    return null
  }
}

/**
 * Transform to Sentry envelope format
 */
function toSentryEnvelope(event: ErrorEvent, dsn: { publicKey: string; projectId: string }): string {
  const header = JSON.stringify({
    event_id: event.eventId,
    sent_at: new Date().toISOString(),
    dsn: dsn,
  })

  const itemHeader = JSON.stringify({
    type: event.type === 'transaction' ? 'transaction' : 'event',
    content_type: 'application/json',
  })

  const payload = JSON.stringify({
    event_id: event.eventId,
    timestamp: event.timestamp,
    platform: event.platform || 'javascript',
    level: event.level || 'error',
    logger: event.logger,
    server_name: event.serverName,
    release: event.release,
    environment: event.environment,
    transaction: event.transaction,
    message: event.message,
    exception: event.exception,
    breadcrumbs: event.breadcrumbs ? { values: event.breadcrumbs } : undefined,
    user: event.user,
    tags: event.tags,
    extra: event.extra,
    contexts: event.contexts,
    spans: event.spans,
  })

  return `${header}\n${itemHeader}\n${payload}`
}

/**
 * Transform to datalake format
 */
function toDatalakeEvent(event: ErrorEvent, request: Request): Record<string, unknown> {
  const cf = (request as unknown as { cf?: Record<string, unknown> }).cf || {}
  return {
    type: `errors.${event.type}`,
    ts: event.timestamp,
    do: {
      id: 'errors-proxy',
      name: 'errors-proxy',
      class: 'Snippet',
      colo: cf.colo || 'unknown',
    },
    eventId: event.eventId,
    level: event.level,
    platform: event.platform,
    serverName: event.serverName,
    release: event.release,
    environment: event.environment,
    transaction: event.transaction,
    message: event.message,
    exception: event.exception,
    breadcrumbs: event.breadcrumbs,
    user: event.user,
    tags: event.tags,
    extra: event.extra,
    spans: event.spans,
    geo: {
      country: cf.country,
      city: cf.city,
      continent: cf.continent,
      region: cf.region,
      timezone: cf.timezone,
      asn: cf.asn,
    },
  }
}

export async function errorsProxySnippet(request: Request): Promise<Response> {
  // Only handle POST to /e/errors
  const url = new URL(request.url)
  if (request.method !== 'POST' || !url.pathname.startsWith('/e/errors')) {
    return fetch(request)
  }

  // Parse payload
  let payload: ErrorsPayload
  try {
    payload = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!payload.events?.length) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get Sentry DSN from header or x-sentry-dsn
  const sentryDsn = request.headers.get('X-Sentry-DSN')
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || payload.apiKey

  // Parse DSN if provided
  const dsn = sentryDsn ? parseDsn(sentryDsn) : null

  // Transform events for datalake
  const datalakeEvents = payload.events.map((e) => toDatalakeEvent(e, request))

  // Forward to Sentry if DSN provided
  if (dsn) {
    for (const event of payload.events) {
      const envelope = toSentryEnvelope(event, dsn)
      fetch(`${dsn.host}/api/${dsn.projectId}/envelope/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7,sentry_client=headlessly-errors/0.1.0,sentry_key=${dsn.publicKey}`,
        },
        body: envelope,
      }).catch(() => {})
    }
  }

  // Datalake via events.do
  fetch(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ events: datalakeEvents }),
  }).catch(() => {})

  // Return success immediately
  return new Response(
    JSON.stringify({
      success: true,
      processed: payload.events.length,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sentry-DSN',
      },
    }
  )
}

// Handle CORS preflight
export async function handleOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sentry-DSN',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions()
    }
    return errorsProxySnippet(request)
  },
}
