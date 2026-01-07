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

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

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
 * Create a configured org client
 */
export function createOrg(options?: ClientOptions): OrgClient {
  return createClient<OrgClient>('https://id.org.ai', options)
}

/**
 * Default org client instance
 */
export const org: OrgClient = createOrg({
  apiKey: typeof process !== 'undefined' ? process.env?.ORG_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
