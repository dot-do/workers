/**
 * directories.as - Create and manage directories and listings
 *
 * Build directories, marketplaces, and catalog sites.
 * directories.as/startups, directories.as/tools, directories.as/jobs
 *
 * @see https://directories.as
 *
 * @example
 * ```typescript
 * import { directories } from 'directories.as'
 *
 * // Create a startup directory
 * const dir = await directories.create({
 *   name: 'ai-startups',
 *   title: 'AI Startup Directory',
 *   schema: {
 *     name: { type: 'text', required: true },
 *     website: { type: 'url' },
 *     category: { type: 'select', options: ['B2B', 'B2C', 'Developer Tools'] },
 *     funding: { type: 'number' }
 *   }
 * })
 *
 * // Add a listing
 * await directories.add('ai-startups', {
 *   name: 'Acme AI',
 *   website: 'https://acme.ai',
 *   category: 'B2B'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type FieldType = 'text' | 'textarea' | 'number' | 'url' | 'email' | 'select' | 'multiselect' | 'date' | 'image' | 'boolean' | 'location' | 'tags'

export interface FieldSchema {
  type: FieldType
  label?: string
  required?: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
}

export interface DirectoryConfig {
  /** Directory name/slug */
  name: string
  /** Display title */
  title?: string
  /** Description */
  description?: string
  /** Field schema */
  schema: Record<string, FieldSchema>
  /** Categories */
  categories?: string[]
  /** Custom domain */
  domain?: string
  /** Visibility */
  visibility?: 'public' | 'private' | 'unlisted'
  /** Allow submissions */
  allowSubmissions?: boolean
  /** Require approval */
  requireApproval?: boolean
  /** Enable ratings */
  ratings?: boolean
  /** Enable reviews */
  reviews?: boolean
}

export interface Directory {
  id: string
  name: string
  title?: string
  description?: string
  schema: Record<string, FieldSchema>
  categories: string[]
  status: 'active' | 'paused' | 'archived'
  url: string
  domain?: string
  listingCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Listing {
  id: string
  directoryId: string
  slug: string
  data: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  featured: boolean
  rating?: number
  reviewCount: number
  views: number
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
}

export interface Review {
  id: string
  listingId: string
  rating: number
  title?: string
  content: string
  author?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface DirectoryMetrics {
  totalListings: number
  pendingListings: number
  totalViews: number
  topListings: Array<{ id: string; name: string; views: number }>
  listingsByCategory: Record<string, number>
  submissionsPerDay: Array<{ date: string; count: number }>
  period: string
}

export interface SearchOptions {
  query?: string
  category?: string
  filters?: Record<string, unknown>
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Client interface
export interface DirectoriesAsClient {
  /**
   * Create a directory
   */
  create(config: DirectoryConfig): Promise<Directory>

  /**
   * Get directory details
   */
  get(name: string): Promise<Directory>

  /**
   * List all directories
   */
  list(options?: { status?: Directory['status']; limit?: number }): Promise<Directory[]>

  /**
   * Update a directory
   */
  update(name: string, config: Partial<DirectoryConfig>): Promise<Directory>

  /**
   * Delete a directory
   */
  delete(name: string): Promise<void>

  /**
   * Add a listing
   */
  add(directoryName: string, data: Record<string, unknown>): Promise<Listing>

  /**
   * Get a listing
   */
  listing(directoryName: string, listingId: string): Promise<Listing>

  /**
   * Update a listing
   */
  updateListing(directoryName: string, listingId: string, data: Record<string, unknown>): Promise<Listing>

  /**
   * Delete a listing
   */
  deleteListing(directoryName: string, listingId: string): Promise<void>

  /**
   * Search listings
   */
  search(directoryName: string, options?: SearchOptions): Promise<{ listings: Listing[]; total: number }>

  /**
   * List all listings
   */
  listings(directoryName: string, options?: { status?: Listing['status']; category?: string; featured?: boolean; limit?: number; offset?: number }): Promise<Listing[]>

  /**
   * Approve a listing
   */
  approve(directoryName: string, listingId: string): Promise<Listing>

  /**
   * Reject a listing
   */
  reject(directoryName: string, listingId: string, reason?: string): Promise<Listing>

  /**
   * Feature a listing
   */
  feature(directoryName: string, listingId: string, featured: boolean): Promise<Listing>

  /**
   * Add a review
   */
  review(directoryName: string, listingId: string, review: { rating: number; title?: string; content: string; author?: string }): Promise<Review>

  /**
   * Get reviews
   */
  reviews(directoryName: string, listingId: string, options?: { status?: Review['status']; limit?: number }): Promise<Review[]>

  /**
   * Get directory metrics
   */
  metrics(directoryName: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<DirectoryMetrics>

  /**
   * Export directory
   */
  export(directoryName: string, format?: 'csv' | 'json'): Promise<string>

  /**
   * Import listings
   */
  import(directoryName: string, data: string, format?: 'csv' | 'json'): Promise<{ imported: number; errors: string[] }>

  /**
   * Get categories
   */
  categories(directoryName: string): Promise<Array<{ name: string; count: number }>>

  /**
   * Duplicate a directory
   */
  duplicate(name: string, newName: string): Promise<Directory>
}

/**
 * Create a configured directories.as client
 */
export function Directories(options?: ClientOptions): DirectoriesAsClient {
  return createClient<DirectoriesAsClient>('https://directories.as', options)
}

/**
 * Default directories.as client instance
 */
export const directories: DirectoriesAsClient = Directories({
  apiKey: typeof process !== 'undefined' ? (process.env?.DIRECTORIES_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: DirectoryConfig) => directories.create(config)
export const add = (directoryName: string, data: Record<string, unknown>) => directories.add(directoryName, data)
export const search = (directoryName: string, options?: SearchOptions) => directories.search(directoryName, options)

export default directories

// Re-export types
export type { ClientOptions } from 'rpc.do'
