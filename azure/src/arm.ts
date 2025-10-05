/**
 * Azure Resource Manager (ARM) API Client
 *
 * Provides methods to interact with Azure Resource Manager API
 * Handles subscriptions, resource groups, and resources
 */

import type { AzureSubscription, AzureResourceGroup, AzureResource } from './types'

export class ARMClient {
	private baseUrl = 'https://management.azure.com'
	private accessToken: string
	private apiVersion = '2021-04-01'

	constructor(accessToken: string) {
		this.accessToken = accessToken
	}

	/**
	 * Make authenticated request to ARM API
	 */
	private async request<T>(path: string, options?: RequestInit & { apiVersion?: string }): Promise<T> {
		const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`
		const apiVersion = options?.apiVersion || this.apiVersion

		// Add api-version query parameter
		const separator = url.includes('?') ? '&' : '?'
		const fullUrl = `${url}${separator}api-version=${apiVersion}`

		const response = await fetch(fullUrl, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				...options?.headers,
			},
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(error.error?.message || `ARM API error: ${response.status} ${response.statusText}`)
		}

		return await response.json()
	}

	// ========================================
	// Subscription Operations
	// ========================================

	/**
	 * List all subscriptions
	 */
	async listSubscriptions(): Promise<{ value: AzureSubscription[] }> {
		return await this.request('/subscriptions', {
			apiVersion: '2020-01-01',
		})
	}

	/**
	 * Get subscription by ID
	 */
	async getSubscription(subscriptionId: string): Promise<AzureSubscription> {
		return await this.request(`/subscriptions/${subscriptionId}`, {
			apiVersion: '2020-01-01',
		})
	}

	// ========================================
	// Resource Group Operations
	// ========================================

	/**
	 * List resource groups in a subscription
	 */
	async listResourceGroups(subscriptionId: string): Promise<{ value: AzureResourceGroup[] }> {
		return await this.request(`/subscriptions/${subscriptionId}/resourceGroups`)
	}

	/**
	 * Get resource group by name
	 */
	async getResourceGroup(subscriptionId: string, resourceGroupName: string): Promise<AzureResourceGroup> {
		return await this.request(`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`)
	}

	/**
	 * Create or update resource group
	 */
	async createResourceGroup(
		subscriptionId: string,
		resourceGroupName: string,
		location: string,
		tags?: Record<string, string>
	): Promise<AzureResourceGroup> {
		return await this.request(`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`, {
			method: 'PUT',
			body: JSON.stringify({
				location,
				tags,
			}),
		})
	}

	/**
	 * Delete resource group
	 */
	async deleteResourceGroup(subscriptionId: string, resourceGroupName: string): Promise<void> {
		await this.request(`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`, {
			method: 'DELETE',
		})
	}

	// ========================================
	// Resource Operations
	// ========================================

	/**
	 * List all resources in a subscription
	 */
	async listResources(subscriptionId: string, options?: { filter?: string }): Promise<{ value: AzureResource[] }> {
		let path = `/subscriptions/${subscriptionId}/resources`
		if (options?.filter) {
			path += `?$filter=${encodeURIComponent(options.filter)}`
		}
		return await this.request(path)
	}

	/**
	 * List resources in a resource group
	 */
	async listResourceGroupResources(
		subscriptionId: string,
		resourceGroupName: string
	): Promise<{ value: AzureResource[] }> {
		return await this.request(`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/resources`)
	}

	/**
	 * Get resource by ID
	 */
	async getResource(resourceId: string, apiVersion?: string): Promise<AzureResource> {
		return await this.request(resourceId, {
			apiVersion: apiVersion || this.apiVersion,
		})
	}

	/**
	 * Create or update resource
	 */
	async createOrUpdateResource(
		resourceId: string,
		properties: Record<string, any>,
		apiVersion?: string
	): Promise<AzureResource> {
		return await this.request(resourceId, {
			method: 'PUT',
			body: JSON.stringify(properties),
			apiVersion: apiVersion || this.apiVersion,
		})
	}

	/**
	 * Delete resource
	 */
	async deleteResource(resourceId: string, apiVersion?: string): Promise<void> {
		await this.request(resourceId, {
			method: 'DELETE',
			apiVersion: apiVersion || this.apiVersion,
		})
	}

	// ========================================
	// Resource Provider Operations
	// ========================================

	/**
	 * List all resource providers
	 */
	async listProviders(subscriptionId: string): Promise<any> {
		return await this.request(`/subscriptions/${subscriptionId}/providers`)
	}

	/**
	 * Get resource provider
	 */
	async getProvider(subscriptionId: string, providerNamespace: string): Promise<any> {
		return await this.request(`/subscriptions/${subscriptionId}/providers/${providerNamespace}`)
	}

	// ========================================
	// Tags Operations
	// ========================================

	/**
	 * Get all tags in subscription
	 */
	async listTags(subscriptionId: string): Promise<any> {
		return await this.request(`/subscriptions/${subscriptionId}/tagNames`, {
			apiVersion: '2021-04-01',
		})
	}

	/**
	 * Create or update tags on a resource
	 */
	async updateResourceTags(resourceId: string, tags: Record<string, string>): Promise<any> {
		return await this.request(`${resourceId}/providers/Microsoft.Resources/tags/default`, {
			method: 'PUT',
			body: JSON.stringify({
				properties: {
					tags,
				},
			}),
			apiVersion: '2021-04-01',
		})
	}
}
