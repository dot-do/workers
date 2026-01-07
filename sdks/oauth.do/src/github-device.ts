/**
 * GitHub Device Flow implementation
 * Following OAuth 2.0 Device Authorization Grant (RFC 8628)
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

export interface GitHubDeviceFlowOptions {
	/** GitHub OAuth App client ID */
	clientId: string
	/** OAuth scopes (default: 'user:email read:user') */
	scope?: string
	/** Custom fetch implementation */
	fetch?: typeof fetch
}

export interface GitHubDeviceAuthResponse {
	/** Device verification code */
	deviceCode: string
	/** User verification code to display */
	userCode: string
	/** Verification URI for user to visit */
	verificationUri: string
	/** Expiration time in seconds */
	expiresIn: number
	/** Polling interval in seconds */
	interval: number
}

export interface GitHubTokenResponse {
	/** Access token for GitHub API */
	accessToken: string
	/** Token type (typically 'bearer') */
	tokenType: string
	/** Granted scopes */
	scope: string
}

export interface GitHubUser {
	/** Numeric GitHub user ID (critical for sqid generation) */
	id: number
	/** GitHub username */
	login: string
	/** User's email (may be null if not public) */
	email: string | null
	/** User's display name */
	name: string | null
	/** Avatar image URL */
	avatarUrl: string
}

type GitHubTokenError =
	| 'authorization_pending'
	| 'slow_down'
	| 'expired_token'
	| 'access_denied'
	| 'unknown'

/**
 * Start GitHub Device Flow
 *
 * Initiates device authorization flow by requesting device and user codes.
 *
 * @param options - Client ID, scope, and optional custom fetch
 * @returns Device authorization response with codes and URIs
 *
 * @example
 * ```ts
 * const auth = await startGitHubDeviceFlow({
 *   clientId: 'Ov23liABCDEFGHIJKLMN',
 *   scope: 'user:email read:user'
 * })
 *
 * console.log(`Visit ${auth.verificationUri} and enter code: ${auth.userCode}`)
 * ```
 */
export async function startGitHubDeviceFlow(
	options: GitHubDeviceFlowOptions
): Promise<GitHubDeviceAuthResponse> {
	const { clientId, scope = 'user:email read:user' } = options
	const fetchImpl = options.fetch || globalThis.fetch

	if (!clientId) {
		throw new Error('GitHub client ID is required for device authorization')
	}

	try {
		const url = 'https://github.com/login/device/code'
		const body = new URLSearchParams({
			client_id: clientId,
			scope,
		})

		const response = await fetchImpl(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json',
			},
			body,
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`GitHub device authorization failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as {
			device_code: string
			user_code: string
			verification_uri: string
			expires_in: number
			interval: number
		}

		return {
			deviceCode: data.device_code,
			userCode: data.user_code,
			verificationUri: data.verification_uri,
			expiresIn: data.expires_in,
			interval: data.interval,
		}
	} catch (error) {
		console.error('GitHub device authorization error:', error)
		throw error
	}
}

/**
 * Poll GitHub Device Flow for access token
 *
 * Polls GitHub's token endpoint until user completes authorization.
 * Handles all error states including authorization_pending, slow_down, etc.
 *
 * @param deviceCode - Device code from startGitHubDeviceFlow
 * @param options - Client ID and optional custom fetch
 * @returns Token response with access token
 *
 * @example
 * ```ts
 * const auth = await startGitHubDeviceFlow({ clientId: '...' })
 * // User completes authorization...
 * const token = await pollGitHubDeviceFlow(auth.deviceCode, {
 *   clientId: '...',
 *   interval: auth.interval,
 *   expiresIn: auth.expiresIn
 * })
 * console.log('Access token:', token.accessToken)
 * ```
 */
export async function pollGitHubDeviceFlow(
	deviceCode: string,
	options: GitHubDeviceFlowOptions & { interval?: number; expiresIn?: number }
): Promise<GitHubTokenResponse> {
	const { clientId, interval = 5, expiresIn = 900 } = options
	const fetchImpl = options.fetch || globalThis.fetch

	if (!clientId) {
		throw new Error('GitHub client ID is required for token polling')
	}

	const startTime = Date.now()
	const timeout = expiresIn * 1000
	let currentInterval = interval * 1000

	while (true) {
		// Check if expired
		if (Date.now() - startTime > timeout) {
			throw new Error('GitHub device authorization expired. Please try again.')
		}

		// Wait for interval
		await new Promise((resolve) => setTimeout(resolve, currentInterval))

		try {
			const url = 'https://github.com/login/oauth/access_token'
			const body = new URLSearchParams({
				client_id: clientId,
				device_code: deviceCode,
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
			})

			const response = await fetchImpl(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json',
				},
				body,
			})

			const data = await response.json() as
				| { access_token: string; token_type: string; scope: string }
				| { error: string; error_description?: string; error_uri?: string }

			// Check for success
			if ('access_token' in data) {
				return {
					accessToken: data.access_token,
					tokenType: data.token_type,
					scope: data.scope,
				}
			}

			// Handle error responses
			const error = (data.error || 'unknown') as GitHubTokenError

			switch (error) {
				case 'authorization_pending':
					// Continue polling
					continue

				case 'slow_down':
					// Increase interval by 5 seconds
					currentInterval += 5000
					continue

				case 'access_denied':
					throw new Error('Access denied by user')

				case 'expired_token':
					throw new Error('Device code expired')

				default:
					throw new Error(`GitHub token polling failed: ${error}`)
			}
		} catch (error) {
			// If it's our thrown error, re-throw it
			if (error instanceof Error) {
				throw error
			}
			// Otherwise continue polling
			continue
		}
	}
}

/**
 * Get GitHub user information
 *
 * Fetches authenticated user's profile from GitHub API.
 *
 * @param accessToken - GitHub access token
 * @param options - Optional custom fetch implementation
 * @returns GitHub user profile
 *
 * @example
 * ```ts
 * const user = await getGitHubUser(token.accessToken)
 * console.log(`Logged in as ${user.login} (ID: ${user.id})`)
 * ```
 */
export async function getGitHubUser(
	accessToken: string,
	options: { fetch?: typeof fetch } = {}
): Promise<GitHubUser> {
	const fetchImpl = options.fetch || globalThis.fetch

	if (!accessToken) {
		throw new Error('GitHub access token is required')
	}

	try {
		const response = await fetchImpl('https://api.github.com/user', {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`GitHub user fetch failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as {
			id: number
			login: string
			email: string | null
			name: string | null
			avatar_url: string
		}

		return {
			id: data.id,
			login: data.login,
			email: data.email,
			name: data.name,
			avatarUrl: data.avatar_url,
		}
	} catch (error) {
		console.error('GitHub user fetch error:', error)
		throw error
	}
}
