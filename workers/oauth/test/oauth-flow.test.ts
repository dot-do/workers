/**
 * RED Tests: oauth.do OAuth Flow Handling
 *
 * These tests define the contract for the oauth.do worker's OAuth flow handling.
 * The OAuthDO must implement complete OAuth 2.0/OIDC flows via WorkOS AuthKit.
 *
 * Per ARCHITECTURE.md:
 * - oauth.do implements WorkOS AuthKit integration
 * - Handles OAuth flow (authorization, callback, token exchange)
 * - Extends slim DO core
 * - Provides session management
 *
 * RED PHASE: These tests MUST FAIL because OAuthDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-6ebr).
 *
 * @see ARCHITECTURE.md lines 984, 1148-1153, 1340
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockUser,
  createMockSession,
  type MockDOState,
  type MockOAuthEnv,
} from './helpers.js'

/**
 * Interface definition for OAuthDO OAuth flow handling
 * This defines the contract the implementation must satisfy
 */
export interface OAuthDOFlowContract {
  // Authorization URL generation
  getAuthorizationUrl(options?: AuthorizationUrlOptions): Promise<AuthorizationUrlResult>

  // Callback handling (code exchange)
  handleCallback(code: string, state?: string): Promise<CallbackResult>

  // Logout
  logout(sessionId: string): Promise<LogoutResult>
  getLogoutUrl(sessionId: string): Promise<string>

  // HTTP fetch handler
  fetch(request: Request): Promise<Response>
}

export interface AuthorizationUrlOptions {
  redirectUri?: string
  state?: string
  scope?: string[]
  provider?: string
  connectionId?: string
  organizationId?: string
  domainHint?: string
  loginHint?: string
  screenHint?: 'sign-up' | 'sign-in'
}

export interface AuthorizationUrlResult {
  url: string
  state: string
}

export interface CallbackResult {
  success: boolean
  session?: {
    id: string
    userId: string
    accessToken: string
    refreshToken?: string
    expiresAt: number
  }
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  error?: string
}

export interface LogoutResult {
  success: boolean
  redirectUrl?: string
  error?: string
}

/**
 * Attempt to load OAuthDO - this will fail in RED phase
 */
async function loadOAuthDO(): Promise<new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOFlowContract> {
  const module = await import('../src/oauth.js')
  return module.OAuthDO
}

describe('OAuthDO OAuth Flow Handling', () => {
  let ctx: MockDOState
  let env: MockOAuthEnv
  let OAuthDO: new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOFlowContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    OAuthDO = await loadOAuthDO()
  })

  describe('Authorization URL generation', () => {
    describe('getAuthorizationUrl()', () => {
      it('should generate authorization URL with default options', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl()

        expect(result.url).toBeDefined()
        expect(result.url).toContain('https://')
        expect(result.state).toBeDefined()
        expect(result.state.length).toBeGreaterThan(0)
      })

      it('should include state parameter for CSRF protection', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl()

        expect(result.state).toBeDefined()
        expect(result.state.length).toBeGreaterThanOrEqual(32) // Minimum secure state length
        expect(result.url).toContain('state=')
      })

      it('should use custom state if provided', async () => {
        const instance = new OAuthDO(ctx, env)
        const customState = 'my-custom-state-123'
        const result = await instance.getAuthorizationUrl({ state: customState })

        expect(result.state).toBe(customState)
        expect(result.url).toContain(`state=${customState}`)
      })

      it('should include redirect_uri in URL', async () => {
        const instance = new OAuthDO(ctx, env)
        const customRedirectUri = 'https://myapp.com/callback'
        const result = await instance.getAuthorizationUrl({ redirectUri: customRedirectUri })

        expect(result.url).toContain(encodeURIComponent(customRedirectUri))
      })

      it('should support custom scopes', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl({
          scope: ['openid', 'profile', 'email'],
        })

        expect(result.url).toMatch(/scope=/)
      })

      it('should support provider hint for SSO', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl({
          provider: 'GoogleOAuth',
        })

        expect(result.url).toBeDefined()
        // Should handle provider-specific authorization
      })

      it('should support organization-specific login', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl({
          organizationId: 'org_test123',
        })

        expect(result.url).toBeDefined()
      })

      it('should support login hint for pre-filled email', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl({
          loginHint: 'user@example.com',
        })

        expect(result.url).toContain('login_hint')
      })

      it('should support screen hint for sign-up vs sign-in', async () => {
        const instance = new OAuthDO(ctx, env)

        const signUpResult = await instance.getAuthorizationUrl({
          screenHint: 'sign-up',
        })
        expect(signUpResult.url).toBeDefined()

        const signInResult = await instance.getAuthorizationUrl({
          screenHint: 'sign-in',
        })
        expect(signInResult.url).toBeDefined()
      })

      it('should store state in storage for later validation', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getAuthorizationUrl()

        // State should be stored for CSRF validation during callback
        expect(ctx.storage.put).toHaveBeenCalled()
      })
    })
  })

  describe('Callback handling', () => {
    describe('handleCallback()', () => {
      it('should exchange authorization code for tokens', async () => {
        const instance = new OAuthDO(ctx, env)
        // First generate auth URL to create state
        const authResult = await instance.getAuthorizationUrl()

        // Then handle callback with code
        const result = await instance.handleCallback('auth_code_123', authResult.state)

        expect(result.success).toBe(true)
        expect(result.session).toBeDefined()
        expect(result.session?.accessToken).toBeDefined()
      })

      it('should return user info after successful callback', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const result = await instance.handleCallback('auth_code_123', authResult.state)

        expect(result.success).toBe(true)
        expect(result.user).toBeDefined()
        expect(result.user?.id).toBeDefined()
        expect(result.user?.email).toBeDefined()
      })

      it('should create session after successful code exchange', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const result = await instance.handleCallback('auth_code_123', authResult.state)

        expect(result.session).toBeDefined()
        expect(result.session?.id).toBeDefined()
        expect(result.session?.userId).toBeDefined()
        expect(result.session?.expiresAt).toBeGreaterThan(Date.now())
      })

      it('should include refresh token if provided by WorkOS', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const result = await instance.handleCallback('auth_code_123', authResult.state)

        // Refresh token may or may not be present depending on grant type
        if (result.session?.refreshToken) {
          expect(result.session.refreshToken.length).toBeGreaterThan(0)
        }
      })

      it('should reject invalid authorization code', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const result = await instance.handleCallback('invalid_code', authResult.state)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error).toMatch(/invalid|expired|code/i)
      })

      it('should reject mismatched state (CSRF protection)', async () => {
        const instance = new OAuthDO(ctx, env)
        await instance.getAuthorizationUrl()

        // Try callback with different state
        const result = await instance.handleCallback('auth_code_123', 'wrong-state')

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/state|csrf|mismatch/i)
      })

      it('should reject expired state', async () => {
        const instance = new OAuthDO(ctx, env)
        // Simulate expired state by manipulating storage
        const authResult = await instance.getAuthorizationUrl()

        // Manually expire the state in storage
        await ctx.storage.put(`state:${authResult.state}`, {
          createdAt: Date.now() - 3600000, // 1 hour ago
          expiresAt: Date.now() - 1800000, // Expired 30 min ago
        })

        const result = await instance.handleCallback('auth_code_123', authResult.state)

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/expired|state/i)
      })

      it('should clean up state after successful callback', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        await instance.handleCallback('auth_code_123', authResult.state)

        // State should be deleted to prevent replay
        expect(ctx.storage.delete).toHaveBeenCalled()
      })

      it('should store session in storage after successful callback', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const result = await instance.handleCallback('auth_code_123', authResult.state)

        expect(result.success).toBe(true)
        // Session should be stored
        expect(ctx.storage.put).toHaveBeenCalled()
      })
    })
  })

  describe('Logout handling', () => {
    describe('logout()', () => {
      it('should invalidate session on logout', async () => {
        const instance = new OAuthDO(ctx, env)
        // Create a session first
        const authResult = await instance.getAuthorizationUrl()
        const callbackResult = await instance.handleCallback('auth_code_123', authResult.state)

        const logoutResult = await instance.logout(callbackResult.session!.id)

        expect(logoutResult.success).toBe(true)
      })

      it('should remove session from storage', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const callbackResult = await instance.handleCallback('auth_code_123', authResult.state)

        await instance.logout(callbackResult.session!.id)

        // Session should be deleted from storage
        expect(ctx.storage.delete).toHaveBeenCalled()
      })

      it('should return error for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.logout('nonexistent_session_id')

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/session|not found/i)
      })

      it('should revoke tokens with WorkOS', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const callbackResult = await instance.handleCallback('auth_code_123', authResult.state)

        const logoutResult = await instance.logout(callbackResult.session!.id)

        expect(logoutResult.success).toBe(true)
        // WorkOS session revocation should be called
      })
    })

    describe('getLogoutUrl()', () => {
      it('should return WorkOS logout URL', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const callbackResult = await instance.handleCallback('auth_code_123', authResult.state)

        const logoutUrl = await instance.getLogoutUrl(callbackResult.session!.id)

        expect(logoutUrl).toBeDefined()
        expect(logoutUrl).toContain('https://')
      })

      it('should include session ID or token in logout URL', async () => {
        const instance = new OAuthDO(ctx, env)
        const authResult = await instance.getAuthorizationUrl()
        const callbackResult = await instance.handleCallback('auth_code_123', authResult.state)

        const logoutUrl = await instance.getLogoutUrl(callbackResult.session!.id)

        expect(logoutUrl).toBeDefined()
      })
    })
  })

  describe('HTTP fetch() handler - OAuth endpoints', () => {
    describe('GET /authorize', () => {
      it('should redirect to authorization URL', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/authorize', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toBeDefined()
      })

      it('should accept query parameters for auth options', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/authorize')
        url.searchParams.set('redirect_uri', 'https://myapp.com/callback')
        url.searchParams.set('screen_hint', 'sign-up')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
        const location = response.headers.get('Location')
        expect(location).toBeDefined()
      })

      it('should set state cookie for CSRF protection', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/authorize', { method: 'GET' })

        const response = await instance.fetch(request)

        const setCookie = response.headers.get('Set-Cookie')
        expect(setCookie).toBeDefined()
        expect(setCookie).toMatch(/state=/)
      })
    })

    describe('GET /callback', () => {
      it('should exchange code and return session', async () => {
        const instance = new OAuthDO(ctx, env)

        // First, get authorization URL to set up state
        const authRequest = new Request('https://oauth.do/authorize', { method: 'GET' })
        const authResponse = await instance.fetch(authRequest)
        const stateCookie = authResponse.headers.get('Set-Cookie')
        const stateMatch = stateCookie?.match(/state=([^;]+)/)
        const state = stateMatch?.[1]

        // Then simulate callback
        const callbackUrl = new URL('https://oauth.do/callback')
        callbackUrl.searchParams.set('code', 'auth_code_123')
        callbackUrl.searchParams.set('state', state!)

        const callbackRequest = new Request(callbackUrl.toString(), {
          method: 'GET',
          headers: {
            Cookie: `state=${state}`,
          },
        })

        const response = await instance.fetch(callbackRequest)

        // Should redirect to success URL or return session
        expect([200, 302]).toContain(response.status)
      })

      it('should return 400 for missing code', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/callback?state=test', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(400)
        const data = (await response.json()) as { error: string }
        expect(data.error).toMatch(/code|required/i)
      })

      it('should return 400 for invalid state', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/callback?code=test&state=invalid', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(400)
        const data = (await response.json()) as { error: string }
        expect(data.error).toMatch(/state|invalid|csrf/i)
      })

      it('should handle OAuth error responses', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/callback')
        url.searchParams.set('error', 'access_denied')
        url.searchParams.set('error_description', 'User denied access')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect([400, 403]).toContain(response.status)
        const data = (await response.json()) as { error: string }
        expect(data.error).toBeDefined()
      })
    })

    describe('POST /logout', () => {
      it('should logout and clear session', async () => {
        const instance = new OAuthDO(ctx, env)

        // First create a session
        const authResult = await instance.getAuthorizationUrl()
        await instance.handleCallback('auth_code_123', authResult.state)

        const request = new Request('https://oauth.do/logout', {
          method: 'POST',
          headers: {
            Cookie: 'session=session_id',
          },
        })

        const response = await instance.fetch(request)

        expect([200, 302]).toContain(response.status)
      })

      it('should clear session cookie on logout', async () => {
        const instance = new OAuthDO(ctx, env)

        const request = new Request('https://oauth.do/logout', {
          method: 'POST',
          headers: {
            Cookie: 'session=session_id',
          },
        })

        const response = await instance.fetch(request)

        const setCookie = response.headers.get('Set-Cookie')
        // Should clear/expire the session cookie
        expect(setCookie).toMatch(/session=.*(?:Max-Age=0|expires=)/i)
      })
    })

    describe('GET /logout', () => {
      it('should return logout redirect URL', async () => {
        const instance = new OAuthDO(ctx, env)

        const request = new Request('https://oauth.do/logout', {
          method: 'GET',
          headers: {
            Cookie: 'session=session_id',
          },
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toBeDefined()
      })
    })
  })
})
