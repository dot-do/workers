/**
 * org.ai - Auth for AI and Humans
 *
 * Foundation identity layer for the workers.do platform.
 * Provides SSO, vault, users, and organization management.
 *
 * @example
 * ```typescript
 * import { org, getToken, isAuthenticated } from 'org.ai'
 *
 * // Check authentication
 * if (await isAuthenticated()) {
 *   const token = await getToken()
 * }
 *
 * // SSO
 * const authUrl = await org.sso.getAuthorizationUrl({ organization: 'org_123' })
 *
 * // Vault (secure secrets)
 * await org.vault.store('org_123', 'OPENAI_KEY', 'sk-...')
 * ```
 */

// Core auth utilities
export { auth, getToken, getUser, isAuthenticated, buildAuthUrl, refreshAccessToken, getStoredTokenData, storeTokenData } from './auth.js'
export type { AuthProvider } from './auth.js'

// Configuration
export { configure, getConfig } from './config.js'

// Storage
export {
  createSecureStorage,
  SecureFileTokenStorage,
  MemoryTokenStorage,
  LocalStorageTokenStorage,
  KeychainTokenStorage,
} from './storage.js'

// Types
export type {
  OrgConfig,
  User,
  Organization,
  AuthResult,
  DeviceAuthorizationResponse,
  TokenResponse,
  TokenError,
  StoredTokenData,
  TokenStorage,
  SSOOptions,
  SSOProfile,
} from './types.js'

// RPC Client
import { createClient, type ClientOptions } from 'rpc.do'
import type { Organization, User, SSOOptions, SSOProfile } from './types.js'

/**
 * RPC client interface for org.ai services
 */
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
 */
export function Org(options?: ClientOptions): OrgClient {
  return createClient<OrgClient>('https://id.org.ai', options)
}

/**
 * Default Org client instance (camelCase)
 */
export const org: OrgClient = Org()

// Named exports
export { Org, org }

// Default export = camelCase instance
export default org

// Legacy aliases
export const createOrg = Org

// Re-export types from rpc.do
export type { ClientOptions } from 'rpc.do'

// id.org.ai OAuth 2.1 Provider utilities
export {
  generateCodeVerifier,
  generateCodeChallenge,
  buildIdOrgAuthUrl,
  exchangeCodeForTokens,
  refreshIdOrgToken,
  getIdOrgUserInfo,
  introspectToken,
  revokeToken,
  registerClient,
  getDiscovery,
} from './id.js'

export type {
  OAuthClientRegistration,
  OAuthClientResponse,
  OIDCDiscovery,
  AuthorizationRequest,
  TokenRequest,
  OAuthTokenResponse,
  OAuthError,
  TokenIntrospection,
  UserInfo,
} from './id.js'
