import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SessionManager,
  Session,
  SessionStore,
  SessionConfig,
  generateSecureToken,
  hashToken,
  createSession,
  validateSession,
  destroySession,
  refreshSession,
} from '../src/index'

/**
 * TDD Tests for Session Management
 *
 * Requirements:
 * 1. Create/destroy sessions
 * 2. Session storage (Durable Objects or KV)
 * 3. Session expiration
 * 4. Secure session tokens
 */

describe('Session Management', () => {
  describe('Secure Token Generation', () => {
    it('should generate a secure random token', () => {
      const token = generateSecureToken()

      // Token should be a string
      expect(typeof token).toBe('string')

      // Token should be at least 32 characters (256 bits of entropy)
      expect(token.length).toBeGreaterThanOrEqual(32)
    })

    it('should generate unique tokens on each call', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()

      expect(token1).not.toBe(token2)
    })

    it('should generate tokens with specified length', () => {
      const token = generateSecureToken(64)

      // Base64 encoding: 64 bytes = 86 chars (approx)
      expect(token.length).toBeGreaterThanOrEqual(64)
    })

    it('should hash tokens securely', async () => {
      const token = 'test-session-token-12345'
      const hash = await hashToken(token)

      // Hash should be a string
      expect(typeof hash).toBe('string')

      // Hash should not equal the original token
      expect(hash).not.toBe(token)

      // Same token should produce same hash
      const hash2 = await hashToken(token)
      expect(hash).toBe(hash2)
    })
  })

  describe('Session Creation', () => {
    it('should create a session with required fields', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.token).toBeDefined()
      expect(session.userId).toBe('user-123')
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.expiresAt).toBeInstanceOf(Date)
    })

    it('should create a session with custom expiration', async () => {
      const expiresIn = 60 * 60 * 1000 // 1 hour
      const session = await createSession({
        userId: 'user-123',
        expiresIn,
      })

      const expectedExpiration = new Date(session.createdAt.getTime() + expiresIn)
      expect(session.expiresAt.getTime()).toBe(expectedExpiration.getTime())
    })

    it('should create a session with metadata', async () => {
      const metadata = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        deviceId: 'device-abc',
      }

      const session = await createSession({
        userId: 'user-123',
        metadata,
      })

      expect(session.metadata).toEqual(metadata)
    })

    it('should generate a cryptographically secure session token', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      // Token should be long enough for security
      expect(session.token.length).toBeGreaterThanOrEqual(32)
    })

    it('should store token hash, not raw token', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      // The stored session should have a tokenHash, not the raw token
      expect(session.tokenHash).toBeDefined()
      expect(session.tokenHash).not.toBe(session.token)
    })
  })

  describe('Session Validation', () => {
    it('should validate a valid session token', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      const result = await validateSession(session.token, session)

      expect(result.valid).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.userId).toBe('user-123')
    })

    it('should reject an invalid session token', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      const result = await validateSession('invalid-token', session)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid_token')
    })

    it('should reject an expired session', async () => {
      const session = await createSession({
        userId: 'user-123',
        expiresIn: -1000, // Already expired
      })

      const result = await validateSession(session.token, session)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('session_expired')
    })

    it('should reject a revoked session', async () => {
      const session = await createSession({
        userId: 'user-123',
      })
      session.revokedAt = new Date()

      const result = await validateSession(session.token, session)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('session_revoked')
    })
  })

  describe('Session Destruction', () => {
    it('should destroy a session by marking it as revoked', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      const destroyedSession = await destroySession(session)

      expect(destroyedSession.revokedAt).toBeInstanceOf(Date)
    })

    it('should prevent validation after destruction', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      const destroyedSession = await destroySession(session)
      const result = await validateSession(session.token, destroyedSession)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('session_revoked')
    })
  })

  describe('Session Refresh', () => {
    it('should refresh a valid session with new token', async () => {
      const session = await createSession({
        userId: 'user-123',
        expiresIn: 60 * 60 * 1000, // 1 hour
      })

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 5))

      const refreshedSession = await refreshSession(session)

      expect(refreshedSession.id).toBe(session.id)
      expect(refreshedSession.token).not.toBe(session.token)
      expect(refreshedSession.tokenHash).not.toBe(session.tokenHash)
      expect(refreshedSession.expiresAt.getTime()).toBeGreaterThan(session.expiresAt.getTime())
    })

    it('should not refresh an expired session', async () => {
      const session = await createSession({
        userId: 'user-123',
        expiresIn: -1000, // Already expired
      })

      await expect(refreshSession(session)).rejects.toThrow('session_expired')
    })

    it('should not refresh a revoked session', async () => {
      const session = await createSession({
        userId: 'user-123',
      })
      session.revokedAt = new Date()

      await expect(refreshSession(session)).rejects.toThrow('session_revoked')
    })
  })

  describe('Session Expiration', () => {
    it('should have a default expiration of 24 hours', async () => {
      const session = await createSession({
        userId: 'user-123',
      })

      const expectedExpiration = 24 * 60 * 60 * 1000 // 24 hours
      const actualExpiration = session.expiresAt.getTime() - session.createdAt.getTime()

      expect(actualExpiration).toBe(expectedExpiration)
    })

    it('should support sliding expiration', async () => {
      const session = await createSession({
        userId: 'user-123',
        expiresIn: 60 * 60 * 1000, // 1 hour
        slidingExpiration: true,
      })

      expect(session.slidingExpiration).toBe(true)
    })

    it('should update expiration on access when sliding enabled', async () => {
      const expiresIn = 60 * 60 * 1000 // 1 hour
      const session = await createSession({
        userId: 'user-123',
        expiresIn,
        slidingExpiration: true,
      })

      // Simulate time passing
      const originalExpiry = session.expiresAt.getTime()

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 5))

      // Touch the session (simulating access)
      const touchedSession = await refreshSession(session, { slideOnly: true })

      expect(touchedSession.expiresAt.getTime()).toBeGreaterThan(originalExpiry)
    })

    it('should calculate time until expiration', async () => {
      const expiresIn = 60 * 60 * 1000 // 1 hour
      const session = await createSession({
        userId: 'user-123',
        expiresIn,
      })

      const ttl = session.expiresAt.getTime() - Date.now()

      // Should be approximately 1 hour (with some tolerance)
      expect(ttl).toBeGreaterThan(expiresIn - 1000)
      expect(ttl).toBeLessThanOrEqual(expiresIn)
    })
  })
})

describe('SessionStore Interface', () => {
  describe('KV-based SessionStore', () => {
    let mockKV: any

    beforeEach(() => {
      mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }
    })

    it('should save a session to KV', async () => {
      const store = new SessionStore({ type: 'kv', kv: mockKV })
      const session = await createSession({ userId: 'user-123' })

      await store.save(session)

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining(session.id),
        expect.any(String),
        expect.objectContaining({ expirationTtl: expect.any(Number) })
      )
    })

    it('should retrieve a session from KV', async () => {
      const session = await createSession({ userId: 'user-123' })
      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      const store = new SessionStore({ type: 'kv', kv: mockKV })
      const retrieved = await store.get(session.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.userId).toBe('user-123')
    })

    it('should delete a session from KV', async () => {
      const store = new SessionStore({ type: 'kv', kv: mockKV })
      const session = await createSession({ userId: 'user-123' })

      await store.delete(session.id)

      expect(mockKV.delete).toHaveBeenCalledWith(expect.stringContaining(session.id))
    })

    it('should find session by token hash', async () => {
      const session = await createSession({ userId: 'user-123' })
      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      const store = new SessionStore({ type: 'kv', kv: mockKV })
      const found = await store.findByTokenHash(session.tokenHash)

      expect(found).toBeDefined()
    })
  })
})

describe('SessionManager', () => {
  let mockKV: any
  let manager: SessionManager

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn().mockResolvedValue({ keys: [] }),
    }

    manager = new SessionManager({
      store: { type: 'kv', kv: mockKV },
      defaultExpiresIn: 24 * 60 * 60 * 1000,
    })
  })

  describe('Session Lifecycle', () => {
    it('should create and store a session', async () => {
      const session = await manager.create({
        userId: 'user-123',
        metadata: { userAgent: 'test' },
      })

      expect(session).toBeDefined()
      expect(session.userId).toBe('user-123')
      expect(mockKV.put).toHaveBeenCalled()
    })

    it('should validate a token and return session', async () => {
      const session = await manager.create({ userId: 'user-123' })

      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      const result = await manager.validate(session.token)

      expect(result.valid).toBe(true)
      expect(result.session?.userId).toBe('user-123')
    })

    it('should destroy a session', async () => {
      const session = await manager.create({ userId: 'user-123' })

      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      await manager.destroy(session.id)

      // Should update with revokedAt
      // Initial save does 2 puts (session + token hash mapping)
      // Revoke save does 2 puts (session + token hash mapping)
      expect(mockKV.put).toHaveBeenCalledTimes(4)
    })

    it('should refresh a session', async () => {
      const session = await manager.create({ userId: 'user-123' })

      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 5))

      const refreshed = await manager.refresh(session.token)

      expect(refreshed.token).not.toBe(session.token)
      expect(refreshed.expiresAt.getTime()).toBeGreaterThan(session.expiresAt.getTime())
    })
  })

  describe('User Session Management', () => {
    it('should list all sessions for a user', async () => {
      const mockSession1 = {
        id: 'session-1',
        userId: 'user-123',
        tokenHash: 'hash1',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }
      const mockSession2 = {
        id: 'session-2',
        userId: 'user-123',
        tokenHash: 'hash2',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }

      mockKV.list.mockResolvedValue({
        keys: [
          { name: 'session:user-123:session-1' },
          { name: 'session:user-123:session-2' },
        ],
      })
      mockKV.get.mockImplementation((key: string) => {
        if (key === 'session:user-123:session-1') return JSON.stringify(mockSession1)
        if (key === 'session:user-123:session-2') return JSON.stringify(mockSession2)
        return null
      })

      const sessions = await manager.listForUser('user-123')

      expect(sessions).toHaveLength(2)
    })

    it('should destroy all sessions for a user', async () => {
      mockKV.list.mockResolvedValue({
        keys: [
          { name: 'session:user-123:session-1' },
          { name: 'session:user-123:session-2' },
        ],
      })

      await manager.destroyAllForUser('user-123')

      expect(mockKV.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('Session Configuration', () => {
    it('should use custom expiration from config', async () => {
      const customManager = new SessionManager({
        store: { type: 'kv', kv: mockKV },
        defaultExpiresIn: 60 * 60 * 1000, // 1 hour
      })

      const session = await customManager.create({ userId: 'user-123' })

      const expectedExpiration = session.createdAt.getTime() + 60 * 60 * 1000
      expect(session.expiresAt.getTime()).toBe(expectedExpiration)
    })

    it('should support session prefix configuration', async () => {
      const customManager = new SessionManager({
        store: { type: 'kv', kv: mockKV },
        prefix: 'custom-session:',
      })

      const session = await customManager.create({ userId: 'user-123' })

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('custom-session:'),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('Security Features', () => {
    it('should not expose token hash externally', async () => {
      const session = await manager.create({ userId: 'user-123' })
      const publicSession = manager.toPublicSession(session)

      expect(publicSession.tokenHash).toBeUndefined()
      expect(publicSession.token).toBeUndefined()
      expect(publicSession.userId).toBe('user-123')
      expect(publicSession.id).toBe(session.id)
    })

    it('should bind session to user agent if configured', async () => {
      const secureManager = new SessionManager({
        store: { type: 'kv', kv: mockKV },
        bindToUserAgent: true,
      })

      const session = await secureManager.create({
        userId: 'user-123',
        metadata: { userAgent: 'Mozilla/5.0' },
      })

      expect(session.boundUserAgent).toBe('Mozilla/5.0')
    })

    it('should reject validation with mismatched user agent', async () => {
      const secureManager = new SessionManager({
        store: { type: 'kv', kv: mockKV },
        bindToUserAgent: true,
      })

      const session = await secureManager.create({
        userId: 'user-123',
        metadata: { userAgent: 'Mozilla/5.0' },
      })

      mockKV.get.mockResolvedValue(JSON.stringify({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }))

      const result = await secureManager.validate(session.token, {
        userAgent: 'DifferentBrowser/1.0',
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('user_agent_mismatch')
    })
  })
})

describe('Session Types', () => {
  it('Session interface should have required properties', async () => {
    const session = await createSession({ userId: 'user-123' })

    // Required properties
    expect(session).toHaveProperty('id')
    expect(session).toHaveProperty('userId')
    expect(session).toHaveProperty('token')
    expect(session).toHaveProperty('tokenHash')
    expect(session).toHaveProperty('createdAt')
    expect(session).toHaveProperty('expiresAt')

    // Optional properties exist (may be undefined)
    expect('metadata' in session).toBe(true)
    expect('revokedAt' in session).toBe(true)
  })
})
