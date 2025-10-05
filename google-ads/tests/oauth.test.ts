/**
 * Google Ads OAuth Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GoogleAdsOAuth } from '../src/oauth'
import type { BingAdsOAuthConfig } from '../src/oauth'

describe('GoogleAdsOAuth', () => {
  let oauth: GoogleAdsOAuth
  let config: BingAdsOAuthConfig

  beforeEach(() => {
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback',
    }
    oauth = new GoogleAdsOAuth(config)
  })

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const state = 'random-state-123'
      const url = oauth.getAuthorizationUrl(state)

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain(`client_id=${config.clientId}`)
      expect(url).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`)
      expect(url).toContain('response_type=code')
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords')
      expect(url).toContain(`state=${state}`)
      expect(url).toContain('access_type=offline')
      expect(url).toContain('prompt=consent')
    })

    it('should include different state values', () => {
      const state1 = oauth.getAuthorizationUrl('state-1')
      const state2 = oauth.getAuthorizationUrl('state-2')

      expect(state1).toContain('state=state-1')
      expect(state2).toContain('state=state-2')
    })
  })

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString() // 1 minute ago
      expect(oauth.isTokenExpired(pastDate)).toBe(true)
    })

    it('should return true for tokens expiring within 1 minute', () => {
      const soonDate = new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      expect(oauth.isTokenExpired(soonDate)).toBe(true)
    })

    it('should return false for valid tokens', () => {
      const futureDate = new Date(Date.now() + 120000).toISOString() // 2 minutes from now
      expect(oauth.isTokenExpired(futureDate)).toBe(false)
    })

    it('should use 1-minute buffer for expiry check', () => {
      const bufferDate = new Date(Date.now() + 60000).toISOString() // Exactly 1 minute
      // Should be considered expired due to buffer
      expect(oauth.isTokenExpired(bufferDate)).toBe(true)
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should handle successful token exchange', async () => {
      // Mock fetch
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/adwords',
        }),
      }) as Response

      const tokens = await oauth.exchangeCodeForTokens('auth-code-123')

      expect(tokens.accessToken).toBe('new-access-token')
      expect(tokens.refreshToken).toBe('new-refresh-token')
      expect(tokens.scope).toBe('https://www.googleapis.com/auth/adwords')
      expect(new Date(tokens.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('should throw error on failed token exchange', async () => {
      global.fetch = async () => ({
        ok: false,
        text: async () => 'Invalid authorization code',
      }) as Response

      await expect(oauth.exchangeCodeForTokens('invalid-code')).rejects.toThrow('Failed to exchange code for tokens')
    })

    it('should calculate correct expiry time', async () => {
      const now = Date.now()

      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          scope: 'scope',
        }),
      }) as Response

      const tokens = await oauth.exchangeCodeForTokens('code')
      const expiresAt = new Date(tokens.expiresAt).getTime()

      expect(expiresAt).toBeGreaterThanOrEqual(now + 3600000) // 1 hour
      expect(expiresAt).toBeLessThan(now + 3600000 + 1000) // Within 1 second
    })
  })

  describe('refreshAccessToken', () => {
    it('should handle successful token refresh', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/adwords',
        }),
      }) as Response

      const tokens = await oauth.refreshAccessToken('old-refresh-token')

      expect(tokens.accessToken).toBe('refreshed-access-token')
      expect(tokens.refreshToken).toBe('refreshed-refresh-token')
    })

    it('should throw error on failed token refresh', async () => {
      global.fetch = async () => ({
        ok: false,
        text: async () => 'Invalid refresh token',
      }) as Response

      await expect(oauth.refreshAccessToken('invalid-refresh')).rejects.toThrow('Failed to refresh access token')
    })

    it('should use correct token endpoint', async () => {
      let requestUrl = ''

      global.fetch = async (url: string) => {
        requestUrl = url
        return {
          ok: true,
          json: async () => ({
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            scope: 'scope',
          }),
        } as Response
      }

      await oauth.refreshAccessToken('refresh-token')

      expect(requestUrl).toBe('https://oauth2.googleapis.com/token')
    })
  })

  describe('makeAuthenticatedRequest', () => {
    it('should include required headers', async () => {
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

      await oauth.makeAuthenticatedRequest('https://api.example.com', 'access-token', 'dev-token', 'customer-123', 'account-456')

      expect(requestHeaders['Authorization']).toBe('Bearer access-token')
      expect(requestHeaders['DeveloperToken']).toBe('dev-token')
      expect(requestHeaders['CustomerId']).toBe('customer-123')
      expect(requestHeaders['AccountId']).toBe('account-456')
      expect(requestHeaders['Content-Type']).toBe('application/json')
    })

    it('should handle successful API requests', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({ data: 'success' }),
      }) as Response

      const result = await oauth.makeAuthenticatedRequest<{ data: string }>(
        'https://api.example.com',
        'token',
        'dev-token',
        'customer',
        'account'
      )

      expect(result.data).toBe('success')
    })

    it('should throw error on failed API requests', async () => {
      global.fetch = async () => ({
        ok: false,
        text: async () => 'API Error',
      }) as Response

      await expect(oauth.makeAuthenticatedRequest('https://api.example.com', 'token', 'dev', 'customer', 'account')).rejects.toThrow(
        'Google Ads API request failed'
      )
    })

    it('should merge custom headers with default headers', async () => {
      let requestHeaders: Record<string, string> = {}

      global.fetch = async (_url: string, options?: RequestInit) => {
        if (options?.headers) {
          requestHeaders = options.headers as Record<string, string>
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response
      }

      await oauth.makeAuthenticatedRequest('https://api.example.com', 'token', 'dev', 'customer', 'account', {
        headers: { 'X-Custom-Header': 'custom-value' },
      })

      expect(requestHeaders['Authorization']).toBe('Bearer token')
      expect(requestHeaders['X-Custom-Header']).toBe('custom-value')
    })
  })
})
