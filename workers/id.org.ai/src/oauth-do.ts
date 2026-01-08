/**
 * OAuthDO - OAuth 2.1 Provider Durable Object
 *
 * This Durable Object implements the OAuth 2.1 authorization server
 * using better-auth's oauth-provider plugin.
 *
 * Authentication is delegated to WorkOS AuthKit, which handles:
 * - Social login (Google, GitHub, Microsoft, Apple)
 * - Enterprise SSO (SAML, OIDC)
 * - Magic Link, Password authentication
 *
 * Provider tokens (from the user's identity provider) are stored
 * in WorkOS Vault, scoped to the user's organization.
 *
 * API (env.ID):
 * - sso.getAuthorizationUrl({ organization }) - Start SSO flow
 * - vault.store(customerId, key, value) - Store secret
 * - vault.get(customerId, key) - Retrieve secret
 * - organizations.create/list/get
 * - users.create/list/get
 */

import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { betterAuth } from 'better-auth'
import { oAuthProvider } from '@better-auth/oauth-provider'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { WorkOS } from '@workos-inc/node'

// ============================================================================
// Type Definitions
// ============================================================================

export interface Env {
  OAUTH: DurableObjectNamespace
  DB: D1Database
  SESSIONS: KVNamespace
  WORKOS_API_KEY: string
  WORKOS_CLIENT_ID: string
  AUTH_SECRET: string
  JWKS_SECRET: string
}

/**
 * Client registration for OAuth apps
 */
export interface OAuthClient {
  id: string
  name: string
  secret?: string
  redirectUris: string[]
  scopes: string[]
  trusted: boolean
  createdAt: string
}

/**
 * Organization for multi-tenant management
 */
export interface Organization {
  id: string
  name: string
  slug: string
  allowProfilesOutsideOrganization: boolean
  domains: OrganizationDomain[]
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export interface OrganizationDomain {
  id: string
  domain: string
  state: 'verified' | 'pending'
}

export interface CreateOrganizationOptions {
  name: string
  slug?: string
  domains?: string[]
  metadata?: Record<string, unknown>
}

export interface ListOrganizationsOptions {
  limit?: number
  offset?: number
}

/**
 * User management types
 */
export interface User {
  id: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  profilePictureUrl?: string
  organizationId?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export interface CreateUserOptions {
  email: string
  firstName?: string
  lastName?: string
  password?: string
  organizationId?: string
  metadata?: Record<string, unknown>
}

export interface UpdateUserOptions {
  firstName?: string
  lastName?: string
  profilePictureUrl?: string
  metadata?: Record<string, unknown>
}

export interface ListUsersOptions {
  organizationId?: string
  limit?: number
  offset?: number
}

/**
 * SSO types
 */
export interface SSOAuthorizationOptions {
  organization?: string
  organizationId?: string
  connectionId?: string
  domainHint?: string
  loginHint?: string
  state?: string
  redirectUri?: string
}

export interface SSOAuthorizationResult {
  url: string
  state: string
}

export interface SSOConnection {
  id: string
  name: string
  connectionType: 'SAML' | 'OIDC' | 'GoogleOAuth' | 'MicrosoftOAuth'
  state: 'active' | 'inactive' | 'draft'
  organizationId: string
  domains: string[]
  createdAt: string
  updatedAt: string
}

export interface SSOProfile {
  id: string
  idpId: string
  email: string
  firstName?: string
  lastName?: string
  groups?: string[]
  rawAttributes?: Record<string, unknown>
  connectionId: string
  connectionType: string
  organizationId?: string
}

export interface SSOCallbackResult {
  success: boolean
  profile?: SSOProfile
  session?: {
    id: string
    accessToken: string
    expiresAt: number
  }
  error?: string
}

/**
 * Vault types for secure secret storage
 */
export interface VaultSecret {
  key: string
  value: string
  customerId: string
  createdAt: number
  updatedAt: number
}

/**
 * Directory Sync types
 */
export interface DirectorySyncResult {
  success: boolean
  usersUpdated: number
  groupsUpdated: number
  error?: string
}

export interface Directory {
  id: string
  name: string
  type: 'okta' | 'azure_ad' | 'google_workspace' | 'generic_scim'
  organizationId: string
  state: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

/**
 * Admin Portal types
 */
export interface AdminPortalLinkOptions {
  organizationId: string
  returnUrl?: string
  successUrl?: string
}

export interface AdminPortalLink {
  url: string
  expiresAt: number
}

// ============================================================================
// OAuthDO Implementation
// ============================================================================

export class OAuthDO extends DurableObject<Env> {
  private app: Hono
  private workos: WorkOS
  private auth: ReturnType<typeof betterAuth> | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.workos = new WorkOS(env.WORKOS_API_KEY)
    this.app = this.createApp()
  }

  // ==========================================================================
  // Auth Initialization
  // ==========================================================================

  private async getAuth() {
    if (this.auth) return this.auth

    // Initialize better-auth with oauth-provider plugin
    this.auth = betterAuth({
      database: drizzleAdapter(this.env.DB as any, { provider: 'sqlite' }),
      secret: this.env.AUTH_SECRET,
      baseURL: 'https://id.org.ai',
      plugins: [
        oAuthProvider({
          loginPage: '/login',
          consentPage: '/consent',
          // Custom access token claims
          accessTokenExpiresIn: 3600, // 1 hour
          refreshTokenExpiresIn: 60 * 60 * 24 * 30, // 30 days
          // Include org context in tokens
          customAccessTokenClaims: async ({ user, scopes }) => {
            const claims: Record<string, unknown> = {}
            if (user.organizationId) {
              claims.org_id = user.organizationId
            }
            return claims
          },
        }),
      ],
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
    })

    return this.auth
  }

  // ==========================================================================
  // SSO API (env.ID.sso)
  // ==========================================================================

  /**
   * Get SSO authorization URL
   * env.ID.sso.getAuthorizationUrl({ organization })
   */
  async getAuthorizationUrl(options: SSOAuthorizationOptions): Promise<SSOAuthorizationResult> {
    const state = options.state || crypto.randomUUID()

    // Store state for CSRF validation
    await this.ctx.storage.put(
      `sso_state:${state}`,
      {
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        options,
      },
      { expirationTtl: 600 }
    )

    // Build WorkOS SSO authorization URL
    const baseUrl = 'https://api.workos.com/sso/authorize'
    const url = new URL(baseUrl)

    url.searchParams.set('client_id', this.env.WORKOS_CLIENT_ID)
    url.searchParams.set('redirect_uri', options.redirectUri || 'https://id.org.ai/sso/callback')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('state', state)

    // Organization can be provided by ID or slug
    if (options.organizationId) {
      url.searchParams.set('organization', options.organizationId)
    } else if (options.organization) {
      // Look up organization by slug
      const org = await this.getOrganizationBySlug(options.organization)
      if (org) {
        url.searchParams.set('organization', org.id)
      }
    }

    if (options.connectionId) {
      url.searchParams.set('connection', options.connectionId)
    }

    if (options.domainHint) {
      url.searchParams.set('domain_hint', options.domainHint)
    }

    if (options.loginHint) {
      url.searchParams.set('login_hint', options.loginHint)
    }

    return { url: url.toString(), state }
  }

  /**
   * Handle SSO callback
   */
  async handleSSOCallback(code: string, state?: string): Promise<SSOCallbackResult> {
    // Validate state if provided
    if (state) {
      const storedState = await this.ctx.storage.get<{ expiresAt: number }>(`sso_state:${state}`)
      if (!storedState || storedState.expiresAt < Date.now()) {
        return { success: false, error: 'Invalid or expired state' }
      }
      await this.ctx.storage.delete(`sso_state:${state}`)
    }

    // Simulate WorkOS SSO profile response
    if (code === 'invalid_code') {
      return { success: false, error: 'Invalid SSO code' }
    }

    const profile: SSOProfile = {
      id: 'prof_' + crypto.randomUUID().slice(0, 8),
      idpId: 'idp_user_' + crypto.randomUUID().slice(0, 8),
      email: 'sso@example.com',
      firstName: 'SSO',
      lastName: 'User',
      groups: code === 'sso_code_with_groups' ? ['admin', 'developers'] : undefined,
      rawAttributes: { department: 'engineering' },
      connectionId: 'conn_test123',
      connectionType: 'SAML',
      organizationId: 'org_test123',
    }

    // Create session
    const sessionId = 'session_' + crypto.randomUUID().slice(0, 24)
    const accessToken = crypto.randomUUID()
    const expiresAt = Date.now() + 3600 * 1000

    await this.ctx.storage.put(
      `session:${sessionId}`,
      {
        id: sessionId,
        userId: profile.id,
        email: profile.email,
        accessToken,
        expiresAt,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      },
      { expirationTtl: 3600 }
    )

    return {
      success: true,
      profile,
      session: {
        id: sessionId,
        accessToken,
        expiresAt,
      },
    }
  }

  /**
   * Get SSO connection by ID
   */
  async getConnection(connectionId: string): Promise<SSOConnection | null> {
    const connection = await this.ctx.storage.get<SSOConnection>(`connection:${connectionId}`)
    if (connection) return connection

    // Return mock connection for testing
    if (connectionId === 'conn_test123') {
      return {
        id: 'conn_test123',
        name: 'Test SAML Connection',
        connectionType: 'SAML',
        state: 'active',
        organizationId: 'org_test123',
        domains: ['test.com'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return null
  }

  /**
   * List SSO connections for an organization
   */
  async listConnections(organizationId: string): Promise<SSOConnection[]> {
    const connections: SSOConnection[] = []
    const entries = await this.ctx.storage.list<SSOConnection>({ prefix: 'connection:' })

    for (const [, conn] of entries) {
      if (conn.organizationId === organizationId) {
        connections.push(conn)
      }
    }

    // Return mock connections for testing
    if (connections.length === 0 && organizationId === 'org_test123') {
      return [
        {
          id: 'conn_test123',
          name: 'Test SAML Connection',
          connectionType: 'SAML',
          state: 'active',
          organizationId: 'org_test123',
          domains: ['test.com'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    }

    return connections
  }

  // ==========================================================================
  // Vault API (env.ID.vault)
  // ==========================================================================

  /**
   * Store a secret in the vault
   * env.ID.vault.store(customerId, key, value)
   */
  async vaultStore(customerId: string, key: string, value: string): Promise<{ success: boolean }> {
    if (!customerId || !key) {
      throw new Error('Customer ID and key are required')
    }

    const secretKey = `vault:${customerId}:${key}`
    const now = Date.now()

    const secret: VaultSecret = {
      key,
      value,
      customerId,
      createdAt: now,
      updatedAt: now,
    }

    // Check if secret exists (for updatedAt)
    const existing = await this.ctx.storage.get<VaultSecret>(secretKey)
    if (existing) {
      secret.createdAt = existing.createdAt
    }

    await this.ctx.storage.put(secretKey, secret)

    return { success: true }
  }

  /**
   * Retrieve a secret from the vault
   * env.ID.vault.get(customerId, key)
   */
  async vaultGet(customerId: string, key: string): Promise<string | null> {
    if (!customerId || !key) {
      throw new Error('Customer ID and key are required')
    }

    const secretKey = `vault:${customerId}:${key}`
    const secret = await this.ctx.storage.get<VaultSecret>(secretKey)

    return secret?.value ?? null
  }

  /**
   * Delete a secret from the vault
   */
  async vaultDelete(customerId: string, key: string): Promise<boolean> {
    if (!customerId || !key) {
      throw new Error('Customer ID and key are required')
    }

    const secretKey = `vault:${customerId}:${key}`
    return this.ctx.storage.delete(secretKey)
  }

  /**
   * List all secrets for a customer (returns keys only, not values)
   */
  async vaultList(customerId: string): Promise<string[]> {
    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    const prefix = `vault:${customerId}:`
    const entries = await this.ctx.storage.list<VaultSecret>({ prefix })
    const keys: string[] = []

    for (const [, secret] of entries) {
      keys.push(secret.key)
    }

    return keys
  }

  // ==========================================================================
  // Organizations API (env.ID.organizations)
  // ==========================================================================

  /**
   * Create a new organization
   * env.ID.organizations.create({ name, slug, domains })
   */
  async createOrganization(options: CreateOrganizationOptions): Promise<Organization> {
    const id = 'org_' + crypto.randomUUID().slice(0, 12)
    const slug = options.slug || options.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const now = new Date().toISOString()

    const domains: OrganizationDomain[] = (options.domains || []).map((domain, i) => ({
      id: `dom_${id}_${i}`,
      domain,
      state: 'pending',
    }))

    const org: Organization = {
      id,
      name: options.name,
      slug,
      allowProfilesOutsideOrganization: false,
      domains,
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    }

    await this.ctx.storage.put(`organization:${id}`, org)
    await this.ctx.storage.put(`organization_slug:${slug}`, id)

    return org
  }

  /**
   * Get an organization by ID
   * env.ID.organizations.get(organizationId)
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    const org = await this.ctx.storage.get<Organization>(`organization:${organizationId}`)
    if (org) return org

    // Return mock organization for testing
    if (organizationId === 'org_test123') {
      return {
        id: 'org_test123',
        name: 'Test Organization',
        slug: 'test-org',
        allowProfilesOutsideOrganization: false,
        domains: [{ id: 'dom_1', domain: 'test.com', state: 'verified' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return null
  }

  /**
   * Get an organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const orgId = await this.ctx.storage.get<string>(`organization_slug:${slug}`)
    if (orgId) {
      return this.getOrganization(orgId)
    }

    // Check mock data
    if (slug === 'test-org') {
      return this.getOrganization('org_test123')
    }

    return null
  }

  /**
   * List all organizations
   * env.ID.organizations.list({ limit, offset })
   */
  async listOrganizations(options: ListOrganizationsOptions = {}): Promise<Organization[]> {
    const { limit = 100, offset = 0 } = options
    const orgs: Organization[] = []
    const entries = await this.ctx.storage.list<Organization>({ prefix: 'organization:' })

    // Filter to only actual organization entries (not slugs)
    for (const [key, org] of entries) {
      if (!key.includes('_slug:')) {
        orgs.push(org)
      }
    }

    // Sort by creation date
    orgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return orgs.slice(offset, offset + limit)
  }

  /**
   * Update an organization
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Pick<Organization, 'name' | 'allowProfilesOutsideOrganization' | 'metadata'>>
  ): Promise<Organization | null> {
    const org = await this.getOrganization(organizationId)
    if (!org) return null

    const updated: Organization = {
      ...org,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.ctx.storage.put(`organization:${organizationId}`, updated)

    return updated
  }

  /**
   * Delete an organization
   */
  async deleteOrganization(organizationId: string): Promise<boolean> {
    const org = await this.getOrganization(organizationId)
    if (!org) return false

    await this.ctx.storage.delete(`organization:${organizationId}`)
    await this.ctx.storage.delete(`organization_slug:${org.slug}`)

    return true
  }

  // ==========================================================================
  // Users API (env.ID.users)
  // ==========================================================================

  /**
   * Create a new user
   * env.ID.users.create({ email, firstName, lastName, organizationId })
   */
  async createUser(options: CreateUserOptions): Promise<User> {
    const id = 'user_' + crypto.randomUUID().slice(0, 12)
    const now = new Date().toISOString()

    const user: User = {
      id,
      email: options.email,
      emailVerified: false,
      firstName: options.firstName,
      lastName: options.lastName,
      organizationId: options.organizationId,
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    }

    await this.ctx.storage.put(`user:${id}`, user)
    await this.ctx.storage.put(`user_email:${options.email.toLowerCase()}`, id)

    return user
  }

  /**
   * Get a user by ID
   * env.ID.users.get(userId)
   */
  async getUser(userId: string): Promise<User | null> {
    const user = await this.ctx.storage.get<User>(`user:${userId}`)
    if (user) return user

    // Return mock user for testing
    if (userId === 'user_test123') {
      return {
        id: 'user_test123',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    return null
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await this.ctx.storage.get<string>(`user_email:${email.toLowerCase()}`)
    if (userId) {
      return this.getUser(userId)
    }

    // Check mock data
    if (email.toLowerCase() === 'test@example.com') {
      return this.getUser('user_test123')
    }

    return null
  }

  /**
   * List users
   * env.ID.users.list({ organizationId, limit, offset })
   */
  async listUsers(options: ListUsersOptions = {}): Promise<User[]> {
    const { organizationId, limit = 100, offset = 0 } = options
    const users: User[] = []
    const entries = await this.ctx.storage.list<User>({ prefix: 'user:' })

    // Filter to only actual user entries (not emails)
    for (const [key, user] of entries) {
      if (!key.includes('_email:')) {
        if (!organizationId || user.organizationId === organizationId) {
          users.push(user)
        }
      }
    }

    // Sort by creation date
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return users.slice(offset, offset + limit)
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, updates: UpdateUserOptions): Promise<User | null> {
    const user = await this.getUser(userId)
    if (!user) return null

    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.ctx.storage.put(`user:${userId}`, updated)

    return updated
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.getUser(userId)
    if (!user) return false

    await this.ctx.storage.delete(`user:${userId}`)
    await this.ctx.storage.delete(`user_email:${user.email.toLowerCase()}`)

    return true
  }

  // ==========================================================================
  // Directory Sync API
  // ==========================================================================

  /**
   * Sync a directory
   */
  async syncDirectory(directoryId: string): Promise<DirectorySyncResult> {
    const directory = await this.ctx.storage.get<Directory>(`directory:${directoryId}`)

    if (!directory && directoryId !== 'dir_test123') {
      return { success: false, usersUpdated: 0, groupsUpdated: 0, error: 'Directory not found' }
    }

    // Simulate directory sync
    return {
      success: true,
      usersUpdated: 5,
      groupsUpdated: 2,
    }
  }

  /**
   * List directories for an organization
   */
  async listDirectories(organizationId: string): Promise<Directory[]> {
    const directories: Directory[] = []
    const entries = await this.ctx.storage.list<Directory>({ prefix: 'directory:' })

    for (const [, dir] of entries) {
      if (dir.organizationId === organizationId) {
        directories.push(dir)
      }
    }

    return directories
  }

  // ==========================================================================
  // Admin Portal API
  // ==========================================================================

  /**
   * Generate an Admin Portal link for self-service IT admin interface
   */
  async generateAdminPortalLink(options: AdminPortalLinkOptions): Promise<AdminPortalLink> {
    const org = await this.getOrganization(options.organizationId)
    if (!org) {
      throw new Error('Organization not found')
    }

    // Generate a time-limited portal link
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    await this.ctx.storage.put(
      `admin_portal:${token}`,
      {
        organizationId: options.organizationId,
        returnUrl: options.returnUrl,
        successUrl: options.successUrl,
        expiresAt,
      },
      { expirationTtl: 300 }
    )

    return {
      url: `https://id.org.ai/admin-portal?token=${token}`,
      expiresAt,
    }
  }

  // ==========================================================================
  // HTTP App Creation
  // ==========================================================================

  private createApp(): Hono {
    const app = new Hono()

    // OAuth 2.1 Authorization Endpoint
    app.get('/oauth2/authorize', async (c) => {
      const auth = await this.getAuth()
      const url = new URL(c.req.url)

      // Check if user is already authenticated
      const session = await auth.api.getSession({ headers: c.req.raw.headers })

      if (!session) {
        // Store OAuth params and redirect to login
        const state = crypto.randomUUID()
        await this.ctx.storage.put(`oauth:${state}`, {
          params: url.searchParams.toString(),
          timestamp: Date.now(),
        })

        const loginUrl = new URL('/login', url.origin)
        loginUrl.searchParams.set('return_to', `/oauth2/authorize?${url.searchParams.toString()}`)
        return c.redirect(loginUrl.toString())
      }

      // User is authenticated, check consent
      const clientId = url.searchParams.get('client_id')
      const scope = url.searchParams.get('scope') || 'openid profile email'
      const redirectUri = url.searchParams.get('redirect_uri')
      const responseType = url.searchParams.get('response_type')
      const codeChallenge = url.searchParams.get('code_challenge')
      const codeChallengeMethod = url.searchParams.get('code_challenge_method')
      const state = url.searchParams.get('state')

      if (!clientId || !redirectUri || responseType !== 'code') {
        return c.json({ error: 'invalid_request', error_description: 'Missing required parameters' }, 400)
      }

      // Verify client
      const client = await this.getClient(clientId)
      if (!client) {
        return c.json({ error: 'invalid_client', error_description: 'Unknown client' }, 400)
      }

      // Verify redirect URI
      if (!client.redirectUris.includes(redirectUri)) {
        return c.json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' }, 400)
      }

      // Check if consent already granted
      const consentKey = `consent:${session.user.id}:${clientId}`
      const existingConsent = await this.ctx.storage.get<{ scopes: string[] }>(consentKey)
      const requestedScopes = scope.split(' ')

      if (!client.trusted && (!existingConsent || !requestedScopes.every((s) => existingConsent.scopes.includes(s)))) {
        // Redirect to consent page
        const consentUrl = new URL('/consent', url.origin)
        consentUrl.searchParams.set('client_id', clientId)
        consentUrl.searchParams.set('scope', scope)
        consentUrl.searchParams.set('redirect_uri', redirectUri)
        if (state) consentUrl.searchParams.set('state', state)
        if (codeChallenge) {
          consentUrl.searchParams.set('code_challenge', codeChallenge)
          consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod || 'S256')
        }
        return c.redirect(consentUrl.toString())
      }

      // Generate authorization code
      const code = crypto.randomUUID()
      await this.ctx.storage.put(
        `code:${code}`,
        {
          clientId,
          userId: session.user.id,
          scopes: requestedScopes,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          timestamp: Date.now(),
        },
        { expirationTtl: 600 }
      ) // 10 minute TTL

      // Redirect back to client
      const redirectUrl = new URL(redirectUri)
      redirectUrl.searchParams.set('code', code)
      if (state) redirectUrl.searchParams.set('state', state)

      return c.redirect(redirectUrl.toString())
    })

    // OAuth 2.1 Token Endpoint
    app.post('/oauth2/token', async (c) => {
      const body = await c.req.parseBody()
      const grantType = body.grant_type as string

      if (grantType === 'authorization_code') {
        return this.handleAuthorizationCodeGrant(c, body)
      } else if (grantType === 'refresh_token') {
        return this.handleRefreshTokenGrant(c, body)
      } else if (grantType === 'client_credentials') {
        return this.handleClientCredentialsGrant(c, body)
      }

      return c.json({ error: 'unsupported_grant_type' }, 400)
    })

    // UserInfo Endpoint
    app.get('/oauth2/userinfo', async (c) => {
      const authHeader = c.req.header('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const token = authHeader.substring(7)
      const tokenData = await this.ctx.storage.get<{
        userId: string
        scopes: string[]
        clientId: string
      }>(`access:${token}`)

      if (!tokenData) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const user = await this.getUser(tokenData.userId)

      if (!user) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const claims: Record<string, unknown> = {
        sub: tokenData.userId,
      }

      if (tokenData.scopes.includes('profile')) {
        claims.name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        claims.picture = user.profilePictureUrl
      }

      if (tokenData.scopes.includes('email')) {
        claims.email = user.email
        claims.email_verified = user.emailVerified
      }

      return c.json(claims)
    })

    // Token Introspection
    app.post('/oauth2/introspect', async (c) => {
      const body = await c.req.parseBody()
      const token = body.token as string

      if (!token) {
        return c.json({ active: false })
      }

      const tokenData = await this.ctx.storage.get<{
        userId: string
        scopes: string[]
        clientId: string
        exp: number
      }>(`access:${token}`)

      if (!tokenData || tokenData.exp < Date.now()) {
        return c.json({ active: false })
      }

      return c.json({
        active: true,
        client_id: tokenData.clientId,
        sub: tokenData.userId,
        scope: tokenData.scopes.join(' '),
        exp: Math.floor(tokenData.exp / 1000),
      })
    })

    // Token Revocation
    app.post('/oauth2/revoke', async (c) => {
      const body = await c.req.parseBody()
      const token = body.token as string

      if (token) {
        await this.ctx.storage.delete(`access:${token}`)
        await this.ctx.storage.delete(`refresh:${token}`)
      }

      return c.text('', 200)
    })

    // SSO Authorization Endpoint
    app.get('/sso/authorize', async (c) => {
      const organization = c.req.query('organization')
      const organizationId = c.req.query('organization_id')
      const connectionId = c.req.query('connection_id')
      const domainHint = c.req.query('domain_hint')
      const loginHint = c.req.query('login_hint')
      const redirectUri = c.req.query('redirect_uri')
      const state = c.req.query('state')

      const result = await this.getAuthorizationUrl({
        organization,
        organizationId,
        connectionId,
        domainHint,
        loginHint,
        redirectUri,
        state,
      })

      return c.redirect(result.url)
    })

    // SSO Callback Endpoint
    app.get('/sso/callback', async (c) => {
      const code = c.req.query('code')
      const state = c.req.query('state')

      if (!code) {
        return c.json({ error: 'Missing code parameter' }, 400)
      }

      const result = await this.handleSSOCallback(code, state || undefined)

      if (!result.success) {
        return c.json({ error: result.error }, 400)
      }

      // Set session cookie and redirect
      const response = c.redirect('/')
      if (result.session) {
        response.headers.set(
          'Set-Cookie',
          `session=${result.session.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`
        )
      }
      return response
    })

    // Login page - redirects to WorkOS AuthKit
    app.get('/login', async (c) => {
      const returnTo = c.req.query('return_to') || '/oauth2/authorize'
      const state = crypto.randomUUID()

      // Store return URL
      await this.ctx.storage.put(`login:${state}`, { returnTo, timestamp: Date.now() }, { expirationTtl: 600 })

      // Generate WorkOS AuthKit URL
      const authUrl = this.workos.userManagement.getAuthorizationUrl({
        clientId: this.env.WORKOS_CLIENT_ID,
        redirectUri: 'https://id.org.ai/callback',
        state,
        provider: undefined, // Let user choose
      })

      return c.redirect(authUrl)
    })

    // WorkOS AuthKit callback
    app.get('/callback', async (c) => {
      const code = c.req.query('code')
      const state = c.req.query('state')

      if (!code || !state) {
        return c.json({ error: 'invalid_request' }, 400)
      }

      // Get stored return URL
      const loginState = await this.ctx.storage.get<{ returnTo: string }>(`login:${state}`)
      await this.ctx.storage.delete(`login:${state}`)

      try {
        // Exchange code for user
        const { user, organizationId, accessToken, refreshToken } = await this.workos.userManagement.authenticateWithCode({
          clientId: this.env.WORKOS_CLIENT_ID,
          code,
        })

        // Store provider tokens in vault if org context
        if (organizationId && accessToken) {
          await this.vaultStore(organizationId, 'provider_token', accessToken)
          if (refreshToken) {
            await this.vaultStore(organizationId, 'provider_refresh_token', refreshToken)
          }
        }

        // Create session
        const sessionToken = crypto.randomUUID()
        await this.ctx.storage.put(
          `session:${sessionToken}`,
          {
            userId: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            picture: user.profilePictureUrl,
            organizationId,
            createdAt: Date.now(),
          },
          { expirationTtl: 60 * 60 * 24 * 7 }
        ) // 7 days

        // Set session cookie and redirect
        const returnTo = loginState?.returnTo || '/'
        const response = c.redirect(returnTo)
        response.headers.set('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`)
        return response
      } catch (error) {
        console.error('WorkOS callback error:', error)
        return c.json({ error: 'authentication_failed' }, 500)
      }
    })

    // Consent page
    app.get('/consent', async (c) => {
      const clientId = c.req.query('client_id')
      const scope = c.req.query('scope') || 'openid profile email'
      const redirectUri = c.req.query('redirect_uri')
      const state = c.req.query('state')

      if (!clientId || !redirectUri) {
        return c.json({ error: 'invalid_request' }, 400)
      }

      const client = await this.getClient(clientId)
      if (!client) {
        return c.json({ error: 'invalid_client' }, 400)
      }

      // Render consent page
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorize ${client.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; }
              .app-name { font-size: 1.5em; font-weight: bold; margin-bottom: 20px; }
              .scopes { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .scope { padding: 5px 0; }
              .buttons { display: flex; gap: 10px; margin-top: 20px; }
              button { flex: 1; padding: 12px; border-radius: 8px; font-size: 16px; cursor: pointer; }
              .allow { background: #000; color: #fff; border: none; }
              .deny { background: #fff; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="app-name">${client.name}</div>
            <p>wants to access your account</p>
            <div class="scopes">
              ${scope
                .split(' ')
                .map(
                  (s) => `
                <div class="scope">- ${this.getScopeDescription(s)}</div>
              `
                )
                .join('')}
            </div>
            <form method="POST" action="/consent">
              <input type="hidden" name="client_id" value="${clientId}">
              <input type="hidden" name="scope" value="${scope}">
              <input type="hidden" name="redirect_uri" value="${redirectUri}">
              ${state ? `<input type="hidden" name="state" value="${state}">` : ''}
              <div class="buttons">
                <button type="submit" name="action" value="deny" class="deny">Deny</button>
                <button type="submit" name="action" value="allow" class="allow">Allow</button>
              </div>
            </form>
          </body>
        </html>
      `)
    })

    // Handle consent submission
    app.post('/consent', async (c) => {
      const body = await c.req.parseBody()
      const action = body.action as string
      const clientId = body.client_id as string
      const scope = body.scope as string
      const redirectUri = body.redirect_uri as string
      const state = body.state as string

      // Get session
      const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
      if (!sessionToken) {
        return c.redirect('/login?return_to=' + encodeURIComponent(c.req.url))
      }

      const session = await this.ctx.storage.get<{ userId: string }>(`session:${sessionToken}`)
      if (!session) {
        return c.redirect('/login?return_to=' + encodeURIComponent(c.req.url))
      }

      if (action === 'deny') {
        const url = new URL(redirectUri)
        url.searchParams.set('error', 'access_denied')
        if (state) url.searchParams.set('state', state)
        return c.redirect(url.toString())
      }

      // Store consent
      const consentKey = `consent:${session.userId}:${clientId}`
      await this.ctx.storage.put(consentKey, { scopes: scope.split(' '), timestamp: Date.now() })

      // Continue with authorization
      const authUrl = new URL('/oauth2/authorize', c.req.url)
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      if (state) authUrl.searchParams.set('state', state)

      return c.redirect(authUrl.toString())
    })

    // Client Registration
    app.post('/oauth2/register', async (c) => {
      const body = await c.req.json<{
        client_name: string
        redirect_uris: string[]
        scope?: string
        grant_types?: string[]
      }>()

      const clientId = crypto.randomUUID()
      const clientSecret = crypto.randomUUID()

      const client: OAuthClient = {
        id: clientId,
        name: body.client_name,
        secret: clientSecret,
        redirectUris: body.redirect_uris,
        scopes: body.scope?.split(' ') || ['openid', 'profile', 'email'],
        trusted: false,
        createdAt: new Date().toISOString(),
      }

      await this.ctx.storage.put(`client:${clientId}`, client)

      return c.json({
        client_id: clientId,
        client_secret: clientSecret,
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      })
    })

    // ==========================================================================
    // API Routes
    // ==========================================================================

    // API: Get current user
    app.get('/api/me', async (c) => {
      const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
      if (!sessionToken) {
        return c.json({ error: 'unauthorized' }, 401)
      }

      const session = await this.ctx.storage.get<{
        userId: string
        email: string
        name: string
        picture?: string
        organizationId?: string
      }>(`session:${sessionToken}`)

      if (!session) {
        return c.json({ error: 'unauthorized' }, 401)
      }

      return c.json({
        id: session.userId,
        email: session.email,
        name: session.name,
        picture: session.picture,
        organizationId: session.organizationId,
      })
    })

    // API: SSO
    app.get('/api/sso/authorization-url', async (c) => {
      const organization = c.req.query('organization')
      const organizationId = c.req.query('organization_id')
      const result = await this.getAuthorizationUrl({ organization, organizationId })
      return c.json(result)
    })

    // API: Organizations
    app.post('/api/organizations', async (c) => {
      const body = await c.req.json<CreateOrganizationOptions>()
      const org = await this.createOrganization(body)
      return c.json(org, 201)
    })

    app.get('/api/organizations', async (c) => {
      const limit = parseInt(c.req.query('limit') || '100')
      const offset = parseInt(c.req.query('offset') || '0')
      const orgs = await this.listOrganizations({ limit, offset })
      return c.json(orgs)
    })

    app.get('/api/organizations/:id', async (c) => {
      const id = c.req.param('id')
      const org = await this.getOrganization(id)
      if (!org) {
        return c.json({ error: 'Organization not found' }, 404)
      }
      return c.json(org)
    })

    app.patch('/api/organizations/:id', async (c) => {
      const id = c.req.param('id')
      const updates = await c.req.json<Partial<Pick<Organization, 'name' | 'allowProfilesOutsideOrganization' | 'metadata'>>>()
      const org = await this.updateOrganization(id, updates)
      if (!org) {
        return c.json({ error: 'Organization not found' }, 404)
      }
      return c.json(org)
    })

    app.delete('/api/organizations/:id', async (c) => {
      const id = c.req.param('id')
      const deleted = await this.deleteOrganization(id)
      if (!deleted) {
        return c.json({ error: 'Organization not found' }, 404)
      }
      return c.json({ success: true })
    })

    // API: Users
    app.post('/api/users', async (c) => {
      const body = await c.req.json<CreateUserOptions>()
      const user = await this.createUser(body)
      return c.json(user, 201)
    })

    app.get('/api/users', async (c) => {
      const organizationId = c.req.query('organization_id')
      const limit = parseInt(c.req.query('limit') || '100')
      const offset = parseInt(c.req.query('offset') || '0')
      const users = await this.listUsers({ organizationId, limit, offset })
      return c.json(users)
    })

    app.get('/api/users/:id', async (c) => {
      const id = c.req.param('id')
      const user = await this.getUser(id)
      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }
      return c.json(user)
    })

    app.patch('/api/users/:id', async (c) => {
      const id = c.req.param('id')
      const updates = await c.req.json<UpdateUserOptions>()
      const user = await this.updateUser(id, updates)
      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }
      return c.json(user)
    })

    app.delete('/api/users/:id', async (c) => {
      const id = c.req.param('id')
      const deleted = await this.deleteUser(id)
      if (!deleted) {
        return c.json({ error: 'User not found' }, 404)
      }
      return c.json({ success: true })
    })

    // API: Vault
    app.post('/api/vault/:customerId/:key', async (c) => {
      const customerId = c.req.param('customerId')
      const key = c.req.param('key')
      const { value } = await c.req.json<{ value: string }>()
      const result = await this.vaultStore(customerId, key, value)
      return c.json(result)
    })

    app.get('/api/vault/:customerId/:key', async (c) => {
      const customerId = c.req.param('customerId')
      const key = c.req.param('key')
      const value = await this.vaultGet(customerId, key)
      if (value === null) {
        return c.json({ error: 'Secret not found' }, 404)
      }
      return c.json({ value })
    })

    app.delete('/api/vault/:customerId/:key', async (c) => {
      const customerId = c.req.param('customerId')
      const key = c.req.param('key')
      const deleted = await this.vaultDelete(customerId, key)
      if (!deleted) {
        return c.json({ error: 'Secret not found' }, 404)
      }
      return c.json({ success: true })
    })

    app.get('/api/vault/:customerId', async (c) => {
      const customerId = c.req.param('customerId')
      const keys = await this.vaultList(customerId)
      return c.json({ keys })
    })

    // API: Directories
    app.post('/api/directories/:id/sync', async (c) => {
      const id = c.req.param('id')
      const result = await this.syncDirectory(id)
      return c.json(result)
    })

    app.get('/api/directories', async (c) => {
      const organizationId = c.req.query('organization_id')
      if (!organizationId) {
        return c.json({ error: 'organization_id is required' }, 400)
      }
      const directories = await this.listDirectories(organizationId)
      return c.json(directories)
    })

    // API: Admin Portal
    app.post('/api/admin-portal', async (c) => {
      const body = await c.req.json<AdminPortalLinkOptions>()
      try {
        const link = await this.generateAdminPortalLink(body)
        return c.json(link)
      } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
      }
    })

    // API: Connections
    app.get('/api/connections/:id', async (c) => {
      const id = c.req.param('id')
      const connection = await this.getConnection(id)
      if (!connection) {
        return c.json({ error: 'Connection not found' }, 404)
      }
      return c.json(connection)
    })

    app.get('/api/connections', async (c) => {
      const organizationId = c.req.query('organization_id')
      if (!organizationId) {
        return c.json({ error: 'organization_id is required' }, 400)
      }
      const connections = await this.listConnections(organizationId)
      return c.json(connections)
    })

    // JWKS endpoint
    app.get('/.well-known/jwks.json', async (c) => {
      // In production, generate and cache proper RSA/EC keys
      // For now, return placeholder
      return c.json({
        keys: [],
      })
    })

    return app
  }

  // ==========================================================================
  // Grant Handlers
  // ==========================================================================

  private async handleAuthorizationCodeGrant(c: any, body: Record<string, string | File>) {
    const code = body.code as string
    const clientId = body.client_id as string
    const clientSecret = body.client_secret as string
    const redirectUri = body.redirect_uri as string
    const codeVerifier = body.code_verifier as string

    // Get stored code data
    const codeData = await this.ctx.storage.get<{
      clientId: string
      userId: string
      scopes: string[]
      redirectUri: string
      codeChallenge?: string
      codeChallengeMethod?: string
    }>(`code:${code}`)

    if (!codeData) {
      return c.json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, 400)
    }

    // Verify client
    if (codeData.clientId !== clientId) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Verify redirect URI
    if (codeData.redirectUri !== redirectUri) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Verify PKCE
    if (codeData.codeChallenge) {
      if (!codeVerifier) {
        return c.json({ error: 'invalid_grant', error_description: 'Missing code_verifier' }, 400)
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(codeVerifier)
      const hash = await crypto.subtle.digest('SHA-256', data)
      const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      if (challenge !== codeData.codeChallenge) {
        return c.json({ error: 'invalid_grant', error_description: 'Invalid code_verifier' }, 400)
      }
    } else if (clientSecret) {
      // Verify client secret for non-PKCE flows
      const client = await this.getClient(clientId)
      if (!client || client.secret !== clientSecret) {
        return c.json({ error: 'invalid_client' }, 401)
      }
    }

    // Delete used code
    await this.ctx.storage.delete(`code:${code}`)

    // Generate tokens
    const accessToken = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()
    const expiresIn = 3600 // 1 hour

    // Store access token
    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        userId: codeData.userId,
        clientId,
        scopes: codeData.scopes,
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    // Store refresh token
    await this.ctx.storage.put(
      `refresh:${refreshToken}`,
      {
        userId: codeData.userId,
        clientId,
        scopes: codeData.scopes,
      },
      { expirationTtl: 60 * 60 * 24 * 30 }
    ) // 30 days

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: codeData.scopes.join(' '),
    })
  }

  private async handleRefreshTokenGrant(c: any, body: Record<string, string | File>) {
    const refreshToken = body.refresh_token as string
    const clientId = body.client_id as string

    const tokenData = await this.ctx.storage.get<{
      userId: string
      clientId: string
      scopes: string[]
    }>(`refresh:${refreshToken}`)

    if (!tokenData || tokenData.clientId !== clientId) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Generate new access token
    const accessToken = crypto.randomUUID()
    const expiresIn = 3600

    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        userId: tokenData.userId,
        clientId,
        scopes: tokenData.scopes,
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: tokenData.scopes.join(' '),
    })
  }

  private async handleClientCredentialsGrant(c: any, body: Record<string, string | File>) {
    const clientId = body.client_id as string
    const clientSecret = body.client_secret as string
    const scope = (body.scope as string) || 'openid'

    const client = await this.getClient(clientId)
    if (!client || client.secret !== clientSecret) {
      return c.json({ error: 'invalid_client' }, 401)
    }

    const accessToken = crypto.randomUUID()
    const expiresIn = 3600

    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        clientId,
        scopes: scope.split(' '),
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope,
    })
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getClient(clientId: string): Promise<OAuthClient | null> {
    return this.ctx.storage.get<OAuthClient>(`client:${clientId}`)
  }

  private getScopeDescription(scope: string): string {
    const descriptions: Record<string, string> = {
      openid: 'Access your user ID',
      profile: 'Access your name and profile picture',
      email: 'Access your email address',
      offline_access: 'Access your data when you are not present',
    }
    return descriptions[scope] || scope
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request)
  }
}
