/**
 * Microsoft Graph API Client
 *
 * Provides methods to interact with Microsoft Graph API
 * Handles authentication, pagination, and error handling
 */

import type {
	AzureUserInfo,
	GraphApiResponse,
	GraphMailMessage,
	GraphCalendarEvent,
} from './types'

export class GraphClient {
	private baseUrl = 'https://graph.microsoft.com/v1.0'
	private accessToken: string

	constructor(accessToken: string) {
		this.accessToken = accessToken
	}

	/**
	 * Make authenticated request to Graph API
	 */
	private async request<T>(
		path: string,
		options?: RequestInit
	): Promise<T | GraphApiResponse<T>> {
		const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`

		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options?.headers,
			},
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(
				error.error?.message || `Graph API error: ${response.status} ${response.statusText}`
			)
		}

		return await response.json()
	}

	// ========================================
	// User Operations
	// ========================================

	/**
	 * Get current user profile
	 */
	async getMe(): Promise<AzureUserInfo> {
		return await this.request<AzureUserInfo>('/me')
	}

	/**
	 * Get user by ID or userPrincipalName
	 */
	async getUser(userId: string): Promise<AzureUserInfo> {
		return await this.request<AzureUserInfo>(`/users/${userId}`)
	}

	/**
	 * List users (requires User.Read.All permission)
	 */
	async listUsers(options?: {
		top?: number
		skip?: number
		filter?: string
		select?: string[]
	}): Promise<GraphApiResponse<AzureUserInfo>> {
		const params = new URLSearchParams()
		if (options?.top) params.set('$top', options.top.toString())
		if (options?.skip) params.set('$skip', options.skip.toString())
		if (options?.filter) params.set('$filter', options.filter)
		if (options?.select) params.set('$select', options.select.join(','))

		const query = params.toString()
		return await this.request<AzureUserInfo>(`/users${query ? `?${query}` : ''}`)
	}

	// ========================================
	// Mail Operations
	// ========================================

	/**
	 * Get user's messages
	 */
	async getMessages(options?: {
		top?: number
		skip?: number
		filter?: string
		orderby?: string
	}): Promise<GraphApiResponse<GraphMailMessage>> {
		const params = new URLSearchParams()
		if (options?.top) params.set('$top', options.top.toString())
		if (options?.skip) params.set('$skip', options.skip.toString())
		if (options?.filter) params.set('$filter', options.filter)
		if (options?.orderby) params.set('$orderby', options.orderby)

		const query = params.toString()
		return await this.request<GraphMailMessage>(`/me/messages${query ? `?${query}` : ''}`)
	}

	/**
	 * Send email
	 */
	async sendMail(message: {
		subject: string
		body: {
			contentType: 'Text' | 'HTML'
			content: string
		}
		toRecipients: Array<{
			emailAddress: {
				address: string
				name?: string
			}
		}>
		ccRecipients?: Array<{
			emailAddress: {
				address: string
				name?: string
			}
		}>
		attachments?: Array<{
			'@odata.type': '#microsoft.graph.fileAttachment'
			name: string
			contentType: string
			contentBytes: string // Base64 encoded
		}>
	}): Promise<void> {
		await this.request('/me/sendMail', {
			method: 'POST',
			body: JSON.stringify({ message }),
		})
	}

	// ========================================
	// Calendar Operations
	// ========================================

	/**
	 * Get calendar events
	 */
	async getCalendarEvents(options?: {
		startDateTime?: string
		endDateTime?: string
		top?: number
		skip?: number
		filter?: string
	}): Promise<GraphApiResponse<GraphCalendarEvent>> {
		const params = new URLSearchParams()
		if (options?.startDateTime) params.set('startDateTime', options.startDateTime)
		if (options?.endDateTime) params.set('endDateTime', options.endDateTime)
		if (options?.top) params.set('$top', options.top.toString())
		if (options?.skip) params.set('$skip', options.skip.toString())
		if (options?.filter) params.set('$filter', options.filter)

		const query = params.toString()
		return await this.request<GraphCalendarEvent>(
			`/me/calendar/events${query ? `?${query}` : ''}`
		)
	}

	/**
	 * Create calendar event
	 */
	async createCalendarEvent(event: {
		subject: string
		start: {
			dateTime: string
			timeZone: string
		}
		end: {
			dateTime: string
			timeZone: string
		}
		location?: {
			displayName: string
		}
		body?: {
			contentType: 'Text' | 'HTML'
			content: string
		}
		attendees?: Array<{
			emailAddress: {
				address: string
				name?: string
			}
			type: 'required' | 'optional' | 'resource'
		}>
	}): Promise<GraphCalendarEvent> {
		return await this.request<GraphCalendarEvent>('/me/calendar/events', {
			method: 'POST',
			body: JSON.stringify(event),
		})
	}

	// ========================================
	// Files Operations (OneDrive)
	// ========================================

	/**
	 * List files in user's OneDrive root
	 */
	async listFiles(options?: {
		top?: number
		skip?: number
		orderby?: string
	}): Promise<GraphApiResponse<any>> {
		const params = new URLSearchParams()
		if (options?.top) params.set('$top', options.top.toString())
		if (options?.skip) params.set('$skip', options.skip.toString())
		if (options?.orderby) params.set('$orderby', options.orderby)

		const query = params.toString()
		return await this.request(`/me/drive/root/children${query ? `?${query}` : ''}`)
	}

	/**
	 * Upload file to OneDrive
	 */
	async uploadFile(
		fileName: string,
		content: ArrayBuffer | Blob
	): Promise<any> {
		return await this.request(`/me/drive/root:/${fileName}:/content`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/octet-stream',
			},
			body: content,
		})
	}

	// ========================================
	// Batch Operations
	// ========================================

	/**
	 * Execute multiple requests in a single batch
	 */
	async batch(requests: Array<{
		id: string
		method: string
		url: string
		body?: any
		headers?: Record<string, string>
	}>): Promise<any> {
		return await this.request('/$batch', {
			method: 'POST',
			body: JSON.stringify({
				requests: requests.map((req) => ({
					id: req.id,
					method: req.method,
					url: req.url.startsWith('/') ? req.url : `/${req.url}`,
					body: req.body,
					headers: req.headers,
				})),
			}),
		})
	}
}
