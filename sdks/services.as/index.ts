/**
 * services.as - Services-as-Software SDK
 *
 * AI agents delivering services humans used to provide.
 *
 * @see https://services.as/software
 *
 * @example
 * ```typescript
 * import { sas } from 'services.as'
 *
 * // Discover AI-delivered services
 * const services = await sas.discover({ category: 'marketing' })
 *
 * // Use a service
 * const result = await sas.use('content-writer', {
 *   task: 'Write a blog post about AI',
 *   tone: 'professional'
 * })
 *
 * // Publish your own service
 * await sas.publish({
 *   name: 'My AI Consultant',
 *   description: 'AI-powered business consulting',
 *   capabilities: ['strategy', 'analysis', 'recommendations']
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface ServiceDefinition {
  name: string
  description: string
  /** What the service can do */
  capabilities: string[]
  /** Service category */
  category?: string
  /** Pricing model */
  pricing?: {
    model: 'free' | 'per-use' | 'subscription' | 'custom'
    amount?: number
    currency?: string
  }
  /** Example inputs/outputs */
  examples?: Array<{
    input: Record<string, unknown>
    output: Record<string, unknown>
  }>
}

export interface Service {
  id: string
  name: string
  description: string
  capabilities: string[]
  category: string
  publisherId: string
  pricing: ServiceDefinition['pricing']
  rating?: number
  usageCount: number
  status: 'active' | 'paused' | 'deprecated'
  createdAt: Date
}

export interface ServiceResult {
  id: string
  serviceId: string
  status: 'completed' | 'failed' | 'partial'
  output: Record<string, unknown>
  usage: {
    tokens?: number
    cost?: number
    duration?: number
  }
  createdAt: Date
}

export interface ServiceUsage {
  serviceId: string
  period: { start: Date; end: Date }
  requests: number
  successRate: number
  avgLatency: number
  totalCost: number
}

// Client interface
export interface ServicesAsClient {
  /**
   * Discover available services
   */
  discover(filters?: {
    category?: string
    query?: string
    capabilities?: string[]
  }): Promise<Service[]>

  /**
   * Get a service by ID
   */
  get(serviceId: string): Promise<Service>

  /**
   * Use a service (invoke the AI agent)
   */
  use(serviceId: string, input: Record<string, unknown>): Promise<ServiceResult>

  /**
   * Use a service with streaming output
   */
  stream(serviceId: string, input: Record<string, unknown>): Promise<ReadableStream<string>>

  /**
   * Publish a new service
   */
  publish(definition: ServiceDefinition): Promise<Service>

  /**
   * Update a published service
   */
  update(serviceId: string, updates: Partial<ServiceDefinition>): Promise<Service>

  /**
   * Pause a service (stop accepting requests)
   */
  pause(serviceId: string): Promise<Service>

  /**
   * Resume a paused service
   */
  resume(serviceId: string): Promise<Service>

  /**
   * Deprecate a service (soft delete)
   */
  deprecate(serviceId: string): Promise<Service>

  /**
   * Get usage statistics for a service
   */
  usage(serviceId: string, period?: { start: Date; end: Date }): Promise<ServiceUsage>

  /**
   * List your published services
   */
  myServices(): Promise<Service[]>

  /**
   * Categories
   */
  categories(): Promise<Array<{ id: string; name: string; count: number }>>
}

/**
 * Create a configured Services-as-Software client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { SAS } from 'services.as'
 * const mySAS = SAS({ apiKey: 'xxx' })
 * ```
 */
export function SAS(options?: ClientOptions): ServicesAsClient {
  return createClient<ServicesAsClient>('https://services.as', options)
}

/**
 * Default Services-as-Software client instance (camelCase)
 * Uses environment variable SAS_API_KEY or DO_API_KEY if available
 *
 * @example
 * ```typescript
 * import { sas } from 'services.as'
 * const services = await sas.discover({ category: 'marketing' })
 * ```
 */
export const sas: ServicesAsClient = SAS({
  apiKey: typeof process !== 'undefined' ? (process.env?.SAS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Alias for clarity
export const services = sas

// Legacy alias
export const createSAS = SAS

// Re-export types
export type { ClientOptions } from 'rpc.do'
