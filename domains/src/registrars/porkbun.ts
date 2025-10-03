/**
 * Porkbun API integration
 * Docs: https://porkbun.com/api/json/v3/documentation
 */
import { Registrar } from 'domains.do'
import type { RegistrarSearchResult, Env } from '../types'

const PORKBUN_API_URL = 'https://porkbun.com/api/json/v3'

export async function searchPorkbun(domain: string, env: Env): Promise<RegistrarSearchResult> {
  const start = Date.now()

  try {
    // Porkbun pricing endpoint (no auth required)
    const pricingUrl = 'https://porkbun.com/api/json/v3/pricing/get'
    const response = await fetch(pricingUrl)

    if (!response.ok) {
      throw new Error(`Porkbun API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    // Extract TLD from domain (e.g., example.com → com)
    const tld = domain.split('.').pop()?.toLowerCase()

    if (!tld || !data.pricing?.[tld]) {
      return {
        registrar: Registrar.Porkbun,
        domain,
        available: false,
        error: `TLD .${tld} not supported by Porkbun`,
        responseTime: Date.now() - start,
      }
    }

    const pricing = data.pricing[tld]

    // Check availability if API keys are configured
    let available = true
    if (env.PORKBUN_API_KEY && env.PORKBUN_SECRET_KEY) {
      const availResponse = await fetch(`${PORKBUN_API_URL}/domain/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: env.PORKBUN_API_KEY,
          secretapikey: env.PORKBUN_SECRET_KEY,
          domain,
        }),
      })

      if (availResponse.ok) {
        const availData = (await availResponse.json()) as any
        available = availData.status === 'SUCCESS' && availData.available === true
      }
    }

    return {
      registrar: Registrar.Porkbun,
      domain,
      available,
      price: pricing.registration || pricing.renewal,
      premium: pricing.special === true,
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      registrar: Registrar.Porkbun,
      domain,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Get pricing for a specific TLD from Porkbun
 */
export async function getPorkbunPricing(tld: string): Promise<any> {
  const response = await fetch('https://porkbun.com/api/json/v3/pricing/get')
  const data = (await response.json()) as any
  return data.pricing?.[tld.replace('.', '')]
}
