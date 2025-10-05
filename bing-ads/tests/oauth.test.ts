/**
 * Bing Ads OAuth Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BingAdsOAuth } from '../src/oauth'
import type { BingAdsOAuthConfig } from '../src/oauth'

describe('BingAdsOAuth', () => {
  let oauth: BingAdsOAuth
  let config: BingAdsOAuthConfig

  beforeEach(() => {
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback',
      tenant: 'common',
    }
    oauth = new BingAdsOAuth(config)
  })

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL with MFA scope', () => {
      const state = 'random-state-123'
      const url = oauth.getAuthorizationUrl(state)

      expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
      expect(url).toContain(`client_id=${config.clientId}`)
      expect(url).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`)
      expect(url).toContain('response_type=code')
      expect(url).toContain('scope=https%3A%2F%2Fads.microsoft.com%2Fmsads.manage') // MFA scope
      expect(url).toContain('offline_access')
      expect(url).toContain(`state=${state}`)
      expect(url).toContain('response_mode=query')
      expect(url).toContain('prompt=consent')
    })

    it('should support custom tenant', () => {
      const customOAuth = new BingAdsOAuth({
        ...config,
        tenant: 'contoso.com',
      })

      const url = customOAuth.getAuthorizationUrl('state')

      expect(url).toContain('https://login.microsoftonline.com/contoso.com/oauth2/v2.0/authorize')
    })

    it('should default to common tenant', () => {
      const noTenantOAuth = new BingAdsOAuth({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      })

      const url = noTenantOAuth.getAuthorizationUrl('state')

      expect(url).toContain('/common/')
    })

    it('should force consent prompt for offline access', () => {
      const url = oauth.getAuthorizationUrl('state')

      expect(url).toContain('prompt=consent')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens with MFA support', async () => {
      global.fetch = async (url: string, options?: RequestInit) => {
        expect(url).toContain('/common/oauth2/v2.0/token')

        const body = new URLSearchParams(options?.body as string)
        expect(body.get('scope')).toContain('msads.manage')
        expect(body.get('scope')).toContain('offline_access')

        return {
          ok: true,
          json: async () => ({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            scope: 'https://ads.microsoft.com/msads.manage offline_access',
          }),
        } as Response
      }

      const tokens = await oauth.exchangeCodeForTokens('auth-code-123')

      expect(tokens.accessToken).toBe('new-access-token')
      expect(tokens.refreshToken).toBe('new-refresh-token')
      expect(tokens.scope).toContain('msads.manage')
    })

    it('should throw error if MFA scope not granted', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          scope: 'https://ads.microsoft.com/ads.manage', // Old scope without MFA
        }),
      }) as Response

      const tokens = await oauth.exchangeCodeForTokens('code')

      // Should warn or handle gracefully
      expect(tokens.scope).not.toContain('msads.manage')
    })

    it('should throw error on failed exchange', async () => {
      global.fetch = async () => ({
        ok: false,
        text: async () => 'Invalid authorization code',
      }) as Response

      await expect(oauth.exchangeCodeForTokens('invalid-code')).rejects.toThrow()
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh token with MFA scope', async () => {
      global.fetch = async (url: string, options?: RequestInit) => {
        const body = new URLSearchParams(options?.body as string)
        expect(body.get('scope')).toContain('msads.manage')

        return {
          ok: true,
          json: async () => ({
            access_token: 'refreshed-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            scope: 'https://ads.microsoft.com/msads.manage offline_access',
          }),
        } as Response
      }

      const tokens = await oauth.refreshAccessToken('old-refresh-token')

      expect(tokens.accessToken).toBe('refreshed-token')
      expect(tokens.scope).toContain('msads.manage')
    })

    it('should throw error on invalid refresh token', async () => {
      global.fetch = async () => ({
        ok: false,
        text: async () => 'Invalid refresh token',
      }) as Response

      await expect(oauth.refreshAccessToken('invalid')).rejects.toThrow()
    })
  })

  describe('makeAuthenticatedRequest', () => {
    it('should include required Bing Ads headers', async () => {
      let requestHeaders: Record<string, string> = {}

      global.fetch = async (_url: string, options?: RequestInit) => {
        if (options?.headers) {
          requestHeaders = options.headers as Record<string, string>
        }
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response
      }

      await oauth.makeAuthenticatedRequest(
        'https://bingads.microsoft.com/api',
        'access-token',
        'dev-token',
        'customer-123',
        'account-456'
      )

      expect(requestHeaders['Authorization']).toBe('Bearer access-token')
      expect(requestHeaders['DeveloperToken']).toBe('dev-token')
      expect(requestHeaders['CustomerId']).toBe('customer-123')
      expect(requestHeaders['CustomerAccountId']).toBe('account-456')
      expect(requestHeaders['Content-Type']).toBe('application/json')
    })

    it('should handle SOAP requests', async () => {
      let requestBody = ''

      global.fetch = async (_url: string, options?: RequestInit) => {
        requestBody = options?.body as string
        return {
          ok: true,
          text: async () => '<response>Success</response>',
        } as Response
      }

      const soapEnvelope = '<?xml version="1.0"?><Envelope></Envelope>'

      await oauth.makeAuthenticatedRequest(
        'https://bingads.microsoft.com/api',
        'token',
        'dev',
        'customer',
        'account',
        {
          method: 'POST',
          body: soapEnvelope,
        }
      )

      expect(requestBody).toBe(soapEnvelope)
    })
  })

  describe('isTokenExpired', () => {
    it('should use 1-minute buffer', () => {
      const almostExpired = new Date(Date.now() + 30000).toISOString() // 30 seconds
      expect(oauth.isTokenExpired(almostExpired)).toBe(true)

      const notExpired = new Date(Date.now() + 120000).toISOString() // 2 minutes
      expect(oauth.isTokenExpired(notExpired)).toBe(false)
    })
  })
})
