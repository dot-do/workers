/**
 * marketplace.as - Build and manage marketplaces
 *
 * Create two-sided marketplaces with payments, escrow, and reviews.
 * marketplace.as/services, marketplace.as/products, marketplace.as/talent
 *
 * @see https://marketplace.as
 *
 * @example
 * ```typescript
 * import { marketplace } from 'marketplace.as'
 *
 * // Create a marketplace
 * const mp = await marketplace.create({
 *   name: 'freelance-devs',
 *   title: 'Freelance Developer Marketplace',
 *   type: 'services',
 *   commission: 10  // 10% platform fee
 * })
 *
 * // Add a listing
 * await marketplace.list('freelance-devs', {
 *   title: 'Full-Stack Development',
 *   price: 150,
 *   unit: 'hour',
 *   sellerId: 'seller-123'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type MarketplaceType = 'products' | 'services' | 'rentals' | 'digital' | 'talent' | 'custom'

export interface MarketplaceConfig {
  /** Marketplace name/slug */
  name: string
  /** Display title */
  title?: string
  /** Description */
  description?: string
  /** Marketplace type */
  type: MarketplaceType
  /** Platform commission percentage */
  commission?: number
  /** Currency */
  currency?: string
  /** Categories */
  categories?: string[]
  /** Custom domain */
  domain?: string
  /** Escrow enabled */
  escrow?: boolean
  /** Dispute resolution */
  disputes?: boolean
  /** Stripe Connect account ID */
  stripeAccount?: string
}

export interface Marketplace {
  id: string
  name: string
  title?: string
  description?: string
  type: MarketplaceType
  commission: number
  currency: string
  status: 'active' | 'paused' | 'archived'
  url: string
  domain?: string
  listingCount: number
  sellerCount: number
  totalVolume: number
  createdAt: Date
  updatedAt: Date
}

export interface ListingConfig {
  /** Listing title */
  title: string
  /** Description */
  description?: string
  /** Price */
  price: number
  /** Price unit for services */
  unit?: 'item' | 'hour' | 'day' | 'week' | 'month' | 'project'
  /** Category */
  category?: string
  /** Seller ID */
  sellerId: string
  /** Images */
  images?: string[]
  /** Tags */
  tags?: string[]
  /** Variants */
  variants?: Array<{ name: string; options: string[]; prices?: Record<string, number> }>
  /** Inventory (for products) */
  inventory?: number
  /** Digital delivery URL */
  deliveryUrl?: string
  /** Custom fields */
  metadata?: Record<string, unknown>
}

export interface Listing {
  id: string
  marketplaceId: string
  title: string
  description?: string
  price: number
  unit?: string
  category?: string
  sellerId: string
  status: 'draft' | 'active' | 'paused' | 'sold' | 'archived'
  featured: boolean
  images: string[]
  tags: string[]
  rating?: number
  reviewCount: number
  salesCount: number
  url: string
  createdAt: Date
  updatedAt: Date
}

export interface Seller {
  id: string
  marketplaceId: string
  name: string
  email: string
  stripeAccountId?: string
  status: 'pending' | 'active' | 'suspended'
  rating?: number
  reviewCount: number
  totalSales: number
  totalRevenue: number
  createdAt: Date
}

export interface Order {
  id: string
  marketplaceId: string
  listingId: string
  buyerId: string
  sellerId: string
  quantity: number
  subtotal: number
  commission: number
  total: number
  status: 'pending' | 'paid' | 'in_progress' | 'completed' | 'disputed' | 'refunded' | 'cancelled'
  escrowStatus?: 'held' | 'released' | 'refunded'
  createdAt: Date
  completedAt?: Date
}

export interface Review {
  id: string
  orderId: string
  listingId: string
  buyerId: string
  sellerId: string
  rating: number
  title?: string
  content: string
  response?: string
  createdAt: Date
}

export interface Dispute {
  id: string
  orderId: string
  reason: string
  status: 'open' | 'under_review' | 'resolved' | 'escalated'
  resolution?: 'buyer_favor' | 'seller_favor' | 'split' | 'dismissed'
  createdAt: Date
  resolvedAt?: Date
}

export interface MarketplaceMetrics {
  totalVolume: number
  totalOrders: number
  totalCommission: number
  activeListings: number
  activeSellers: number
  avgOrderValue: number
  conversionRate: number
  topCategories: Array<{ category: string; volume: number }>
  topSellers: Array<{ id: string; name: string; volume: number }>
  period: string
}

// Client interface
export interface MarketplaceAsClient {
  /**
   * Create a marketplace
   */
  create(config: MarketplaceConfig): Promise<Marketplace>

  /**
   * Get marketplace details
   */
  get(name: string): Promise<Marketplace>

  /**
   * List all marketplaces
   */
  list(options?: { status?: Marketplace['status']; limit?: number }): Promise<Marketplace[]>

  /**
   * Update a marketplace
   */
  update(name: string, config: Partial<MarketplaceConfig>): Promise<Marketplace>

  /**
   * Delete a marketplace
   */
  delete(name: string): Promise<void>

  /**
   * Create a listing
   */
  createListing(marketplaceName: string, config: ListingConfig): Promise<Listing>

  /**
   * Get a listing
   */
  getListing(marketplaceName: string, listingId: string): Promise<Listing>

  /**
   * Update a listing
   */
  updateListing(marketplaceName: string, listingId: string, config: Partial<ListingConfig>): Promise<Listing>

  /**
   * Delete a listing
   */
  deleteListing(marketplaceName: string, listingId: string): Promise<void>

  /**
   * Search listings
   */
  searchListings(marketplaceName: string, options?: { query?: string; category?: string; minPrice?: number; maxPrice?: number; sellerId?: string; sort?: string; limit?: number }): Promise<{ listings: Listing[]; total: number }>

  /**
   * Feature a listing
   */
  featureListing(marketplaceName: string, listingId: string, featured: boolean): Promise<Listing>

  /**
   * Register a seller
   */
  registerSeller(marketplaceName: string, seller: { name: string; email: string; stripeAccountId?: string }): Promise<Seller>

  /**
   * Get seller
   */
  getSeller(marketplaceName: string, sellerId: string): Promise<Seller>

  /**
   * List sellers
   */
  sellers(marketplaceName: string, options?: { status?: Seller['status']; limit?: number }): Promise<Seller[]>

  /**
   * Create an order
   */
  createOrder(marketplaceName: string, order: { listingId: string; buyerId: string; quantity?: number }): Promise<Order>

  /**
   * Get order
   */
  getOrder(marketplaceName: string, orderId: string): Promise<Order>

  /**
   * List orders
   */
  orders(marketplaceName: string, options?: { status?: Order['status']; buyerId?: string; sellerId?: string; limit?: number }): Promise<Order[]>

  /**
   * Complete an order (release escrow)
   */
  completeOrder(marketplaceName: string, orderId: string): Promise<Order>

  /**
   * Refund an order
   */
  refundOrder(marketplaceName: string, orderId: string, reason?: string): Promise<Order>

  /**
   * Add a review
   */
  addReview(marketplaceName: string, review: { orderId: string; rating: number; title?: string; content: string }): Promise<Review>

  /**
   * Get reviews
   */
  reviews(marketplaceName: string, options?: { listingId?: string; sellerId?: string; limit?: number }): Promise<Review[]>

  /**
   * Open a dispute
   */
  openDispute(marketplaceName: string, orderId: string, reason: string): Promise<Dispute>

  /**
   * Resolve a dispute
   */
  resolveDispute(marketplaceName: string, disputeId: string, resolution: Dispute['resolution']): Promise<Dispute>

  /**
   * Get marketplace metrics
   */
  metrics(marketplaceName: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<MarketplaceMetrics>

  /**
   * Generate payout report
   */
  payoutReport(marketplaceName: string, period?: string): Promise<Array<{ sellerId: string; gross: number; commission: number; net: number }>>
}

/**
 * Create a configured marketplace.as client
 */
export function Marketplace(options?: ClientOptions): MarketplaceAsClient {
  return createClient<MarketplaceAsClient>('https://marketplace.as', options)
}

/**
 * Default marketplace.as client instance
 */
export const marketplace: MarketplaceAsClient = Marketplace({
  apiKey: typeof process !== 'undefined' ? (process.env?.MARKETPLACE_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: MarketplaceConfig) => marketplace.create(config)
export const createListing = (name: string, config: ListingConfig) => marketplace.createListing(name, config)
export const searchListings = (name: string, options?: Parameters<MarketplaceAsClient['searchListings']>[1]) => marketplace.searchListings(name, options)

export default marketplace

// Re-export types
export type { ClientOptions } from 'rpc.do'
