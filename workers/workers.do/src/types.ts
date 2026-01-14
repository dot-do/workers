/**
 * Type definitions for workers.do
 *
 * Centralized types for deployment, dispatch, and routing.
 */

// ============================================================================
// Deployment Types
// ============================================================================

export interface DeployRequest {
  name: string
  code: string
  language?: 'ts' | 'js' | 'mdx'
  minify?: boolean
}

export interface DeployResponse {
  success: boolean
  workerId?: string
  url?: string
  error?: string
}

// ============================================================================
// Dispatch Types
// ============================================================================

export interface DispatchRequest {
  worker: string
  method?: string
  path?: string
  body?: unknown
  headers?: Record<string, string>
}

export interface DispatchResponse {
  success: boolean
  status?: number
  data?: unknown
  error?: string
}

// ============================================================================
// Deployment Record Types (for O(1) lookup)
// ============================================================================

/**
 * Deployment record from secondary index
 */
export interface DeploymentRecord {
  workerId: string
  name: string
  url: string
  createdAt: string
  context?: ThingContext
}

/**
 * Thing context for context-based routing (id.type.ns.do)
 */
export interface ThingContext {
  ns: string
  type: string
  id: string
}

/**
 * Rate limit status for a worker
 */
export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * DeploymentsStore interface for O(1) lookup
 * Uses secondary index for name-based lookups
 */
export interface DeploymentsStore {
  getById(workerId: string): Promise<DeploymentRecord | null>
  getByName(name: string): Promise<DeploymentRecord | null>
  getRateLimitStatus(workerId: string): Promise<RateLimitStatus>
}

// ============================================================================
// Router Types
// ============================================================================

/**
 * Result of extracting app ID from URL
 */
export interface AppIdMatch {
  appId: string
  path: string
  context?: ThingContext
}

/**
 * Route match result
 */
export interface RouteMatch {
  workerId: string
  path: string
  matched: boolean
}

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Worker environment bindings for dispatch and routing
 */
export interface DispatchEnv {
  apps: DispatchNamespace
  deployments: KVNamespace
  deploymentsStore?: DeploymentsStore
}

// ============================================================================
// Worker Registry Types
// ============================================================================

export interface Worker {
  $id: string
  name: string
  url: string
  createdAt: string
  deployedAt?: string
  accessedAt?: string
  linkedFolders?: string[]
}

export interface ListOptions {
  sortBy?: 'created' | 'deployed' | 'accessed'
  limit?: number
}

export interface LinkOptions {
  folder: string
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  message?: string
  [key: string]: unknown
}
