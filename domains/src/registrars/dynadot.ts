/**
 * Dynadot Reseller API integration
 * Docs: https://www.dynadot.com/domain/api3.html
 */
import { Registrar } from 'domains.do'
import type { RegistrarSearchResult, Env } from '../types'

const DYNADOT_API_URL = 'https://api.dynadot.com/api3.json'

export async function searchDynadot(domain: string, env: Env): Promise<RegistrarSearchResult> {
  const start = Date.now()

  if (!env.DYNADOT_KEY) {
    return {
      registrar: Registrar.Dynadot,
      domain,
      available: false,
      error: 'DYNADOT_KEY not configured',
      responseTime: Date.now() - start,
    }
  }

  try {
    // Dynadot search command
    const url = new URL(DYNADOT_API_URL)
    url.searchParams.set('key', env.DYNADOT_KEY)
    url.searchParams.set('command', 'search')
    url.searchParams.set('domain', domain)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Dynadot API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (data.SearchResponse?.ResponseCode !== '0') {
      throw new Error(data.SearchResponse?.Error || 'Unknown API error')
    }

    const searchResult = data.SearchResponse?.SearchResults?.[0]
    if (!searchResult) {
      throw new Error('No search results returned')
    }

    return {
      registrar: Registrar.Dynadot,
      domain,
      available: searchResult.Available === 'yes',
      price: searchResult.Price ? parseFloat(searchResult.Price) : undefined,
      premium: searchResult.Type === 'premium',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    return {
      registrar: Registrar.Dynadot,
      domain,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    }
  }
}

/**
 * Bulk search on Dynadot (up to 20 domains)
 */
export async function bulkSearchDynadot(domains: string[], env: Env): Promise<RegistrarSearchResult[]> {
  if (!env.DYNADOT_KEY) {
    return domains.map((domain) => ({
      registrar: Registrar.Dynadot,
      domain,
      available: false,
      error: 'DYNADOT_KEY not configured',
      responseTime: 0,
    }))
  }

  const start = Date.now()

  try {
    const url = new URL(DYNADOT_API_URL)
    url.searchParams.set('key', env.DYNADOT_KEY)
    url.searchParams.set('command', 'search')
    url.searchParams.set('domain0', domains.slice(0, 20).join(','))

    const response = await fetch(url.toString())
    const data = (await response.json()) as any

    if (data.SearchResponse?.ResponseCode !== '0') {
      throw new Error(data.SearchResponse?.Error || 'Unknown API error')
    }

    const results = data.SearchResponse?.SearchResults || []
    const responseTime = Date.now() - start

    return results.map((result: any) => ({
      registrar: Registrar.Dynadot,
      domain: result.Domain,
      available: result.Available === 'yes',
      price: result.Price ? parseFloat(result.Price) : undefined,
      premium: result.Type === 'premium',
      responseTime,
    }))
  } catch (error) {
    const responseTime = Date.now() - start
    return domains.map((domain) => ({
      registrar: Registrar.Dynadot,
      domain,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    }))
  }
}
