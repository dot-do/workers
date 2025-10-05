/**
 * Vercel API Client
 * Wrapper for Vercel REST API with authentication and error handling
 */

import type { Env, VercelAPIError } from './types'

export class VercelAPIClient {
	private baseUrl: string
	private accessToken: string
	private teamId?: string

	constructor(env: Env, accessToken: string, teamId?: string) {
		this.baseUrl = env.VERCEL_API_BASE || 'https://api.vercel.com'
		this.accessToken = accessToken
		this.teamId = teamId
	}

	/**
	 * Make authenticated request to Vercel API
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = new URL(endpoint, this.baseUrl)

		// Add teamId to query if provided
		if (this.teamId) {
			url.searchParams.set('teamId', this.teamId)
		}

		const response = await fetch(url.toString(), {
			...options,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		if (!response.ok) {
			const error: VercelAPIError = await response.json().catch(() => ({
				error: {
					code: 'UNKNOWN_ERROR',
					message: `HTTP ${response.status}: ${response.statusText}`,
				},
			}))

			throw new Error(
				`Vercel API Error: ${error.error.message} (${error.error.code})`
			)
		}

		return response.json()
	}

	/**
	 * GET request
	 */
	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(endpoint, this.baseUrl)
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value)
			})
		}
		return this.request<T>(url.pathname + url.search)
	}

	/**
	 * POST request
	 */
	async post<T>(endpoint: string, body?: any): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: body ? JSON.stringify(body) : undefined,
		})
	}

	/**
	 * PATCH request
	 */
	async patch<T>(endpoint: string, body?: any): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: body ? JSON.stringify(body) : undefined,
		})
	}

	/**
	 * DELETE request
	 */
	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'DELETE',
		})
	}

	/**
	 * Exchange authorization code for access token
	 */
	static async exchangeCode(
		env: Env,
		code: string,
		redirectUri: string
	): Promise<any> {
		const response = await fetch(`${env.VERCEL_API_BASE}/v2/oauth/access_token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: env.VERCEL_CLIENT_ID,
				client_secret: env.VERCEL_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri,
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Failed to exchange code: ${error}`)
		}

		return response.json()
	}

	/**
	 * Get current authenticated user
	 */
	async getUser() {
		return this.get<any>('/v2/user')
	}

	/**
	 * List user's teams
	 */
	async listTeams(params?: { limit?: number; since?: number; until?: number }) {
		const queryParams: Record<string, string> = {}
		if (params?.limit) queryParams.limit = params.limit.toString()
		if (params?.since) queryParams.since = params.since.toString()
		if (params?.until) queryParams.until = params.until.toString()

		return this.get<any>('/v2/teams', queryParams)
	}

	/**
	 * List projects
	 */
	async listProjects(params?: {
		limit?: number
		since?: number
		until?: number
		search?: string
	}) {
		const queryParams: Record<string, string> = {}
		if (params?.limit) queryParams.limit = params.limit.toString()
		if (params?.since) queryParams.since = params.since.toString()
		if (params?.until) queryParams.until = params.until.toString()
		if (params?.search) queryParams.search = params.search

		return this.get<any>('/v9/projects', queryParams)
	}

	/**
	 * Get project by ID or name
	 */
	async getProject(projectIdOrName: string) {
		return this.get<any>(`/v9/projects/${projectIdOrName}`)
	}

	/**
	 * Create deployment
	 */
	async createDeployment(options: any) {
		return this.post<any>('/v13/deployments', options)
	}

	/**
	 * Get deployment
	 */
	async getDeployment(deploymentId: string) {
		return this.get<any>(`/v13/deployments/${deploymentId}`)
	}

	/**
	 * List deployments
	 */
	async listDeployments(params?: {
		projectId?: string
		limit?: number
		since?: number
		until?: number
		state?: string
		target?: string
	}) {
		const queryParams: Record<string, string> = {}
		if (params?.projectId) queryParams.projectId = params.projectId
		if (params?.limit) queryParams.limit = params.limit.toString()
		if (params?.since) queryParams.since = params.since.toString()
		if (params?.until) queryParams.until = params.until.toString()
		if (params?.state) queryParams.state = params.state
		if (params?.target) queryParams.target = params.target

		return this.get<any>('/v6/deployments', queryParams)
	}

	/**
	 * Cancel deployment
	 */
	async cancelDeployment(deploymentId: string) {
		return this.patch<any>(`/v12/deployments/${deploymentId}/cancel`)
	}

	/**
	 * List domains
	 */
	async listDomains(params?: { limit?: number; since?: number; until?: number }) {
		const queryParams: Record<string, string> = {}
		if (params?.limit) queryParams.limit = params.limit.toString()
		if (params?.since) queryParams.since = params.since.toString()
		if (params?.until) queryParams.until = params.until.toString()

		return this.get<any>('/v5/domains', queryParams)
	}

	/**
	 * Add domain to project
	 */
	async addDomain(name: string, projectId: string) {
		return this.post<any>('/v10/projects/' + projectId + '/domains', {
			name,
		})
	}

	/**
	 * Remove domain
	 */
	async removeDomain(name: string) {
		return this.delete<any>(`/v6/domains/${name}`)
	}
}
