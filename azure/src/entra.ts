/**
 * Azure Entra ID OAuth Implementation
 *
 * Handles OAuth 2.0 authorization code flow with PKCE for Azure AD/Entra ID
 * Supports both single-tenant and multi-tenant applications
 */

import type { AzureOAuthConfig, AzureTokens, AzureError } from './types'

export class EntraOAuth {
	private config: AzureOAuthConfig

	constructor(config: AzureOAuthConfig) {
		this.config = config
	}

	/**
	 * Get authorization URL for user to consent
	 */
	getAuthorizationUrl(options: {
		state: string
		codeChallenge: string
		codeChallengeMethod?: 'S256' | 'plain'
		tenantId?: string
	}): string {
		const tenant = options.tenantId || this.config.tenantId || 'common'
		const baseUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`

		const params = new URLSearchParams({
			client_id: this.config.clientId,
			response_type: 'code',
			redirect_uri: this.config.redirectUri,
			response_mode: 'query',
			scope: this.config.scopes.join(' '),
			state: options.state,
			code_challenge: options.codeChallenge,
			code_challenge_method: options.codeChallengeMethod || 'S256',
		})

		return `${baseUrl}?${params.toString()}`
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCodeForTokens(options: {
		code: string
		codeVerifier: string
		tenantId?: string
	}): Promise<AzureTokens> {
		const tenant = options.tenantId || this.config.tenantId || 'common'
		const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`

		const body = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			code: options.code,
			redirect_uri: this.config.redirectUri,
			grant_type: 'authorization_code',
			code_verifier: options.codeVerifier,
		})

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
		})

		if (!response.ok) {
			const error = (await response.json()) as AzureError
			throw new Error(error.error_description || error.error || 'Token exchange failed')
		}

		const data = await response.json()

		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			id_token: data.id_token,
			token_type: data.token_type,
			expires_in: data.expires_in,
			expires_at: Date.now() + data.expires_in * 1000,
			scope: data.scope,
		}
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshAccessToken(refreshToken: string, tenantId?: string): Promise<AzureTokens> {
		const tenant = tenantId || this.config.tenantId || 'common'
		const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`

		const body = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
			scope: this.config.scopes.join(' '),
		})

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
		})

		if (!response.ok) {
			const error = (await response.json()) as AzureError
			throw new Error(error.error_description || error.error || 'Token refresh failed')
		}

		const data = await response.json()

		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token || refreshToken, // Azure may not return new refresh token
			id_token: data.id_token,
			token_type: data.token_type,
			expires_in: data.expires_in,
			expires_at: Date.now() + data.expires_in * 1000,
			scope: data.scope,
		}
	}

	/**
	 * Revoke tokens (logout)
	 */
	getLogoutUrl(options?: { postLogoutRedirectUri?: string; tenantId?: string }): string {
		const tenant = options?.tenantId || this.config.tenantId || 'common'
		const baseUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout`

		const params = new URLSearchParams()
		if (options?.postLogoutRedirectUri) {
			params.set('post_logout_redirect_uri', options.postLogoutRedirectUri)
		}

		const query = params.toString()
		return query ? `${baseUrl}?${query}` : baseUrl
	}

	/**
	 * Generate PKCE code verifier and challenge
	 */
	static async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
		// Generate code verifier (43-128 chars)
		const array = new Uint8Array(32)
		crypto.getRandomValues(array)
		const codeVerifier = Array.from(array)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')

		// Generate code challenge (SHA-256 hash of verifier, base64url encoded)
		const encoder = new TextEncoder()
		const data = encoder.encode(codeVerifier)
		const hashBuffer = await crypto.subtle.digest('SHA-256', data)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		const codeChallenge = btoa(String.fromCharCode(...hashArray))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '')

		return { codeVerifier, codeChallenge }
	}

	/**
	 * Decode JWT token (without verification - for claims inspection)
	 * Note: Token verification should be done server-side using JWKS endpoint
	 */
	static decodeJWT(token: string): any {
		const parts = token.split('.')
		if (parts.length !== 3) {
			throw new Error('Invalid JWT format')
		}

		const payload = parts[1]
		const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
		return JSON.parse(decoded)
	}
}
