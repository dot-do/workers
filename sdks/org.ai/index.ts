/**
 * id.org.ai - Auth for AI and Humans SDK
 *
 * @example
 * ```typescript
 * import { org } from 'id.org.ai'
 *
 * // SSO
 * const authUrl = await org.sso.getAuthorizationUrl({ organization: 'org_123' })
 *
 * // Vault (secure secrets)
 * await org.vault.store('org_123', 'OPENAI_KEY', 'sk-...')
 * const key = await org.vault.get('org_123', 'OPENAI_KEY')
 *
 * // Users
 * const users = await org.users.list('org_123')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface Organization {
  id: string
  name: string
  domains: string[]
  createdAt: Date
}

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  organizationId: string
  roles: string[]
  createdAt: Date
}

export interface SSOOptions {
  organization: string
  redirectUri?: string
  state?: string
}

export interface SSOProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  organizationId: string
  idpId: string
  connectionType: 'SAML' | 'OIDC' | 'OAuth'
}

// Client interface
export interface OrgClient {
  sso: {
    getAuthorizationUrl(options: SSOOptions): Promise<string>
    getProfile(code: string): Promise<{ profile: SSOProfile; token: string }>
  }

  vault: {
    store(orgId: string, key: string, value: string): Promise<void>
    get(orgId: string, key: string): Promise<string | null>
    delete(orgId: string, key: string): Promise<void>
    list(orgId: string): Promise<string[]>
  }

  users: {
    create(orgId: string, user: { email: string; firstName?: string; lastName?: string }): Promise<User>
    get(userId: string): Promise<User>
    list(orgId: string): Promise<User[]>
    delete(userId: string): Promise<void>
  }

  organizations: {
    create(org: { name: string; domains?: string[] }): Promise<Organization>
    get(orgId: string): Promise<Organization>
    list(): Promise<Organization[]>
    delete(orgId: string): Promise<void>
  }
}

/**
 * Create a configured Org client (PascalCase factory)
 *
 * @example
 * ```typescript
 * import { Org } from 'org.ai'
 * const org = Org({ apiKey: 'xxx' })
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
 * import { org } from 'org.ai'
 * await org.sso.getAuthorizationUrl({ organization: 'org_123' })
 * ```
 */
export const org: OrgClient = Org()

// Named exports
export { Org, org }

// Default export = camelCase instance
export default org

// Legacy alias
export const createOrg = Org

// Re-export types
export type { ClientOptions } from 'rpc.do'
