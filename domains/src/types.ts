/**
 * Domain search service types
 * Re-exports types from domains.do foundation package
 */
import type { Registrar, DomainAvailability, DomainPricing } from 'domains.do'

export type { Registrar, DomainAvailability, DomainPricing }

/**
 * Search result from a single registrar
 */
export interface RegistrarSearchResult {
  registrar: Registrar
  domain: string
  available: boolean
  price?: number
  premium?: boolean
  error?: string
  responseTime: number
}

/**
 * Aggregated search result across multiple registrars
 */
export interface DomainSearchResult {
  domain: string
  available: boolean
  cheapestPrice?: number
  cheapestRegistrar?: Registrar
  results: RegistrarSearchResult[]
  searchTime: number
}

/**
 * Bulk search request
 */
export interface BulkSearchRequest {
  domains: string[]
  registrars?: Registrar[]
}

/**
 * Price comparison result
 */
export interface PriceComparison {
  tld: string
  prices: {
    registrar: Registrar
    registration: number
    renewal: number
    transfer: number
    currency: string
    lastUpdated: Date
  }[]
  cheapest: {
    registration: Registrar
    renewal: Registrar
    transfer: Registrar
  }
}

/**
 * Environment bindings
 */
export interface Env {
  // API Keys
  DYNADOT_KEY?: string
  PORKBUN_API_KEY?: string
  PORKBUN_SECRET_KEY?: string
  NETIM_API_KEY?: string
  SAV_API_KEY?: string
  TLDLIST_API_KEY?: string
  WHOISXML_API_KEY?: string

  // Service bindings
  DB: any
  PIPELINE: any

  // Context
  ctx: ExecutionContext
}
