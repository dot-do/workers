/**
 * Deploy Service Types
 */

export interface Env {
  // Service bindings
  AUTH_SERVICE: any
  DB_SERVICE: any

  // Cloudflare API credentials (stored as secrets)
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_API_TOKEN: string

  // LEGACY: Environment-based namespace names
  PRODUCTION_NAMESPACE: string
  STAGING_NAMESPACE: string
  DEV_NAMESPACE: string

  // NEW (EXPERIMENTAL): 3-tier namespace names
  INTERNAL_NAMESPACE?: string // dotdo-internal
  PUBLIC_NAMESPACE?: string // dotdo-public
  TENANT_NAMESPACE?: string // dotdo-tenant

  // Architecture mode toggle
  NAMESPACE_MODE?: 'tier' | 'environment' // default: 'environment'
}

export type ServiceName = 'gateway' | 'db' | 'auth' | 'schedule' | 'webhooks' | 'email' | 'mcp' | 'queue'

// LEGACY: Environment-based deployment
export type Environment = 'production' | 'staging' | 'development'

// NEW (EXPERIMENTAL): Tier-based deployment
export type Tier = 'internal' | 'public' | 'tenant'

export interface DeploymentMetadata {
  commit: string
  branch: string
  author: string
  version?: string
}

export interface DeploymentRequest {
  service: ServiceName
  environment: Environment // For legacy environment-based
  tier?: Tier // For new tier-based (optional, experimental)
  version?: string // For versioned deployments (e.g., "v1", "v2", "v1-alpha")
  script: string // base64-encoded bundle
  bindings?: Record<string, any>
  metadata: DeploymentMetadata
}

export interface Deployment {
  id: string
  service: ServiceName
  environment: Environment // Legacy environment-based
  tier?: Tier // New tier-based (experimental)
  version?: string // Versioned deployment identifier (e.g., "v1", "v2")
  namespace: string
  namespaceMode: 'tier' | 'environment'
  status: 'deployed' | 'failed' | 'rolled_back'
  timestamp: string
  url: string
  versionTag: string // Git version or commit SHA
  metadata: DeploymentMetadata
}

export interface DeploymentResponse {
  success: boolean
  deployment?: Deployment
  error?: string
}

export interface RollbackRequest {
  service: ServiceName
  environment: Environment
}

export interface RollbackResponse {
  success: boolean
  deployment?: Deployment
  error?: string
}

export interface ListDeploymentsRequest {
  service?: ServiceName
  environment?: Environment
  limit?: number
}

export interface ListDeploymentsResponse {
  deployments: Deployment[]
  total: number
}

export interface CloudflareDeployResponse {
  success: boolean
  errors: any[]
  messages: any[]
  result?: {
    id: string
    etag: string
    created_on: string
    modified_on: string
  }
}

export interface AuthValidation {
  valid: boolean
  userId?: string
  permissions?: string[]
  error?: string
}
