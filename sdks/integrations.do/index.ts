/**
 * integrations.do - Connect everything. Code nothing.
 *
 * AI-powered integrations that connect any service in minutes.
 * Describe your integration, map your data, and sync automatically.
 *
 * @see https://integrations.do
 *
 * @example
 * ```typescript
 * import integrations from 'integrations.do'
 *
 * // Tagged template - describe what you want
 * const sync = await integrations.do`
 *   Sync new Stripe customers to HubSpot contacts,
 *   map email and name, update on changes
 * `
 *
 * // Connect services (API keys from environment via rpc.do/env)
 * const stripe = await integrations.connect('stripe', {
 *   apiKey: env.STRIPE_API_KEY
 * })
 *
 * // Define data mappings
 * await integrations.map({
 *   source: { service: 'stripe', object: 'customer' },
 *   target: { service: 'hubspot', object: 'contact' },
 *   fields: {
 *     'email': 'email',
 *     'name': 'firstname',
 *     'metadata.company': 'company'
 *   }
 * })
 *
 * // Sync automatically
 * await integrations.sync('stripe-to-hubspot')
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface Integration {
  id: string
  name: string
  description?: string
  service: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  config?: Record<string, unknown>
  credentials?: {
    type: 'oauth' | 'apiKey' | 'basic' | 'custom'
    expiresAt?: Date
  }
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Connection {
  id: string
  integrationId: string
  service: string
  name: string
  status: 'active' | 'inactive' | 'error'
  lastSync?: Date
  syncCount: number
  errorCount: number
  config?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Sync {
  id: string
  name: string
  description?: string
  source: {
    connectionId: string
    service: string
    object: string
    filter?: Record<string, unknown>
  }
  target: {
    connectionId: string
    service: string
    object: string
  }
  mappingId: string
  schedule?: string // Cron expression or 'realtime'
  status: 'active' | 'paused' | 'error'
  lastRun?: SyncRun
  createdAt: Date
  updatedAt: Date
}

export interface SyncRun {
  id: string
  syncId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors?: SyncError[]
  startedAt: Date
  completedAt?: Date
  duration?: number
}

export interface SyncError {
  record: unknown
  error: string
  field?: string
  timestamp: Date
}

export interface Mapping {
  id: string
  name: string
  description?: string
  source: {
    service: string
    object: string
    schema?: Record<string, unknown>
  }
  target: {
    service: string
    object: string
    schema?: Record<string, unknown>
  }
  fields: Record<string, string | FieldMapping>
  transforms?: Transform[]
  defaults?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface FieldMapping {
  source: string
  transform?: string // Transform expression
  default?: unknown
  required?: boolean
}

export interface Transform {
  type: 'rename' | 'convert' | 'concat' | 'split' | 'lookup' | 'custom'
  config: Record<string, unknown>
}

export interface Webhook {
  id: string
  integrationId: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  secret?: string
  lastTriggered?: Date
  successCount: number
  failureCount: number
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEvent {
  id: string
  webhookId: string
  event: string
  payload: unknown
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  deliveredAt?: Date
  createdAt: Date
}

export interface IntegrationStatus {
  integration: Integration
  connections: Connection[]
  syncs: Sync[]
  health: {
    status: 'healthy' | 'degraded' | 'down'
    lastCheck: Date
    uptime: number
    errors?: string[]
  }
}

export interface IntegrationLog {
  id: string
  integrationId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: unknown
  timestamp: Date
}

export interface DoOptions {
  context?: Record<string, unknown>
  dryRun?: boolean
}

export interface ConnectOptions {
  apiKey?: string
  oauth?: {
    clientId: string
    clientSecret: string
    redirectUri?: string
  }
  credentials?: Record<string, unknown>
  config?: Record<string, unknown>
}

export interface SyncOptions {
  force?: boolean
  dryRun?: boolean
  limit?: number
  filter?: Record<string, unknown>
}

export interface MappingDefinition {
  source: {
    service: string
    object: string
  }
  target: {
    service: string
    object: string
  }
  fields: Record<string, string | FieldMapping>
  transforms?: Transform[]
  defaults?: Record<string, unknown>
}

export interface WebhookConfig {
  url: string
  events: string[]
  secret?: string
}

// Client interface
export interface IntegrationsClient {
  /**
   * Create an integration from natural language
   *
   * @example
   * ```typescript
   * const sync = await integrations.do`
   *   Sync new Stripe customers to HubSpot contacts,
   *   map email and name, update on changes
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Sync>>

  /**
   * Connect to a service
   *
   * @example
   * ```typescript
   * // API keys from environment via rpc.do/env
   * const stripe = await integrations.connect('stripe', {
   *   apiKey: env.STRIPE_API_KEY
   * })
   * ```
   */
  connect(service: string, options?: ConnectOptions): Promise<Connection>

  /**
   * Disconnect a service
   *
   * @example
   * ```typescript
   * await integrations.disconnect('stripe')
   * ```
   */
  disconnect(serviceOrId: string): Promise<void>

  /**
   * List all integrations
   *
   * @example
   * ```typescript
   * const all = await integrations.list()
   * const active = await integrations.list({ status: 'connected' })
   * ```
   */
  list(options?: {
    status?: Integration['status']
    service?: string
    limit?: number
  }): Promise<Integration[]>

  /**
   * Get an integration by ID or service name
   */
  get(serviceOrId: string): Promise<Integration>

  /**
   * Sync data between connected services
   *
   * @example
   * ```typescript
   * // Sync a specific integration
   * await integrations.sync('stripe-to-hubspot')
   *
   * // Force full sync
   * await integrations.sync('stripe-to-hubspot', { force: true })
   *
   * // Dry run
   * const preview = await integrations.sync('stripe-to-hubspot', { dryRun: true })
   * ```
   */
  sync(syncIdOrName: string, options?: SyncOptions): Promise<SyncRun>

  /**
   * Define a data mapping between services
   *
   * @example
   * ```typescript
   * await integrations.map({
   *   source: { service: 'stripe', object: 'customer' },
   *   target: { service: 'hubspot', object: 'contact' },
   *   fields: {
   *     'email': 'email',
   *     'name': 'firstname',
   *     'metadata.company': 'company'
   *   }
   * })
   * ```
   */
  map(definition: MappingDefinition): Promise<Mapping>

  /**
   * Get a mapping by ID
   */
  getMapping(mappingId: string): Promise<Mapping>

  /**
   * List all mappings
   */
  listMappings(options?: {
    service?: string
    limit?: number
  }): Promise<Mapping[]>

  /**
   * Update a mapping
   */
  updateMapping(mappingId: string, updates: Partial<MappingDefinition>): Promise<Mapping>

  /**
   * Delete a mapping
   */
  deleteMapping(mappingId: string): Promise<void>

  /**
   * Register a webhook for integration events
   *
   * @example
   * ```typescript
   * await integrations.webhook('stripe', {
   *   url: 'https://my-app.com/webhooks/stripe',
   *   events: ['customer.created', 'customer.updated']
   * })
   * ```
   */
  webhook(serviceOrId: string, config: WebhookConfig): Promise<Webhook>

  /**
   * List webhooks for an integration
   */
  listWebhooks(serviceOrId: string): Promise<Webhook[]>

  /**
   * Delete a webhook
   */
  deleteWebhook(webhookId: string): Promise<void>

  /**
   * Get integration status and health
   *
   * @example
   * ```typescript
   * const status = await integrations.status('stripe')
   * console.log(status.health.status) // 'healthy'
   * ```
   */
  status(serviceOrId: string): Promise<IntegrationStatus>

  /**
   * Get integration logs
   *
   * @example
   * ```typescript
   * const logs = await integrations.logs('stripe', { level: 'error' })
   * ```
   */
  logs(serviceOrId: string, options?: {
    level?: IntegrationLog['level']
    since?: Date
    limit?: number
  }): Promise<IntegrationLog[]>

  /**
   * List all syncs
   */
  listSyncs(options?: {
    status?: Sync['status']
    service?: string
    limit?: number
  }): Promise<Sync[]>

  /**
   * Get a sync by ID or name
   */
  getSync(syncIdOrName: string): Promise<Sync>

  /**
   * Pause a sync
   */
  pauseSync(syncIdOrName: string): Promise<Sync>

  /**
   * Resume a paused sync
   */
  resumeSync(syncIdOrName: string): Promise<Sync>

  /**
   * Delete a sync
   */
  deleteSync(syncIdOrName: string): Promise<void>

  /**
   * List sync runs for a sync
   */
  runs(syncIdOrName: string, options?: {
    status?: SyncRun['status']
    limit?: number
  }): Promise<SyncRun[]>

  /**
   * Get available connectors
   */
  connectors(): Promise<Array<{
    service: string
    name: string
    description: string
    authTypes: Array<'oauth' | 'apiKey' | 'basic' | 'custom'>
    objects: string[]
  }>>
}

/**
 * Create a configured integrations client
 *
 * @example
 * ```typescript
 * // With custom options
 * import { Integrations } from 'integrations.do'
 * const integrations = Integrations({ baseURL: 'https://custom.example.com' })
 *
 * // In Cloudflare Workers, import env adapter first
 * import 'rpc.do/env'
 * import { integrations } from 'integrations.do'
 * ```
 */
export function Integrations(options?: ClientOptions): IntegrationsClient {
  return createClient<IntegrationsClient>('https://integrations.do', options)
}

/**
 * Default integrations client instance
 *
 * Note: For Cloudflare Workers, import 'rpc.do/env' first to set up environment.
 * API key is read from INTEGRATIONS_API_KEY or DO_API_KEY environment variables.
 */
export const integrations: IntegrationsClient = Integrations()

// Named exports
export { Integrations, integrations }

// Default export = camelCase instance
export default integrations

export type { ClientOptions } from 'rpc.do'
