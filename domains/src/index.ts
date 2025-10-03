/**
 * Domain Search & Pricing API
 * Integrates multiple registrars for parallel domain availability checking and price comparison
 */
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Registrar } from 'domains.do'
import type { Env, DomainSearchResult, RegistrarSearchResult, BulkSearchRequest } from './types'
import { searchPorkbun } from './registrars/porkbun'
import { searchDynadot, bulkSearchDynadot } from './registrars/dynadot'
import { searchNetim } from './registrars/netim'
import { searchSAV } from './registrars/sav'
import { getTLDListPricing, getAIBuilderPreferredTLDs, getRecommendedRegistrar } from './registrars/tldlist'

/**
 * Domain Search Service - RPC Interface
 */
export class DomainsService extends WorkerEntrypoint<Env> {
  /**
   * Search for domain availability across multiple registrars
   * Returns aggregated results with best price
   */
  async search(domain: string, registrars?: Registrar[]): Promise<DomainSearchResult> {
    const start = Date.now()

    // Default to all configured registrars
    const searchRegistrars = registrars || [Registrar.Porkbun, Registrar.Dynadot, Registrar.Netim, Registrar.SAV]

    // Parallel search across all registrars
    const results = await Promise.all(
      searchRegistrars.map(async (registrar) => {
        switch (registrar) {
          case Registrar.Porkbun:
            return await searchPorkbun(domain, this.env)
          case Registrar.Dynadot:
            return await searchDynadot(domain, this.env)
          case Registrar.Netim:
            return await searchNetim(domain, this.env)
          case Registrar.SAV:
            return await searchSAV(domain, this.env)
          default:
            return {
              registrar,
              domain,
              available: false,
              error: 'Registrar not implemented',
              responseTime: 0,
            } as RegistrarSearchResult
        }
      }),
    )

    // Find cheapest price among available results
    const availableResults = results.filter((r) => r.available && r.price !== undefined)
    const cheapest = availableResults.reduce(
      (min, r) => {
        if (!r.price) return min
        if (!min.price || r.price < min.price) return r
        return min
      },
      { price: undefined, registrar: undefined } as { price?: number; registrar?: Registrar },
    )

    const searchResult: DomainSearchResult = {
      domain,
      available: results.some((r) => r.available),
      cheapestPrice: cheapest.price,
      cheapestRegistrar: cheapest.registrar,
      results,
      searchTime: Date.now() - start,
    }

    // Log to database for analytics
    this.ctx.waitUntil(this.env.DB?.set?.(`domain:search:${domain}`, searchResult, { $type: 'DomainSearch' }))

    return searchResult
  }

  /**
   * Bulk search for multiple domains
   */
  async bulkSearch(request: BulkSearchRequest): Promise<DomainSearchResult[]> {
    const { domains, registrars } = request

    // Limit to 20 domains per request
    const limitedDomains = domains.slice(0, 20)

    // Search all domains in parallel
    return await Promise.all(limitedDomains.map((domain) => this.search(domain, registrars)))
  }

  /**
   * Get price comparison for a specific TLD
   */
  async getPricing(tld: string) {
    return await getTLDListPricing(tld, this.env)
  }

  /**
   * Get AI builder preferred TLDs
   */
  getPreferredTLDs() {
    return getAIBuilderPreferredTLDs()
  }

  /**
   * Get recommended registrar for a TLD
   */
  getRecommendedRegistrar(tld: string) {
    return getRecommendedRegistrar(tld)
  }
}

/**
 * HTTP API (Hono)
 */
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('/*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'domains' }))

// Search single domain
app.get('/search/:domain', async (c) => {
  const domain = c.req.param('domain')
  const registrarsParam = c.req.query('registrars')
  const registrars = registrarsParam ? (registrarsParam.split(',') as Registrar[]) : undefined

  const service = new DomainsService(c.env.ctx, c.env)
  const result = await service.search(domain, registrars)

  return c.json(result)
})

// Bulk search
app.post('/search/bulk', async (c) => {
  const body = await c.req.json<BulkSearchRequest>()

  const service = new DomainsService(c.env.ctx, c.env)
  const results = await service.bulkSearch(body)

  return c.json(results)
})

// Get TLD pricing
app.get('/pricing/:tld', async (c) => {
  const tld = c.req.param('tld')

  const service = new DomainsService(c.env.ctx, c.env)
  const pricing = await service.getPricing(tld)

  if (!pricing) {
    return c.json({ error: 'Pricing not available for this TLD' }, 404)
  }

  return c.json(pricing)
})

// Get AI builder preferred TLDs
app.get('/tlds/preferred', (c) => {
  const service = new DomainsService(c.env.ctx, c.env)
  const tlds = service.getPreferredTLDs()

  return c.json({ tlds })
})

// Get recommended registrar for TLD
app.get('/tlds/:tld/recommended', (c) => {
  const tld = c.req.param('tld')

  const service = new DomainsService(c.env.ctx, c.env)
  const registrar = service.getRecommendedRegistrar(tld)

  return c.json({ tld, recommended: registrar })
})

/**
 * Unified export with RPC + HTTP
 */
export default {
  fetch: app.fetch,
} as ExportedHandler<Env>
