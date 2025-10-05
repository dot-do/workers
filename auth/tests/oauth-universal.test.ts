/**
 * OAuth Flow Tests - Phase 7 Universal API
 *
 * Comprehensive tests for OAuth 2.0 flow with 3 providers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getProviderConfig,
  getOAuthUrl,
  exchangeOAuthCode,
  storeOAuthToken,
  getOAuthToken,
  refreshOAuthToken,
  isTokenExpired,
  type OAuthToken,
} from '../src/oauth-universal'

describe('OAuth Universal Flow', () => {
  let mockEnv: any

  beforeEach(() => {
    mockEnv = {
      // Mock OAuth credentials
      STRIPE_CLIENT_ID: 'stripe_client_id_test',
      STRIPE_CLIENT_SECRET: 'stripe_client_secret_test',
      GITHUB_CLIENT_ID: 'github_client_id_test',
      GITHUB_CLIENT_SECRET: 'github_client_secret_test',
      OPENWEATHER_CLIENT_ID: 'openweather_api_key_test',
      OPENWEATHER_CLIENT_SECRET: 'placeholder',
      ENCRYPTION_SECRET: 'test-encryption-secret-for-oauth-tokens',

      // Mock DB service
      DB: {
        saveOAuthToken: vi.fn().mockResolvedValue({ success: true }),
        getOAuthToken: vi.fn().mockResolvedValue(null),
      },
    }

    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('getProviderConfig', () => {
    it('should return Stripe configuration', () => {
      const config = getProviderConfig('stripe', mockEnv)

      expect(config).toBeDefined()
      expect(config?.provider).toBe('stripe')
      expect(config?.name).toBe('Stripe')
      expect(config?.authUrl).toBe('https://connect.stripe.com/oauth/authorize')
      expect(config?.tokenUrl).toBe('https://connect.stripe.com/oauth/token')
      expect(config?.clientId).toBe('stripe_client_id_test')
      expect(config?.clientSecret).toBe('stripe_client_secret_test')
      expect(config?.scopes).toEqual(['read_write'])
      expect(config?.authType).toBe('oauth')
    })

    it('should return GitHub configuration', () => {
      const config = getProviderConfig('github', mockEnv)

      expect(config).toBeDefined()
      expect(config?.provider).toBe('github')
      expect(config?.name).toBe('GitHub')
      expect(config?.authUrl).toBe('https://github.com/login/oauth/authorize')
      expect(config?.tokenUrl).toBe('https://github.com/login/oauth/access_token')
      expect(config?.scopes).toEqual(['repo', 'user', 'gist'])
    })

    it('should return OpenWeather configuration', () => {
      const config = getProviderConfig('openweather', mockEnv)

      expect(config).toBeDefined()
      expect(config?.provider).toBe('openweather')
      expect(config?.name).toBe('OpenWeather')
      expect(config?.authType).toBe('api_key')
    })

    it('should return null for unknown provider', () => {
      const config = getProviderConfig('unknown-provider', mockEnv)
      expect(config).toBeNull()
    })

    it('should return null if credentials missing', () => {
      const envWithoutCreds = {
        STRIPE_CLIENT_ID: undefined,
        STRIPE_CLIENT_SECRET: undefined,
      }
      const config = getProviderConfig('stripe', envWithoutCreds)
      expect(config).toBeNull()
    })

    it('should be case-insensitive', () => {
      const config1 = getProviderConfig('STRIPE', mockEnv)
      const config2 = getProviderConfig('Stripe', mockEnv)
      const config3 = getProviderConfig('stripe', mockEnv)

      expect(config1?.provider).toBe('stripe')
      expect(config2?.provider).toBe('stripe')
      expect(config3?.provider).toBe('stripe')
    })
  })

  describe('getOAuthUrl', () => {
    it('should generate Stripe OAuth URL', () => {
      const url = getOAuthUrl('stripe', 'https://api.do/oauth/callback', 'random_state_123', mockEnv)

      expect(url).toBeDefined()
      expect(url).toContain('https://connect.stripe.com/oauth/authorize')
      expect(url).toContain('client_id=stripe_client_id_test')
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapi.do%2Foauth%2Fcallback')
      expect(url).toContain('scope=read_write')
      expect(url).toContain('state=random_state_123')
      expect(url).toContain('response_type=code')
    })

    it('should generate GitHub OAuth URL', () => {
      const url = getOAuthUrl('github', 'https://api.do/oauth/callback', 'random_state_456', mockEnv)

      expect(url).toBeDefined()
      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=github_client_id_test')
      expect(url).toContain('scope=repo+user+gist')
      expect(url).toContain('state=random_state_456')
    })

    it('should return null for API key providers (OpenWeather)', () => {
      const url = getOAuthUrl('openweather', 'https://api.do/oauth/callback', 'state', mockEnv)
      expect(url).toBeNull()
    })

    it('should return null for unknown provider', () => {
      const url = getOAuthUrl('unknown', 'https://api.do/oauth/callback', 'state', mockEnv)
      expect(url).toBeNull()
    })
  })

  describe('exchangeOAuthCode', () => {
    it('should exchange code for tokens (Stripe)', async () => {
      // Mock successful OAuth response
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'sk_test_abc123',
          refresh_token: 'rt_test_xyz456',
          expires_in: 3600,
          scope: 'read_write',
        }),
      })

      const result = await exchangeOAuthCode('stripe', 'auth_code_123', 'https://api.do/oauth/callback', mockEnv)

      expect(result).toBeDefined()
      expect(result?.access_token).toBe('sk_test_abc123')
      expect(result?.refresh_token).toBe('rt_test_xyz456')
      expect(result?.expires_in).toBe(3600)
      expect(result?.scope).toBe('read_write')

      // Verify fetch called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.stripe.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      )
    })

    it('should handle OAuth errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid authorization code',
      })

      const result = await exchangeOAuthCode('stripe', 'invalid_code', 'https://api.do/oauth/callback', mockEnv)

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await exchangeOAuthCode('stripe', 'auth_code', 'https://api.do/oauth/callback', mockEnv)

      expect(result).toBeNull()
    })
  })

  describe('storeOAuthToken', () => {
    it('should encrypt and store OAuth token', async () => {
      const token: OAuthToken = {
        userId: 'user_123',
        provider: 'stripe',
        accessToken: 'sk_test_abc123',
        refreshToken: 'rt_test_xyz456',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: ['read_write'],
      }

      const success = await storeOAuthToken(token, mockEnv)

      expect(success).toBe(true)
      expect(mockEnv.DB.saveOAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: 'stripe',
          encryptedAccessToken: expect.any(String),
          encryptedRefreshToken: expect.any(String),
          expiresAt: expect.any(Date),
          scopes: ['read_write'],
        })
      )
    })

    it('should handle tokens without refresh token', async () => {
      const token: OAuthToken = {
        userId: 'user_123',
        provider: 'github',
        accessToken: 'gho_abc123',
        scopes: ['repo'],
      }

      const success = await storeOAuthToken(token, mockEnv)

      expect(success).toBe(true)
      expect(mockEnv.DB.saveOAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: 'github',
          encryptedAccessToken: expect.any(String),
          encryptedRefreshToken: undefined,
        })
      )
    })

    it('should fail if ENCRYPTION_SECRET missing', async () => {
      const envWithoutSecret = { ...mockEnv, ENCRYPTION_SECRET: undefined }
      const token: OAuthToken = {
        userId: 'user_123',
        provider: 'stripe',
        accessToken: 'sk_test_abc123',
        scopes: [],
      }

      const success = await storeOAuthToken(token, envWithoutSecret)
      expect(success).toBe(false)
    })
  })

  describe('getOAuthToken', () => {
    it('should retrieve and decrypt OAuth token', async () => {
      // First store a token
      const originalToken: OAuthToken = {
        userId: 'user_456',
        provider: 'stripe',
        accessToken: 'sk_test_original',
        refreshToken: 'rt_test_original',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: ['read_write'],
      }

      await storeOAuthToken(originalToken, mockEnv)

      // Get the encrypted values that were stored
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]

      // Mock DB to return encrypted token
      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: saveCall.encryptedRefreshToken,
        expires_at: saveCall.expiresAt.toISOString(),
        scopes: JSON.stringify(saveCall.scopes),
      })

      // Retrieve and decrypt
      const retrievedToken = await getOAuthToken('user_456', 'stripe', mockEnv)

      expect(retrievedToken).toBeDefined()
      expect(retrievedToken?.userId).toBe('user_456')
      expect(retrievedToken?.provider).toBe('stripe')
      expect(retrievedToken?.accessToken).toBe('sk_test_original')
      expect(retrievedToken?.refreshToken).toBe('rt_test_original')
      expect(retrievedToken?.scopes).toEqual(['read_write'])
    })

    it('should return null if token not found', async () => {
      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue(null)

      const token = await getOAuthToken('user_789', 'stripe', mockEnv)
      expect(token).toBeNull()
    })

    it('should handle tokens without refresh token', async () => {
      const originalToken: OAuthToken = {
        userId: 'user_999',
        provider: 'github',
        accessToken: 'gho_test_token',
        scopes: ['repo'],
      }

      await storeOAuthToken(originalToken, mockEnv)
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]

      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: null,
        expires_at: null,
        scopes: JSON.stringify(saveCall.scopes),
      })

      const retrievedToken = await getOAuthToken('user_999', 'github', mockEnv)

      expect(retrievedToken).toBeDefined()
      expect(retrievedToken?.refreshToken).toBeUndefined()
    })
  })

  describe('refreshOAuthToken', () => {
    it('should refresh expired token', async () => {
      // Mock existing token
      const existingToken: OAuthToken = {
        userId: 'user_refresh',
        provider: 'stripe',
        accessToken: 'sk_test_old',
        refreshToken: 'rt_test_refresh',
        expiresAt: new Date(Date.now() - 1000), // Expired
        scopes: ['read_write'],
      }

      await storeOAuthToken(existingToken, mockEnv)
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]

      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: saveCall.encryptedRefreshToken,
        expires_at: saveCall.expiresAt.toISOString(),
        scopes: JSON.stringify(saveCall.scopes),
      })

      // Mock OAuth refresh response
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'sk_test_new',
          refresh_token: 'rt_test_new',
          expires_in: 3600,
        }),
      })

      const success = await refreshOAuthToken('user_refresh', 'stripe', mockEnv)

      expect(success).toBe(true)

      // Verify new token was stored
      expect(mockEnv.DB.saveOAuthToken).toHaveBeenCalledTimes(2) // Once for setup, once for refresh
      const refreshCall = mockEnv.DB.saveOAuthToken.mock.calls[1][0]
      expect(refreshCall.userId).toBe('user_refresh')
    })

    it('should fail if no refresh token available', async () => {
      const tokenWithoutRefresh: OAuthToken = {
        userId: 'user_no_refresh',
        provider: 'stripe',
        accessToken: 'sk_test_token',
        scopes: [],
      }

      await storeOAuthToken(tokenWithoutRefresh, mockEnv)
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]

      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: null,
        expires_at: null,
        scopes: '[]',
      })

      const success = await refreshOAuthToken('user_no_refresh', 'stripe', mockEnv)
      expect(success).toBe(false)
    })

    it('should handle refresh failures gracefully', async () => {
      const existingToken: OAuthToken = {
        userId: 'user_fail',
        provider: 'stripe',
        accessToken: 'sk_test_old',
        refreshToken: 'rt_test_refresh',
        scopes: [],
      }

      await storeOAuthToken(existingToken, mockEnv)
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]

      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: saveCall.encryptedRefreshToken,
        expires_at: null,
        scopes: '[]',
      })

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const success = await refreshOAuthToken('user_fail', 'stripe', mockEnv)
      expect(success).toBe(false)
    })
  })

  describe('isTokenExpired', () => {
    it('should detect expired tokens', () => {
      const expiredToken: OAuthToken = {
        userId: 'user_expired',
        provider: 'stripe',
        accessToken: 'token',
        scopes: [],
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      }

      expect(isTokenExpired(expiredToken)).toBe(true)
    })

    it('should detect tokens expiring soon (within buffer)', () => {
      const soonToExpireToken: OAuthToken = {
        userId: 'user_soon',
        provider: 'stripe',
        accessToken: 'token',
        scopes: [],
        expiresAt: new Date(Date.now() + 200 * 1000), // Expires in 200 seconds
      }

      // Default buffer is 300 seconds, so this should be considered expired
      expect(isTokenExpired(soonToExpireToken)).toBe(true)

      // With custom buffer of 100 seconds, should not be expired
      expect(isTokenExpired(soonToExpireToken, 100)).toBe(false)
    })

    it('should not mark valid tokens as expired', () => {
      const validToken: OAuthToken = {
        userId: 'user_valid',
        provider: 'stripe',
        accessToken: 'token',
        scopes: [],
        expiresAt: new Date(Date.now() + 1000 * 1000), // Expires in 1000 seconds
      }

      expect(isTokenExpired(validToken)).toBe(false)
    })

    it('should handle tokens without expiration', () => {
      const noExpirationToken: OAuthToken = {
        userId: 'user_no_exp',
        provider: 'stripe',
        accessToken: 'token',
        scopes: [],
      }

      expect(isTokenExpired(noExpirationToken)).toBe(false)
    })
  })

  describe('Round-trip tests', () => {
    it('should handle full OAuth flow for Stripe', async () => {
      // Step 1: Generate OAuth URL
      const authUrl = getOAuthUrl('stripe', 'https://api.do/oauth/callback', 'random_state', mockEnv)
      expect(authUrl).toBeDefined()

      // Step 2: Mock OAuth callback (exchange code)
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'sk_test_roundtrip',
          refresh_token: 'rt_test_roundtrip',
          expires_in: 3600,
        }),
      })

      const tokens = await exchangeOAuthCode('stripe', 'auth_code', 'https://api.do/oauth/callback', mockEnv)
      expect(tokens).toBeDefined()

      // Step 3: Store tokens
      const token: OAuthToken = {
        userId: 'user_roundtrip',
        provider: 'stripe',
        accessToken: tokens!.access_token,
        refreshToken: tokens!.refresh_token,
        expiresAt: new Date(Date.now() + tokens!.expires_in! * 1000),
        scopes: ['read_write'],
      }

      const stored = await storeOAuthToken(token, mockEnv)
      expect(stored).toBe(true)

      // Step 4: Retrieve tokens
      const saveCall = mockEnv.DB.saveOAuthToken.mock.calls[0][0]
      mockEnv.DB.getOAuthToken = vi.fn().mockResolvedValue({
        encrypted_access_token: saveCall.encryptedAccessToken,
        encrypted_refresh_token: saveCall.encryptedRefreshToken,
        expires_at: saveCall.expiresAt.toISOString(),
        scopes: JSON.stringify(saveCall.scopes),
      })

      const retrieved = await getOAuthToken('user_roundtrip', 'stripe', mockEnv)
      expect(retrieved?.accessToken).toBe('sk_test_roundtrip')
      expect(retrieved?.refreshToken).toBe('rt_test_roundtrip')
    })
  })
})
