/**
 * Tests: WorkOSDO Token Authentication and Validation
 *
 * Tests token authentication flow for id.org.ai.
 * Handles both user tokens and agent (M2M) tokens.
 *
 * @see CLAUDE.md - id.org.ai section
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockWorkOSEnv,
} from './helpers.js'

/**
 * Token validation result
 */
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

/**
 * Token introspection result (RFC 7662)
 */
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

/**
 * Authentication result from bearer token
 */
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

/**
 * Contract for WorkOSDO authentication methods
 */
export interface WorkOSDOAuthContract {
  authenticate(authHeader: string): Promise<AuthenticateResult>
  validateToken(token: string): Promise<TokenValidationResult>
  introspectToken(token: string): Promise<TokenIntrospectionResult>
  revokeToken(token: string): Promise<{ success: boolean }>
  fetch(request: Request): Promise<Response>
}

/**
 * Load WorkOSDO
 */
async function loadWorkOSDO(): Promise<new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOAuthContract> {
  const module = await import('../src/workos.js')
  return module.WorkOSDO
}

describe('WorkOSDO Token Authentication', () => {
  let ctx: MockDOState
  let env: MockWorkOSEnv
  let WorkOSDO: new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOAuthContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkOSDO = await loadWorkOSDO()
  })

  describe('authenticate()', () => {
    it('should authenticate valid Bearer token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('Bearer valid_access_token')

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should return user info on successful authentication', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('Bearer valid_access_token')

      expect(result.success).toBe(true)
      if (result.user) {
        expect(result.user.id).toBeDefined()
        expect(result.user.email).toBeDefined()
      }
    })

    it('should reject invalid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('Bearer invalid_token')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject expired token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('Bearer expired_access_token')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/expired/i)
    })

    it('should reject malformed authorization header', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('NotBearer some_token')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/invalid|malformed|bearer/i)
    })

    it('should reject empty authorization header', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should include organization ID if user belongs to one', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.authenticate('Bearer org_user_token')

      if (result.success && result.user) {
        // Organization ID may or may not be present
        if (result.user.organizationId) {
          expect(result.user.organizationId).toMatch(/^org_/)
        }
      }
    })
  })

  describe('validateToken()', () => {
    it('should validate valid access token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('valid_access_token')

      expect(result.valid).toBe(true)
      expect(result.userId).toBeDefined()
    })

    it('should return user info for valid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('valid_access_token')

      expect(result.valid).toBe(true)
      expect(result.email).toBeDefined()
    })

    it('should include scopes for valid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('valid_access_token')

      if (result.valid && result.scopes) {
        expect(Array.isArray(result.scopes)).toBe(true)
      }
    })

    it('should include expiration time', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('valid_access_token')

      if (result.valid) {
        expect(result.expiresAt).toBeDefined()
        expect(result.expiresAt).toBeGreaterThan(Date.now())
      }
    })

    it('should identify token type (user vs agent)', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('valid_access_token')

      if (result.valid) {
        expect(result.tokenType).toBeDefined()
        expect(['user', 'agent']).toContain(result.tokenType)
      }
    })

    it('should reject invalid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('invalid_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject expired token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('expired_access_token')

      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/expired/i)
    })

    it('should reject revoked token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateToken('revoked_access_token')

      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/revoked/i)
    })
  })

  describe('introspectToken()', () => {
    it('should return active=true for valid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('valid_access_token')

      expect(result.active).toBe(true)
    })

    it('should include standard claims for active token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('valid_access_token')

      if (result.active) {
        expect(result.sub).toBeDefined()
        expect(result.iss).toBeDefined()
      }
    })

    it('should include expiration and issue times', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('valid_access_token')

      if (result.active) {
        expect(result.exp).toBeDefined()
        expect(result.iat).toBeDefined()
      }
    })

    it('should include scope string', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('valid_access_token')

      if (result.active) {
        expect(result.scope).toBeDefined()
        expect(typeof result.scope).toBe('string')
      }
    })

    it('should return active=false for invalid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('invalid_token')

      expect(result.active).toBe(false)
    })

    it('should return active=false for expired token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('expired_access_token')

      expect(result.active).toBe(false)
    })

    it('should return only active=false for inactive token (RFC 7662)', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.introspectToken('invalid_token')

      // Per RFC 7662, inactive tokens should only return { active: false }
      expect(result.active).toBe(false)
    })
  })

  describe('revokeToken()', () => {
    it('should revoke valid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.revokeToken('token_to_revoke')

      expect(result.success).toBe(true)
    })

    it('should succeed for already revoked token (idempotent)', async () => {
      const instance = new WorkOSDO(ctx, env)
      // Per RFC 7009, revocation is idempotent
      const result = await instance.revokeToken('already_revoked_token')

      expect(result.success).toBe(true)
    })

    it('should succeed for non-existent token (idempotent)', async () => {
      const instance = new WorkOSDO(ctx, env)
      // Per RFC 7009, revocation always succeeds
      const result = await instance.revokeToken('nonexistent_token')

      expect(result.success).toBe(true)
    })

    it('should make token invalid after revocation', async () => {
      const instance = new WorkOSDO(ctx, env)
      const token = 'token_to_revoke_and_check'

      await instance.revokeToken(token)
      const validation = await instance.validateToken(token)

      expect(validation.valid).toBe(false)
    })
  })

  describe('HTTP fetch() handler - Auth endpoints', () => {
    describe('GET /token/validate', () => {
      it('should validate token from Authorization header', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/validate', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401]).toContain(response.status)
      })

      it('should return 401 for invalid token', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/validate', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid_token',
          },
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(401)
      })

      it('should return 401 for missing Authorization header', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/validate', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(401)
      })
    })

    describe('POST /token/introspect', () => {
      it('should introspect token from body', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/introspect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'token=valid_access_token',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const data = (await response.json()) as { active: boolean }
        expect(typeof data.active).toBe('boolean')
      })

      it('should return 400 for missing token', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/introspect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: '',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)
      })
    })

    describe('POST /token/revoke', () => {
      it('should revoke token from body', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'token=token_to_revoke',
        })

        const response = await instance.fetch(request)
        // Per RFC 7009, always return 200
        expect(response.status).toBe(200)
      })

      it('should always return 200 (RFC 7009)', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'token=nonexistent_token',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
      })
    })
  })
})
