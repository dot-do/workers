/**
 * GCP API Client
 * Wrapper for Google Cloud Platform REST APIs
 */

import type { Env, GCPConnection, GCPProject, GCPBucket, GCPFunction, GCPFunctionInvocation } from './types'

export class GCPAPIClient {
	constructor(
		private env: Env,
		private connection: GCPConnection
	) {}

	/**
	 * Get valid access token, refreshing if necessary
	 */
	private async getAccessToken(): Promise<string> {
		// Check if token is expired
		if (Date.now() >= this.connection.expiresAt) {
			// Token expired, need to refresh
			if (!this.connection.refreshToken) {
				throw new Error('Access token expired and no refresh token available')
			}

			// Refresh token
			const response = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					client_id: this.env.GCP_CLIENT_ID,
					client_secret: this.env.GCP_CLIENT_SECRET,
					refresh_token: this.connection.refreshToken,
					grant_type: 'refresh_token',
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to refresh access token')
			}

			const tokens = await response.json()

			// Update connection with new token
			this.connection.accessToken = tokens.access_token
			this.connection.expiresAt = Date.now() + tokens.expires_in * 1000

			// Save updated connection
			await this.env.TOKEN_KV.put(`gcp:${this.connection.userId}`, JSON.stringify(this.connection), {
				expirationTtl: 86400 * 90, // 90 days
			})
		}

		return this.connection.accessToken
	}

	/**
	 * Make authenticated API request to GCP
	 */
	private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
		const accessToken = await this.getAccessToken()

		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`GCP API error: ${response.status} ${error}`)
		}

		return response.json()
	}

	/**
	 * List GCP projects accessible to user
	 */
	async listProjects(pageSize = 50, pageToken?: string): Promise<{ projects: GCPProject[]; nextPageToken?: string }> {
		const params = new URLSearchParams({
			pageSize: pageSize.toString(),
		})

		if (pageToken) {
			params.set('pageToken', pageToken)
		}

		const data = await this.request<any>(`https://cloudresourcemanager.googleapis.com/v1/projects?${params.toString()}`)

		return {
			projects: data.projects || [],
			nextPageToken: data.nextPageToken,
		}
	}

	/**
	 * List Cloud Storage buckets in a project
	 */
	async listBuckets(projectId: string, prefix?: string, maxResults = 100): Promise<{ buckets: GCPBucket[]; nextPageToken?: string }> {
		const params = new URLSearchParams({
			project: projectId,
			maxResults: maxResults.toString(),
		})

		if (prefix) {
			params.set('prefix', prefix)
		}

		const data = await this.request<any>(`https://storage.googleapis.com/storage/v1/b?${params.toString()}`)

		return {
			buckets: data.items || [],
			nextPageToken: data.nextPageToken,
		}
	}

	/**
	 * List Cloud Functions in a project
	 */
	async listFunctions(projectId: string, location = 'us-central1'): Promise<GCPFunction[]> {
		const parent = `projects/${projectId}/locations/${location}`
		const data = await this.request<any>(`https://cloudfunctions.googleapis.com/v2/${parent}/functions`)

		return data.functions || []
	}

	/**
	 * Invoke a Cloud Function
	 */
	async invokeFunction(projectId: string, functionName: string, data?: any): Promise<GCPFunctionInvocation> {
		// Get function details to extract HTTP trigger URL
		const location = 'us-central1' // Default location
		const functionPath = `projects/${projectId}/locations/${location}/functions/${functionName}`

		const functionDetails = await this.request<any>(`https://cloudfunctions.googleapis.com/v2/${functionPath}`)

		if (!functionDetails.serviceConfig?.uri) {
			throw new Error('Function does not have an HTTP trigger URL')
		}

		const url = functionDetails.serviceConfig.uri

		// Invoke the function
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${await this.getAccessToken()}`,
			},
			body: data ? JSON.stringify(data) : undefined,
		})

		const result = response.ok ? await response.json() : null
		const error = response.ok ? undefined : await response.text()

		return {
			executionId: response.headers.get('function-execution-id') || crypto.randomUUID(),
			result,
			error,
		}
	}

	/**
	 * Get Compute Engine instances
	 */
	async listInstances(projectId: string, zone = 'us-central1-a'): Promise<any[]> {
		const data = await this.request<any>(`https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`)

		return data.items || []
	}

	/**
	 * Get BigQuery datasets
	 */
	async listDatasets(projectId: string): Promise<any[]> {
		const data = await this.request<any>(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets`)

		return data.datasets || []
	}

	/**
	 * Get Cloud SQL instances
	 */
	async listCloudSQLInstances(projectId: string): Promise<any[]> {
		const data = await this.request<any>(`https://sqladmin.googleapis.com/v1/projects/${projectId}/instances`)

		return data.items || []
	}
}
