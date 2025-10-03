/**
 * TLD-List API integration
 * Docs: https://tld-list.com/api/v1
 * Provides price comparison across 54+ registrars
 */
import { Registrar } from 'domains.do'
import type { PriceComparison, Env } from '../types'

const TLDLIST_API_URL = 'https://tld-list.com/api/v1'

/**
 * Get price comparison for a TLD from TLD-List
 * Requires Enterprise subscription for API access
 */
export async function getTLDListPricing(tld: string, env: Env): Promise<PriceComparison | null> {
  if (!env.TLDLIST_API_KEY) {
    console.warn('TLDLIST_API_KEY not configured - price comparison unavailable')
    return null
  }

  try {
    const cleanTLD = tld.replace(/^\./, '') // Remove leading dot
    const response = await fetch(`${TLDLIST_API_URL}/tld/${cleanTLD}`, {
      headers: {
        Authorization: `Bearer ${env.TLDLIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`TLD-List API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    // Parse registrar prices
    const prices = []
    for (const registrar in data.prices) {
      const priceData = data.prices[registrar]
      prices.push({
        registrar: mapRegistrarName(registrar),
        registration: priceData.registration,
        renewal: priceData.renewal,
        transfer: priceData.transfer,
        currency: priceData.currency || 'USD',
        lastUpdated: new Date(priceData.updated),
      })
    }

    // Find cheapest prices
    const cheapest = {
      registration: prices.reduce((min, p) => (p.registration < min.registration ? p : min)).registrar,
      renewal: prices.reduce((min, p) => (p.renewal < min.renewal ? p : min)).registrar,
      transfer: prices.reduce((min, p) => (p.transfer < min.transfer ? p : min)).registrar,
    }

    return {
      tld: cleanTLD,
      prices,
      cheapest,
    }
  } catch (error) {
    console.error('TLD-List API error:', error)
    return null
  }
}

/**
 * Map TLD-List registrar names to our Registrar enum
 */
function mapRegistrarName(name: string): Registrar {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('porkbun')) return Registrar.Porkbun
  if (lowerName.includes('dynadot')) return Registrar.Dynadot
  if (lowerName.includes('netim')) return Registrar.Netim
  if (lowerName.includes('sav')) return Registrar.SAV
  if (lowerName.includes('cloudflare')) return Registrar.Cloudflare
  if (lowerName.includes('vercel')) return Registrar.Vercel
  return Registrar.Other
}

/**
 * Get best prices for AI builder preferred TLDs
 * Based on research: .dev ($6), .app ($6), .ai ($74.90), .com ($9.68)
 */
export function getAIBuilderPreferredTLDs(): string[] {
  return ['dev', 'app', 'ai', 'io', 'com', 'co', 'tech', 'digital', 'cloud', 'software', 'solutions', 'services', 'tools', 'studio', 'agency']
}

/**
 * Get recommended registrars for specific TLDs based on pricing research
 */
export function getRecommendedRegistrar(tld: string): Registrar {
  const cleanTLD = tld.replace(/^\./, '').toLowerCase()

  // Based on research from the conversation summary
  const recommendations: Record<string, Registrar> = {
    dev: Registrar.Porkbun, // $6/year
    app: Registrar.Porkbun, // $6/year
    com: Registrar.Porkbun, // $9.68/year
    ai: Registrar.Dynadot, // $74.90/year (competitive for .ai)
    io: Registrar.Dynadot,
    co: Registrar.Dynadot,
  }

  return recommendations[cleanTLD] || Registrar.Porkbun
}
