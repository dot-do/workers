/**
 * services.do - AI Services Marketplace SDK
 *
 * @example
 * ```typescript
 * import { services } from 'services.do'
 *
 * // Discover services
 * const list = await services.list({ category: 'content' })
 *
 * // Subscribe to a service
 * await services.subscribe('svc_123', 'cus_456')
 *
 * // Deploy your own service
 * await services.deploy({
 *   name: 'My AI Writer',
 *   worker: 'my-writer-worker',
 *   pricing: { type: 'usage', perUnit: 0.01 }
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Service {
  id: string
  name: string
  description: string
  category: string
  sellerId: string
  pricing: {
    type: 'free' | 'flat' | 'usage' | 'tiered'
    amount?: number
    perUnit?: number
    tiers?: Array<{ upTo: number; price: number }>
  }
  rating?: number
  reviewCount?: number
  createdAt: Date
}

export interface ServiceDeployment {
  name: string
  description?: string
  category?: string
  worker: string
  pricing: Service['pricing']
  domain?: string
}

export interface Subscription {
  id: string
  serviceId: string
  customerId: string
  status: 'active' | 'canceled'
  createdAt: Date
}

export interface Usage {
  serviceId: string
  customerId: string
  quantity: number
  cost: number
  period: { start: Date; end: Date }
}

export interface Review {
  id: string
  serviceId: string
  customerId: string
  rating: number
  comment?: string
  createdAt: Date
}

// Client interface
export interface ServicesClient {
  list(filters?: { category?: string; query?: string; sellerId?: string }): Promise<Service[]>
  get(serviceId: string): Promise<Service>

  deploy(config: ServiceDeployment): Promise<Service>
  update(serviceId: string, updates: Partial<ServiceDeployment>): Promise<Service>
  undeploy(serviceId: string): Promise<void>

  subscribe(serviceId: string, customerId: string): Promise<Subscription>
  unsubscribe(subscriptionId: string): Promise<void>
  subscriptions(customerId: string): Promise<Subscription[]>

  usage(serviceId: string, period?: { start: Date; end: Date }): Promise<Usage>
  usageByCustomer(customerId: string, period?: { start: Date; end: Date }): Promise<Usage[]>

  reviews: {
    list(serviceId: string): Promise<Review[]>
    create(serviceId: string, review: { rating: number; comment?: string }): Promise<Review>
  }
}

/**
 * Create a configured services client
 *
 * @example
 * ```typescript
 * import { Services } from 'services.do'
 * const services = Services({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function Services(options?: ClientOptions): ServicesClient {
  return createClient<ServicesClient>('https://services.do', options)
}

/**
 * Default services client
 *
 * Authentication: Set DO_API_KEY or SERVICES_API_KEY in environment.
 * For Cloudflare Workers, use `import 'rpc.do/env'` to enable env-based config.
 */
export const services: ServicesClient = Services()

// Named exports
export { Services, services }

// Default export = camelCase instance
export default services

export type { ClientOptions } from 'rpc.do'
