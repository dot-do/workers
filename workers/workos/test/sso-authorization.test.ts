/**
 * Tests: WorkOSDO SSO Authorization URL Generation
 *
 * Tests the SSO authorization flow for id.org.ai.
 * Per ARCHITECTURE.md, this service handles enterprise SSO out-of-the-box.
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
 * Interface for SSO authorization options
 */
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

/**
 * Result of SSO authorization URL generation
 */
export interface SSOAuthorizationResult {
  url: string
  state: string
}

/**
 * Contract for WorkOSDO SSO methods
 */
export interface WorkOSDOSSOContract {
  sso: {
    getAuthorizationUrl(options: SSOAuthorizationOptions): Promise<SSOAuthorizationResult>
  }
  fetch(request: Request): Promise<Response>
}

/**
 * Load WorkOSDO
 */
async function loadWorkOSDO(): Promise<new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOSSOContract> {
  const module = await import('../src/workos.js')
  return module.WorkOSDO
}

describe('WorkOSDO SSO Authorization', () => {
  let ctx: MockDOState
  let env: MockWorkOSEnv
  let WorkOSDO: new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOSSOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkOSDO = await loadWorkOSDO()
  })

  describe('sso.getAuthorizationUrl()', () => {
    it('should generate authorization URL with organization ID', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      expect(result.url).toBeDefined()
      expect(result.url).toContain('https://')
      expect(result.url).toContain('organization')
      expect(result.state).toBeDefined()
      expect(result.state.length).toBeGreaterThanOrEqual(32)
    })

    it('should include client_id in authorization URL', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      expect(result.url).toContain('client_id=')
    })

    it('should include redirect_uri in authorization URL', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
        redirectUri: 'https://myapp.com/callback',
      })

      expect(result.url).toContain(encodeURIComponent('https://myapp.com/callback'))
    })

    it('should use default redirect URI if not provided', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      expect(result.url).toContain('redirect_uri=')
    })

    it('should include state parameter for CSRF protection', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      expect(result.state).toBeDefined()
      expect(result.state.length).toBeGreaterThanOrEqual(32)
      expect(result.url).toContain('state=')
    })

    it('should use custom state if provided', async () => {
      const instance = new WorkOSDO(ctx, env)
      const customState = 'my-custom-state-value'
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
        state: customState,
      })

      expect(result.state).toBe(customState)
      expect(result.url).toContain(`state=${customState}`)
    })

    it('should support connection-based SSO', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        connection: 'conn_saml_123',
      })

      expect(result.url).toBeDefined()
      expect(result.url).toContain('connection')
    })

    it('should support domain hint for automatic IdP selection', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        domainHint: 'example.com',
      })

      expect(result.url).toContain('domain_hint')
      expect(result.url).toContain('example.com')
    })

    it('should support login hint for pre-filled email', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        loginHint: 'user@example.com',
      })

      expect(result.url).toContain('login_hint')
    })

    it('should support provider-based OAuth (Google, Microsoft, etc)', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        provider: 'GoogleOAuth',
      })

      expect(result.url).toBeDefined()
    })

    it('should store state in storage for later validation', async () => {
      const instance = new WorkOSDO(ctx, env)
      await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      expect(ctx.storage.put).toHaveBeenCalled()
    })

    it('should set state expiration time', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.sso.getAuthorizationUrl({
        organization: 'org_test123',
      })

      // Verify state was stored with expiration
      const putCalls = ctx.storage.put.mock.calls
      expect(putCalls.length).toBeGreaterThan(0)
      const [key, value] = putCalls[0]
      expect(key).toContain('state:')
      expect(value).toHaveProperty('expiresAt')
    })
  })

  describe('HTTP fetch() handler - SSO endpoints', () => {
    describe('GET /sso/authorize', () => {
      it('should redirect to SSO authorization URL', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/sso/authorize')
        url.searchParams.set('organization', 'org_test123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toBeDefined()
      })

      it('should return 400 if neither organization nor connection provided', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/sso/authorize', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(400)
        const data = (await response.json()) as { error: string }
        expect(data.error).toMatch(/organization|connection/i)
      })

      it('should accept connection_id parameter', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/sso/authorize')
        url.searchParams.set('connection_id', 'conn_saml_123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
      })

      it('should set state cookie for CSRF protection', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/sso/authorize')
        url.searchParams.set('organization', 'org_test123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        const setCookie = response.headers.get('Set-Cookie')
        expect(setCookie).toBeDefined()
        expect(setCookie).toMatch(/state=/)
      })
    })

    describe('GET /sso/callback', () => {
      it('should exchange code for profile and token', async () => {
        const instance = new WorkOSDO(ctx, env)

        // First get authorization to set up state
        const authUrl = new URL('https://id.org.ai/sso/authorize')
        authUrl.searchParams.set('organization', 'org_test123')
        const authRequest = new Request(authUrl.toString(), { method: 'GET' })
        const authResponse = await instance.fetch(authRequest)
        const stateCookie = authResponse.headers.get('Set-Cookie')
        const stateMatch = stateCookie?.match(/state=([^;]+)/)
        const state = stateMatch?.[1]

        // Then handle callback
        const callbackUrl = new URL('https://id.org.ai/sso/callback')
        callbackUrl.searchParams.set('code', 'sso_auth_code_123')
        callbackUrl.searchParams.set('state', state!)

        const callbackRequest = new Request(callbackUrl.toString(), {
          method: 'GET',
          headers: {
            Cookie: `state=${state}`,
          },
        })

        const response = await instance.fetch(callbackRequest)
        expect([200, 302]).toContain(response.status)
      })

      it('should return 400 for missing code', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/sso/callback?state=test', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 for invalid state', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/sso/callback?code=test&state=invalid', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)
      })
    })
  })
})
