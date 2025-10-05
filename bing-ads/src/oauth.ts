/**
 * Bing Ads OAuth 2.0 Helper
 * Handles authentication with MFA support
 */

import type { BingAdsOAuthTokens } from './types'

export interface BingAdsOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  tenant?: string // Azure AD tenant (default: 'common')
}

export class BingAdsOAuth {
  private static readonly AUTH_URL = 'https://login.microsoftonline.com'
  private static readonly TOKEN_URL = 'https://login.microsoftonline.com'
  private static readonly SCOPE = 'https://ads.microsoft.com/msads.manage offline_access'

  constructor(private config: BingAdsOAuthConfig) {}

  /**
   * Generate authorization URL for OAuth flow
   * Uses new msads.manage scope (required for MFA)
   */
  getAuthorizationUrl(state: string): string {
    const tenant = this.config.tenant || 'common'
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: BingAdsOAuth.SCOPE,
      state,
      response_mode: 'query',
      prompt: 'consent', // Force consent to get refresh token
    })

    return `${BingAdsOAuth.AUTH_URL}/${tenant}/oauth2/v2.0/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   * Supports MFA-enabled accounts via msads.manage scope
   */
  async exchangeCodeForTokens(code: string): Promise<BingAdsOAuthTokens> {
    const tenant = this.config.tenant || 'common'
    const tokenUrl = `${BingAdsOAuth.TOKEN_URL}/${tenant}/oauth2/v2.0/token`

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        scope: BingAdsOAuth.SCOPE,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      scope: data.scope,
    }
  }

  /**
   * Refresh access token using refresh token
   * IMPORTANT: Token must have been provisioned with msads.manage scope
   */
  async refreshAccessToken(refreshToken: string): Promise<BingAdsOAuthTokens> {
    const tenant = this.config.tenant || 'common'
    const tokenUrl = `${BingAdsOAuth.TOKEN_URL}/${tenant}/oauth2/v2.0/token`

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        scope: BingAdsOAuth.SCOPE,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh access token: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      scope: data.scope,
    }
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now() + 60000 // 1 minute buffer
  }

  /**
   * Make authenticated request to Bing Ads API
   */
  async makeAuthenticatedRequest<T>(
    url: string,
    accessToken: string,
    developerToken: string,
    customerId: string,
    accountId: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'DeveloperToken': developerToken,
        'CustomerId': customerId,
        'CustomerAccountId': accountId,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bing Ads API request failed: ${error}`)
    }

    return await response.json() as T
  }
}
