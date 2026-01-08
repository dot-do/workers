/**
 * startups.new - Launch Autonomous Startups Instantly
 *
 * Create AI-powered startups from templates or natural language prompts.
 * Business-as-Code meets Services-as-Software.
 *
 * @see https://startups.new
 *
 * @example
 * ```typescript
 * import launch from 'startups.new'
 *
 * // Tagged template - describe your startup in natural language
 * const startup = await launch`
 *   Create an AI-powered resume builder SaaS
 *   with Stripe payments and user authentication
 * `
 *
 * // Template-based launch
 * const saas = await launch.fromTemplate('saas', {
 *   name: 'ResumeAI',
 *   services: ['auth', 'payments', 'ai']
 * })
 *
 * // Full control with options
 * const custom = await launch.create({
 *   name: 'My Startup',
 *   template: 'marketplace',
 *   domain: { tier: 'free', subdomain: 'my-startup' },
 *   services: ['auth', 'payments', 'database']
 * })
 *
 * // Watch launch progress
 * for await (const progress of launch.watch(startup.id)) {
 *   console.log(`${progress.phase}: ${progress.progress}%`)
 * }
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate } from 'rpc.do'

// Re-export all types
export * from './types.js'

import type {
  StartupTemplate,
  LaunchStatus,
  LaunchOptions,
  LaunchResult,
  Template,
  TemplateCustomization,
  DomainAvailability,
  DomainConfig,
  ServiceType,
  ServiceStatus,
  ServiceConfig,
  ValidationResult,
  CloneOptions,
  ForkOptions,
  LaunchProgress,
  LaunchComplete,
} from './types.js'

// =============================================================================
// Client Interface
// =============================================================================

/**
 * startups.new client interface for launching Autonomous Startups
 */
export interface StartupsNewClient {
  // ===========================================================================
  // Tagged Template - Natural Language Interface
  // ===========================================================================

  /**
   * Launch a startup from natural language description
   *
   * @example
   * ```typescript
   * const startup = await launch`
   *   Create a SaaS for tracking fitness goals
   *   with user accounts, subscription billing, and mobile app
   * `
   * ```
   */
  do: TaggedTemplate<Promise<LaunchResult>>

  // ===========================================================================
  // Template-Based Launch
  // ===========================================================================

  /**
   * Launch from a predefined template
   *
   * @example
   * ```typescript
   * // SaaS template with basic options
   * const startup = await launch.fromTemplate('saas', {
   *   name: 'My SaaS',
   *   services: ['auth', 'payments']
   * })
   *
   * // Marketplace with customization
   * const marketplace = await launch.fromTemplate('marketplace', {
   *   name: 'Local Services',
   *   domain: { tier: 'basic', custom: 'localservices.com' }
   * })
   * ```
   */
  fromTemplate(template: StartupTemplate, options: Omit<LaunchOptions, 'template'>): Promise<LaunchResult>

  /**
   * Launch with template customization
   */
  fromCustomTemplate(customization: TemplateCustomization, options: Omit<LaunchOptions, 'template'>): Promise<LaunchResult>

  // ===========================================================================
  // Full Launch API
  // ===========================================================================

  /**
   * Create and launch a new startup with full options
   *
   * @example
   * ```typescript
   * const startup = await launch.create({
   *   name: 'My Startup',
   *   description: 'An AI-powered productivity tool',
   *   template: 'saas',
   *   domain: {
   *     tier: 'free',
   *     subdomain: 'my-startup'
   *   },
   *   services: ['auth', 'payments', 'database', 'ai'],
   *   tags: ['productivity', 'ai']
   * })
   * ```
   */
  create(options: LaunchOptions): Promise<LaunchResult>

  /**
   * Get launch status by ID
   */
  status(id: string): Promise<LaunchResult>

  /**
   * List recent launches
   */
  list(options?: {
    status?: LaunchStatus
    limit?: number
    offset?: number
  }): Promise<LaunchResult[]>

  /**
   * Cancel a pending or in-progress launch
   */
  cancel(id: string): Promise<{ cancelled: boolean; message: string }>

  // ===========================================================================
  // Watch Launch Progress
  // ===========================================================================

  /**
   * Watch launch progress in real-time
   *
   * @example
   * ```typescript
   * // Using async iterator
   * for await (const progress of launch.watch(startup.id)) {
   *   console.log(`${progress.phase}: ${progress.progress}%`)
   *   if (progress.status === 'live') break
   * }
   *
   * // Using callback
   * const stop = await launch.watch(startup.id, {
   *   onProgress: (p) => console.log(`${p.phase}: ${p.progress}%`),
   *   onComplete: (c) => console.log(`Launched! ${c.result.url}`)
   * })
   * // Later: stop()
   * ```
   */
  watch(id: string): AsyncIterable<LaunchProgress>
  watch(id: string, callbacks: {
    onProgress: (progress: LaunchProgress) => void
    onComplete?: (complete: LaunchComplete) => void
    onError?: (error: Error) => void
  }): Promise<{ stop: () => void }>

  // ===========================================================================
  // Templates
  // ===========================================================================

  templates: {
    /**
     * List all available templates
     */
    list(): Promise<Template[]>

    /**
     * Get template details
     */
    get(template: StartupTemplate): Promise<Template>

    /**
     * Preview what a template would generate
     */
    preview(template: StartupTemplate, customization?: TemplateCustomization): Promise<{
      features: string[]
      services: ServiceType[]
      estimatedTime: number
      preview: {
        pages: string[]
        components: string[]
        apis: string[]
      }
    }>
  }

  // ===========================================================================
  // Domain Management
  // ===========================================================================

  domains: {
    /**
     * Check domain availability
     *
     * @example
     * ```typescript
     * const result = await launch.domains.check('my-startup.com')
     * if (!result.available) {
     *   console.log('Try:', result.suggestions)
     * }
     * ```
     */
    check(domain: string): Promise<DomainAvailability>

    /**
     * Check multiple domains
     */
    checkBulk(domains: string[]): Promise<DomainAvailability[]>

    /**
     * Get suggested domains for a startup name
     */
    suggest(name: string, options?: {
      tlds?: string[]
      count?: number
    }): Promise<DomainAvailability[]>

    /**
     * Get domain configuration for a launched startup
     */
    config(startupId: string): Promise<DomainConfig>

    /**
     * Update domain configuration
     */
    configure(startupId: string, config: Partial<DomainConfig>): Promise<DomainConfig>

    /**
     * Add an alias domain
     */
    addAlias(startupId: string, domain: string): Promise<DomainConfig>

    /**
     * Remove an alias domain
     */
    removeAlias(startupId: string, domain: string): Promise<DomainConfig>

    /**
     * Set primary domain
     */
    setPrimary(startupId: string, domain: string): Promise<DomainConfig>
  }

  // ===========================================================================
  // Service Configuration
  // ===========================================================================

  services: {
    /**
     * List services for a startup
     */
    list(startupId: string): Promise<ServiceStatus[]>

    /**
     * Get service status
     */
    status(startupId: string, service: ServiceType): Promise<ServiceStatus>

    /**
     * Enable a service
     */
    enable(startupId: string, service: ServiceType, config?: Record<string, unknown>): Promise<ServiceStatus>

    /**
     * Disable a service
     */
    disable(startupId: string, service: ServiceType): Promise<ServiceStatus>

    /**
     * Configure a service
     */
    configure(startupId: string, config: ServiceConfig): Promise<ServiceStatus>

    /**
     * Get available services
     */
    available(): Promise<{
      service: ServiceType
      name: string
      description: string
      free: boolean
      price?: { amount: number; currency: string; period: string }
    }[]>
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  /**
   * Validate launch options before launching
   *
   * @example
   * ```typescript
   * const validation = await launch.validate({
   *   name: 'My Startup',
   *   domain: { tier: 'basic', custom: 'my-startup.com' }
   * })
   *
   * if (!validation.valid) {
   *   console.log('Errors:', validation.errors)
   * }
   * ```
   */
  validate(options: LaunchOptions): Promise<ValidationResult>

  /**
   * Validate just the name
   */
  validateName(name: string): Promise<{
    valid: boolean
    slug: string
    errors?: string[]
  }>

  /**
   * Validate a prompt for AI generation
   */
  validatePrompt(prompt: string): Promise<{
    valid: boolean
    template: StartupTemplate
    suggestedServices: ServiceType[]
    warnings?: string[]
  }>

  // ===========================================================================
  // Clone & Fork
  // ===========================================================================

  /**
   * Clone an existing startup
   *
   * @example
   * ```typescript
   * const clone = await launch.clone({
   *   source: 'my-existing-startup',
   *   name: 'My Startup Copy',
   *   domain: { tier: 'free', subdomain: 'my-startup-copy' }
   * })
   * ```
   */
  clone(options: CloneOptions): Promise<LaunchResult>

  /**
   * Fork from a template or public startup
   *
   * @example
   * ```typescript
   * // Fork from marketplace template
   * const forked = await launch.fork({
   *   source: 'templates/marketplace-pro',
   *   name: 'My Marketplace',
   *   services: ['auth', 'payments', 'search']
   * })
   * ```
   */
  fork(options: ForkOptions): Promise<LaunchResult>

  // ===========================================================================
  // Quick Launch Helpers
  // ===========================================================================

  /**
   * Quick launch a SaaS startup
   */
  saas(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>

  /**
   * Quick launch a marketplace
   */
  marketplace(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>

  /**
   * Quick launch an API service
   */
  api(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>

  /**
   * Quick launch an AI agency
   */
  agency(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>

  /**
   * Quick launch an e-commerce store
   */
  ecommerce(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>

  /**
   * Quick launch a media platform
   */
  media(name: string, options?: Omit<LaunchOptions, 'name' | 'template'>): Promise<LaunchResult>
}

// =============================================================================
// Client Factory
// =============================================================================

/**
 * Create a configured startups.new client
 *
 * @example
 * ```typescript
 * import { StartupsNew } from 'startups.new'
 *
 * // Default configuration
 * const launch = StartupsNew()
 *
 * // Custom configuration
 * const launch = StartupsNew({
 *   apiKey: 'your-api-key',
 *   baseURL: 'https://custom.startups.new'
 * })
 * ```
 */
export function StartupsNew(options?: ClientOptions): StartupsNewClient {
  return createClient<StartupsNewClient>('https://startups.new', options)
}

/**
 * Default startups.new client instance
 *
 * Uses global env from rpc.do for authentication.
 * In Workers, import 'rpc.do/env' before using this instance.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import launch from 'startups.new'
 *
 * const startup = await launch`Build a SaaS for project management`
 * ```
 */
export const launch: StartupsNewClient = StartupsNew()

// Alias for natural naming
export { launch as startups }

// Default export
export default launch

// Re-export ClientOptions for convenience
export type { ClientOptions } from 'rpc.do'
