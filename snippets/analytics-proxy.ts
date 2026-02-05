/**
 * Analytics Proxy Snippet
 *
 * Receives events from @headlessly/analytics SDK and forwards to:
 * 1. PostHog (original destination)
 * 2. events.do for datalake storage
 *
 * Runs as a Cloudflare Snippet with strict constraints:
 * - < 5ms CPU
 * - < 32KB compressed
 * - No bindings
 * - Max 2 subrequests (Pro) / 5 (Enterprise)
 */

interface AnalyticsEvent {
  type: string
  event?: string
  userId?: string
  anonymousId?: string
  sessionId?: string
  properties?: Record<string, unknown>
  traits?: Record<string, unknown>
  timestamp: string
  url?: string
  path?: string
  referrer?: string
  userAgent?: string
  featureFlag?: string
  featureFlagValue?: unknown
  webVitals?: Record<string, number>
}

interface AnalyticsPayload {
  events: AnalyticsEvent[]
  apiKey?: string
}

// PostHog host mapping
const POSTHOG_HOST = 'https://app.posthog.com'

// Events.do endpoint for datalake
const EVENTS_ENDPOINT = 'https://events.do/ingest'

/**
 * Transform our event format to PostHog format
 */
function toPostHogEvent(event: AnalyticsEvent): Record<string, unknown> {
  const base = {
    timestamp: event.timestamp,
    distinct_id: event.userId || event.anonymousId,
    $session_id: event.sessionId,
    $current_url: event.url,
    $pathname: event.path,
    $referrer: event.referrer,
    $user_agent: event.userAgent,
  }

  switch (event.type) {
    case 'page':
    case '$pageview':
      return {
        event: '$pageview',
        properties: { ...base, ...event.properties },
      }
    case 'track':
      return {
        event: event.event || 'custom_event',
        properties: { ...base, ...event.properties },
      }
    case 'identify':
      return {
        event: '$identify',
        properties: base,
        $set: event.traits,
      }
    case '$feature_flag_called':
      return {
        event: '$feature_flag_called',
        properties: {
          ...base,
          $feature_flag: event.featureFlag,
          $feature_flag_response: event.featureFlagValue,
        },
      }
    case '$web_vitals':
      return {
        event: '$web_vitals',
        properties: { ...base, ...event.webVitals },
      }
    default:
      return {
        event: event.type,
        properties: { ...base, ...event.properties },
      }
  }
}

/**
 * Transform to datalake format
 */
function toDatalakeEvent(event: AnalyticsEvent, request: Request): Record<string, unknown> {
  const cf = (request as unknown as { cf?: Record<string, unknown> }).cf || {}
  return {
    type: `analytics.${event.type}`,
    ts: event.timestamp,
    do: {
      id: 'analytics-proxy',
      name: 'analytics-proxy',
      class: 'Snippet',
      colo: cf.colo || 'unknown',
    },
    userId: event.userId,
    anonymousId: event.anonymousId,
    sessionId: event.sessionId,
    event: event.event,
    properties: event.properties,
    traits: event.traits,
    url: event.url,
    path: event.path,
    referrer: event.referrer,
    userAgent: event.userAgent,
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

export async function analyticsProxySnippet(request: Request): Promise<Response> {
  // Only handle POST to /e/analytics
  const url = new URL(request.url)
  if (request.method !== 'POST' || !url.pathname.startsWith('/e/analytics')) {
    return fetch(request)
  }

  // Parse payload
  let payload: AnalyticsPayload
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

  // Get API key from header or payload
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || payload.apiKey

  // Transform events
  const posthogEvents = payload.events.map(toPostHogEvent)
  const datalakeEvents = payload.events.map((e) => toDatalakeEvent(e, request))

  // Fire and forget both requests (within subrequest limits)
  // PostHog batch capture
  fetch(`${POSTHOG_HOST}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      batch: posthogEvents,
    }),
  }).catch(() => {})

  // Datalake via events.do
  fetch(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ events: datalakeEvents }),
  }).catch(() => {})

  // Return success immediately (don't wait for subrequests)
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions()
    }
    return analyticsProxySnippet(request)
  },
}
