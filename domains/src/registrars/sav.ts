/**
 * SAV (Start A Venture) API integration
 * Docs: https://docs.sav.com/
 */
import { Registrar } from 'domains.do'
import type { RegistrarSearchResult, Env } from '../types'

const SAV_API_URL = 'https://api.sav.com/v1'

export async function searchSAV(domain: string, env: Env): Promise<RegistrarSearchResult> {
  const start = Date.now()

  if (!env.SAV_API_KEY) {
    return {
      registrar: Registrar.SAV,
      domain,
      available: false,
      error: 'SAV_API_KEY not configured',
      responseTime: Date.now() - start,
    }
  }

  try {
    // SAV domain availability check
    const response = await fetch(`${SAV_API_URL}/domains/${domain}/availability`, {
      headers: {
        Authorization: `Bearer ${env.SAV_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`SAV API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    return {
      registrar: Registrar.SAV,
      domain,
      available: data.available === true,
      price: data.price?.registration,
      premium: data.premium === true,
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      registrar: Registrar.SAV,
      domain,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    }
  }
}
