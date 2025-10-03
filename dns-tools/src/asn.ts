/**
 * ASN Lookup Functions
 * Provides Autonomous System Number information
 */

import type { Env, ASNLookupResult } from './types'

/**
 * Lookup ASN information using IPinfo.io or WhoisXML API
 */
export async function asnLookup(asn: string, env: Env): Promise<ASNLookupResult> {
  const start = Date.now()

  try {
    // Clean ASN input (remove "AS" prefix if present)
    const asnNumber = asn.replace(/^AS/i, '')

    // Use IPinfo.io ASN API if token available
    if (env.IPINFO_TOKEN) {
      return await asnLookupIPInfo(asnNumber, env)
    }

    // Fallback to basic info
    return {
      asn: `AS${asnNumber}`,
      name: 'Unknown',
      countryCode: 'XX',
      responseTime: Date.now() - start,
      cached: false,
      error: 'No ASN API configured',
    }
  } catch (error) {
    return {
      asn,
      name: 'Unknown',
      countryCode: 'XX',
      responseTime: Date.now() - start,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * ASN lookup using IPinfo.io
 */
async function asnLookupIPInfo(asnNumber: string, env: Env): Promise<ASNLookupResult> {
  const start = Date.now()

  const url = `https://ipinfo.io/AS${asnNumber}/json?token=${env.IPINFO_TOKEN}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`IPinfo ASN API failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as any

  return {
    asn: `AS${asnNumber}`,
    name: data.name || 'Unknown',
    description: data.description,
    countryCode: data.country || 'XX',
    registryDate: data.allocated,
    routes: data.prefixes?.map((p: any) => p.netblock) || [],
    prefixes: data.prefixes?.map((p: any) => ({
      prefix: p.netblock,
      description: p.description,
    })),
    organization: data.name,
    responseTime: Date.now() - start,
    cached: false,
  }
}

/**
 * Get ASN from IP address
 */
export async function getASNFromIP(ip: string, env: Env): Promise<string | undefined> {
  try {
    if (!env.IPINFO_TOKEN) {
      return undefined
    }

    const url = `https://ipinfo.io/${ip}/json?token=${env.IPINFO_TOKEN}`
    const response = await fetch(url)

    if (!response.ok) {
      return undefined
    }

    const data = (await response.json()) as any
    return data.org?.split(' ')[0] // Usually "AS15169 Google LLC"
  } catch {
    return undefined
  }
}
