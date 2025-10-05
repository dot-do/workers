/**
 * Site management operations for Netlify
 *
 * Handles listing, creating, and managing Netlify sites.
 */

import { NetlifyApiClient } from './api'
import type { NetlifySite, ListOptions } from './types'

/**
 * List user's sites
 */
export async function listSites(accessToken: string, options: ListOptions = {}): Promise<NetlifySite[]> {
	const client = new NetlifyApiClient(accessToken)

	const page = options.page || 1
	const perPage = Math.min(options.perPage || 100, 100) // Max 100 per page

	const sites = await client.listSites(page, perPage)

	// Apply filter if provided
	if (options.filter) {
		const filterLower = options.filter.toLowerCase()
		return sites.filter(
			(site) =>
				site.name.toLowerCase().includes(filterLower) ||
				site.url.toLowerCase().includes(filterLower) ||
				site.custom_domain?.toLowerCase().includes(filterLower)
		)
	}

	return sites
}

/**
 * Get site by ID
 */
export async function getSite(accessToken: string, siteId: string): Promise<NetlifySite> {
	const client = new NetlifyApiClient(accessToken)
	return await client.getSite(siteId)
}

/**
 * Find site by name
 */
export async function findSiteByName(accessToken: string, name: string): Promise<NetlifySite | null> {
	const sites = await listSites(accessToken, { filter: name })
	return sites.find((site) => site.name === name) || null
}

/**
 * Find site by domain
 */
export async function findSiteByDomain(accessToken: string, domain: string): Promise<NetlifySite | null> {
	const sites = await listSites(accessToken, { filter: domain })
	return sites.find((site) => site.url.includes(domain) || site.custom_domain === domain) || null
}

/**
 * Get site statistics
 */
export async function getSiteStats(accessToken: string, siteId: string) {
	const client = new NetlifyApiClient(accessToken)

	const [site, deploys] = await Promise.all([client.getSite(siteId), client.listDeploys(siteId, 1, 10)])

	// Calculate statistics
	const successfulDeploys = deploys.filter((d) => d.state === 'ready').length
	const failedDeploys = deploys.filter((d) => d.state === 'error').length
	const latestDeploy = deploys[0]

	return {
		site: {
			id: site.id,
			name: site.name,
			url: site.url,
			state: site.state,
			created_at: site.created_at,
		},
		deploys: {
			total: site.published_deploy ? 1 : 0,
			successful: successfulDeploys,
			failed: failedDeploys,
			latest: latestDeploy
				? {
						id: latestDeploy.id,
						state: latestDeploy.state,
						created_at: latestDeploy.created_at,
						published_at: latestDeploy.published_at,
				  }
				: null,
		},
	}
}
