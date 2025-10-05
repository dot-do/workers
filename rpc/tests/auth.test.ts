import { describe, it, expect, beforeEach, vi } from 'vitest'
import { extractToken, validateToken, getOrCreateSession, authenticate } from '../src/auth'
import type { Env } from '../src/types'

const createMockEnv = (): Env => ({
  OAUTH_SERVICE: {
    validateToken: vi.fn().mockResolvedValue({
      valid: true,
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: Date.now() + 3600000,
    }),
  },
  AUTH_SERVICE: {},
  DB_SERVICE: {},
  SESSIONS: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as any,
})

describe('Auth Module', () => {
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
  })

  describe('extractToken', () => {
    it('should extract bearer token from Authorization header', () => {
      const request = new Request('https://rpc.do/rpc', {
        headers: { Authorization: 'Bearer test-token-123' },
      })

      const token = extractToken(request)
      expect(token).toBe('test-token-123')
    })

    it('should return null for missing Authorization header', () => {
      const request = new Request('https://rpc.do/rpc')

      const token = extractToken(request)
      expect(token).toBeNull()
    })

    it('should return null for invalid Authorization format', () => {
      const request = new Request('https://rpc.do/rpc', {
        headers: { Authorization: 'InvalidFormat test-token' },
      })

      const token = extractToken(request)
      expect(token).toBeNull()
    })
  })

  describe('validateToken', () => {
    it('should validate token via OAUTH_SERVICE', async () => {
      const tokenInfo = await validateToken('valid-token', env)

      expect(env.OAUTH_SERVICE.validateToken).toHaveBeenCalledWith('valid-token')
      expect(tokenInfo).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: undefined,
        permissions: [],
        expiresAt: expect.any(Number),
      })
    })

    it('should return null for invalid token', async () => {
      env.OAUTH_SERVICE.validateToken = vi.fn().mockResolvedValue({ valid: false })

      const tokenInfo = await validateToken('invalid-token', env)

      expect(tokenInfo).toBeNull()
    })

    it('should handle validation errors', async () => {
      env.OAUTH_SERVICE.validateToken = vi.fn().mockRejectedValue(new Error('Service unavailable'))

      const tokenInfo = await validateToken('error-token', env)

      expect(tokenInfo).toBeNull()
    })
  })

  describe('getOrCreateSession', () => {
    it('should create session in KV', async () => {
      const tokenInfo = {
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: Date.now() + 3600000,
      }

      const sessionId = await getOrCreateSession(tokenInfo, 'test-token', env)

      expect(sessionId).toMatch(/^session:user-123:\d+$/)
      expect(env.SESSIONS.put).toHaveBeenCalled()

      const putCall = (env.SESSIONS.put as any).mock.calls[0]
      expect(putCall[0]).toBe(sessionId)
      expect(JSON.parse(putCall[1])).toEqual({
        userId: 'user-123',
        token: 'test-token',
        createdAt: expect.any(Number),
        expiresAt: expect.any(Number),
      })
    })
  })

  describe('authenticate', () => {
    it('should authenticate with bearer token', async () => {
      const request = new Request('https://rpc.do/rpc', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const tokenInfo = await authenticate(request, env)

      expect(tokenInfo).toBeDefined()
      expect(tokenInfo?.userId).toBe('user-123')
    })

    it('should return null without authentication', async () => {
      const request = new Request('https://rpc.do/rpc')

      const tokenInfo = await authenticate(request, env)

      expect(tokenInfo).toBeNull()
    })
  })
})
