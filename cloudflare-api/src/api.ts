/**
 * Cloudflare API client with rate limiting and error handling
 */

import { CloudflareApiResponse, CloudflareApiError, type CloudflareUser, type CloudflareAccount } from './types'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

/**
 * Generic Cloudflare API request handler
 */
export async function cloudflareRequest<T>(
	endpoint: string,
	apiToken: string,
	options: RequestInit = {}
): Promise<T> {
	const url = `${CLOUDFLARE_API_BASE}${endpoint}`

	const headers = {
		Authorization: `Bearer ${apiToken}`,
		'Content-Type': 'application/json',
		...options.headers,
	}

	try {
		const response = await fetch(url, {
			...options,
			headers,
		})

		const data = (await response.json()) as CloudflareApiResponse<T>

		if (!response.ok || !data.success) {
			throw new CloudflareApiError(
				data.errors?.[0]?.message || 'Cloudflare API request failed',
				response.status,
				data.errors
			)
		}

		return data.result
	} catch (error) {
		if (error instanceof CloudflareApiError) {
			throw error
		}

		// Network or parsing errors
		throw new CloudflareApiError(
			error instanceof Error ? error.message : 'Unknown error occurred',
			0
		)
	}
}

/**
 * Verify API token and get user information
 */
export async function verifyToken(apiToken: string): Promise<{
	user: CloudflareUser
	accounts: CloudflareAccount[]
}> {
	try {
		// Verify token by getting user info
		const user = await cloudflareRequest<CloudflareUser>('/user', apiToken)

		// Get user's accounts
		const accounts = await cloudflareRequest<CloudflareAccount[]>('/accounts', apiToken)

		return { user, accounts }
	} catch (error) {
		if (error instanceof CloudflareApiError) {
			throw error
		}
		throw new CloudflareApiError('Failed to verify token')
	}
}

/**
 * Get token status
 */
export async function getTokenStatus(apiToken: string): Promise<{
	id: string
	status: string
	expires_on?: string
	not_before?: string
	policies?: Array<{
		id: string
		effect: string
		resources: Record<string, any>
		permission_groups: Array<{ id: string; name: string }>
	}>
}> {
	return cloudflareRequest('/user/tokens/verify', apiToken)
}

/**
 * Rate limit tracker (in-memory, could be moved to KV for persistence)
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>()

/**
 * Check and update rate limit for a user
 * Cloudflare API limits: ~1200 requests per 5 minutes per token
 */
export function checkRateLimit(userId: string): boolean {
	const now = Date.now()
	const limit = rateLimits.get(userId)

	// Reset if window expired
	if (!limit || now > limit.resetAt) {
		rateLimits.set(userId, {
			count: 1,
			resetAt: now + 5 * 60 * 1000, // 5 minutes
		})
		return true
	}

	// Check limit (1000 requests per 5 min to leave buffer)
	if (limit.count >= 1000) {
		return false
	}

	// Increment
	limit.count++
	return true
}

/**
 * Encrypt API token for storage (simple XOR encryption)
 * In production, use proper encryption (e.g., KMS, Durable Objects with secret)
 */
export function encryptToken(token: string, secret: string): string {
	// Simple XOR encryption - replace with proper encryption in production
	const encrypted = Buffer.from(token)
		.map((byte, i) => byte ^ secret.charCodeAt(i % secret.length))
		.toString('base64')
	return encrypted
}

/**
 * Decrypt API token from storage
 */
export function decryptToken(encrypted: string, secret: string): string {
	// Reverse XOR encryption
	const decrypted = Buffer.from(encrypted, 'base64')
		.map((byte, i) => byte ^ secret.charCodeAt(i % secret.length))
		.toString('utf-8')
	return decrypted
}
