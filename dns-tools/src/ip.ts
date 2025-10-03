/**
 * IP Lookup Functions
 * Provides IP geolocation and information using Cloudflare and external APIs
 */

import type { Env, IPLookupResult } from './types'

/**
 * Get IP information using Cloudflare's request object (free, built-in)
 */
export function getIPFromRequest(request: Request): IPLookupResult {
  const start = Date.now()

  // Cloudflare adds cf object to requests
  const cf = (request as any).cf

  if (!cf) {
    return {
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      country: 'unknown',
      countryCode: 'XX',
      responseTime: Date.now() - start,
      cached: false,
      error: 'Cloudflare cf object not available',
    }
  }

  return {
    ip: cf.ip || request.headers.get('CF-Connecting-IP') || 'unknown',
    city: cf.city,
    region: cf.region,
    country: cf.country,
    countryCode: cf.colo,
    continent: cf.continent,
    latitude: cf.latitude ? parseFloat(cf.latitude) : undefined,
    longitude: cf.longitude ? parseFloat(cf.longitude) : undefined,
    timezone: cf.timezone,
    postalCode: cf.postalCode,
    asn: cf.asn ? `AS${cf.asn}` : undefined,
    asnName: cf.asOrganization,
    responseTime: Date.now() - start,
    cached: false,
  }
}

/**
 * Lookup IP information using IPinfo.io API
 * Free tier: 50,000 requests/month
 */
export async function ipLookup(ip: string, env: Env): Promise<IPLookupResult> {
  const start = Date.now()

  try {
    // If no API token, use Cloudflare's free IP info (limited)
    if (!env.IPINFO_TOKEN) {
      return {
        ip,
        country: 'unknown',
        countryCode: 'XX',
        responseTime: Date.now() - start,
        cached: false,
        error: 'IPinfo API token not configured',
      }
    }

    // Use IPinfo.io API
    const url = `https://ipinfo.io/${ip}/json?token=${env.IPINFO_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`IPinfo API failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as any

    // Parse location coordinates
    const coords = data.loc?.split(',') || []

    return {
      ip: data.ip,
      hostname: data.hostname,
      city: data.city,
      region: data.region,
      country: data.country,
      countryCode: data.country,
      latitude: coords[0] ? parseFloat(coords[0]) : undefined,
      longitude: coords[1] ? parseFloat(coords[1]) : undefined,
      timezone: data.timezone,
      postalCode: data.postal,
      org: data.org,
      asn: data.org?.split(' ')[0], // Usually "AS15169 Google LLC"
      asnName: data.org?.split(' ').slice(1).join(' '),
      responseTime: Date.now() - start,
      cached: false,
    }
  } catch (error) {
    return {
      ip,
      country: 'unknown',
      countryCode: 'XX',
      responseTime: Date.now() - start,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch IP lookup (up to 100 IPs)
 */
export async function ipLookupBatch(ips: string[], env: Env): Promise<IPLookupResult[]> {
  // IPinfo.io supports batch lookup with POST
  // For now, do parallel individual lookups
  return await Promise.all(ips.map((ip) => ipLookup(ip, env)))
}
