/**
 * Netim Reseller API integration
 * Docs: https://support.netim.com/en/wiki/Category:API
 */
import { Registrar } from 'domains.do'
import type { RegistrarSearchResult, Env } from '../types'

const NETIM_API_URL = 'https://oteapi.netim.com/2.0' // OTE = testing, use prod URL in production

export async function searchNetim(domain: string, env: Env): Promise<RegistrarSearchResult> {
  const start = Date.now()

  if (!env.NETIM_API_KEY) {
    return {
      registrar: Registrar.Netim,
      domain,
      available: false,
      error: 'NETIM_API_KEY not configured',
      responseTime: Date.now() - start,
    }
  }

  try {
    // Netim domainCheck API
    const response = await fetch(`${NETIM_API_URL}/domain/${domain}/check/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.NETIM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Netim API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    // Get pricing info
    const pricingResponse = await fetch(`${NETIM_API_URL}/domain/${domain}/price/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.NETIM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    let price: number | undefined
    if (pricingResponse.ok) {
      const pricingData = (await pricingResponse.json()) as any
      price = pricingData.registration?.price
    }

    return {
      registrar: Registrar.Netim,
      domain,
      available: data.available === true,
      price,
      premium: data.premium === true,
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      registrar: Registrar.Netim,
      domain,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Get TLD pricing from Netim
 */
export async function getNetimPricing(tld: string, env: Env): Promise<any> {
  if (!env.NETIM_API_KEY) {
    throw new Error('NETIM_API_KEY not configured')
  }

  const response = await fetch(`${NETIM_API_URL}/catalog/${tld}/`, {
    headers: {
      Authorization: `Bearer ${env.NETIM_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Netim API error: ${response.status}`)
  }

  return await response.json()
}
