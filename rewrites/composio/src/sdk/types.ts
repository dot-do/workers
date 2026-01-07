/**
 * TypeScript types for Composio SDK
 */

/**
 * Supported app definition
 */
export interface App {
  id: string
  name: string
  description: string
  category: AppCategory
  authMethod: AuthMethod
  logo?: string
  docsUrl?: string
}

export type AppCategory =
  | 'developer'
  | 'communication'
  | 'productivity'
  | 'crm'
  | 'storage'
  | 'calendar'
  | 'ai'
  | 'finance'
  | 'marketing'
  | 'other'

export type AuthMethod = 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth'

/**
 * Action definition
 */
export interface Action {
  id: string
  name: string
  description: string
  app: string
  inputSchema: JSONSchema
  outputSchema: JSONSchema
  scopes?: string[]
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  description?: string
  enum?: string[]
  default?: unknown
}

/**
 * Connection to an app for an entity
 */
export interface Connection {
  id: string
  entityId: string
  app: string
  status: ConnectionStatus
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  scopes?: string[]
}

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'pending'

/**
 * Entity represents a user/account in the system
 */
export interface Entity {
  id: string
  externalId: string
  connections: Connection[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Trigger definition for webhooks
 */
export interface Trigger {
  id: string
  entityId: string
  app: string
  event: string
  webhookUrl: string
  status: TriggerStatus
  createdAt: Date
}

export type TriggerStatus = 'active' | 'paused' | 'failed'

/**
 * Result of executing an action
 */
export interface ExecutionResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  executionTime: number
  requestId: string
}

/**
 * Options for connecting to an app
 */
export interface ConnectOptions {
  userId: string
  app: string
  redirectUrl?: string
  credentials?: Credentials
  scopes?: string[]
}

export type Credentials =
  | { apiKey: string }
  | { bearerToken: string }
  | { email: string; apiToken: string }
  | { clientId: string; clientSecret: string }

/**
 * Options for executing an action
 */
export interface ExecuteOptions {
  action: string
  params: Record<string, unknown>
  entityId: string
  timeout?: number
}

/**
 * Options for getting tools
 */
export interface GetToolsOptions {
  apps?: string[]
  actions?: string[]
  entityId: string
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}
