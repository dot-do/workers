/**
 * Domain Analytics - Tracking & Metrics
 * Domain-specific analytics for search, registration, DNS, and monitoring
 */

import type { Env } from './types'
import { writeToR2Parquet } from './r2-sql'

/**
 * Domain Event Types
 */
export type DomainEventType =
  | 'domain_search'
  | 'domain_registration'
  | 'domain_renewal'
  | 'dns_lookup'
  | 'ip_lookup'
  | 'whois_lookup'
  | 'health_check'
  | 'screenshot_capture'
  | 'expiration_alert'

/**
 * Domain Analytics Event
 */
export interface DomainAnalyticsEvent {
  event_type: DomainEventType
  timestamp: string
  domain?: string
  tld?: string
  registrar?: string
  user_id?: string
  session_id?: string

  // Search metadata
  search_query?: string
  search_results_count?: number
  cheapest_price?: number
  cheapest_registrar?: string

  // Registration metadata
  registration_price?: number
  registration_years?: number
  registration_success?: boolean

  // DNS metadata
  dns_record_type?: string
  dns_response_time_ms?: number
  dns_records_count?: number

  // IP lookup metadata
  ip_address?: string
  ip_country?: string
  ip_asn?: string

  // Health check metadata
  health_status?: 'healthy' | 'degraded' | 'unhealthy'
  health_check_duration_ms?: number
  health_issues_count?: number

  // Screenshot metadata
  screenshot_success?: boolean
  screenshot_change_detected?: boolean

  // Alert metadata
  alert_severity?: 'critical' | 'warning' | 'info'
  alert_days_until_expiry?: number
  alert_sent_via?: string[]

  // Generic metadata
  metadata?: Record<string, any>
}

/**
 * Track domain event
 */
export async function trackDomainEvent(event: DomainAnalyticsEvent, env: Env): Promise<void> {
  // Add timestamp if not provided
  if (!event.timestamp) {
    event.timestamp = new Date().toISOString()
  }

  // Write to Analytics Engine for real-time queries
  await writeToAnalyticsEngine(event, env)

  // Write to R2 for long-term storage and R2 SQL
  await writeToR2(event, env)

  // Update real-time KV counters
  await updateDomainCounters(event, env)
}

/**
 * Write event to Analytics Engine
 */
async function writeToAnalyticsEngine(event: DomainAnalyticsEvent, env: Env): Promise<void> {
  const dataPoint = {
    // Dimensions (blobs)
    blobs: [
      event.event_type, // blob1: event type
      event.domain || '', // blob2: domain
      event.tld || '', // blob3: TLD
      event.registrar || '', // blob4: registrar
      event.user_id || '', // blob5: user ID
      event.session_id || '', // blob6: session ID
      event.dns_record_type || '', // blob7: DNS record type
      event.health_status || '', // blob8: health status
      event.ip_country || '', // blob9: country
      event.alert_severity || '', // blob10: alert severity
    ],

    // Metrics (doubles)
    doubles: [
      event.search_results_count || 0, // double1
      event.cheapest_price || 0, // double2
      event.registration_price || 0, // double3
      event.dns_response_time_ms || 0, // double4
      event.health_check_duration_ms || 0, // double5
      event.alert_days_until_expiry || 0, // double6
    ],

    // Index for time-series
    indexes: [event.event_type],
  }

  env.ANALYTICS.writeDataPoint(dataPoint)
}

/**
 * Write event to R2 for long-term storage
 */
async function writeToR2(event: DomainAnalyticsEvent, env: Env): Promise<void> {
  // Determine table name based on event type
  const tableMap: Record<DomainEventType, string> = {
    domain_search: 'domain_searches',
    domain_registration: 'domain_registrations',
    domain_renewal: 'domain_renewals',
    dns_lookup: 'dns_lookups',
    ip_lookup: 'ip_lookups',
    whois_lookup: 'whois_lookups',
    health_check: 'domain_health_checks',
    screenshot_capture: 'domain_screenshots',
    expiration_alert: 'domain_alerts',
  }

  const tableName = tableMap[event.event_type]

  // Write to R2 (batched in real implementation)
  await writeToR2Parquet(tableName, [event], env)
}

/**
 * Update real-time KV counters
 */
async function updateDomainCounters(event: DomainAnalyticsEvent, env: Env): Promise<void> {
  const counters: Record<string, number> = {}

  // Event type counter
  counters[`count:${event.event_type}:total`] = 1

  // TLD counter
  if (event.tld) {
    counters[`count:tld:${event.tld}`] = 1
  }

  // Registrar counter
  if (event.registrar) {
    counters[`count:registrar:${event.registrar}`] = 1
  }

  // Health status counter
  if (event.health_status) {
    counters[`count:health:${event.health_status}`] = 1
  }

  // Update all counters
  for (const [key, increment] of Object.entries(counters)) {
    const current = (await env.ANALYTICS_KV.get(key)) || '0'
    const newValue = parseInt(current) + increment
    await env.ANALYTICS_KV.put(key, String(newValue), { expirationTtl: 86400 }) // 24 hour TTL
  }
}

/**
 * Get domain analytics summary
 */
export async function getDomainAnalyticsSummary(
  timeRange: '1h' | '24h' | '7d' | '30d',
  env: Env
): Promise<{
  searches: number
  registrations: number
  dnsLookups: number
  healthChecks: number
  alerts: number
  topTLDs: Array<{ tld: string; count: number }>
  topRegistrars: Array<{ registrar: string; count: number }>
}> {
  // Get counters from KV
  const searches = parseInt((await env.ANALYTICS_KV.get('count:domain_search:total')) || '0')
  const registrations = parseInt((await env.ANALYTICS_KV.get('count:domain_registration:total')) || '0')
  const dnsLookups = parseInt((await env.ANALYTICS_KV.get('count:dns_lookup:total')) || '0')
  const healthChecks = parseInt((await env.ANALYTICS_KV.get('count:health_check:total')) || '0')
  const alerts = parseInt((await env.ANALYTICS_KV.get('count:expiration_alert:total')) || '0')

  // Get top TLDs (would query Analytics Engine in production)
  const topTLDs = [
    { tld: 'com', count: 1234 },
    { tld: 'dev', count: 567 },
    { tld: 'app', count: 234 },
  ]

  // Get top registrars
  const topRegistrars = [
    { registrar: 'porkbun', count: 890 },
    { registrar: 'dynadot', count: 456 },
    { registrar: 'netim', count: 123 },
  ]

  return {
    searches,
    registrations,
    dnsLookups,
    healthChecks,
    alerts,
    topTLDs,
    topRegistrars,
  }
}
