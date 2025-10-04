/**
 * Lead Enrichment Service Types
 *
 * Types for enriching contact and company data from external sources
 */

// ============================================================================
// Enrichment Sources
// ============================================================================

export type EnrichmentProvider = 'apollo' | 'clearbit' | 'hunter' | 'snov' | 'internal'

export interface EnrichmentSource {
  provider: EnrichmentProvider
  priority: number // Higher = checked first
  enabled: boolean
  cost: number // Credits per enrichment
  fields: EnrichmentField[] // What this provider can enrich
}

export type EnrichmentField =
  | 'email'
  | 'phone'
  | 'company'
  | 'title'
  | 'linkedin'
  | 'twitter'
  | 'github'
  | 'industry'
  | 'company_size'
  | 'revenue'
  | 'location'
  | 'website'

// ============================================================================
// Enrichment Requests
// ============================================================================

export interface EnrichContactRequest {
  email?: string
  name?: string
  company?: string
  domain?: string
  linkedin?: string
  // Fields to enrich (if not provided, enrich all available)
  fields?: EnrichmentField[]
  // Sources to use (if not provided, use all enabled sources)
  sources?: EnrichmentProvider[]
  // Force fresh enrichment (skip cache)
  refresh?: boolean
}

export interface EnrichCompanyRequest {
  domain: string
  name?: string
  // Fields to enrich
  fields?: EnrichmentField[]
  sources?: EnrichmentProvider[]
  refresh?: boolean
}

export interface BulkEnrichRequest {
  contacts: EnrichContactRequest[]
  // Max concurrent enrichments
  concurrency?: number
}

// ============================================================================
// Enrichment Responses
// ============================================================================

export interface EnrichedContact {
  // Input data
  input: {
    email?: string
    name?: string
    company?: string
    domain?: string
    linkedin?: string
  }
  // Enriched data
  enriched: {
    email?: string
    verified_email?: boolean
    phone?: string
    firstName?: string
    lastName?: string
    fullName?: string
    title?: string
    company?: string
    domain?: string
    linkedin?: string
    twitter?: string
    github?: string
    location?: string
    timezone?: string
    photo?: string
  }
  // Company data (if found)
  company?: EnrichedCompany
  // Enrichment metadata
  metadata: EnrichmentMetadata
}

export interface EnrichedCompany {
  name: string
  domain: string
  website?: string
  description?: string
  industry?: string
  founded?: number
  size?: string
  size_range?: {
    min: number
    max: number
  }
  revenue?: string
  revenue_range?: {
    min: number
    max: number
  }
  location?: {
    city?: string
    state?: string
    country?: string
    address?: string
  }
  social?: {
    linkedin?: string
    twitter?: string
    facebook?: string
    github?: string
  }
  technologies?: string[]
  logo?: string
  // Metadata
  metadata: EnrichmentMetadata
}

export interface EnrichmentMetadata {
  sources: EnrichmentProvider[] // Which sources were used
  enrichedAt: string // ISO timestamp
  cached: boolean // Was this from cache?
  cost: number // Total cost in credits
  confidence: number // 0-1, how confident are we in the data
  fields: EnrichmentField[] // Which fields were enriched
}

export interface BulkEnrichResponse {
  total: number
  enriched: number
  failed: number
  results: EnrichedContact[]
  errors: Array<{
    index: number
    email?: string
    error: string
  }>
  metadata: {
    totalCost: number
    duration: number
  }
}

// ============================================================================
// Provider-Specific Types
// ============================================================================

// Apollo.io API
export interface ApolloPersonSearch {
  person_titles?: string[]
  organization_domains?: string[]
  organization_num_employees_ranges?: string[]
  page?: number
}

export interface ApolloPersonResponse {
  person: {
    id: string
    first_name: string
    last_name: string
    email: string
    email_status: 'verified' | 'guessed' | 'unavailable'
    title: string
    organization: {
      name: string
      website_url: string
      primary_domain: string
      industry: string
      num_employees: number
    }
    linkedin_url: string
    twitter_url?: string
    github_url?: string
    photo_url?: string
  }
}

export interface ApolloCompanyResponse {
  organization: {
    id: string
    name: string
    website_url: string
    primary_domain: string
    primary_phone: {
      number: string
    }
    industry: string
    keywords: string[]
    estimated_num_employees: number
    publicly_traded_symbol?: string
    publicly_traded_exchange?: string
    logo_url: string
    organization_raw_address: string
    city: string
    state: string
    country: string
    linkedin_url: string
    twitter_url?: string
    facebook_url?: string
  }
}

// Clearbit
export interface ClearbitPersonResponse {
  id: string
  name: {
    fullName: string
    givenName: string
    familyName: string
  }
  email: string
  location: string
  timeZone: string
  utcOffset: number
  geo: {
    city: string
    state: string
    stateCode: string
    country: string
    countryCode: string
  }
  bio: string
  site: string
  avatar: string
  employment: {
    domain: string
    name: string
    title: string
    role: string
    seniority: string
  }
  facebook?: {
    handle: string
  }
  github?: {
    handle: string
    avatar: string
  }
  twitter?: {
    handle: string
    followers: number
  }
  linkedin?: {
    handle: string
  }
}

export interface ClearbitCompanyResponse {
  id: string
  name: string
  legalName: string
  domain: string
  domainAliases: string[]
  url: string
  site: {
    phoneNumbers: string[]
    emailAddresses: string[]
  }
  category: {
    sector: string
    industryGroup: string
    industry: string
    subIndustry: string
  }
  tags: string[]
  description: string
  foundedYear: number
  location: string
  timeZone: string
  utcOffset: number
  geo: {
    streetNumber: string
    streetName: string
    subPremise: string
    city: string
    postalCode: string
    state: string
    stateCode: string
    country: string
    countryCode: string
  }
  logo: string
  facebook?: {
    handle: string
    likes: number
  }
  linkedin?: {
    handle: string
  }
  twitter?: {
    handle: string
    followers: number
  }
  crunchbase?: {
    handle: string
  }
  emailProvider: boolean
  type: string
  tech: string[]
  metrics: {
    alexaUsRank: number
    alexaGlobalRank: number
    employees: number
    employeesRange: string
    marketCap: number
    raised: number
    annualRevenue: number
    estimatedAnnualRevenue: string
    fiscalYearEnd: number
  }
}

// ============================================================================
// Cache & Storage
// ============================================================================

export interface CachedEnrichment {
  data: EnrichedContact | EnrichedCompany
  cachedAt: string
  expiresAt: string
  sources: EnrichmentProvider[]
}

export interface EnrichmentUsage {
  userId: string
  organizationId: string
  provider: EnrichmentProvider
  type: 'contact' | 'company'
  cost: number
  timestamp: string
  success: boolean
}

// ============================================================================
// Configuration
// ============================================================================

export interface EnrichmentConfig {
  sources: EnrichmentSource[]
  caching: {
    enabled: boolean
    ttl: number // Seconds (default: 30 days)
  }
  rateLimit: {
    perMinute: number
    perHour: number
    perDay: number
  }
  costs: {
    maxPerEnrichment: number // Max credits to spend per enrichment
    maxPerDay: number // Max daily spend
  }
}
