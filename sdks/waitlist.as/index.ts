/**
 * waitlist.as - Manage waitlists and early access
 *
 * Create and manage product waitlists with referral tracking.
 * waitlist.as/my-product, waitlist.as/beta, waitlist.as/launch
 *
 * @see https://waitlist.as
 *
 * @example
 * ```typescript
 * import { waitlist } from 'waitlist.as'
 *
 * // Create a waitlist
 * const list = await waitlist.create({
 *   name: 'product-launch',
 *   title: 'Join the waitlist',
 *   referralBonus: 5
 * })
 *
 * // Add someone to the waitlist
 * const entry = await waitlist.join('product-launch', {
 *   email: 'user@example.com',
 *   referredBy: 'ref123'
 * })
 *
 * // Get their position
 * console.log(`You're #${entry.position} on the waitlist!`)
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface WaitlistConfig {
  /** Waitlist name/slug */
  name: string
  /** Display title */
  title?: string
  /** Description */
  description?: string
  /** Positions gained per referral */
  referralBonus?: number
  /** Maximum waitlist size */
  maxSize?: number
  /** Custom fields to collect */
  fields?: Array<{ name: string; type: 'text' | 'email' | 'select'; required?: boolean; options?: string[] }>
  /** Redirect URL after signup */
  redirectUrl?: string
  /** Custom domain */
  domain?: string
  /** Email notifications */
  notifications?: {
    welcome?: boolean
    positionUpdate?: boolean
    invited?: boolean
  }
}

export interface Waitlist {
  id: string
  name: string
  title?: string
  description?: string
  status: 'active' | 'paused' | 'closed'
  count: number
  maxSize?: number
  referralBonus: number
  url: string
  createdAt: Date
}

export interface WaitlistEntry {
  id: string
  email: string
  position: number
  referralCode: string
  referredBy?: string
  referralCount: number
  status: 'waiting' | 'invited' | 'joined' | 'declined'
  customFields?: Record<string, string>
  createdAt: Date
  invitedAt?: Date
}

export interface JoinOptions {
  email: string
  referredBy?: string
  customFields?: Record<string, string>
}

export interface WaitlistMetrics {
  totalSignups: number
  invited: number
  joined: number
  declined: number
  referralRate: number
  avgWaitTime: number
  topReferrers: Array<{ email: string; count: number }>
  period: string
}

export interface InviteOptions {
  /** Number of people to invite */
  count?: number
  /** Specific emails to invite */
  emails?: string[]
  /** Filter by referral count */
  minReferrals?: number
}

// Client interface
export interface WaitlistAsClient {
  /**
   * Create a waitlist
   */
  create(config: WaitlistConfig): Promise<Waitlist>

  /**
   * Get waitlist details
   */
  get(name: string): Promise<Waitlist>

  /**
   * List all waitlists
   */
  list(options?: { status?: Waitlist['status']; limit?: number }): Promise<Waitlist[]>

  /**
   * Update waitlist configuration
   */
  update(name: string, config: Partial<WaitlistConfig>): Promise<Waitlist>

  /**
   * Delete a waitlist
   */
  delete(name: string): Promise<void>

  /**
   * Join a waitlist
   */
  join(name: string, options: JoinOptions): Promise<WaitlistEntry>

  /**
   * Get entry by email
   */
  lookup(name: string, email: string): Promise<WaitlistEntry | null>

  /**
   * Get entry by referral code
   */
  lookupByCode(name: string, code: string): Promise<WaitlistEntry | null>

  /**
   * Get position
   */
  position(name: string, email: string): Promise<number>

  /**
   * List entries
   */
  entries(name: string, options?: { status?: WaitlistEntry['status']; limit?: number; offset?: number }): Promise<WaitlistEntry[]>

  /**
   * Invite people from the waitlist
   */
  invite(name: string, options?: InviteOptions): Promise<WaitlistEntry[]>

  /**
   * Mark entry as joined
   */
  markJoined(name: string, email: string): Promise<WaitlistEntry>

  /**
   * Remove from waitlist
   */
  remove(name: string, email: string): Promise<void>

  /**
   * Get waitlist metrics
   */
  metrics(name: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<WaitlistMetrics>

  /**
   * Export waitlist entries
   */
  export(name: string, format?: 'csv' | 'json'): Promise<string>

  /**
   * Pause waitlist
   */
  pause(name: string): Promise<Waitlist>

  /**
   * Resume waitlist
   */
  resume(name: string): Promise<Waitlist>

  /**
   * Close waitlist
   */
  close(name: string): Promise<Waitlist>
}

/**
 * Create a configured waitlist.as client
 */
export function Waitlist(options?: ClientOptions): WaitlistAsClient {
  return createClient<WaitlistAsClient>('https://waitlist.as', options)
}

/**
 * Default waitlist.as client instance
 */
export const waitlist: WaitlistAsClient = Waitlist()

// Convenience exports
export const create = (config: WaitlistConfig) => waitlist.create(config)
export const join = (name: string, options: JoinOptions) => waitlist.join(name, options)

export default waitlist

// Re-export types
export type { ClientOptions } from 'rpc.do'
