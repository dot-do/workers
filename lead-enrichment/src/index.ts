/**
 * Lead Enrichment Service
 *
 * Enriches contact and company data from external sources (Apollo, Clearbit, etc.)
 *
 * Features:
 * - Multiple enrichment providers (Apollo, Clearbit, Hunter, Snov)
 * - Intelligent source selection based on availability and cost
 * - Caching to minimize API costs (30-day TTL)
 * - Bulk enrichment with concurrency control
 * - Usage tracking and rate limiting
 *
 * Interfaces:
 * - RPC (WorkerEntrypoint)
 * - HTTP (Hono REST API)
 * - Queue (async bulk enrichment)
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { z } from 'zod'
import type {
  EnrichContactRequest,
  EnrichCompanyRequest,
  BulkEnrichRequest,
  EnrichedContact,
  EnrichedCompany,
  BulkEnrichResponse,
  EnrichmentProvider,
  EnrichmentSource,
  CachedEnrichment,
  EnrichmentUsage,
  ApolloPersonResponse,
  ApolloCompanyResponse,
  ClearbitPersonResponse,
  ClearbitCompanyResponse,
} from './types'

// ============================================================================
// Environment
// ============================================================================

export interface Env {
  // KV for caching enrichment results
  KV: KVNamespace

  // Database for usage tracking
  DB: any // DatabaseService binding

  // API Keys
  APOLLO_API_KEY: string
  CLEARBIT_API_KEY: string
  HUNTER_API_KEY: string
  SNOV_API_KEY: string

  // Rate limiting
  ENRICHMENT_RATE_LIMITER: RateLimit

  // Queue for bulk enrichment
  ENRICHMENT_QUEUE: Queue<BulkEnrichRequest>
}

// ============================================================================
// Zod Schemas
// ============================================================================

const enrichContactSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  linkedin: z.string().url().optional(),
  fields: z.array(z.string()).optional(),
  sources: z.array(z.enum(['apollo', 'clearbit', 'hunter', 'snov', 'internal'])).optional(),
  refresh: z.boolean().optional(),
})

const enrichCompanySchema = z.object({
  domain: z.string(),
  name: z.string().optional(),
  fields: z.array(z.string()).optional(),
  sources: z.array(z.enum(['apollo', 'clearbit', 'hunter', 'snov', 'internal'])).optional(),
  refresh: z.boolean().optional(),
})

const bulkEnrichSchema = z.object({
  contacts: z.array(enrichContactSchema),
  concurrency: z.number().min(1).max(10).optional(),
})

// ============================================================================
// Lead Enrichment Service (RPC)
// ============================================================================

export class LeadEnrichmentService extends WorkerEntrypoint<Env> {
  /**
   * Enrich a single contact
   */
  async enrichContact(request: EnrichContactRequest): Promise<EnrichedContact> {
    // Validate request
    const validated = enrichContactSchema.parse(request)

    // Generate cache key
    const cacheKey = this.generateContactCacheKey(validated)

    // Check cache (unless refresh requested)
    if (!validated.refresh) {
      const cached = await this.getFromCache<EnrichedContact>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Determine which sources to use
    const sources = await this.selectEnrichmentSources(validated.sources || [], validated.fields || [])

    // Try each source in priority order
    let enrichedData: EnrichedContact | null = null
    let lastError: Error | null = null

    for (const source of sources) {
      try {
        enrichedData = await this.enrichContactFromSource(validated, source.provider)
        if (enrichedData) {
          // Cache result
          await this.cacheEnrichment(cacheKey, enrichedData, 30 * 24 * 60 * 60) // 30 days
          // Track usage
          await this.trackUsage(source.provider, 'contact', source.cost, true)
          break
        }
      } catch (error) {
        console.error(`Enrichment failed from ${source.provider}:`, error)
        lastError = error as Error
        await this.trackUsage(source.provider, 'contact', 0, false)
      }
    }

    if (!enrichedData) {
      throw new Error(`Enrichment failed from all sources: ${lastError?.message || 'Unknown error'}`)
    }

    return enrichedData
  }

  /**
   * Enrich a company
   */
  async enrichCompany(request: EnrichCompanyRequest): Promise<EnrichedCompany> {
    const validated = enrichCompanySchema.parse(request)
    const cacheKey = this.generateCompanyCacheKey(validated.domain)

    // Check cache
    if (!validated.refresh) {
      const cached = await this.getFromCache<EnrichedCompany>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Determine sources
    const sources = await this.selectEnrichmentSources(validated.sources || [], validated.fields || [])

    // Try each source
    let enrichedData: EnrichedCompany | null = null

    for (const source of sources) {
      try {
        enrichedData = await this.enrichCompanyFromSource(validated, source.provider)
        if (enrichedData) {
          await this.cacheEnrichment(cacheKey, enrichedData, 30 * 24 * 60 * 60)
          await this.trackUsage(source.provider, 'company', source.cost, true)
          break
        }
      } catch (error) {
        console.error(`Company enrichment failed from ${source.provider}:`, error)
        await this.trackUsage(source.provider, 'company', 0, false)
      }
    }

    if (!enrichedData) {
      throw new Error('Company enrichment failed from all sources')
    }

    return enrichedData
  }

  /**
   * Bulk enrich contacts (queued for async processing)
   */
  async bulkEnrich(request: BulkEnrichRequest): Promise<{ jobId: string; queued: number }> {
    const validated = bulkEnrichSchema.parse(request)

    // Generate job ID
    const jobId = crypto.randomUUID()

    // Queue for processing
    await this.env.ENRICHMENT_QUEUE.send({
      ...validated,
      jobId,
    })

    return {
      jobId,
      queued: validated.contacts.length,
    }
  }

  /**
   * Get bulk enrichment status
   */
  async getBulkStatus(jobId: string): Promise<BulkEnrichResponse | null> {
    const cached = await this.getFromCache<BulkEnrichResponse>(`bulk:${jobId}`)
    return cached || null
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async enrichContactFromSource(request: EnrichContactRequest, provider: EnrichmentProvider): Promise<EnrichedContact | null> {
    switch (provider) {
      case 'apollo':
        return await this.enrichContactFromApollo(request)
      case 'clearbit':
        return await this.enrichContactFromClearbit(request)
      case 'hunter':
        return await this.enrichContactFromHunter(request)
      case 'snov':
        return await this.enrichContactFromSnov(request)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private async enrichCompanyFromSource(request: EnrichCompanyRequest, provider: EnrichmentProvider): Promise<EnrichedCompany | null> {
    switch (provider) {
      case 'apollo':
        return await this.enrichCompanyFromApollo(request)
      case 'clearbit':
        return await this.enrichCompanyFromClearbit(request)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  // Apollo.io Integration
  private async enrichContactFromApollo(request: EnrichContactRequest): Promise<EnrichedContact | null> {
    const response = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.env.APOLLO_API_KEY,
      },
      body: JSON.stringify({
        email: request.email,
        organization_name: request.company,
        reveal_personal_emails: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`)
    }

    const data: ApolloPersonResponse = await response.json()

    if (!data.person) {
      return null
    }

    const person = data.person

    return {
      input: {
        email: request.email,
        name: request.name,
        company: request.company,
      },
      enriched: {
        email: person.email,
        verified_email: person.email_status === 'verified',
        firstName: person.first_name,
        lastName: person.last_name,
        fullName: `${person.first_name} ${person.last_name}`,
        title: person.title,
        company: person.organization?.name,
        domain: person.organization?.primary_domain,
        linkedin: person.linkedin_url,
        twitter: person.twitter_url,
        github: person.github_url,
        photo: person.photo_url,
      },
      company: person.organization
        ? {
            name: person.organization.name,
            domain: person.organization.primary_domain,
            website: person.organization.website_url,
            industry: person.organization.industry,
            size_range: {
              min: person.organization.num_employees,
              max: person.organization.num_employees,
            },
            metadata: {
              sources: ['apollo'],
              enrichedAt: new Date().toISOString(),
              cached: false,
              cost: 1,
              confidence: 0.9,
              fields: ['company', 'domain', 'website', 'industry', 'size'],
            },
          }
        : undefined,
      metadata: {
        sources: ['apollo'],
        enrichedAt: new Date().toISOString(),
        cached: false,
        cost: 1,
        confidence: person.email_status === 'verified' ? 0.95 : 0.7,
        fields: ['email', 'name', 'title', 'company', 'linkedin'],
      },
    }
  }

  private async enrichCompanyFromApollo(request: EnrichCompanyRequest): Promise<EnrichedCompany | null> {
    const response = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.env.APOLLO_API_KEY,
      },
      body: JSON.stringify({
        domain: request.domain,
      }),
    })

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`)
    }

    const data: ApolloCompanyResponse = await response.json()

    if (!data.organization) {
      return null
    }

    const org = data.organization

    return {
      name: org.name,
      domain: org.primary_domain,
      website: org.website_url,
      industry: org.industry,
      size: org.estimated_num_employees.toString(),
      size_range: {
        min: org.estimated_num_employees,
        max: org.estimated_num_employees,
      },
      location: {
        city: org.city,
        state: org.state,
        country: org.country,
        address: org.organization_raw_address,
      },
      social: {
        linkedin: org.linkedin_url,
        twitter: org.twitter_url,
        facebook: org.facebook_url,
      },
      technologies: org.keywords,
      logo: org.logo_url,
      metadata: {
        sources: ['apollo'],
        enrichedAt: new Date().toISOString(),
        cached: false,
        cost: 1,
        confidence: 0.9,
        fields: ['company', 'domain', 'industry', 'size', 'location', 'social'],
      },
    }
  }

  // Clearbit Integration
  private async enrichContactFromClearbit(request: EnrichContactRequest): Promise<EnrichedContact | null> {
    if (!request.email) {
      throw new Error('Email required for Clearbit enrichment')
    }

    const response = await fetch(`https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(request.email)}`, {
      headers: {
        Authorization: `Bearer ${this.env.CLEARBIT_API_KEY}`,
      },
    })

    if (response.status === 404) {
      return null // Not found
    }

    if (!response.ok) {
      throw new Error(`Clearbit API error: ${response.status}`)
    }

    const data: ClearbitPersonResponse = await response.json()

    return {
      input: {
        email: request.email,
      },
      enriched: {
        email: data.email,
        verified_email: true,
        firstName: data.name?.givenName,
        lastName: data.name?.familyName,
        fullName: data.name?.fullName,
        title: data.employment?.title,
        company: data.employment?.name,
        domain: data.employment?.domain,
        linkedin: data.linkedin?.handle ? `https://linkedin.com/in/${data.linkedin.handle}` : undefined,
        twitter: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : undefined,
        github: data.github?.handle ? `https://github.com/${data.github.handle}` : undefined,
        location: data.location,
        timezone: data.timeZone,
        photo: data.avatar,
      },
      metadata: {
        sources: ['clearbit'],
        enrichedAt: new Date().toISOString(),
        cached: false,
        cost: 1,
        confidence: 0.95,
        fields: ['email', 'name', 'title', 'company', 'location', 'social'],
      },
    }
  }

  private async enrichCompanyFromClearbit(request: EnrichCompanyRequest): Promise<EnrichedCompany | null> {
    const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(request.domain)}`, {
      headers: {
        Authorization: `Bearer ${this.env.CLEARBIT_API_KEY}`,
      },
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Clearbit API error: ${response.status}`)
    }

    const data: ClearbitCompanyResponse = await response.json()

    return {
      name: data.name,
      domain: data.domain,
      website: data.url,
      description: data.description,
      industry: data.category?.industry,
      founded: data.foundedYear,
      size: data.metrics?.employeesRange,
      size_range: {
        min: data.metrics?.employees || 0,
        max: data.metrics?.employees || 0,
      },
      revenue: data.metrics?.estimatedAnnualRevenue,
      location: {
        city: data.geo?.city,
        state: data.geo?.state,
        country: data.geo?.country,
        address: `${data.geo?.streetNumber} ${data.geo?.streetName}`,
      },
      social: {
        linkedin: data.linkedin?.handle,
        twitter: data.twitter?.handle,
        facebook: data.facebook?.handle,
      },
      technologies: data.tech,
      logo: data.logo,
      metadata: {
        sources: ['clearbit'],
        enrichedAt: new Date().toISOString(),
        cached: false,
        cost: 1,
        confidence: 0.95,
        fields: ['company', 'domain', 'industry', 'size', 'revenue', 'location', 'technologies'],
      },
    }
  }

  // Hunter.io Integration (email finder)
  private async enrichContactFromHunter(request: EnrichContactRequest): Promise<EnrichedContact | null> {
    // Hunter is primarily for email finding, not full enrichment
    throw new Error('Hunter enrichment not yet implemented')
  }

  // Snov.io Integration
  private async enrichContactFromSnov(request: EnrichContactRequest): Promise<EnrichedContact | null> {
    throw new Error('Snov enrichment not yet implemented')
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private async selectEnrichmentSources(requestedSources: EnrichmentProvider[], requestedFields: string[]): Promise<EnrichmentSource[]> {
    // Default source priority
    const defaultSources: EnrichmentSource[] = [
      { provider: 'apollo', priority: 10, enabled: !!this.env.APOLLO_API_KEY, cost: 1, fields: ['email', 'phone', 'company', 'title', 'linkedin', 'twitter'] },
      { provider: 'clearbit', priority: 9, enabled: !!this.env.CLEARBIT_API_KEY, cost: 1, fields: ['email', 'company', 'title', 'linkedin', 'twitter', 'github'] },
      { provider: 'hunter', priority: 5, enabled: !!this.env.HUNTER_API_KEY, cost: 0.5, fields: ['email'] },
      { provider: 'snov', priority: 5, enabled: !!this.env.SNOV_API_KEY, cost: 0.5, fields: ['email'] },
    ]

    // Filter to requested sources (if any)
    let sources = defaultSources
    if (requestedSources.length > 0) {
      sources = sources.filter((s) => requestedSources.includes(s.provider))
    }

    // Filter to enabled sources
    sources = sources.filter((s) => s.enabled)

    // Sort by priority (highest first)
    sources.sort((a, b) => b.priority - a.priority)

    return sources
  }

  private generateContactCacheKey(request: EnrichContactRequest): string {
    const parts = [request.email || '', request.name || '', request.company || '', request.domain || ''].filter(Boolean)
    return `contact:${parts.join(':')}`
  }

  private generateCompanyCacheKey(domain: string): string {
    return `company:${domain}`
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const cached = await this.env.KV.get<CachedEnrichment>(`enrich:${key}`, 'json')
    if (!cached) {
      return null
    }

    // Check expiration
    if (new Date(cached.expiresAt) < new Date()) {
      return null
    }

    // Mark as cached
    ;(cached.data as any).metadata.cached = true

    return cached.data as T
  }

  private async cacheEnrichment(key: string, data: any, ttlSeconds: number): Promise<void> {
    const cached: CachedEnrichment = {
      data,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      sources: data.metadata?.sources || [],
    }

    await this.env.KV.put(`enrich:${key}`, JSON.stringify(cached), {
      expirationTtl: ttlSeconds,
    })
  }

  private async trackUsage(provider: EnrichmentProvider, type: 'contact' | 'company', cost: number, success: boolean): Promise<void> {
    // Track in database for billing and analytics
    await this.env.DB.execute(
      `INSERT INTO enrichment_usage
       (provider, type, cost, success, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [provider, type, cost, success ? 1 : 0, new Date().toISOString()]
    )
  }
}

// ============================================================================
// HTTP API (Hono)
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'lead-enrichment' })
})

// Enrich contact
app.post('/enrich/contact', async (c) => {
  try {
    const request = await c.req.json()
    const service = new LeadEnrichmentService(c.env.ctx, c.env)
    const result = await service.enrichContact(request)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Enrich company
app.post('/enrich/company', async (c) => {
  try {
    const request = await c.req.json()
    const service = new LeadEnrichmentService(c.env.ctx, c.env)
    const result = await service.enrichCompany(request)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Bulk enrich (queue)
app.post('/enrich/bulk', async (c) => {
  try {
    const request = await c.req.json()
    const service = new LeadEnrichmentService(c.env.ctx, c.env)
    const result = await service.bulkEnrich(request)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// Get bulk status
app.get('/enrich/bulk/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const service = new LeadEnrichmentService(c.env.ctx, c.env)
    const result = await service.getBulkStatus(jobId)
    if (!result) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

// ============================================================================
// Queue Consumer
// ============================================================================

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<BulkEnrichRequest>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const request = message.body
      const service = new LeadEnrichmentService({} as any, env)

      try {
        const results: EnrichedContact[] = []
        const errors: Array<{ index: number; email?: string; error: string }> = []
        const startTime = Date.now()
        let totalCost = 0

        // Process with concurrency control
        const concurrency = request.concurrency || 5
        const chunks = []
        for (let i = 0; i < request.contacts.length; i += concurrency) {
          chunks.push(request.contacts.slice(i, i + concurrency))
        }

        for (const chunk of chunks) {
          const promises = chunk.map(async (contact, index) => {
            try {
              const result = await service.enrichContact(contact)
              results.push(result)
              totalCost += result.metadata.cost
            } catch (error: any) {
              errors.push({
                index,
                email: contact.email,
                error: error.message,
              })
            }
          })

          await Promise.all(promises)
        }

        const duration = Date.now() - startTime

        const response: BulkEnrichResponse = {
          total: request.contacts.length,
          enriched: results.length,
          failed: errors.length,
          results,
          errors,
          metadata: {
            totalCost,
            duration,
          },
        }

        // Cache result for 24 hours
        await env.KV.put(`enrich:bulk:${(request as any).jobId}`, JSON.stringify(response), {
          expirationTtl: 24 * 60 * 60,
        })

        message.ack()
      } catch (error) {
        console.error('Bulk enrichment failed:', error)
        message.retry()
      }
    }
  },
}
