/**
 * id.org.ai - Auth for AI and Humans SDK
 *
 * Strongly-typed client for the id.org.ai identity platform.
 * Provides SSO, vault, users, and organization management.
 *
 * @example
 * ```typescript
 * import { org } from 'id.org.ai'
 *
 * // SSO
 * const authUrl = await org.sso.getAuthorizationUrl({ organization: 'org_123' })
 * const { profile, token } = await org.sso.getProfile('code_123')
 *
 * // Vault (secure secrets storage)
 * await org.vault.store('org_123', 'OPENAI_KEY', 'sk-...')
 * const key = await org.vault.get('org_123', 'OPENAI_KEY')
 *
 * // Users
 * const users = await org.users.list('org_123')
 *
 * // Organizations
 * const orgs = await org.organizations.list()
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// =============================================================================
// Types
// =============================================================================

/**
 * User information
 */
export interface User {
  id: string
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  organizationId?: string
  roles?: string[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Organization information
 */
export interface Organization {
  id: string
  name: string
  slug?: string
  domains?: string[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * SSO options for enterprise authentication
 */
export interface SSOOptions {
  /** Organization ID to authenticate against */
  organization: string
  /** OAuth redirect URI */
  redirectUri?: string
  /** State parameter for CSRF protection */
  state?: string
  /** Specific identity provider to use */
  provider?: string
}

/**
 * SSO profile from identity provider
 */
export interface SSOProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  organizationId: string
  idpId?: string
  connectionType?: 'SAML' | 'OIDC' | 'OAuth'
  rawAttributes?: Record<string, unknown>
}

/**
 * Create user options
 */
export interface CreateUserOptions {
  email: string
  firstName?: string
  lastName?: string
  roles?: string[]
  metadata?: Record<string, string>
}

/**
 * Create organization options
 */
export interface CreateOrganizationOptions {
  name: string
  slug?: string
  domains?: string[]
  metadata?: Record<string, string>
}

// =============================================================================
// Client Interface
// =============================================================================

/**
 * RPC client interface for id.org.ai services
 */
export interface OrgClient {
  /**
   * Single Sign-On operations
   */
  sso: {
    /**
     * Get the authorization URL for SSO login
     *
     * @example
     * ```typescript
     * const authUrl = await org.sso.getAuthorizationUrl({
     *   organization: 'org_123',
     *   redirectUri: 'https://myapp.com/callback'
     * })
     * // Redirect user to authUrl
     * ```
     */
    getAuthorizationUrl(options: SSOOptions): Promise<string>

    /**
     * Exchange authorization code for profile and token
     *
     * @example
     * ```typescript
     * const { profile, token } = await org.sso.getProfile('auth_code_123')
     * console.log(profile.email) // user@company.com
     * ```
     */
    getProfile(code: string): Promise<{ profile: SSOProfile; token: string }>
  }

  /**
   * Secure secrets vault operations
   */
  vault: {
    /**
     * Store a secret in the vault
     *
     * @example
     * ```typescript
     * await org.vault.store('org_123', 'OPENAI_KEY', 'sk-abc123...')
     * ```
     */
    store(orgId: string, key: string, value: string): Promise<void>

    /**
     * Retrieve a secret from the vault
     *
     * @example
     * ```typescript
     * const apiKey = await org.vault.get('org_123', 'OPENAI_KEY')
     * ```
     */
    get(orgId: string, key: string): Promise<string | null>

    /**
     * Delete a secret from the vault
     *
     * @example
     * ```typescript
     * await org.vault.delete('org_123', 'OLD_KEY')
     * ```
     */
    delete(orgId: string, key: string): Promise<void>

    /**
     * List all secret keys for an organization (values are not returned)
     *
     * @example
     * ```typescript
     * const keys = await org.vault.list('org_123')
     * // ['OPENAI_KEY', 'STRIPE_KEY', 'DATABASE_URL']
     * ```
     */
    list(orgId: string): Promise<string[]>
  }

  /**
   * User management operations
   */
  users: {
    /**
     * Create a new user in an organization
     *
     * @example
     * ```typescript
     * const user = await org.users.create('org_123', {
     *   email: 'jane@company.com',
     *   firstName: 'Jane',
     *   lastName: 'Doe'
     * })
     * ```
     */
    create(orgId: string, user: CreateUserOptions): Promise<User>

    /**
     * Get a user by ID
     *
     * @example
     * ```typescript
     * const user = await org.users.get('user_456')
     * ```
     */
    get(userId: string): Promise<User>

    /**
     * List all users in an organization
     *
     * @example
     * ```typescript
     * const users = await org.users.list('org_123')
     * ```
     */
    list(orgId: string): Promise<User[]>

    /**
     * Delete a user
     *
     * @example
     * ```typescript
     * await org.users.delete('user_456')
     * ```
     */
    delete(userId: string): Promise<void>
  }

  /**
   * Organization management operations
   */
  organizations: {
    /**
     * Create a new organization
     *
     * @example
     * ```typescript
     * const org = await org.organizations.create({
     *   name: 'Acme Corp',
     *   domains: ['acme.com']
     * })
     * ```
     */
    create(options: CreateOrganizationOptions): Promise<Organization>

    /**
     * Get an organization by ID
     *
     * @example
     * ```typescript
     * const organization = await org.organizations.get('org_123')
     * ```
     */
    get(orgId: string): Promise<Organization>

    /**
     * List all organizations
     *
     * @example
     * ```typescript
     * const organizations = await org.organizations.list()
     * ```
     */
    list(): Promise<Organization[]>

    /**
     * Delete an organization
     *
     * @example
     * ```typescript
     * await org.organizations.delete('org_123')
     * ```
     */
    delete(orgId: string): Promise<void>
  }
}

// =============================================================================
// Client Factory and Default Instance
// =============================================================================

/**
 * Create a configured Org client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Org } from 'id.org.ai'
 *
 * // With explicit API key
 * const myOrg = Org({ apiKey: 'xxx' })
 *
 * // With custom options
 * const myOrg = Org({
 *   apiKey: 'xxx',
 *   timeout: 60000,
 *   transport: 'http'
 * })
 * ```
 */
export function Org(options?: ClientOptions): OrgClient {
  return createClient<OrgClient>('https://id.org.ai', options)
}

/**
 * Default Org client instance (camelCase)
 * For Workers: import 'rpc.do/env' first to enable env-based API key resolution
 *
 * @example
 * ```typescript
 * import { org } from 'id.org.ai'
 *
 * // SSO
 * const authUrl = await org.sso.getAuthorizationUrl({ organization: 'org_123' })
 *
 * // Vault
 * await org.vault.store('org_123', 'OPENAI_KEY', 'sk-...')
 *
 * // Users
 * const users = await org.users.list('org_123')
 * ```
 */
export const org: OrgClient = Org()

// Default export = camelCase instance
export default org

// Legacy alias for backwards compatibility
export const createOrg = Org

// =============================================================================
// Re-export Types
// =============================================================================

export type { ClientOptions } from 'rpc.do'
