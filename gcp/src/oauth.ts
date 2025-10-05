/**
 * GCP OAuth Handler
 * Handles Google OAuth 2.0 flow for GCP integration
 */

import type { Env, OAuthTokens, TokenInfo, UserInfo } from './types'

export class GCPOAuth {
	constructor(private env: Env) {}

	/**
	 * Generate authorization URL for OAuth flow
	 */
	generateAuthUrl(state: string, scopes: string[] = []): string {
		const defaultScopes = [
			'openid',
			'email',
			'profile',
			'https://www.googleapis.com/auth/cloud-platform',
		]

		const allScopes = [...defaultScopes, ...scopes]

		const params = new URLSearchParams({
			client_id: this.env.GCP_CLIENT_ID,
			redirect_uri: this.env.GCP_REDIRECT_URI,
			response_type: 'code',
			scope: allScopes.join(' '),
			access_type: 'offline',
			prompt: 'consent',
			state: state,
		})

		return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCode(code: string): Promise<OAuthTokens> {
		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				code,
				client_id: this.env.GCP_CLIENT_ID,
				client_secret: this.env.GCP_CLIENT_SECRET,
				redirect_uri: this.env.GCP_REDIRECT_URI,
				grant_type: 'authorization_code',
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Failed to exchange code: ${error}`)
		}

		return response.json()
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: this.env.GCP_CLIENT_ID,
				client_secret: this.env.GCP_CLIENT_SECRET,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Failed to refresh token: ${error}`)
		}

		return response.json()
	}

	/**
	 * Get user info from Google
	 */
	async getUserInfo(accessToken: string): Promise<UserInfo> {
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Failed to get user info: ${error}`)
		}

		return response.json()
	}

	/**
	 * Validate access token
	 */
	async validateToken(accessToken: string): Promise<TokenInfo> {
		const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`)

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Failed to validate token: ${error}`)
		}

		return response.json()
	}

	/**
	 * Revoke access token
	 */
	async revokeToken(token: string): Promise<boolean> {
		const response = await fetch('https://oauth2.googleapis.com/revoke', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: `token=${token}`,
		})

		return response.ok
	}
}
