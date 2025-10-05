/**
 * Google Ads OAuth 2.0 Helper
 * Handles authentication and token management
 */

import type { GoogleAdsOAuthTokens } from './types'

export interface GoogleAdsOAuthConfig {
  clientId: string
  clientSecret: string
  developerToken: string
  redirectUri: string
}

export class GoogleAdsOAuth {
  private static readonly AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
  private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token'
  private static readonly SCOPE = 'https://www.googleapis.com/auth/adwords'

  constructor(private config: GoogleAdsOAuthConfig) {}

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: GoogleAdsOAuth.SCOPE,
      state,
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent screen to get refresh token
    })

    return `${GoogleAdsOAuth.AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleAdsOAuthTokens> {
    const response = await fetch(GoogleAdsOAuth.TOKEN_URL, {
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
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleAdsOAuthTokens> {
    const response = await fetch(GoogleAdsOAuth.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh access token: ${error}`)
    }

    const data = await response.json() as {
      access_token: string
      expires_in: number
      scope: string
    }

    return {
      accessToken: data.access_token,
      refreshToken, // Refresh token doesn't change
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
   * Make authenticated request to Google Ads API
   */
  async makeAuthenticatedRequest<T>(
    url: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': this.config.developerToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Ads API request failed: ${error}`)
    }

    return await response.json() as T
  }
}
