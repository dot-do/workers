/**
 * Cloudflare Workers API
 */

import { cloudflareRequest } from './api'
import type { CloudflareWorker, WorkerRoute, ListOptions } from './types'

/**
 * List all workers in an account
 */
export async function listWorkers(
	apiToken: string,
	accountId: string,
	options: ListOptions = {}
): Promise<{ workers: CloudflareWorker[]; total: number }> {
	const params = new URLSearchParams()
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())

	const queryString = params.toString()
	const endpoint = `/accounts/${accountId}/workers/scripts${queryString ? `?${queryString}` : ''}`

	const response = await cloudflareRequest<CloudflareWorker[]>(endpoint, apiToken)

	return {
		workers: response || [],
		total: (response || []).length,
	}
}

/**
 * Get a specific worker script
 */
export async function getWorker(apiToken: string, accountId: string, scriptName: string): Promise<CloudflareWorker> {
	return cloudflareRequest<CloudflareWorker>(`/accounts/${accountId}/workers/scripts/${scriptName}`, apiToken)
}

/**
 * Get worker script content
 */
export async function getWorkerContent(apiToken: string, accountId: string, scriptName: string): Promise<string> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiToken}`,
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch worker content: ${response.statusText}`)
	}

	return response.text()
}

/**
 * Upload/update worker script
 */
export async function uploadWorker(
	apiToken: string,
	accountId: string,
	scriptName: string,
	script: string,
	metadata?: {
		bindings?: any[]
		compatibility_date?: string
		compatibility_flags?: string[]
		usage_model?: 'bundled' | 'unbound'
	}
): Promise<CloudflareWorker> {
	const formData = new FormData()
	formData.append('script', new Blob([script], { type: 'application/javascript' }), 'worker.js')

	if (metadata) {
		formData.append('metadata', JSON.stringify(metadata))
	}

	const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`

	const response = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${apiToken}`,
		},
		body: formData,
	})

	const data = await response.json()

	if (!response.ok || !data.success) {
		throw new Error(data.errors?.[0]?.message || 'Failed to upload worker')
	}

	return data.result
}

/**
 * Delete worker script
 */
export async function deleteWorker(apiToken: string, accountId: string, scriptName: string): Promise<void> {
	await cloudflareRequest(`/accounts/${accountId}/workers/scripts/${scriptName}`, apiToken, {
		method: 'DELETE',
	})
}

/**
 * List worker routes
 */
export async function listWorkerRoutes(
	apiToken: string,
	zoneId: string,
	options: ListOptions = {}
): Promise<{ routes: WorkerRoute[]; total: number }> {
	const params = new URLSearchParams()
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())

	const queryString = params.toString()
	const endpoint = `/zones/${zoneId}/workers/routes${queryString ? `?${queryString}` : ''}`

	const response = await cloudflareRequest<WorkerRoute[]>(endpoint, apiToken)

	return {
		routes: response || [],
		total: (response || []).length,
	}
}

/**
 * Create worker route
 */
export async function createWorkerRoute(
	apiToken: string,
	zoneId: string,
	pattern: string,
	scriptName: string
): Promise<WorkerRoute> {
	return cloudflareRequest(`/zones/${zoneId}/workers/routes`, apiToken, {
		method: 'POST',
		body: JSON.stringify({
			pattern,
			script: scriptName,
		}),
	})
}

/**
 * Update worker route
 */
export async function updateWorkerRoute(
	apiToken: string,
	zoneId: string,
	routeId: string,
	pattern?: string,
	scriptName?: string
): Promise<WorkerRoute> {
	const body: any = {}
	if (pattern) body.pattern = pattern
	if (scriptName) body.script = scriptName

	return cloudflareRequest(`/zones/${zoneId}/workers/routes/${routeId}`, apiToken, {
		method: 'PUT',
		body: JSON.stringify(body),
	})
}

/**
 * Delete worker route
 */
export async function deleteWorkerRoute(apiToken: string, zoneId: string, routeId: string): Promise<void> {
	await cloudflareRequest(`/zones/${zoneId}/workers/routes/${routeId}`, apiToken, {
		method: 'DELETE',
	})
}

/**
 * Get worker subdomain
 */
export async function getWorkerSubdomain(
	apiToken: string,
	accountId: string
): Promise<{ subdomain: string; enabled: boolean }> {
	return cloudflareRequest(`/accounts/${accountId}/workers/subdomain`, apiToken)
}

/**
 * List worker KV namespaces
 */
export async function listKVNamespaces(
	apiToken: string,
	accountId: string,
	options: ListOptions = {}
): Promise<{ namespaces: Array<{ id: string; title: string; supports_url_encoding?: boolean }>; total: number }> {
	const params = new URLSearchParams()
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())

	const queryString = params.toString()
	const endpoint = `/accounts/${accountId}/storage/kv/namespaces${queryString ? `?${queryString}` : ''}`

	const response = await cloudflareRequest<Array<{ id: string; title: string }>>(endpoint, apiToken)

	return {
		namespaces: response || [],
		total: (response || []).length,
	}
}
