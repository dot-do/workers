// Session Management for Cloudflare Workers
// Supports KV and Durable Object storage backends

/**
 * Session interface representing a user session
 */
export interface Session {
  id: string
  userId: string
  token: string
  tokenHash: string
  createdAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown>
  revokedAt?: Date
  slidingExpiration?: boolean
  boundUserAgent?: string
}

/**
 * Public session interface (safe to expose externally)
 */
export interface PublicSession {
  id: string
  userId: string
  createdAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Options for creating a session
 */
export interface CreateSessionOptions {
  userId: string
  expiresIn?: number
  metadata?: Record<string, unknown>
  slidingExpiration?: boolean
}

/**
 * Result of session validation
 */
export interface ValidationResult {
  valid: boolean
  session?: Session
  error?: 'invalid_token' | 'session_expired' | 'session_revoked' | 'user_agent_mismatch'
}

/**
 * Store configuration for sessions
 */
export interface StoreConfig {
  type: 'kv' | 'durable-object'
  kv?: KVNamespace
  durableObject?: DurableObjectStub
}

/**
 * Session manager configuration
 */
export interface SessionConfig {
  store: StoreConfig
  defaultExpiresIn?: number
  prefix?: string
  bindToUserAgent?: boolean
}

// Default session expiration: 24 hours
const DEFAULT_EXPIRES_IN = 24 * 60 * 60 * 1000

/**
 * Generates a cryptographically secure random token
 * Uses Web Crypto API for secure random bytes
 */
export function generateSecureToken(bytes: number = 32): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  // Convert to base64url encoding for URL-safe tokens
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Hashes a token using SHA-256
 * Used to store session tokens securely
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Creates a new session with the specified options
 */
export async function createSession(options: CreateSessionOptions): Promise<Session> {
  const {
    userId,
    expiresIn = DEFAULT_EXPIRES_IN,
    metadata,
    slidingExpiration = false,
  } = options

  const now = new Date()
  const token = generateSecureToken()
  const tokenHash = await hashToken(token)

  const session: Session = {
    id: generateSessionId(),
    userId,
    token,
    tokenHash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + expiresIn),
    metadata,
    revokedAt: undefined,
    slidingExpiration,
  }

  return session
}

/**
 * Validates a session token against a stored session
 */
export async function validateSession(
  token: string,
  session: Session
): Promise<ValidationResult> {
  // Check if session is revoked
  if (session.revokedAt) {
    return { valid: false, error: 'session_revoked' }
  }

  // Check if session is expired
  if (session.expiresAt.getTime() < Date.now()) {
    return { valid: false, error: 'session_expired' }
  }

  // Validate token by comparing hashes
  const tokenHash = await hashToken(token)
  if (tokenHash !== session.tokenHash) {
    return { valid: false, error: 'invalid_token' }
  }

  return { valid: true, session }
}

/**
 * Destroys a session by marking it as revoked
 */
export async function destroySession(session: Session): Promise<Session> {
  return {
    ...session,
    revokedAt: new Date(),
  }
}

/**
 * Refreshes a session with a new token and extended expiration
 */
export async function refreshSession(
  session: Session,
  options?: { slideOnly?: boolean }
): Promise<Session> {
  // Check if session is revoked
  if (session.revokedAt) {
    throw new Error('session_revoked')
  }

  // Check if session is expired
  if (session.expiresAt.getTime() < Date.now()) {
    throw new Error('session_expired')
  }

  const now = new Date()
  const originalDuration = session.expiresAt.getTime() - session.createdAt.getTime()

  if (options?.slideOnly) {
    // Just slide the expiration window
    return {
      ...session,
      expiresAt: new Date(now.getTime() + originalDuration),
    }
  }

  // Generate new token
  const token = generateSecureToken()
  const tokenHash = await hashToken(token)

  return {
    ...session,
    token,
    tokenHash,
    expiresAt: new Date(now.getTime() + originalDuration),
  }
}

/**
 * Serialized session for storage
 */
interface SerializedSession {
  id: string
  userId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  metadata?: Record<string, unknown>
  revokedAt?: string
  slidingExpiration?: boolean
  boundUserAgent?: string
}

/**
 * SessionStore handles persistence of sessions
 */
export class SessionStore {
  private config: StoreConfig
  private prefix: string

  constructor(config: StoreConfig, prefix: string = 'session:') {
    this.config = config
    this.prefix = prefix
  }

  private getKey(id: string): string {
    return `${this.prefix}${id}`
  }

  private getTokenHashKey(tokenHash: string): string {
    return `${this.prefix}token:${tokenHash}`
  }

  private serializeSession(session: Session): string {
    const serialized: SerializedSession = {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      metadata: session.metadata,
      revokedAt: session.revokedAt?.toISOString(),
      slidingExpiration: session.slidingExpiration,
      boundUserAgent: session.boundUserAgent,
    }
    return JSON.stringify(serialized)
  }

  private deserializeSession(data: string, token?: string): Session {
    const parsed = JSON.parse(data) as SerializedSession
    return {
      id: parsed.id,
      userId: parsed.userId,
      token: token ?? '',
      tokenHash: parsed.tokenHash,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
      metadata: parsed.metadata,
      revokedAt: parsed.revokedAt ? new Date(parsed.revokedAt) : undefined,
      slidingExpiration: parsed.slidingExpiration,
      boundUserAgent: parsed.boundUserAgent,
    }
  }

  async save(session: Session): Promise<void> {
    if (this.config.type !== 'kv' || !this.config.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.kv
    const ttl = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))
    const data = this.serializeSession(session)

    // Store by session ID
    await kv.put(this.getKey(session.id), data, { expirationTtl: ttl })

    // Store token hash -> session ID mapping for lookup
    await kv.put(this.getTokenHashKey(session.tokenHash), session.id, { expirationTtl: ttl })
  }

  async get(id: string): Promise<Session | null> {
    if (this.config.type !== 'kv' || !this.config.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.kv
    const data = await kv.get(this.getKey(id))

    if (!data) {
      return null
    }

    return this.deserializeSession(data)
  }

  async delete(id: string): Promise<void> {
    if (this.config.type !== 'kv' || !this.config.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.kv
    await kv.delete(this.getKey(id))
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    if (this.config.type !== 'kv' || !this.config.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.kv
    const sessionId = await kv.get(this.getTokenHashKey(tokenHash))

    if (!sessionId) {
      return null
    }

    return this.get(sessionId)
  }
}

/**
 * SessionManager provides high-level session management
 */
export class SessionManager {
  private store: SessionStore
  private config: SessionConfig
  private sessionCache: Map<string, Session>

  constructor(config: SessionConfig) {
    this.config = config
    this.store = new SessionStore(config.store, config.prefix ?? 'session:')
    this.sessionCache = new Map()
  }

  async create(options: CreateSessionOptions): Promise<Session> {
    const expiresIn = options.expiresIn ?? this.config.defaultExpiresIn ?? DEFAULT_EXPIRES_IN

    const session = await createSession({
      ...options,
      expiresIn,
    })

    // Bind to user agent if configured
    if (this.config.bindToUserAgent && options.metadata?.userAgent) {
      (session as Session).boundUserAgent = options.metadata.userAgent as string
    }

    // Cache and persist
    this.sessionCache.set(session.id, session)
    await this.store.save(session)

    return session
  }

  async validate(
    token: string,
    context?: { userAgent?: string }
  ): Promise<ValidationResult> {
    // Hash the token to find the session
    const tokenHash = await hashToken(token)

    // Try to find session by token hash
    const session = await this.store.findByTokenHash(tokenHash)

    if (!session) {
      return { valid: false, error: 'invalid_token' }
    }

    // Check user agent binding
    if (this.config.bindToUserAgent && session.boundUserAgent) {
      if (context?.userAgent !== session.boundUserAgent) {
        return { valid: false, error: 'user_agent_mismatch' }
      }
    }

    // Validate the session
    const result = await validateSession(token, { ...session, token, tokenHash })

    return result
  }

  async destroy(sessionId: string): Promise<void> {
    const session = await this.store.get(sessionId)

    if (session) {
      const destroyed = await destroySession(session)
      await this.store.save(destroyed)
      this.sessionCache.delete(sessionId)
    }
  }

  async refresh(token: string): Promise<Session> {
    const tokenHash = await hashToken(token)
    const session = await this.store.findByTokenHash(tokenHash)

    if (!session) {
      throw new Error('session_not_found')
    }

    // Refresh with stored session + provided token
    const refreshed = await refreshSession({ ...session, token, tokenHash })

    // Delete old token hash mapping and save new one
    await this.store.save(refreshed)

    return refreshed
  }

  async listForUser(userId: string): Promise<Session[]> {
    if (this.config.store.type !== 'kv' || !this.config.store.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.store.kv
    const prefix = this.config.prefix ?? 'session:'
    const listResult = await kv.list({ prefix: `${prefix}${userId}:` })

    const sessions: Session[] = []
    for (const key of listResult.keys) {
      const data = await kv.get(key.name)
      if (data) {
        sessions.push(JSON.parse(data))
      }
    }

    return sessions
  }

  async destroyAllForUser(userId: string): Promise<void> {
    if (this.config.store.type !== 'kv' || !this.config.store.kv) {
      throw new Error('KV store not configured')
    }

    const kv = this.config.store.kv
    const prefix = this.config.prefix ?? 'session:'
    const listResult = await kv.list({ prefix: `${prefix}${userId}:` })

    for (const key of listResult.keys) {
      await kv.delete(key.name)
    }
  }

  toPublicSession(session: Session): PublicSession {
    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      metadata: session.metadata,
    }
  }
}
