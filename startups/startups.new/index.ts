/**
 * startups.new SDK
 *
 * Launch Autonomous Startups instantly - Startup-as-Code creation.
 *
 * Like docs.new creates a document, startups.new creates a startup—born digital, not transformed.
 *
 * @example
 * ```typescript
 * import { launch } from 'startups.new'
 *
 * // Launch a new startup from a template
 * const startup = await launch({
 *   name: 'acme-ai',
 *   template: 'saas',
 *   domain: 'acme.hq.com.ai'
 * })
 *
 * // Or describe what you want to build
 * const startup = await launch({
 *   prompt: 'A SaaS that helps developers write better documentation'
 * })
 * ```
 */

import { createClient, getDefaultApiKeySync, type ClientOptions } from 'rpc.do'

// =============================================================================
// Types
// =============================================================================

export interface LaunchConfig {
  /** Startup name (used for subdomain if domain not specified) */
  name?: string
  /** Template to start from */
  template?: StartupTemplate
  /** Custom domain (or subdomain on free tier) */
  domain?: string
  /** Natural language description of what to build */
  prompt?: string
  /** Business model configuration */
  model?: BusinessModelConfig
  /** Initial services to enable */
  services?: ServiceConfig[]
  /** Organization to create the startup under */
  organizationId?: string
}

export type StartupTemplate =
  | 'saas'
  | 'marketplace'
  | 'api'
  | 'agency'
  | 'ecommerce'
  | 'media'
  | 'blank'

export interface BusinessModelConfig {
  type: 'subscription' | 'usage' | 'transaction' | 'freemium' | 'marketplace'
  pricing?: PricingTier[]
}

export interface PricingTier {
  name: string
  price: number
  interval?: 'month' | 'year'
  features: string[]
  limits?: Record<string, number>
}

export interface ServiceConfig {
  service: 'llm' | 'payments' | 'auth' | 'analytics' | 'search' | 'workflows'
  config?: Record<string, unknown>
}

export interface Startup {
  id: string
  name: string
  slug: string
  domain: string
  status: 'creating' | 'active' | 'paused' | 'archived'
  template: StartupTemplate
  createdAt: Date
  urls: StartupUrls
  services: EnabledService[]
  owner: {
    id: string
    email: string
  }
}

export interface StartupUrls {
  app: string
  api: string
  admin: string
  docs: string
  dashboard: string
}

export interface EnabledService {
  name: string
  status: 'active' | 'pending' | 'error'
  endpoint?: string
}

export interface Template {
  id: StartupTemplate
  name: string
  description: string
  features: string[]
  services: string[]
  example?: string
}

export interface GeneratedStartup {
  startup: Startup
  code: GeneratedCode
  suggestions: string[]
}

export interface GeneratedCode {
  worker: string
  schema?: string
  readme: string
}

export interface CloneConfig {
  /** Source startup ID or URL */
  source: string
  /** New name for the clone */
  name: string
  /** New domain for the clone */
  domain?: string
  /** Whether to copy data */
  includeData?: boolean
}

// =============================================================================
// Client Interface
// =============================================================================

export interface StartupsNewClient {
  /**
   * Launch a new Autonomous Startup
   */
  launch(config: LaunchConfig): Promise<Startup>

  /**
   * Launch from natural language prompt (AI generates everything)
   */
  create(prompt: string): Promise<GeneratedStartup>

  /**
   * Get available templates
   */
  templates(): Promise<Template[]>

  /**
   * Get a specific template with full details
   */
  template(id: StartupTemplate): Promise<Template & { code: string }>

  /**
   * Clone an existing startup
   */
  clone(config: CloneConfig): Promise<Startup>

  /**
   * Get startup creation status
   */
  status(startupId: string): Promise<{
    status: 'creating' | 'active' | 'failed'
    progress: number
    steps: { name: string; status: string }[]
    error?: string
  }>

  /**
   * List user's startups
   */
  list(options?: {
    status?: 'active' | 'paused' | 'archived'
    limit?: number
    offset?: number
  }): Promise<{
    startups: Startup[]
    total: number
  }>

  /**
   * Get a startup by ID or slug
   */
  get(idOrSlug: string): Promise<Startup>

  /**
   * Archive (soft delete) a startup
   */
  archive(startupId: string): Promise<void>

  /**
   * Validate a startup name/domain
   */
  validate(options: {
    name?: string
    domain?: string
  }): Promise<{
    valid: boolean
    available: boolean
    suggestions?: string[]
  }>
}

// =============================================================================
// Client Factory & Default Instance
// =============================================================================

/**
 * Create a startups.new client with custom options
 */
export function StartupsNew(options?: ClientOptions): StartupsNewClient {
  return createClient<StartupsNewClient>('https://startups.new', options)
}

/**
 * Convenience alias matching the domain
 */
export const Launch = StartupsNew

/**
 * Default startups.new client instance
 * Uses DO_API_KEY or ORG_AI_API_KEY from environment
 */
export const launch: StartupsNewClient = StartupsNew({
  apiKey: getDefaultApiKeySync(),
})

/**
 * Shorthand for launch.launch() - create a startup in one call
 */
export async function create(configOrPrompt: LaunchConfig | string): Promise<Startup | GeneratedStartup> {
  if (typeof configOrPrompt === 'string') {
    return launch.create(configOrPrompt)
  }
  return launch.launch(configOrPrompt)
}

export default launch
