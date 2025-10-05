/**
 * AWS Cognito OAuth Handler
 * Handles OAuth 2.0 flow with AWS Cognito User Pools
 */

import type { Env, CognitoTokens, AWSConnection } from './types'

export class CognitoOAuth {
	constructor(
		private env: Env,
		private cognitoDomain: string,
		private clientId: string,
		private clientSecret: string,
		private region: string
	) {}

	/**
	 * Generate authorization URL for OAuth flow
	 */
	generateAuthUrl(redirectUri: string, state: string, scopes: string[] = ['openid', 'email', 'profile']): string {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: redirectUri,
			scope: scopes.join(' '),
			state,
		})

		return `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/authorize?${params}`
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCode(code: string, redirectUri: string): Promise<CognitoTokens> {
		const tokenEndpoint = `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/token`

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: this.clientId,
			code,
			redirect_uri: redirectUri,
		})

		const auth = btoa(`${this.clientId}:${this.clientSecret}`)

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${auth}`,
			},
			body: body.toString(),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Token exchange failed: ${error}`)
		}

		return await response.json()
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshToken(refreshToken: string): Promise<CognitoTokens> {
		const tokenEndpoint = `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/token`

		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: this.clientId,
			refresh_token: refreshToken,
		})

		const auth = btoa(`${this.clientId}:${this.clientSecret}`)

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${auth}`,
			},
			body: body.toString(),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Token refresh failed: ${error}`)
		}

		return await response.json()
	}

	/**
	 * Get user info from access token
	 */
	async getUserInfo(accessToken: string): Promise<any> {
		const userInfoEndpoint = `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/userInfo`

		const response = await fetch(userInfoEndpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`UserInfo request failed: ${error}`)
		}

		return await response.json()
	}

	/**
	 * Revoke refresh token
	 */
	async revokeToken(refreshToken: string): Promise<void> {
		const revokeEndpoint = `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/revoke`

		const body = new URLSearchParams({
			token: refreshToken,
			token_type_hint: 'refresh_token',
		})

		const auth = btoa(`${this.clientId}:${this.clientSecret}`)

		const response = await fetch(revokeEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${auth}`,
			},
			body: body.toString(),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Token revocation failed: ${error}`)
		}
	}

	/**
	 * Parse and validate ID token
	 */
	parseIdToken(idToken: string): any {
		const parts = idToken.split('.')
		if (parts.length !== 3) {
			throw new Error('Invalid ID token format')
		}

		// Decode payload (second part)
		const payload = JSON.parse(atob(parts[1]))
		return payload
	}
}

/**
 * Store AWS connection in database
 */
export async function storeConnection(env: Env, connection: AWSConnection): Promise<void> {
	const cacheKey = `aws:connection:${connection.userId}`

	// Store in KV for fast access
	await env.AWS_CACHE.put(cacheKey, JSON.stringify(connection), {
		expirationTtl: 3600, // 1 hour cache
	})

	// Store in database for persistence
	await env.DB.upsertConnection({
		userId: connection.userId,
		provider: 'aws',
		accessToken: connection.accessToken,
		refreshToken: connection.refreshToken,
		idToken: connection.idToken,
		expiresAt: connection.expiresAt,
		metadata: {
			identityId: connection.identityId,
			region: connection.region,
			cognitoDomain: connection.cognitoDomain,
		},
		createdAt: connection.createdAt,
		updatedAt: connection.updatedAt,
	})
}

/**
 * Get AWS connection from cache or database
 */
export async function getConnection(env: Env, userId: string): Promise<AWSConnection | null> {
	const cacheKey = `aws:connection:${userId}`

	// Try KV cache first
	const cached = await env.AWS_CACHE.get(cacheKey, 'json')
	if (cached) {
		return cached as AWSConnection
	}

	// Fallback to database
	const dbConnection = await env.DB.getConnection(userId, 'aws')
	if (!dbConnection) {
		return null
	}

	const connection: AWSConnection = {
		userId: dbConnection.userId,
		accessToken: dbConnection.accessToken,
		refreshToken: dbConnection.refreshToken,
		idToken: dbConnection.idToken,
		expiresAt: dbConnection.expiresAt,
		identityId: dbConnection.metadata?.identityId,
		region: dbConnection.metadata?.region || 'us-east-1',
		cognitoDomain: dbConnection.metadata?.cognitoDomain || '',
		createdAt: dbConnection.createdAt,
		updatedAt: dbConnection.updatedAt,
	}

	// Update cache
	await env.AWS_CACHE.put(cacheKey, JSON.stringify(connection), {
		expirationTtl: 3600,
	})

	return connection
}

/**
 * Delete AWS connection
 */
export async function deleteConnection(env: Env, userId: string): Promise<void> {
	const cacheKey = `aws:connection:${userId}`

	// Delete from cache
	await env.AWS_CACHE.delete(cacheKey)

	// Delete from database
	await env.DB.deleteConnection(userId, 'aws')
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
	return Date.now() >= expiresAt - 60000 // Refresh 1 minute before expiry
}

/**
 * Ensure valid connection with automatic token refresh
 */
export async function ensureValidConnection(env: Env, userId: string, cognito: CognitoOAuth): Promise<AWSConnection> {
	const connection = await getConnection(env, userId)

	if (!connection) {
		throw new Error('No AWS connection found for user')
	}

	// Check if token is expired
	if (isTokenExpired(connection.expiresAt)) {
		if (!connection.refreshToken) {
			throw new Error('No refresh token available')
		}

		// Refresh the token
		const tokens = await cognito.refreshToken(connection.refreshToken)

		// Update connection
		const updatedConnection: AWSConnection = {
			...connection,
			accessToken: tokens.access_token,
			expiresAt: Date.now() + tokens.expires_in * 1000,
			updatedAt: Date.now(),
		}

		await storeConnection(env, updatedConnection)
		return updatedConnection
	}

	return connection
}
