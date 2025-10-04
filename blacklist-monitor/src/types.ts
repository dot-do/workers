/**
 * Blacklist Monitor Types
 */

export interface Env {
  // Environment
  ENVIRONMENT: string

  // D1 Database
  DB: D1Database

  // KV for caching
  KV?: KVNamespace

  // Service bindings
  DOMAINS?: any
}

/**
 * Blacklist to check
 */
export interface Blacklist {
  name: string
  dnsbl: string // DNS blacklist domain (e.g., zen.spamhaus.org)
  type: 'ip' | 'domain' | 'both'
  authority: 'high' | 'medium' | 'low'
  description: string
  website?: string
}

/**
 * Blacklist check request
 */
export interface CheckBlacklistRequest {
  domain?: string
  ip?: string
  checkAll?: boolean // Check all known blacklists
  blacklists?: string[] // Specific blacklists to check
}

/**
 * Blacklist check result for single blacklist
 */
export interface BlacklistResult {
  blacklist: string
  listed: boolean
  reason?: string
  returnCode?: string
  checkedAt: string
  responseTime: number
}

/**
 * Comprehensive blacklist check response
 */
export interface BlacklistCheckResponse {
  domain?: string
  ip?: string
  listed: boolean
  blacklistCount: number
  blacklists: string[]
  results: BlacklistResult[]
  severity: 'critical' | 'warning' | 'clean'
  timestamp: string
}

/**
 * Blacklist history entry
 */
export interface BlacklistHistoryEntry {
  id: string
  domain?: string
  ip?: string
  blacklist: string
  listed: boolean
  listedAt?: string
  delistedAt?: string
  reason?: string
  severity: 'critical' | 'warning'
  resolved: boolean
}

/**
 * Delisting request
 */
export interface DelistingRequest {
  blacklist: string
  domain?: string
  ip?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  requestedAt: string
  completedAt?: string
  notes?: string
}
