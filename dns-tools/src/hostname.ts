/**
 * Hostname/Reverse DNS Lookup Functions
 * Provides reverse DNS (PTR) lookups
 */

import type { HostnameLookupResult } from './types'
import { dnsLookup } from './dns'

/**
 * Perform reverse DNS lookup (PTR record)
 */
export async function hostnameLookup(ip: string): Promise<HostnameLookupResult> {
  const start = Date.now()

  try {
    // Convert IP to reverse DNS format
    const reverseDomain = ipToReverseDomain(ip)

    if (!reverseDomain) {
      throw new Error('Invalid IP address format')
    }

    // Query PTR record
    const result = await dnsLookup(reverseDomain, 'PTR')

    if (result.error) {
      throw new Error(result.error)
    }

    const hostnames = result.records.map((r) => r.value)

    return {
      ip,
      hostnames,
      primary: hostnames[0],
      responseTime: Date.now() - start,
      cached: false,
    }
  } catch (error) {
    return {
      ip,
      hostnames: [],
      responseTime: Date.now() - start,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Convert IP address to reverse DNS domain
 * IPv4: 1.2.3.4 -> 4.3.2.1.in-addr.arpa
 * IPv6: 2001:db8::1 -> 1.0.0.0...8.b.d.0.1.0.0.2.ip6.arpa
 */
function ipToReverseDomain(ip: string): string | null {
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length !== 4) {
      return null
    }
    return parts.reverse().join('.') + '.in-addr.arpa'
  }

  // IPv6
  if (ip.includes(':')) {
    // Expand IPv6 address to full form
    const fullIP = expandIPv6(ip)
    if (!fullIP) {
      return null
    }

    // Remove colons and reverse
    const chars = fullIP.replace(/:/g, '').split('').reverse()
    return chars.join('.') + '.ip6.arpa'
  }

  return null
}

/**
 * Expand IPv6 address to full form (all 8 groups of 4 hex digits)
 */
function expandIPv6(ip: string): string | null {
  try {
    // Handle :: expansion
    if (ip.includes('::')) {
      const parts = ip.split('::')
      const leftParts = parts[0] ? parts[0].split(':') : []
      const rightParts = parts[1] ? parts[1].split(':') : []
      const zerosCount = 8 - leftParts.length - rightParts.length

      const expanded = [...leftParts, ...Array(zerosCount).fill('0000'), ...rightParts]

      return expanded.map((part) => part.padStart(4, '0')).join(':')
    }

    // Already fully expanded, just pad each part
    const parts = ip.split(':')
    if (parts.length !== 8) {
      return null
    }

    return parts.map((part) => part.padStart(4, '0')).join(':')
  } catch {
    return null
  }
}

/**
 * Batch hostname lookups
 */
export async function hostnameLookupBatch(ips: string[]): Promise<HostnameLookupResult[]> {
  return await Promise.all(ips.map((ip) => hostnameLookup(ip)))
}
