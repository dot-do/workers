/**
 * DNS Lookup Functions
 * Provides DNS resolution using Cloudflare Workers DNS API
 */

import type { DNSLookupResult, DNSRecordType, DNSRecord } from './types'

/**
 * Perform DNS lookup using Cloudflare's DNS-over-HTTPS API
 */
export async function dnsLookup(domain: string, recordType: DNSRecordType = 'A'): Promise<DNSLookupResult> {
  const start = Date.now()

  try {
    // Use Cloudflare's DNS-over-HTTPS API (1.1.1.1)
    const url = new URL('https://cloudflare-dns.com/dns-query')
    url.searchParams.set('name', domain)
    url.searchParams.set('type', recordType)

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/dns-json',
      },
    })

    if (!response.ok) {
      throw new Error(`DNS query failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as any

    // Check for errors
    if (data.Status !== 0) {
      const errorCodes: Record<number, string> = {
        1: 'Format error',
        2: 'Server failure',
        3: 'Name error (NXDOMAIN)',
        4: 'Not implemented',
        5: 'Refused',
      }
      throw new Error(errorCodes[data.Status] || `DNS error: ${data.Status}`)
    }

    // Parse DNS records
    const records: DNSRecord[] = (data.Answer || []).map((answer: any) => {
      const record: DNSRecord = {
        type: recordType,
        value: answer.data,
        ttl: answer.TTL,
      }

      // Parse MX records (priority)
      if (recordType === 'MX' && typeof answer.data === 'string') {
        const parts = answer.data.split(' ')
        if (parts.length === 2) {
          record.priority = parseInt(parts[0], 10)
          record.value = parts[1]
        }
      }

      // Parse SRV records
      if (recordType === 'SRV' && typeof answer.data === 'string') {
        const parts = answer.data.split(' ')
        if (parts.length === 4) {
          record.priority = parseInt(parts[0], 10)
          record.weight = parseInt(parts[1], 10)
          record.port = parseInt(parts[2], 10)
          record.target = parts[3]
          record.value = parts[3]
        }
      }

      return record
    })

    return {
      domain,
      recordType,
      records,
      responseTime: Date.now() - start,
      cached: false,
    }
  } catch (error) {
    return {
      domain,
      recordType,
      records: [],
      responseTime: Date.now() - start,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Perform multiple DNS lookups for a domain (A, AAAA, MX, NS, TXT)
 */
export async function dnsLookupAll(domain: string): Promise<Record<DNSRecordType, DNSLookupResult>> {
  const recordTypes: DNSRecordType[] = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA']

  const results = await Promise.all(recordTypes.map((type) => dnsLookup(domain, type)))

  const resultMap: Record<string, DNSLookupResult> = {}
  recordTypes.forEach((type, index) => {
    resultMap[type] = results[index]
  })

  return resultMap as Record<DNSRecordType, DNSLookupResult>
}
