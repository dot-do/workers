/**
 * Netlify API client
 *
 * Handles all communication with Netlify's REST API.
 * API Base: https://api.netlify.com/api/v1
 * Rate Limits: 500 requests/minute
 *
 * @see https://docs.netlify.com/api/get-started/
 */

import type { NetlifyUser, NetlifySite, NetlifyDeployment, NetlifyTokenResponse } from './types'

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1'
const NETLIFY_TOKEN_URL = 'https://api.netlify.com/oauth/token'

/**
 * Netlify API client class
 */
export class NetlifyApiClient {
	constructor(private accessToken: string) {}

	/**
	 * Exchange authorization code for access token
	 */
	static async exchangeCode(
		code: string,
		clientId: string,
		clientSecret: string,
		redirectUri: string
	): Promise<NetlifyTokenResponse> {
		const response = await fetch(NETLIFY_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Token exchange failed: ${error}`)
		}

		return await response.json()
	}

	/**
	 * Get current user information
	 */
	async getCurrentUser(): Promise<NetlifyUser> {
		return await this.request<NetlifyUser>('/user')
	}

	/**
	 * List user's sites
	 */
	async listSites(page = 1, perPage = 100): Promise<NetlifySite[]> {
		return await this.request<NetlifySite[]>(`/sites?page=${page}&per_page=${perPage}`)
	}

	/**
	 * Get site details
	 */
	async getSite(siteId: string): Promise<NetlifySite> {
		return await this.request<NetlifySite>(`/sites/${siteId}`)
	}

	/**
	 * List site deploys
	 */
	async listDeploys(siteId: string, page = 1, perPage = 100): Promise<NetlifyDeployment[]> {
		return await this.request<NetlifyDeployment[]>(`/sites/${siteId}/deploys?page=${page}&per_page=${perPage}`)
	}

	/**
	 * Get deploy details
	 */
	async getDeployment(siteId: string, deployId: string): Promise<NetlifyDeployment> {
		return await this.request<NetlifyDeployment>(`/sites/${siteId}/deploys/${deployId}`)
	}

	/**
	 * Create new deployment
	 */
	async createDeploy(
		siteId: string,
		files: Record<string, string>,
		options: {
			draft?: boolean
			title?: string
			branch?: string
		} = {}
	): Promise<NetlifyDeployment> {
		return await this.request<NetlifyDeployment>(`/sites/${siteId}/deploys`, {
			method: 'POST',
			body: JSON.stringify({
				files,
				draft: options.draft || false,
				title: options.title,
				branch: options.branch,
			}),
		})
	}

	/**
	 * Cancel deployment
	 */
	async cancelDeploy(deployId: string): Promise<void> {
		await this.request(`/deploys/${deployId}/cancel`, { method: 'POST' })
	}

	/**
	 * Restore deployment
	 */
	async restoreDeploy(siteId: string, deployId: string): Promise<NetlifyDeployment> {
		return await this.request<NetlifyDeployment>(`/sites/${siteId}/deploys/${deployId}/restore`, { method: 'POST' })
	}

	/**
	 * Make authenticated request to Netlify API
	 */
	private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
		const url = `${NETLIFY_API_BASE}${path}`

		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Netlify API error (${response.status}): ${error}`)
		}

		return await response.json()
	}

	/**
	 * Check rate limit status from response headers
	 */
	static getRateLimitInfo(response: Response): {
		limit: number
		remaining: number
		reset: number
	} | null {
		const limit = response.headers.get('X-RateLimit-Limit')
		const remaining = response.headers.get('X-RateLimit-Remaining')
		const reset = response.headers.get('X-RateLimit-Reset')

		if (!limit || !remaining || !reset) {
			return null
		}

		return {
			limit: parseInt(limit),
			remaining: parseInt(remaining),
			reset: parseInt(reset),
		}
	}
}
