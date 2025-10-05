/**
 * OAuth Providers Test Suite
 *
 * Tests OAuth 2.0 integration for cloud platforms:
 * - Vercel
 * - Netlify
 * - AWS Cognito
 * - GCP Google OAuth
 * - Azure Entra ID
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getProviderConfig,
  getOAuthAuthUrl,
  exchangeOAuthCode,
  refreshOAuthToken,
  validateOAuthToken,
  storeOAuthToken,
  getOAuthToken,
  isTokenExpired,
  getValidOAuthToken,
} from '../src/oauth-providers'

// Mock environment
const mockEnv = {
  // Vercel
  VERCEL_CLIENT_ID: 'vercel_client_id',
  VERCEL_CLIENT_SECRET: 'vercel_client_secret',

  // Netlify
  NETLIFY_CLIENT_ID: 'netlify_client_id',
  NETLIFY_CLIENT_SECRET: 'netlify_client_secret',

  // AWS Cognito
  AWS_COGNITO_CLIENT_ID: 'aws_client_id',
  AWS_COGNITO_CLIENT_SECRET: 'aws_client_secret',
  AWS_COGNITO_DOMAIN: 'test-domain',
  AWS_REGION: 'us-east-1',

  // GCP
  GCP_CLIENT_ID: 'gcp_client_id',
  GCP_CLIENT_SECRET: 'gcp_client_secret',

  // Azure
  AZURE_CLIENT_ID: 'azure_client_id',
  AZURE_CLIENT_SECRET: 'azure_client_secret',
  AZURE_TENANT_ID: 'azure_tenant_id',

  // Encryption
  ENCRYPTION_SECRET: 'test_encryption_secret',

  // Mock DB service
  DB: {
    saveOAuthToken: vi.fn().mockResolvedValue({ success: true }),
    getOAuthToken: vi.fn().mockResolvedValue(null),
  },
}

describe('OAuth Provider Configuration', () => {
  it('should get Vercel provider config', () => {
    const config = getProviderConfig('vercel', mockEnv)
    expect(config).toBeDefined()
    expect(config?.provider).toBe('vercel')
    expect(config?.name).toBe('Vercel')
    expect(config?.authUrl).toBe('https://api.vercel.com/v2/oauth/authorize')
    expect(config?.tokenUrl).toBe('https://api.vercel.com/v2/oauth/access_token')
    expect(config?.clientId).toBe('vercel_client_id')
    expect(config?.clientSecret).toBe('vercel_client_secret')
  })

  it('should get Netlify provider config', () => {
    const config = getProviderConfig('netlify', mockEnv)
    expect(config).toBeDefined()
    expect(config?.provider).toBe('netlify')
    expect(config?.name).toBe('Netlify')
    expect(config?.authUrl).toBe('https://app.netlify.com/authorize')
    expect(config?.tokenUrl).toBe('https://api.netlify.com/oauth/token')
  })

  it('should get AWS Cognito provider config', () => {
    const config = getProviderConfig('aws', mockEnv)
    expect(config).toBeDefined()
    expect(config?.provider).toBe('aws')
    expect(config?.name).toBe('AWS Cognito')
    expect(config?.authUrl).toContain('test-domain.auth.us-east-1.amazoncognito.com')
    expect(config?.scopes).toContain('openid')
    expect(config?.scopes).toContain('aws.cognito.signin.user.admin')
  })

  it('should get GCP provider config', () => {
    const config = getProviderConfig('gcp', mockEnv)
    expect(config).toBeDefined()
    expect(config?.provider).toBe('gcp')
    expect(config?.name).toBe('Google Cloud Platform')
    expect(config?.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(config?.tokenUrl).toBe('https://oauth2.googleapis.com/token')
    expect(config?.scopes).toContain('https://www.googleapis.com/auth/cloud-platform')
  })

  it('should get Azure provider config', () => {
    const config = getProviderConfig('azure', mockEnv)
    expect(config).toBeDefined()
    expect(config?.provider).toBe('azure')
    expect(config?.name).toBe('Microsoft Azure')
    expect(config?.authUrl).toContain('azure_tenant_id')
    expect(config?.authUrl).toContain('oauth2/v2.0/authorize')
    expect(config?.scopes).toContain('offline_access')
  })

  it('should return null for unknown provider', () => {
    const config = getProviderConfig('unknown', mockEnv)
    expect(config).toBeNull()
  })

  it('should return null if credentials missing', () => {
    const envWithoutCreds = { ...mockEnv, VERCEL_CLIENT_ID: undefined }
    const config = getProviderConfig('vercel', envWithoutCreds)
    expect(config).toBeNull()
  })
})

describe('OAuth Authorization URL Generation', () => {
  it('should generate Vercel auth URL', async () => {
    const url = await getOAuthAuthUrl('vercel', 'https://auth.do/callback', 'random_state', mockEnv)
    expect(url).toBeDefined()
    expect(url).toContain('https://api.vercel.com/v2/oauth/authorize')
    expect(url).toContain('client_id=vercel_client_id')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fauth.do%2Fcallback')
    expect(url).toContain('state=random_state')
    expect(url).toContain('response_type=code')
  })

  it('should generate Netlify auth URL', async () => {
    const url = await getOAuthAuthUrl('netlify', 'https://auth.do/callback', 'random_state', mockEnv)
    expect(url).toContain('https://app.netlify.com/authorize')
  })

  it('should generate AWS Cognito auth URL with scopes', async () => {
    const url = await getOAuthAuthUrl('aws', 'https://auth.do/callback', 'random_state', mockEnv)
    expect(url).toContain('test-domain.auth.us-east-1.amazoncognito.com')
    expect(url).toContain('scope=openid')
  })

  it('should generate GCP auth URL with offline access', async () => {
    const url = await getOAuthAuthUrl('gcp', 'https://auth.do/callback', 'random_state', mockEnv)
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })

  it('should generate Azure auth URL with response_mode', async () => {
    const url = await getOAuthAuthUrl('azure', 'https://auth.do/callback', 'random_state', mockEnv)
    expect(url).toContain('azure_tenant_id')
    expect(url).toContain('response_mode=query')
  })

  it('should return null for unknown provider', async () => {
    const url = await getOAuthAuthUrl('unknown', 'https://auth.do/callback', 'state', mockEnv)
    expect(url).toBeNull()
  })
})

describe('OAuth Code Exchange', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should exchange code for tokens', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'access_token_xyz',
        refresh_token: 'refresh_token_xyz',
        expires_in: 3600,
        token_type: 'bearer',
      }),
    })

    const tokens = await exchangeOAuthCode('vercel', 'auth_code', 'https://auth.do/callback', mockEnv)

    expect(tokens).toBeDefined()
    expect(tokens?.access_token).toBe('access_token_xyz')
    expect(tokens?.refresh_token).toBe('refresh_token_xyz')
    expect(tokens?.expires_in).toBe(3600)
    expect(tokens?.token_type).toBe('bearer')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.vercel.com/v2/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
  })

  it('should handle exchange failure', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Invalid code',
    })

    const tokens = await exchangeOAuthCode('vercel', 'invalid_code', 'https://auth.do/callback', mockEnv)

    expect(tokens).toBeNull()
  })

  it('should handle network error', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const tokens = await exchangeOAuthCode('vercel', 'auth_code', 'https://auth.do/callback', mockEnv)

    expect(tokens).toBeNull()
  })

  it('should add GCP-specific parameters', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'token',
        token_type: 'bearer',
      }),
    })

    await exchangeOAuthCode('gcp', 'auth_code', 'https://auth.do/callback', mockEnv)

    const callBody = (global.fetch as any).mock.calls[0][1].body
    expect(callBody).toContain('access_type=offline')
  })
})

describe('OAuth Token Refresh', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should refresh access token', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
      }),
    })

    const tokens = await refreshOAuthToken('vercel', 'refresh_token_xyz', mockEnv)

    expect(tokens).toBeDefined()
    expect(tokens?.access_token).toBe('new_access_token')
    expect(tokens?.refresh_token).toBe('new_refresh_token')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.vercel.com/v2/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should handle refresh failure', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid refresh token',
    })

    const tokens = await refreshOAuthToken('vercel', 'invalid_token', mockEnv)

    expect(tokens).toBeNull()
  })
})

describe('OAuth Token Validation', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should validate Vercel token', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: 'user_123',
          email: 'user@example.com',
          name: 'Test User',
          username: 'testuser',
        },
      }),
    })

    const userInfo = await validateOAuthToken('vercel', 'access_token', mockEnv)

    expect(userInfo).toBeDefined()
    expect(userInfo?.id).toBe('user_123')
    expect(userInfo?.email).toBe('user@example.com')
    expect(userInfo?.name).toBe('Test User')
  })

  it('should validate GCP token', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'gcp_user_123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      }),
    })

    const userInfo = await validateOAuthToken('gcp', 'access_token', mockEnv)

    expect(userInfo).toBeDefined()
    expect(userInfo?.id).toBe('gcp_user_123')
    expect(userInfo?.email).toBe('user@example.com')
    expect(userInfo?.picture).toBe('https://example.com/photo.jpg')
  })

  it('should handle validation failure', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const userInfo = await validateOAuthToken('vercel', 'invalid_token', mockEnv)

    expect(userInfo).toBeNull()
  })
})

describe('Token Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should store OAuth token', async () => {
    const token = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'access_token_xyz',
      refreshToken: 'refresh_token_xyz',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scopes: [],
      tokenType: 'bearer',
    }

    const result = await storeOAuthToken(token, mockEnv)

    expect(result).toBe(true)
    expect(mockEnv.DB.saveOAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        provider: 'vercel',
        encryptedAccessToken: expect.any(String),
        encryptedRefreshToken: expect.any(String),
      })
    )
  })

  it('should fail if encryption secret missing', async () => {
    const envWithoutSecret = { ...mockEnv, ENCRYPTION_SECRET: undefined }
    const token = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      scopes: [],
      tokenType: 'bearer',
    }

    const result = await storeOAuthToken(token, envWithoutSecret)

    expect(result).toBe(false)
  })
})

describe('Token Expiration', () => {
  it('should detect expired token', () => {
    const expiredToken = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      scopes: [],
      tokenType: 'bearer',
    }

    expect(isTokenExpired(expiredToken)).toBe(true)
  })

  it('should detect token about to expire (within buffer)', () => {
    const soonToExpireToken = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      expiresAt: new Date(Date.now() + 60 * 1000), // Expires in 1 minute
      scopes: [],
      tokenType: 'bearer',
    }

    // Default buffer is 5 minutes
    expect(isTokenExpired(soonToExpireToken)).toBe(true)

    // Custom buffer of 30 seconds
    expect(isTokenExpired(soonToExpireToken, 30)).toBe(false)
  })

  it('should detect valid token', () => {
    const validToken = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
      scopes: [],
      tokenType: 'bearer',
    }

    expect(isTokenExpired(validToken)).toBe(false)
  })

  it('should handle token without expiration', () => {
    const noExpiryToken = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      scopes: [],
      tokenType: 'bearer',
    }

    expect(isTokenExpired(noExpiryToken)).toBe(false)
  })
})

describe('Get Valid OAuth Token (with auto-refresh)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should return valid token without refresh', async () => {
    const validToken = {
      userId: 'user_123',
      provider: 'vercel',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scopes: [],
      tokenType: 'bearer',
    }

    mockEnv.DB.getOAuthToken.mockResolvedValueOnce({
      encrypted_access_token: 'encrypted_access',
      encrypted_refresh_token: 'encrypted_refresh',
      expires_at: validToken.expiresAt.toISOString(),
      scopes: '[]',
      token_type: 'bearer',
    })

    const token = await getValidOAuthToken('user_123', 'vercel', mockEnv)

    expect(token).toBeDefined()
    expect(global.fetch).not.toHaveBeenCalled() // No refresh needed
  })

  it('should auto-refresh expired token', async () => {
    const expiredToken = {
      encrypted_access_token: 'encrypted_access',
      encrypted_refresh_token: 'encrypted_refresh',
      expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      scopes: '[]',
      token_type: 'bearer',
    }

    mockEnv.DB.getOAuthToken.mockResolvedValueOnce(expiredToken)

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
      }),
    })

    const token = await getValidOAuthToken('user_123', 'vercel', mockEnv)

    expect(token).toBeDefined()
    expect(token?.accessToken).toBe('new_access_token')
    expect(global.fetch).toHaveBeenCalled() // Refresh happened
    expect(mockEnv.DB.saveOAuthToken).toHaveBeenCalled() // Saved new token
  })

  it('should return null if no token found', async () => {
    mockEnv.DB.getOAuthToken.mockResolvedValueOnce(null)

    const token = await getValidOAuthToken('user_123', 'vercel', mockEnv)

    expect(token).toBeNull()
  })

  it('should return null if refresh fails', async () => {
    const expiredToken = {
      encrypted_access_token: 'encrypted_access',
      encrypted_refresh_token: 'encrypted_refresh',
      expires_at: new Date(Date.now() - 1000).toISOString(),
      scopes: '[]',
      token_type: 'bearer',
    }

    mockEnv.DB.getOAuthToken.mockResolvedValueOnce(expiredToken)

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid refresh token',
    })

    const token = await getValidOAuthToken('user_123', 'vercel', mockEnv)

    expect(token).toBeNull()
  })
})
