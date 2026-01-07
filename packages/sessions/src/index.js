// Session Management for Cloudflare Workers
// Supports KV and Durable Object storage backends
// Default session expiration: 24 hours
const DEFAULT_EXPIRES_IN = 24 * 60 * 60 * 1000;
/**
 * Generates a cryptographically secure random token
 * Uses Web Crypto API for secure random bytes
 */
export function generateSecureToken(bytes = 32) {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    // Convert to base64url encoding for URL-safe tokens
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
/**
 * Hashes a token using SHA-256
 * Used to store session tokens securely
 */
export async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Generates a unique session ID
 */
function generateSessionId() {
    return crypto.randomUUID();
}
/**
 * Creates a new session with the specified options
 */
export async function createSession(options) {
    const { userId, expiresIn = DEFAULT_EXPIRES_IN, metadata, slidingExpiration = false, } = options;
    const now = new Date();
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    const session = {
        id: generateSessionId(),
        userId,
        token,
        tokenHash,
        createdAt: now,
        expiresAt: new Date(now.getTime() + expiresIn),
        metadata,
        revokedAt: undefined,
        slidingExpiration,
    };
    return session;
}
/**
 * Validates a session token against a stored session
 */
export async function validateSession(token, session) {
    // Check if session is revoked
    if (session.revokedAt) {
        return { valid: false, error: 'session_revoked' };
    }
    // Check if session is expired
    if (session.expiresAt.getTime() < Date.now()) {
        return { valid: false, error: 'session_expired' };
    }
    // Validate token by comparing hashes
    const tokenHash = await hashToken(token);
    if (tokenHash !== session.tokenHash) {
        return { valid: false, error: 'invalid_token' };
    }
    return { valid: true, session };
}
/**
 * Destroys a session by marking it as revoked
 */
export async function destroySession(session) {
    return {
        ...session,
        revokedAt: new Date(),
    };
}
/**
 * Refreshes a session with a new token and extended expiration
 */
export async function refreshSession(session, options) {
    // Check if session is revoked
    if (session.revokedAt) {
        throw new Error('session_revoked');
    }
    // Check if session is expired
    if (session.expiresAt.getTime() < Date.now()) {
        throw new Error('session_expired');
    }
    const now = new Date();
    const originalDuration = session.expiresAt.getTime() - session.createdAt.getTime();
    if (options?.slideOnly) {
        // Just slide the expiration window
        return {
            ...session,
            expiresAt: new Date(now.getTime() + originalDuration),
        };
    }
    // Generate new token
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    return {
        ...session,
        token,
        tokenHash,
        expiresAt: new Date(now.getTime() + originalDuration),
    };
}
/**
 * SessionStore handles persistence of sessions
 */
export class SessionStore {
    config;
    prefix;
    constructor(config, prefix = 'session:') {
        this.config = config;
        this.prefix = prefix;
    }
    getKey(id) {
        return `${this.prefix}${id}`;
    }
    getTokenHashKey(tokenHash) {
        return `${this.prefix}token:${tokenHash}`;
    }
    serializeSession(session) {
        const serialized = {
            id: session.id,
            userId: session.userId,
            tokenHash: session.tokenHash,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            metadata: session.metadata,
            revokedAt: session.revokedAt?.toISOString(),
            slidingExpiration: session.slidingExpiration,
            boundUserAgent: session.boundUserAgent,
        };
        return JSON.stringify(serialized);
    }
    deserializeSession(data, token) {
        const parsed = JSON.parse(data);
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
        };
    }
    async save(session) {
        if (this.config.type !== 'kv' || !this.config.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.kv;
        const ttl = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        const data = this.serializeSession(session);
        // Store by session ID
        await kv.put(this.getKey(session.id), data, { expirationTtl: ttl });
        // Store token hash -> session ID mapping for lookup
        await kv.put(this.getTokenHashKey(session.tokenHash), session.id, { expirationTtl: ttl });
    }
    async get(id) {
        if (this.config.type !== 'kv' || !this.config.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.kv;
        const data = await kv.get(this.getKey(id));
        if (!data) {
            return null;
        }
        return this.deserializeSession(data);
    }
    async delete(id) {
        if (this.config.type !== 'kv' || !this.config.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.kv;
        await kv.delete(this.getKey(id));
    }
    async findByTokenHash(tokenHash) {
        if (this.config.type !== 'kv' || !this.config.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.kv;
        const sessionId = await kv.get(this.getTokenHashKey(tokenHash));
        if (!sessionId) {
            return null;
        }
        return this.get(sessionId);
    }
}
/**
 * SessionManager provides high-level session management
 */
export class SessionManager {
    store;
    config;
    sessionCache;
    constructor(config) {
        this.config = config;
        this.store = new SessionStore(config.store, config.prefix ?? 'session:');
        this.sessionCache = new Map();
    }
    async create(options) {
        const expiresIn = options.expiresIn ?? this.config.defaultExpiresIn ?? DEFAULT_EXPIRES_IN;
        const session = await createSession({
            ...options,
            expiresIn,
        });
        // Bind to user agent if configured
        if (this.config.bindToUserAgent && options.metadata?.userAgent) {
            session.boundUserAgent = options.metadata.userAgent;
        }
        // Cache and persist
        this.sessionCache.set(session.id, session);
        await this.store.save(session);
        return session;
    }
    async validate(token, context) {
        // Hash the token to find the session
        const tokenHash = await hashToken(token);
        // Try to find session by token hash
        const session = await this.store.findByTokenHash(tokenHash);
        if (!session) {
            return { valid: false, error: 'invalid_token' };
        }
        // Check user agent binding
        if (this.config.bindToUserAgent && session.boundUserAgent) {
            if (context?.userAgent !== session.boundUserAgent) {
                return { valid: false, error: 'user_agent_mismatch' };
            }
        }
        // Validate the session
        const result = await validateSession(token, { ...session, token, tokenHash });
        return result;
    }
    async destroy(sessionId) {
        const session = await this.store.get(sessionId);
        if (session) {
            const destroyed = await destroySession(session);
            await this.store.save(destroyed);
            this.sessionCache.delete(sessionId);
        }
    }
    async refresh(token) {
        const tokenHash = await hashToken(token);
        const session = await this.store.findByTokenHash(tokenHash);
        if (!session) {
            throw new Error('session_not_found');
        }
        // Refresh with stored session + provided token
        const refreshed = await refreshSession({ ...session, token, tokenHash });
        // Delete old token hash mapping and save new one
        await this.store.save(refreshed);
        return refreshed;
    }
    async listForUser(userId) {
        if (this.config.store.type !== 'kv' || !this.config.store.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.store.kv;
        const prefix = this.config.prefix ?? 'session:';
        const listResult = await kv.list({ prefix: `${prefix}${userId}:` });
        const sessions = [];
        for (const key of listResult.keys) {
            const data = await kv.get(key.name);
            if (data) {
                sessions.push(JSON.parse(data));
            }
        }
        return sessions;
    }
    async destroyAllForUser(userId) {
        if (this.config.store.type !== 'kv' || !this.config.store.kv) {
            throw new Error('KV store not configured');
        }
        const kv = this.config.store.kv;
        const prefix = this.config.prefix ?? 'session:';
        const listResult = await kv.list({ prefix: `${prefix}${userId}:` });
        for (const key of listResult.keys) {
            await kv.delete(key.name);
        }
    }
    toPublicSession(session) {
        return {
            id: session.id,
            userId: session.userId,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            metadata: session.metadata,
        };
    }
}
