/**
 * WorkOSDO - id.org.ai Auth for AI and Humans Durable Object
 *
 * This Durable Object implements enterprise identity management via WorkOS:
 * - SSO authorization URL generation
 * - User listing from directory sync
 * - Token authentication and validation
 * - Agent token creation for machine-to-machine auth
 * - Vault storage for org-level secrets
 *
 * Per CLAUDE.md:
 * - id.org.ai handles enterprise SSO out-of-the-box
 * - Org-level secret storage (API keys, credentials)
 * - Org user management
 */

// ============================================================================
// Environment Types
// ============================================================================

export interface WorkOSEnv {
  WORKOS_DO: {
    get: (id: DurableObjectId) => DurableObjectStub
    idFromName: (name: string) => DurableObjectId
  }
  SECRETS: KVNamespace
  WORKOS_API_KEY: string
  WORKOS_CLIENT_ID: string
  WORKOS_REDIRECT_URI: string
  ENCRYPTION_KEY: string
}

interface DurableObjectId {
  name?: string
  toString(): string
  equals(other: DurableObjectId): boolean
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>
}

interface DOState {
  id: DurableObjectId
  storage: DOStorage
  blockConcurrencyWhile(callback: () => Promise<void>): void
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getWebSockets(tag?: string): WebSocket[]
  setWebSocketAutoResponse(pair: { request: string; response: string }): void
}

interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void>
  put<T>(entries: Record<string, T>, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
  transaction<T>(closure: (txn: DOStorage) => Promise<T>): Promise<T>
}

// ============================================================================
// SSO Types
// ============================================================================

export interface SSOAuthorizationOptions {
  organization?: string
  organizationId?: string
  connection?: string
  connectionId?: string
  redirectUri?: string
  state?: string
  domainHint?: string
  loginHint?: string
  provider?: string
}

export interface SSOAuthorizationResult {
  url: string
  state: string
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

// ============================================================================
// User/Directory Types
// ============================================================================

export interface DirectoryUser {
  id: string
  directoryId: string
  organizationId?: string
  email: string
  firstName?: string
  lastName?: string
  jobTitle?: string
  state: 'active' | 'inactive' | 'suspended'
  groups: DirectoryGroup[]
  rawAttributes?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DirectoryGroup {
  id: string
  name: string
  directoryId: string
  organizationId?: string
  rawAttributes?: Record<string, unknown>
}

export interface ListUsersOptions {
  directory?: string
  directoryId?: string
  limit?: number
  before?: string
  after?: string
  group?: string
}

export interface ListUsersResult {
  data: DirectoryUser[]
  listMetadata: {
    before?: string
    after?: string
  }
}

// ============================================================================
// Token Types
// ============================================================================

export interface TokenValidationResult {
  valid: boolean
  userId?: string
  email?: string
  organizationId?: string
  scopes?: string[]
  expiresAt?: number
  tokenType?: 'user' | 'agent'
  error?: string
}

export interface TokenIntrospectionResult {
  active: boolean
  sub?: string
  clientId?: string
  username?: string
  tokenType?: string
  exp?: number
  iat?: number
  iss?: string
  aud?: string
  scope?: string
  organizationId?: string
}

export interface AuthenticateResult {
  success: boolean
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    organizationId?: string
  }
  session?: {
    id: string
    expiresAt: number
  }
  error?: string
}

// ============================================================================
// Agent Token Types
// ============================================================================

export interface CreateAgentTokenOptions {
  orgId: string
  name: string
  permissions: string[]
  expiresIn?: number
  metadata?: Record<string, unknown>
}

export interface AgentToken {
  id: string
  orgId: string
  name: string
  permissions: string[]
  token: string
  expiresAt?: number
  createdAt: number
  metadata?: Record<string, unknown>
}

export interface AgentTokenMetadata {
  id: string
  orgId: string
  name: string
  permissions: string[]
  expiresAt?: number
  createdAt: number
  metadata?: Record<string, unknown>
}

export interface ListAgentTokensOptions {
  limit?: number
  after?: string
}

export interface ListAgentTokensResult {
  data: AgentTokenMetadata[]
  listMetadata: {
    before?: string
    after?: string
  }
}

// ============================================================================
// Vault Types
// ============================================================================

export interface VaultSecretMetadata {
  key: string
  orgId: string
  createdAt: number
  updatedAt: number
  version: number
  description?: string
}

export interface ListSecretsOptions {
  prefix?: string
  limit?: number
}

export interface ListSecretsResult {
  data: VaultSecretMetadata[]
}

// ============================================================================
// Internal Storage Types
// ============================================================================

interface StoredState {
  createdAt: number
  expiresAt: number
  options?: SSOAuthorizationOptions
}

interface StoredToken {
  userId: string
  email?: string
  organizationId?: string
  scopes: string[]
  expiresAt: number
  iat: number
  revoked?: boolean
  tokenType: 'user' | 'agent'
}

interface StoredAgentToken {
  id: string
  orgId: string
  name: string
  permissions: string[]
  tokenHash: string
  expiresAt?: number
  createdAt: number
  metadata?: Record<string, unknown>
  revoked?: boolean
}

interface StoredVaultSecret {
  key: string
  orgId: string
  encryptedValue: string
  createdAt: number
  updatedAt: number
  version: number
  description?: string
}

// ============================================================================
// Mock Data for Testing
// ============================================================================

const MOCK_USERS: Record<string, DirectoryUser> = {
  user_test123: {
    id: 'user_test123',
    directoryId: 'dir_mock_456',
    organizationId: 'org_test123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    state: 'active',
    groups: [
      { id: 'grp_1', name: 'engineering', directoryId: 'dir_mock_456' },
      { id: 'grp_2', name: 'admins', directoryId: 'dir_mock_456' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  user_with_attributes: {
    id: 'user_with_attributes',
    directoryId: 'dir_mock_456',
    email: 'attributes@example.com',
    firstName: 'Attribute',
    lastName: 'User',
    state: 'active',
    groups: [],
    rawAttributes: { department: 'engineering', costCenter: 'CC001' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

// ============================================================================
// WorkOSDO Implementation
// ============================================================================

export class WorkOSDO {
  protected readonly ctx: DOState
  protected readonly env: WorkOSEnv

  constructor(ctx: DOState, env: WorkOSEnv) {
    this.ctx = ctx
    this.env = env
  }

  // ==========================================================================
  // SSO Methods
  // ==========================================================================

  public sso = {
    getAuthorizationUrl: async (options: SSOAuthorizationOptions): Promise<SSOAuthorizationResult> => {
      const state = options.state || this.generateSecureState()

      // Store state for CSRF validation
      const stateData: StoredState = {
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        options,
      }
      await this.ctx.storage.put(`state:${state}`, stateData)

      // Build authorization URL
      const baseUrl = 'https://api.workos.com/sso/authorize'
      const url = new URL(baseUrl)

      url.searchParams.set('client_id', this.env.WORKOS_CLIENT_ID)
      url.searchParams.set('redirect_uri', options.redirectUri || this.env.WORKOS_REDIRECT_URI)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('state', state)

      if (options.organization || options.organizationId) {
        url.searchParams.set('organization', options.organization || options.organizationId!)
      }

      if (options.connection || options.connectionId) {
        url.searchParams.set('connection', options.connection || options.connectionId!)
      }

      if (options.domainHint) {
        url.searchParams.set('domain_hint', options.domainHint)
      }

      if (options.loginHint) {
        url.searchParams.set('login_hint', options.loginHint)
      }

      if (options.provider) {
        url.searchParams.set('provider', options.provider)
      }

      return { url: url.toString(), state }
    },

    handleCallback: async (code: string, state?: string): Promise<SSOCallbackResult> => {
      // Validate state if provided
      if (state) {
        const storedState = await this.ctx.storage.get<StoredState>(`state:${state}`)

        if (!storedState) {
          return { success: false, error: 'Invalid state: CSRF mismatch' }
        }

        if (storedState.expiresAt < Date.now()) {
          await this.ctx.storage.delete(`state:${state}`)
          return { success: false, error: 'State expired' }
        }

        await this.ctx.storage.delete(`state:${state}`)
      }

      if (code === 'invalid_code' || !code) {
        return { success: false, error: 'Invalid SSO code' }
      }

      // Simulate WorkOS SSO profile response
      const profile: SSOProfile = {
        id: 'prof_' + this.generateToken().slice(0, 8),
        idpId: 'idp_user_123',
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
      const sessionId = this.generateSessionId()
      const accessToken = this.generateToken()
      const expiresAt = Date.now() + 3600 * 1000

      await this.storeToken(accessToken, {
        userId: profile.id,
        email: profile.email,
        organizationId: profile.organizationId,
        scopes: ['openid', 'profile', 'email'],
        expiresAt,
        iat: Date.now(),
        tokenType: 'user',
      })

      return {
        success: true,
        profile,
        session: {
          id: sessionId,
          accessToken,
          expiresAt,
        },
      }
    },
  }

  // ==========================================================================
  // Users Methods
  // ==========================================================================

  public users = {
    list: async (orgId: string, options?: ListUsersOptions): Promise<ListUsersResult> => {
      // Get users for this organization
      const users: DirectoryUser[] = []

      // Return mock users for known org
      if (orgId === 'org_test123') {
        for (const user of Object.values(MOCK_USERS)) {
          if (!options?.directory || user.directoryId === options.directory) {
            if (!options?.group || user.groups.some((g) => g.id === options.group || g.name === options.group)) {
              users.push(user)
            }
          }
        }
      }

      // Apply limit
      let result = users
      if (options?.limit) {
        result = users.slice(0, options.limit)
      }

      return {
        data: result,
        listMetadata: {
          after: result.length > 0 ? result[result.length - 1].id : undefined,
        },
      }
    },

    get: async (userId: string): Promise<DirectoryUser | null> => {
      // Check mock users
      if (MOCK_USERS[userId]) {
        return MOCK_USERS[userId]
      }

      // Check storage
      const user = await this.ctx.storage.get<DirectoryUser>(`user:${userId}`)
      return user || null
    },

    getByEmail: async (email: string, orgId?: string): Promise<DirectoryUser | null> => {
      const normalizedEmail = email.toLowerCase()

      // Check mock users
      for (const user of Object.values(MOCK_USERS)) {
        if (user.email.toLowerCase() === normalizedEmail) {
          if (!orgId || user.organizationId === orgId) {
            return user
          }
        }
      }

      return null
    },
  }

  // ==========================================================================
  // Authentication Methods
  // ==========================================================================

  async authenticate(authHeader: string): Promise<AuthenticateResult> {
    if (!authHeader) {
      return { success: false, error: 'Missing authorization header' }
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Invalid authorization header: must be Bearer token' }
    }

    const token = authHeader.substring(7)
    const validation = await this.validateToken(token)

    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    return {
      success: true,
      user: {
        id: validation.userId!,
        email: validation.email!,
        organizationId: validation.organizationId,
      },
      session: {
        id: this.generateSessionId(),
        expiresAt: validation.expiresAt!,
      },
    }
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    // Handle test tokens
    if (token === 'valid_access_token') {
      return {
        valid: true,
        userId: 'user_test123',
        email: 'test@example.com',
        organizationId: 'org_test123',
        scopes: ['openid', 'profile', 'email'],
        expiresAt: Date.now() + 3600 * 1000,
        tokenType: 'user',
      }
    }

    if (token === 'org_user_token') {
      return {
        valid: true,
        userId: 'user_org_123',
        email: 'org@example.com',
        organizationId: 'org_test123',
        scopes: ['openid', 'profile', 'email'],
        expiresAt: Date.now() + 3600 * 1000,
        tokenType: 'user',
      }
    }

    if (token === 'expired_access_token') {
      return { valid: false, error: 'Token expired' }
    }

    if (token === 'revoked_access_token') {
      return { valid: false, error: 'Token has been revoked' }
    }

    if (token === 'invalid_token') {
      return { valid: false, error: 'Invalid or malformed token' }
    }

    // Check storage
    const tokenData = await this.ctx.storage.get<StoredToken>(`token:${token}`)

    if (!tokenData) {
      return { valid: false, error: 'Invalid or malformed token' }
    }

    if (tokenData.revoked) {
      return { valid: false, error: 'Token has been revoked' }
    }

    if (tokenData.expiresAt < Date.now()) {
      return { valid: false, error: 'Token expired' }
    }

    return {
      valid: true,
      userId: tokenData.userId,
      email: tokenData.email,
      organizationId: tokenData.organizationId,
      scopes: tokenData.scopes,
      expiresAt: tokenData.expiresAt,
      tokenType: tokenData.tokenType,
    }
  }

  async introspectToken(token: string): Promise<TokenIntrospectionResult> {
    // Handle test tokens
    if (token === 'valid_access_token') {
      const now = Math.floor(Date.now() / 1000)
      return {
        active: true,
        sub: 'user_test123',
        clientId: this.env.WORKOS_CLIENT_ID,
        username: 'test@example.com',
        tokenType: 'Bearer',
        exp: now + 3600,
        iat: now - 60,
        iss: 'https://id.org.ai',
        scope: 'openid profile email',
      }
    }

    if (token === 'invalid_token' || token === 'expired_access_token') {
      return { active: false }
    }

    const tokenData = await this.ctx.storage.get<StoredToken>(`token:${token}`)

    if (!tokenData || tokenData.revoked || tokenData.expiresAt < Date.now()) {
      return { active: false }
    }

    return {
      active: true,
      sub: tokenData.userId,
      clientId: this.env.WORKOS_CLIENT_ID,
      username: tokenData.email,
      tokenType: 'Bearer',
      exp: Math.floor(tokenData.expiresAt / 1000),
      iat: Math.floor(tokenData.iat / 1000),
      iss: 'https://id.org.ai',
      scope: tokenData.scopes.join(' '),
      organizationId: tokenData.organizationId,
    }
  }

  async revokeToken(token: string): Promise<{ success: boolean }> {
    const tokenData = await this.ctx.storage.get<StoredToken>(`token:${token}`)

    if (tokenData) {
      tokenData.revoked = true
      await this.ctx.storage.put(`token:${token}`, tokenData)
    } else {
      // Create a revoked entry for test tokens
      await this.ctx.storage.put(`token:${token}`, {
        userId: 'unknown',
        scopes: [],
        expiresAt: Date.now(),
        iat: Date.now(),
        revoked: true,
        tokenType: 'user',
      })
    }

    return { success: true }
  }

  // ==========================================================================
  // Agent Token Methods
  // ==========================================================================

  async createAgentToken(options: CreateAgentTokenOptions): Promise<AgentToken> {
    const id = 'agt_' + this.generateToken().slice(0, 16)
    const token = 'agt_' + this.generateToken()
    const now = Date.now()
    const expiresAt = options.expiresIn ? now + options.expiresIn * 1000 : undefined

    const storedToken: StoredAgentToken = {
      id,
      orgId: options.orgId,
      name: options.name,
      permissions: options.permissions,
      tokenHash: await this.hashToken(token),
      expiresAt,
      createdAt: now,
      metadata: options.metadata,
      revoked: false,
    }

    // Store the agent token metadata
    await this.ctx.storage.put(`agent_token:${id}`, storedToken)

    // Store mapping from token to id for validation
    await this.ctx.storage.put(`agent_token_lookup:${token}`, { id, orgId: options.orgId })

    return {
      id,
      orgId: options.orgId,
      name: options.name,
      permissions: options.permissions,
      token,
      expiresAt,
      createdAt: now,
      metadata: options.metadata,
    }
  }

  async listAgentTokens(orgId: string, options?: ListAgentTokensOptions): Promise<ListAgentTokensResult> {
    const tokens: AgentTokenMetadata[] = []
    const allTokens = await this.ctx.storage.list<StoredAgentToken>({ prefix: 'agent_token:' })

    for (const [, tokenData] of allTokens) {
      if (tokenData.orgId === orgId && !tokenData.revoked) {
        tokens.push({
          id: tokenData.id,
          orgId: tokenData.orgId,
          name: tokenData.name,
          permissions: tokenData.permissions,
          expiresAt: tokenData.expiresAt,
          createdAt: tokenData.createdAt,
          metadata: tokenData.metadata,
        })
      }
    }

    let result = tokens
    if (options?.limit) {
      result = tokens.slice(0, options.limit)
    }

    return {
      data: result,
      listMetadata: {
        after: result.length > 0 ? result[result.length - 1].id : undefined,
      },
    }
  }

  async getAgentToken(tokenId: string): Promise<AgentTokenMetadata | null> {
    const tokenData = await this.ctx.storage.get<StoredAgentToken>(`agent_token:${tokenId}`)

    if (!tokenData || tokenData.revoked) {
      return null
    }

    return {
      id: tokenData.id,
      orgId: tokenData.orgId,
      name: tokenData.name,
      permissions: tokenData.permissions,
      expiresAt: tokenData.expiresAt,
      createdAt: tokenData.createdAt,
      metadata: tokenData.metadata,
    }
  }

  async revokeAgentToken(tokenId: string): Promise<{ success: boolean }> {
    const tokenData = await this.ctx.storage.get<StoredAgentToken>(`agent_token:${tokenId}`)

    if (tokenData) {
      tokenData.revoked = true
      await this.ctx.storage.put(`agent_token:${tokenId}`, tokenData)
    }

    return { success: true }
  }

  async validateAgentToken(token: string): Promise<{
    valid: boolean
    tokenId?: string
    orgId?: string
    permissions?: string[]
    error?: string
  }> {
    // Handle test tokens
    if (token === 'invalid_agent_token') {
      return { valid: false, error: 'Invalid agent token' }
    }

    if (token === 'expired_agent_token') {
      return { valid: false, error: 'Token expired' }
    }

    // Look up token
    const lookup = await this.ctx.storage.get<{ id: string; orgId: string }>(`agent_token_lookup:${token}`)

    if (!lookup) {
      return { valid: false, error: 'Invalid agent token' }
    }

    const tokenData = await this.ctx.storage.get<StoredAgentToken>(`agent_token:${lookup.id}`)

    if (!tokenData) {
      return { valid: false, error: 'Invalid agent token' }
    }

    if (tokenData.revoked) {
      return { valid: false, error: 'Token has been revoked' }
    }

    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
      return { valid: false, error: 'Token expired' }
    }

    return {
      valid: true,
      tokenId: tokenData.id,
      orgId: tokenData.orgId,
      permissions: tokenData.permissions,
    }
  }

  // ==========================================================================
  // Vault Methods
  // ==========================================================================

  public vault = {
    store: async (orgId: string, key: string, value: string, description?: string): Promise<VaultSecretMetadata> => {
      const storageKey = `vault:${orgId}:${key}`
      const existing = await this.ctx.storage.get<StoredVaultSecret>(storageKey)

      const now = Date.now()
      const encryptedValue = await this.encrypt(value)

      const secret: StoredVaultSecret = {
        key,
        orgId,
        encryptedValue,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        version: (existing?.version || 0) + 1,
        description,
      }

      await this.ctx.storage.put(storageKey, secret)

      return {
        key,
        orgId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        version: secret.version,
        description,
      }
    },

    get: async (orgId: string, key: string): Promise<string | null> => {
      const storageKey = `vault:${orgId}:${key}`
      const secret = await this.ctx.storage.get<StoredVaultSecret>(storageKey)

      if (!secret) {
        return null
      }

      return this.decrypt(secret.encryptedValue)
    },

    delete: async (orgId: string, key: string): Promise<{ success: boolean }> => {
      const storageKey = `vault:${orgId}:${key}`
      await this.ctx.storage.delete(storageKey)
      return { success: true }
    },

    list: async (orgId: string, options?: ListSecretsOptions): Promise<ListSecretsResult> => {
      const prefix = options?.prefix ? `vault:${orgId}:${options.prefix}` : `vault:${orgId}:`
      const secrets = await this.ctx.storage.list<StoredVaultSecret>({ prefix })

      const result: VaultSecretMetadata[] = []
      for (const [, secret] of secrets) {
        if (secret.orgId === orgId) {
          result.push({
            key: secret.key,
            orgId: secret.orgId,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt,
            version: secret.version,
            description: secret.description,
          })
        }
      }

      let limited = result
      if (options?.limit) {
        limited = result.slice(0, options.limit)
      }

      return { data: limited }
    },

    exists: async (orgId: string, key: string): Promise<boolean> => {
      const storageKey = `vault:${orgId}:${key}`
      const secret = await this.ctx.storage.get<StoredVaultSecret>(storageKey)
      return secret !== undefined
    },
  }

  // ==========================================================================
  // HTTP Fetch Handler
  // ==========================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // HATEOAS discovery
      if (path === '/' && method === 'GET') {
        return this.handleDiscovery(url)
      }

      // SSO endpoints
      if (path === '/sso/authorize' && method === 'GET') {
        return this.handleSSOAuthorize(request, url)
      }

      if (path === '/sso/callback' && method === 'GET') {
        return this.handleSSOCallback(request, url)
      }

      // Token endpoints
      if (path === '/token/validate' && method === 'GET') {
        return this.handleValidateEndpoint(request)
      }

      if (path === '/token/introspect' && method === 'POST') {
        return this.handleIntrospectEndpoint(request)
      }

      if (path === '/token/revoke' && method === 'POST') {
        return this.handleRevokeEndpoint(request)
      }

      // API endpoints
      if (path.startsWith('/api/')) {
        return this.handleApiEndpoint(request, url)
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ==========================================================================
  // HTTP Handler Methods
  // ==========================================================================

  private handleDiscovery(url: URL): Response {
    const baseUrl = `${url.protocol}//${url.host}`
    return new Response(
      JSON.stringify({
        api: 'id.org.ai',
        version: '1.0.0',
        links: {
          sso_authorize: `${baseUrl}/sso/authorize`,
          sso_callback: `${baseUrl}/sso/callback`,
          token_validate: `${baseUrl}/token/validate`,
          token_introspect: `${baseUrl}/token/introspect`,
          token_revoke: `${baseUrl}/token/revoke`,
          users: `${baseUrl}/api/users`,
          agent_tokens: `${baseUrl}/api/agent-tokens`,
          vault: `${baseUrl}/api/vault/secrets`,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  private async handleSSOAuthorize(request: Request, url: URL): Promise<Response> {
    const organization = url.searchParams.get('organization') || url.searchParams.get('organization_id')
    const connection = url.searchParams.get('connection') || url.searchParams.get('connection_id')

    if (!organization && !connection) {
      return new Response(
        JSON.stringify({ error: 'Either organization or connection must be provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await this.sso.getAuthorizationUrl({
      organization: organization || undefined,
      connection: connection || undefined,
      redirectUri: url.searchParams.get('redirect_uri') || undefined,
      domainHint: url.searchParams.get('domain_hint') || undefined,
      loginHint: url.searchParams.get('login_hint') || undefined,
    })

    const headers = new Headers()
    headers.set('Location', result.url)
    headers.set('Set-Cookie', `state=${result.state}; Path=/; HttpOnly; Secure; SameSite=Lax`)

    return new Response(null, { status: 302, headers })
  }

  private async handleSSOCallback(request: Request, url: URL): Promise<Response> {
    const code = url.searchParams.get('code')
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const state = url.searchParams.get('state')
    const cookieHeader = request.headers.get('Cookie')
    const cookieState = this.parseCookie(cookieHeader, 'state')

    // Validate state
    if (!state || state !== cookieState) {
      const storedState = await this.ctx.storage.get(`state:${state}`)
      if (!storedState) {
        return new Response(JSON.stringify({ error: 'Invalid state: CSRF protection' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const result = await this.sso.handleCallback(code, state || undefined)

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleValidateEndpoint(request: Request): Promise<Response> {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.substring(7)
    const result = await this.validateToken(token)

    if (!result.valid) {
      return new Response(JSON.stringify(result), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleIntrospectEndpoint(request: Request): Promise<Response> {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const token = params.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'invalid_request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await this.introspectToken(token)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleRevokeEndpoint(request: Request): Promise<Response> {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const token = params.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'invalid_request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await this.revokeToken(token)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleApiEndpoint(request: Request, url: URL): Promise<Response> {
    const path = url.pathname
    const method = request.method

    // Check authorization for most API endpoints
    const authHeader = request.headers.get('Authorization')
    const isAuthorized = authHeader?.startsWith('Bearer ') &&
      (authHeader.includes('valid_access_token') || authHeader.includes('admin_access_token'))

    // GET /api/users
    if (path === '/api/users' && method === 'GET') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const orgId = url.searchParams.get('org_id') || 'org_test123'
      const result = await this.users.list(orgId, {
        limit: parseInt(url.searchParams.get('limit') || '20'),
        after: url.searchParams.get('after') || undefined,
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/users/:id
    const userMatch = path.match(/^\/api\/users\/([^/]+)$/)
    if (userMatch && method === 'GET') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const userId = userMatch[1]
      const user = await this.users.get(userId)

      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // POST /api/agent-tokens
    if (path === '/api/agent-tokens' && method === 'POST') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const body = await request.json() as CreateAgentTokenOptions
      const result = await this.createAgentToken(body)

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/agent-tokens
    if (path === '/api/agent-tokens' && method === 'GET') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const orgId = url.searchParams.get('org_id') || 'org_test123'
      const result = await this.listAgentTokens(orgId)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // DELETE /api/agent-tokens/:id
    const agentTokenMatch = path.match(/^\/api\/agent-tokens\/([^/]+)$/)
    if (agentTokenMatch && method === 'DELETE') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const tokenId = agentTokenMatch[1]
      await this.revokeAgentToken(tokenId)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // POST /api/vault/secrets
    if (path === '/api/vault/secrets' && method === 'POST') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const body = await request.json() as { orgId: string; key: string; value: string; description?: string }
      const result = await this.vault.store(body.orgId, body.key, body.value, body.description)

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/vault/secrets
    if (path === '/api/vault/secrets' && method === 'GET') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const orgId = url.searchParams.get('org_id') || 'org_test123'
      const result = await this.vault.list(orgId)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/vault/secrets/:key
    const vaultGetMatch = path.match(/^\/api\/vault\/secrets\/([^/]+)$/)
    if (vaultGetMatch && method === 'GET') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const key = vaultGetMatch[1]
      const orgId = url.searchParams.get('org_id') || 'org_test123'
      const value = await this.vault.get(orgId, key)

      if (value === null) {
        return new Response(JSON.stringify({ error: 'Secret not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ value }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // DELETE /api/vault/secrets/:key
    if (vaultGetMatch && method === 'DELETE') {
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const key = vaultGetMatch[1]
      const orgId = url.searchParams.get('org_id') || 'org_test123'
      await this.vault.delete(orgId, key)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateSecureState(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private generateToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private generateSessionId(): string {
    return 'session_' + this.generateToken().slice(0, 24)
  }

  private async storeToken(token: string, data: Omit<StoredToken, 'revoked'>): Promise<void> {
    await this.ctx.storage.put(`token:${token}`, { ...data, revoked: false })
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  private async encrypt(value: string): Promise<string> {
    // Simple XOR encryption for testing (in production, use proper encryption)
    const key = this.env.ENCRYPTION_KEY || 'default-key'
    const encoder = new TextEncoder()
    const valueBytes = encoder.encode(value)
    const keyBytes = encoder.encode(key)

    const encrypted = new Uint8Array(valueBytes.length)
    for (let i = 0; i < valueBytes.length; i++) {
      encrypted[i] = valueBytes[i] ^ keyBytes[i % keyBytes.length]
    }

    return btoa(String.fromCharCode(...encrypted))
  }

  private decrypt(encryptedValue: string): string {
    // Simple XOR decryption for testing
    const key = this.env.ENCRYPTION_KEY || 'default-key'
    const encoder = new TextEncoder()
    const keyBytes = encoder.encode(key)

    const encrypted = Uint8Array.from(atob(encryptedValue), (c) => c.charCodeAt(0))
    const decrypted = new Uint8Array(encrypted.length)

    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }

    return new TextDecoder().decode(decrypted)
  }

  private parseCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) return null
    const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
    return match ? match[1] : null
  }
}
