/**
 * Cloudflare Zones API
 */

import { cloudflareRequest } from './api'
import type { CloudflareZone, ListOptions } from './types'

/**
 * List all zones for an account
 */
export async function listZones(
	apiToken: string,
	accountId?: string,
	options: ListOptions = {}
): Promise<{ zones: CloudflareZone[]; total: number; hasMore: boolean }> {
	const params = new URLSearchParams()

	if (accountId) params.set('account.id', accountId)
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())
	if (options.order) params.set('order', options.order)
	if (options.direction) params.set('direction', options.direction)
	if (options.match) params.set('match', options.match)
	if (options.status) params.set('status', options.status)

	const queryString = params.toString()
	const endpoint = `/zones${queryString ? `?${queryString}` : ''}`

	const response = await cloudflareRequest<CloudflareZone[]>(endpoint, apiToken)

	// Cloudflare returns array directly in result
	return {
		zones: response || [],
		total: (response || []).length,
		hasMore: false, // Would need result_info to determine this
	}
}

/**
 * Get a specific zone by ID
 */
export async function getZone(apiToken: string, zoneId: string): Promise<CloudflareZone> {
	return cloudflareRequest<CloudflareZone>(`/zones/${zoneId}`, apiToken)
}

/**
 * Get zone settings
 */
export async function getZoneSettings(
	apiToken: string,
	zoneId: string
): Promise<Array<{ id: string; value: any; editable: boolean; modified_on: string }>> {
	return cloudflareRequest(`/zones/${zoneId}/settings`, apiToken)
}

/**
 * Update zone setting
 */
export async function updateZoneSetting(
	apiToken: string,
	zoneId: string,
	settingId: string,
	value: any
): Promise<{ id: string; value: any; editable: boolean; modified_on: string }> {
	return cloudflareRequest(`/zones/${zoneId}/settings/${settingId}`, apiToken, {
		method: 'PATCH',
		body: JSON.stringify({ value }),
	})
}

/**
 * Purge zone cache
 */
export async function purgeZoneCache(
	apiToken: string,
	zoneId: string,
	options: { purge_everything?: boolean; files?: string[]; tags?: string[]; hosts?: string[] } = {}
): Promise<{ id: string }> {
	return cloudflareRequest(`/zones/${zoneId}/purge_cache`, apiToken, {
		method: 'POST',
		body: JSON.stringify(options),
	})
}

/**
 * Get zone DNS records
 */
export async function getDNSRecords(
	apiToken: string,
	zoneId: string,
	options: { type?: string; name?: string; page?: number; per_page?: number } = {}
): Promise<
	Array<{
		id: string
		type: string
		name: string
		content: string
		proxied: boolean
		ttl: number
		created_on: string
		modified_on: string
	}>
> {
	const params = new URLSearchParams()
	if (options.type) params.set('type', options.type)
	if (options.name) params.set('name', options.name)
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())

	const queryString = params.toString()
	const endpoint = `/zones/${zoneId}/dns_records${queryString ? `?${queryString}` : ''}`

	return cloudflareRequest(endpoint, apiToken)
}

/**
 * Create DNS record
 */
export async function createDNSRecord(
	apiToken: string,
	zoneId: string,
	record: {
		type: string
		name: string
		content: string
		ttl?: number
		priority?: number
		proxied?: boolean
	}
): Promise<{ id: string; type: string; name: string; content: string }> {
	return cloudflareRequest(`/zones/${zoneId}/dns_records`, apiToken, {
		method: 'POST',
		body: JSON.stringify(record),
	})
}

/**
 * Update DNS record
 */
export async function updateDNSRecord(
	apiToken: string,
	zoneId: string,
	recordId: string,
	record: {
		type?: string
		name?: string
		content?: string
		ttl?: number
		priority?: number
		proxied?: boolean
	}
): Promise<{ id: string; type: string; name: string; content: string }> {
	return cloudflareRequest(`/zones/${zoneId}/dns_records/${recordId}`, apiToken, {
		method: 'PUT',
		body: JSON.stringify(record),
	})
}

/**
 * Delete DNS record
 */
export async function deleteDNSRecord(apiToken: string, zoneId: string, recordId: string): Promise<{ id: string }> {
	return cloudflareRequest(`/zones/${zoneId}/dns_records/${recordId}`, apiToken, {
		method: 'DELETE',
	})
}
