/**
 * startups.new - Type definitions
 *
 * Core types for launching Autonomous Startups instantly.
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Startup template types
 */
export type StartupTemplate =
  | 'saas'        // SaaS application with subscriptions
  | 'marketplace' // Two-sided marketplace
  | 'api'         // API-first service
  | 'agency'      // AI-powered service agency
  | 'ecommerce'   // E-commerce store
  | 'media'       // Content/media platform
  | 'custom'      // Custom from prompt

/**
 * Launch status for a startup creation request
 */
export type LaunchStatus =
  | 'pending'     // Queued for creation
  | 'generating'  // AI is generating the startup
  | 'provisioning'// Infrastructure being set up
  | 'deploying'   // Code being deployed
  | 'configuring' // Services being configured
  | 'live'        // Startup is live
  | 'failed'      // Creation failed

/**
 * Domain tier for startup hosting
 */
export type DomainTier =
  | 'free'        // Free subdomain (*.startups.new)
  | 'basic'       // Basic custom domain
  | 'premium'     // Premium domain with SSL

/**
 * Service configuration options
 */
export type ServiceType =
  | 'auth'        // Authentication (WorkOS)
  | 'payments'    // Payments (Stripe)
  | 'database'    // Database (D1/Turso)
  | 'storage'     // File storage (R2)
  | 'email'       // Email (Resend)
  | 'analytics'   // Analytics
  | 'ai'          // AI/LLM (llm.do)
  | 'search'      // Full-text search
  | 'queue'       // Background jobs

// =============================================================================
// Launch Request
// =============================================================================

/**
 * Options for launching a new startup
 */
export interface LaunchOptions {
  /** Human-readable name */
  name: string
  /** Description of the startup */
  description?: string
  /** URL-safe slug (auto-generated if not provided) */
  slug?: string
  /** Template to base the startup on */
  template?: StartupTemplate
  /** AI prompt for custom generation */
  prompt?: string
  /** Domain configuration */
  domain?: {
    /** Domain tier */
    tier?: DomainTier
    /** Custom domain (if tier is basic or premium) */
    custom?: string
    /** Subdomain prefix (for free tier) */
    subdomain?: string
  }
  /** Services to enable at launch */
  services?: ServiceType[]
  /** Initial environment variables */
  env?: Record<string, string>
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Repository to fork from (for clone/fork) */
  forkFrom?: string
  /** Tags for organization */
  tags?: string[]
}

/**
 * Result of a launch request
 */
export interface LaunchResult {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** URL-safe slug */
  slug: string
  /** Current launch status */
  status: LaunchStatus
  /** Primary URL */
  url: string
  /** Dashboard URL */
  dashboardUrl: string
  /** Repository URL (if created) */
  repositoryUrl?: string
  /** Enabled services */
  services: ServiceType[]
  /** Timestamps */
  createdAt: Date
  /** Estimated completion time */
  estimatedCompletion?: Date
  /** Error message if failed */
  error?: string
  /** Progress percentage (0-100) */
  progress?: number
  /** Progress message */
  progressMessage?: string
}

// =============================================================================
// Templates
// =============================================================================

/**
 * Template definition
 */
export interface Template {
  /** Template identifier */
  id: StartupTemplate
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Default services included */
  services: ServiceType[]
  /** Estimated launch time in seconds */
  estimatedTime: number
  /** Preview image URL */
  previewUrl?: string
  /** Example startups using this template */
  examples?: string[]
  /** Features included */
  features?: string[]
  /** Tags */
  tags?: string[]
}

/**
 * Template customization options
 */
export interface TemplateCustomization {
  /** Template to customize */
  template: StartupTemplate
  /** Features to add */
  addFeatures?: string[]
  /** Features to remove */
  removeFeatures?: string[]
  /** Additional services */
  addServices?: ServiceType[]
  /** Services to exclude */
  excludeServices?: ServiceType[]
  /** Branding options */
  branding?: {
    primaryColor?: string
    logo?: string
    favicon?: string
  }
}

// =============================================================================
// Domain Management
// =============================================================================

/**
 * Domain availability check result
 */
export interface DomainAvailability {
  /** Domain that was checked */
  domain: string
  /** Is available */
  available: boolean
  /** Suggested alternatives if not available */
  suggestions?: string[]
  /** Price if available (for premium domains) */
  price?: {
    amount: number
    currency: string
    period: 'year' | 'month'
  }
}

/**
 * Domain configuration for a startup
 */
export interface DomainConfig {
  /** Primary domain */
  primary: string
  /** Additional domains */
  aliases?: string[]
  /** SSL certificate status */
  ssl: {
    enabled: boolean
    issuer?: string
    expiresAt?: Date
  }
  /** DNS configuration */
  dns?: {
    type: 'managed' | 'external'
    nameservers?: string[]
    records?: {
      type: string
      name: string
      value: string
    }[]
  }
}

// =============================================================================
// Service Configuration
// =============================================================================

/**
 * Service status
 */
export interface ServiceStatus {
  /** Service type */
  service: ServiceType
  /** Is enabled */
  enabled: boolean
  /** Is configured */
  configured: boolean
  /** Health status */
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  /** Configuration URL */
  configUrl?: string
  /** Credentials available */
  hasCredentials: boolean
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  /** Service type */
  service: ServiceType
  /** Enable/disable */
  enabled: boolean
  /** Service-specific configuration */
  config?: Record<string, unknown>
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validation result for launch options
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationWarning[]
  /** Estimated launch time if valid */
  estimatedTime?: number
  /** Estimated cost if applicable */
  estimatedCost?: {
    setup: number
    monthly: number
    currency: string
  }
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field with error */
  field: string
  /** Error code */
  code: string
  /** Human-readable message */
  message: string
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field with warning */
  field: string
  /** Warning code */
  code: string
  /** Human-readable message */
  message: string
  /** Suggestion to fix */
  suggestion?: string
}

// =============================================================================
// Clone/Fork
// =============================================================================

/**
 * Clone options
 */
export interface CloneOptions {
  /** Source startup ID or slug */
  source: string
  /** New startup name */
  name: string
  /** New slug (auto-generated if not provided) */
  slug?: string
  /** Include configuration */
  includeConfig?: boolean
  /** Include environment variables (names only, values must be re-entered) */
  includeEnvNames?: boolean
  /** Include data */
  includeData?: boolean
  /** Domain configuration for the clone */
  domain?: LaunchOptions['domain']
}

/**
 * Fork options (from public template or marketplace)
 */
export interface ForkOptions {
  /** Source repository URL or template ID */
  source: string
  /** New startup name */
  name: string
  /** New slug (auto-generated if not provided) */
  slug?: string
  /** Customizations to apply */
  customization?: TemplateCustomization
  /** Domain configuration */
  domain?: LaunchOptions['domain']
  /** Services to enable */
  services?: ServiceType[]
}

// =============================================================================
// Launch Progress
// =============================================================================

/**
 * Launch progress event
 */
export interface LaunchProgress {
  /** Startup ID */
  id: string
  /** Current status */
  status: LaunchStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Current phase */
  phase: string
  /** Phase message */
  message: string
  /** Phases completed */
  completedPhases: string[]
  /** Remaining phases */
  remainingPhases: string[]
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number
  /** Timestamp */
  timestamp: Date
}

/**
 * Launch completion event
 */
export interface LaunchComplete {
  /** Startup ID */
  id: string
  /** Final status */
  status: 'live' | 'failed'
  /** Launch result */
  result: LaunchResult
  /** Total launch time in seconds */
  launchTime: number
  /** Error if failed */
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
