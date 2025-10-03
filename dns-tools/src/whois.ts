/**
 * WHOIS Lookup Functions
 * Provides WHOIS data using WhoisXML API
 */

import type { Env, WHOISLookupResult, WHOISContact } from './types'

/**
 * Perform WHOIS lookup using WhoisXML API
 */
export async function whoisLookup(domain: string, env: Env): Promise<WHOISLookupResult> {
  const start = Date.now()

  try {
    if (!env.WHOISXML_API_KEY) {
      return {
        domain,
        responseTime: Date.now() - start,
        cached: false,
        error: 'WhoisXML API key not configured',
      }
    }

    // Use WhoisXML API
    const url = new URL('https://www.whoisxmlapi.com/whoisserver/WhoisService')
    url.searchParams.set('apiKey', env.WHOISXML_API_KEY)
    url.searchParams.set('domainName', domain)
    url.searchParams.set('outputFormat', 'JSON')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`WhoisXML API failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as any

    // Parse WHOIS data
    const whoisRecord = data.WhoisRecord

    if (!whoisRecord) {
      throw new Error('No WHOIS data available')
    }

    // Parse contacts
    const registrant = parseContact(whoisRecord.registrant)
    const admin = parseContact(whoisRecord.administrativeContact)
    const tech = parseContact(whoisRecord.technicalContact)

    return {
      domain,
      registrar: whoisRecord.registrarName,
      registrant,
      admin,
      tech,
      nameservers: whoisRecord.nameServers?.hostNames || [],
      status: whoisRecord.status || [],
      createdDate: whoisRecord.createdDate,
      updatedDate: whoisRecord.updatedDate,
      expiresDate: whoisRecord.expiresDate,
      dnssec: whoisRecord.dnssec === 'signed',
      rawText: whoisRecord.rawText,
      responseTime: Date.now() - start,
      cached: false,
    }
  } catch (error) {
    return {
      domain,
      responseTime: Date.now() - start,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse WHOIS contact from API response
 */
function parseContact(contact: any): WHOISContact | undefined {
  if (!contact) {
    return undefined
  }

  return {
    name: contact.name,
    organization: contact.organization,
    email: contact.email,
    phone: contact.telephone,
    fax: contact.fax,
    address: contact.street1,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    country: contact.country,
    countryCode: contact.countryCode,
  }
}

/**
 * Batch WHOIS lookups
 */
export async function whoisLookupBatch(domains: string[], env: Env): Promise<WHOISLookupResult[]> {
  return await Promise.all(domains.map((domain) => whoisLookup(domain, env)))
}
