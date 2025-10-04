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

  // Namespace names
  PRODUCTION_NAMESPACE: string
  STAGING_NAMESPACE: string
  DEV_NAMESPACE: string
}

export type ServiceName = 'gateway' | 'db' | 'auth' | 'schedule' | 'webhooks' | 'email' | 'mcp' | 'queue'

export type Environment = 'production' | 'staging' | 'development'

export interface DeploymentMetadata {
  commit: string
  branch: string
  author: string
  version?: string
}

export interface DeploymentRequest {
  service: ServiceName
  environment: Environment
  script: string // base64-encoded bundle
  bindings?: Record<string, any>
  metadata: DeploymentMetadata
}

export interface Deployment {
  id: string
  service: ServiceName
  environment: Environment
  namespace: string
  status: 'deployed' | 'failed' | 'rolled_back'
  timestamp: string
  url: string
  version: string
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
